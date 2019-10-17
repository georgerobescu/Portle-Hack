<template>
	<div>
		<div id="asset-picker-wrapper">
			<span class="input-group">
				<span class="label">Deposit asset</span>
				<Picker :value="asset" :list="assets" :onSelect="assetSelected" class="inline"/>
			</span>
		</div>
		<div id="platform-picker-wrapper">
			Migrate deposit from
			<span class="input-group">
				<Picker :value="inPlatform" :list="platforms" :onSelect="inPlatformSelected" class="inline"/>
			</span>
			to
			<span class="input-group">
				<Picker :value="outPlatform" :list="platforms" :onSelect="outPlatformSelected" class="inline"/>
			</span>
		</div>
		<div id="rate-wrapper">
			<p>{{ inPlatform }} rate: {{ formatRate(inPlatformRate) }}</p>
			<p>{{ outPlatform }} rate: {{ formatRate(outPlatformRate) }}</p>
			<p>Rate difference: {{ formatRate(netRate) }}</p>
		</div>
		<div id="amount-picker-wrapper">
			<span class="input-group">
				<span class="label">Amount</span>
				<span class="max-label" @click="setMax()">MAX</span>
				<input class="amount" v-model="amount">
				<span class="label label-ghost label-right inline">{{ asset }}</span>
			</span>
		</div>
		<div id="button-wrapper">
			<button class="primary big" @click="migrate()">Migrate</button>
		</div>
		<TxStatus :status="txStatus" :onHidden="hideStatus"/>
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import Picker from '../../../components/Picker.vue';
import TxStatus from '../../../components/TxStatus.vue';

import erc20Abi from '../../../data/abi/erc20.json';
import compoundTokenAbi from '../../../data/abi/compoundToken.json';
import compoundEtherAbi from '../../../data/abi/compoundEther.json';
import fulcrumPositionTokenAbi from '../../../data/abi/fulcrumPositionToken.json';

import prices from '../../../data/prices.json';
import decimals from '../../../data/decimals.json';
import addresses from '../../../data/addresses.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

export default {
	components: {
		Picker,
		TxStatus,
	},
	data() {
		return {
			account: undefined,
			txStatus: 'none',
			asset: 'DAI',
			inPlatform: 'Compound',
			outPlatform: 'Fulcrum',
			amount: '100',
			tokenAddresses: {
				Compound: {},
				Fulcrum: {},
			},
			rates: {
				supply: {},
				borrow: {},
			},
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
		this.loadCompound();
		this.loadFulcrum();
	},
	methods: {
		assetSelected(asset) {
			this.asset = asset;
		},
		inPlatformSelected(inPlatform) {
			this.inPlatform = inPlatform;
			if (this.inPlatform == 'Compound') {
				this.outPlatform = 'Fulcrum';
			}
			if (this.inPlatform == 'Fulcrum') {
				this.outPlatform = 'Compound';
			}
		},
		outPlatformSelected(outPlatform) {
			this.outPlatform = outPlatform;
			if (this.outPlatform == 'Compound') {
				this.inPlatform = 'Fulcrum';
			}
			if (this.outPlatform == 'Fulcrum') {
				this.inPlatform = 'Compound';
			}
		},
		hideStatus() {
			this.txStatus = 'none';
		},
		migrate() {

		},
		loadAccount() {
			const address = localStorage.getItem('address');
			const auth = localStorage.getItem('auth') == 'true';
			if (!address) {
				return;
			}
			this.account = {
				address,
				auth,
			};
		},
		async loadCompound() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					tokens {
						symbol
						address
						supplyRate
						borrowRate
					}
				}`;
			const opts = {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query })
			};
			const response = await fetch(url, opts);
			const json = await response.json();
			const data = json.data;
			const tokens = data.tokens;
			for (const token of tokens) {
				const ticker = token.symbol.substr(1);
				const address = token.address;
				Vue.set(this.tokenAddresses['Compound'], ticker, address);
				// Set rates
				const supplyRawRate = token.supplyRate;
				const borrowRawRate = token.borrowRate;
				const supplyRawRateNumber = new BigNumber(supplyRawRate);
				const borrowRawRateNumber = new BigNumber(borrowRawRate);
				const supplyRateNumber = supplyRawRateNumber.times('2102400').div('1e18');
				const borrowRateNumber = borrowRawRateNumber.times('2102400').div('1e18');
				const supplyRate = supplyRateNumber.toString();
				const borrowRate = borrowRateNumber.toString();
				if (!(ticker in this.rates.supply)) {
					Vue.set(this.rates.supply, ticker, {});
				}
				if (!(ticker in this.rates.borrow)) {
					Vue.set(this.rates.borrow, ticker, {});
				}
				Vue.set(this.rates.supply[ticker], 'Compound', supplyRate);
				Vue.set(this.rates.borrow[ticker], 'Compound', borrowRate);
			}
		},
		async loadFulcrum() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/fulcrum";
			const query = `
				query {
					tokens {
						symbol
						address
						supplyRate
						borrowRate
					}
				}`;
			const opts = {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query })
			};
			const response = await fetch(url, opts);
			const json = await response.json();
			const data = json.data;
			const tokens = data.tokens;
			for (const token of tokens) {
				const ticker = token.symbol.substr(1);
				const address = token.address;
				Vue.set(this.tokenAddresses['Fulcrum'], ticker, address);
				// Set rates
				const supplyRawRate = token.supplyRate;
				const borrowRawRate = token.borrowRate;
				const supplyRawRateNumber = new BigNumber(supplyRawRate);
				const borrowRawRateNumber = new BigNumber(borrowRawRate);
				const supplyRateNumber = supplyRawRateNumber.div('1e18').div('1e2');
				const borrowRateNumber = borrowRawRateNumber.div('1e18').div('1e2');
				const supplyRate = supplyRateNumber.toString();
				const borrowRate = borrowRateNumber.toString();
				if (!(ticker in this.rates.supply)) {
					Vue.set(this.rates.supply, ticker, {});
				}
				if (!(ticker in this.rates.borrow)) {
					Vue.set(this.rates.borrow, ticker, {});
				}
				Vue.set(this.rates.supply[ticker], 'Fulcrum', supplyRate);
				Vue.set(this.rates.borrow[ticker], 'Fulcrum', borrowRate);
			}
		},
		formatRate(rateString) {
			const rate = parseFloat(rateString);
			return `${(rate * 100).toFixed(2)}%`;
		},
	},
	computed: {
		assets() {
			return ['DAI', 'USDC'];
		},
		platforms() {
			return ['Compound', 'Fulcrum'];
		},
		inPlatformRate() {
			const assetRates = this.rates.supply[this.asset];
			if (!assetRates) {
				return '0';
			}
			const rate = assetRates[this.inPlatform];
			if (!rate) {
				return '0';
			}
			return rate;
		},
		outPlatformRate() {
			const assetRates = this.rates.supply[this.asset];
			if (!assetRates) {
				return '0';
			}
			const rate = assetRates[this.outPlatform];
			if (!rate) {
				return '0';
			}
			return rate;
		},
		netRate() {
			const inPlatformRate = parseFloat(this.inPlatformRate);
			const outPlatformRate = parseFloat(this.outPlatformRate);
			const netRate = outPlatformRate - inPlatformRate;
			return netRate.toString();
		},
	}
}
</script>

<style scoped>
#asset-picker-wrapper {
	margin-top: 2em;
}

#platform-picker-wrapper {
	margin-top: 2em;
}

#rate-wrapper {
	margin-top: 1em;
}

#amount-picker-wrapper {
	margin-top: 2em;
}

#button-wrapper {
	margin-top: 1em;
}
</style>
