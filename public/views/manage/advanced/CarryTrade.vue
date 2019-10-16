<template>
	<div>
		<div id="deposit-picker-wrapper">
			<span class="input-group">
				<span class="label">Deposit asset</span>
				<Picker :value="depositAsset" :list="depositAssets" :onSelect="depositAssetSelected" class="inline"/>
			</span>
		</div>
		<div id="strategy-picker-wrapper">
			Borrow
			<span class="input-group">
				<Picker :value="fundingAsset" :list="assets" :onSelect="fundingAssetSelected" class="inline"/>
			</span>
			to lend
			<span class="input-group">
				<Picker :value="lendingAsset" :list="assets" :onSelect="lendingAssetSelected" class="inline"/>
			</span>
			using
			<span class="input-group">
				<Picker :value="platform" :list="platforms" :onSelect="platformSelected" class="inline"/>
			</span>
		</div>
		<div id="rate-wrapper">
			<p>USDC borrow rate: {{ formatRate(fundingRate) }}</p>
			<p>DAI supply rate: {{ formatRate(lendingRate) }}</p>
			<p>Net rate: {{ formatRate(netRate) }}</p>
		</div>
		<div id="amount-picker-wrapper">
			<span class="input-group">
				<span class="label">Amount</span>
				<input class="amount" v-model="amount">
				<span class="label label-ghost label-right inline">{{ depositAsset }}</span>
			</span>
		</div>
		<div id="button-wrapper">
			<button class="primary big" @click="trade()">Trade</button>
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
import kyberProxyAbi from '../../../data/abi/kyberProxy.json';
import compoundTokenAbi from '../../../data/abi/compoundToken.json';
import compoundEtherAbi from '../../../data/abi/compoundEther.json';
import fulcrumPositionTokenAbi from '../../../data/abi/fulcrumPositionToken.json';

import prices from '../../../data/prices.json';
import decimals from '../../../data/decimals.json';
import addresses from '../../../data/addresses.json';

const kyberProxyAddress = '0x818e6fecd516ecc3849daf6845e3ec868087b755';

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
			depositAsset: 'ETH',
			fundingAsset: 'USDC',
			lendingAsset: 'DAI',
			platform: 'Compound',
			amount: '1',
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
		depositAssetSelected(depositAsset) {
			this.depositAsset = depositAsset;
		},
		fundingAssetSelected(fundingAsset) {
			this.fundingAsset = fundingAsset;
			if (fundingAsset == 'USDC') {
				this.lendingAsset = 'DAI';
			}
			if (fundingAsset == 'DAI') {
				this.lendingAsset = 'USDC';
			}
		},
		lendingAssetSelected(lendingAsset) {
			this.lendingAsset = lendingAsset;
			if (lendingAsset == 'USDC') {
				this.fundingAsset = 'DAI';
			}
			if (lendingAsset == 'DAI') {
				this.fundingAsset = 'USDC';
			}
		},
		platformSelected(platform) {
			this.platform = platform;
		},
		hideStatus() {
			this.txStatus = 'none';
		},
		async trade() {
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
		depositAssets() {
			return ['ETH', 'WBTC', 'ZRX', 'REP'];
		},
		assets() {
			return ['USDC', 'DAI'];
		},
		platforms() {
			return ['Compound', 'Fulcrum'];
		},
		fundingRate() {
			const assetRates = this.rates.borrow[this.fundingAsset];
			if (!assetRates) {
				return '0';
			}
			const rate = assetRates[this.platform];
			if (!rate) {
				return '0';
			}
			return rate;
		},
		lendingRate() {
			const assetRates = this.rates.borrow[this.lendingAsset];
			if (!assetRates) {
				return '0';
			}
			const rate = assetRates[this.platform];
			if (!rate) {
				return '0';
			}
			return rate;
		},
		netRate() {
			const fundingRate = parseFloat(this.fundingRate);
			const lendingRate = parseFloat(this.lendingRate);
			const netRate = fundingRate - lendingRate;
			return netRate.toString();
		},
	}
}
</script>

<style scoped>
#deposit-picker-wrapper {
	margin-top: 2em;
}

#strategy-picker-wrapper {
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