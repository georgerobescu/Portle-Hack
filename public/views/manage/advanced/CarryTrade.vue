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
				<Picker :value="lendingAsset" :list="assets" :onSelect="lendingAssetSelected" class="inline"/>
			</span>
			to lend
			<span class="input-group">
				<Picker :value="fundingAsset" :list="assets" :onSelect="fundingAssetSelected" class="inline"/>
			</span>
		</div>
		<div id="rate-wrapper">
			<p>{{ lendingAsset }} borrow rate: {{ formatRate(fundingRate) }}</p>
			<p>{{ fundingAsset }} supply rate: {{ formatRate(lendingRate) }}</p>
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

import decimals from '../../../data/decimals.json';
import addresses from '../../../data/addresses.json';
import currencyIds from '../../../data/currency-ids.json';

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
			lendingAsset: 'USDC',
			fundingAsset: 'DAI',
			amount: '1',
			rates: {
				supply: {},
				borrow: {},
			},
			prices: {},
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
		this.loadPrices();
		this.loadCompound();
	},
	methods: {
		depositAssetSelected(depositAsset) {
			this.depositAsset = depositAsset;
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
		fundingAssetSelected(fundingAsset) {
			this.fundingAsset = fundingAsset;
			if (fundingAsset == 'USDC') {
				this.lendingAsset = 'DAI';
			}
			if (fundingAsset == 'DAI') {
				this.lendingAsset = 'USDC';
			}
		},
		hideStatus() {
			this.txStatus = 'none';
		},
		async trade() {
			await this.deposit();
			await this.borrow();
			await this.swap();
			await this.lend();
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
		async loadPrices() {
			const assets = ['DAI', 'USDC', 'ETH', 'WBTC', 'REP', 'BAT', 'ZRX', 'LINK', 'KNC'];
			const assetIds = assets.map((asset) => currencyIds[asset]);
			const assetIdString = assetIds.join('%2C');
			const url = `https://api.coingecko.com/api/v3/simple/price?ids=${assetIdString}&vs_currencies=usd`;
 			const response = await fetch(url);
			const prices = await response.json();
			for (let i = 0; i < assets.length; i++) {
				const ticker = assets[i];
				const id = assetIds[i];
				const price = prices[id].usd;
				Vue.set(this.prices, ticker, price);
			}
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
				Vue.set(this.rates.supply, ticker, supplyRate);
				Vue.set(this.rates.borrow, ticker, borrowRate);
			}
		},
		async deposit() {
			const assetAddress = addresses[this.depositAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.depositAsset];
			const depositAmountNumber = new BigNumber(this.amount);
			const depositAmount = this.toLongAmount(depositAmountNumber, this.depositAsset);
			if (this.depositAsset == 'ETH') {
				try {
					this.txStatus = 'mining';
					const cEther = new ethers.Contract(cTokenAddress, compoundEtherAbi, signer);
					const valueNumber = new BigNumber(depositAmount);
					const options = {
						value: '0x' + valueNumber.toString(16),
					};
					const tx = await cEther.mint(options);
					const txReceipt = await provider.getTransactionReceipt(tx.hash);
					if (txReceipt.status == 1) {
						this.txStatus = 'success';
					} else {
						this.txStatus = 'failure';
					}
				} catch(e) {
					this.txStatus = 'rejected';
				}
			} else {
				await this.checkAllowance(cTokenAddress, assetAddress, depositAmount);
				try {
					this.txStatus = 'mining';
					const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
					const tx = await cToken.mint(depositAmount);
					const txReceipt = await provider.getTransactionReceipt(tx.hash);
					if (txReceipt.status == 1) {
						this.txStatus = 'success';
					} else {
						this.txStatus = 'failure';
					}
				} catch(e) {
					this.txStatus = 'rejected';
				}
			}
		},
		async borrow() {
			const assetAddress = addresses[this.lendingAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.lendingAsset];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const depositAmountNumber = new BigNumber(this.amount);
			const borrowAmountNumber = depositAmountNumber.times(this.prices[this.depositAsset]).div(this.prices[this.lendingAsset]);
			const borrowAmount = this.toLongAmount(depositAmountNumber, this.lendingAsset);
			try {
				this.txStatus = 'mining';
				const tx = await cToken.borrow(borrowAmount);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
			}
		},
		async swap() {
			const depositAmountNumber = new BigNumber(this.amount);
			const borrowAmountNumber = depositAmountNumber.times(this.prices[this.depositAsset]).div(this.prices[this.lendingAsset]);
			const minConversionRate = '1';
			const kyberProxy = new ethers.Contract(kyberProxyAddress, kyberProxyAbi, signer);
			// Token to token
			const inputAddress = this.getTokenAddress(this.lendingAsset);
			const inputAmount = this.toLongAmount(borrowAmountNumber, this.accountAsset);
			const outputAddress = this.getTokenAddress(this.fundingAsset);
			await this.checkAllowance(kyberProxyAddress, inputAddress, inputAmount);
			try {
				this.txStatus = 'mining';
				const tx = await kyberProxy.swapTokenToToken(inputAddress, inputAmount, outputAddress, minConversionRate);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
			}
		},
		async lend() {
			const assetAddress = addresses[this.depositAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.depositAsset];
			const depositAmountNumber = new BigNumber(this.amount);
			const lendAmountNumber = depositAmountNumber.times(this.prices[this.depositAsset]).div(this.prices[this.fundingAsset]);
			const lendAmount = this.toLongAmount(lendAmountNumber, this.fundingAsset);
			await this.checkAllowance(cTokenAddress, assetAddress, depositAmount);
			try {
				this.txStatus = 'mining';
				const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
				const tx = await cToken.mint(depositAmount);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
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
		fundingRate() {
			const rate = this.rates.borrow[this.lendingAsset];
			if (!rate) {
				return '0';
			}
			return rate;
		},
		lendingRate() {
			const rate = this.rates.supply[this.fundingAsset];
			if (!rate) {
				return '0';
			}
			return rate;
		},
		netRate() {
			const lendingRate = parseFloat(this.lendingRate);
			const fundingRate = parseFloat(this.fundingRate);
			const netRate = lendingRate - fundingRate;
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