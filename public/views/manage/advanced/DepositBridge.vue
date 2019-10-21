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
import fulcrumTokenAbi from '../../../data/abi/fulcrumToken.json';

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
			rates: {
				Compound: {},
				Fulcrum: {},
			},
			indices: {
				Compound: {},
				Fulcrum: {},
			},
			tokenAddresses: {
				Compound: {},
				Fulcrum: {},
			},
			balances: {
				Compound: {},
				Fulcrum: {},
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
		async migrate() {
			await this.withdraw();
			await this.deposit();
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
						supplyIndex
					}
					userBalances(where: {
						id: "${this.account.address}"
					}) {
						balances {
							token {
								symbol
							}
							balance
						}
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
				const rawRate = token.supplyRate;
				const index = token.supplyIndex;
				const rawRateNumber = new BigNumber(rawRate);
				const rateNumber = rawRateNumber.times('2102400').div('1e18');
				const rate = rateNumber.toString();
				Vue.set(this.tokenAddresses['Compound'], ticker, address);
				Vue.set(this.rates['Compound'], ticker, rate);
				Vue.set(this.indices['Compound'], ticker, index);
			}
			if (data.userBalances.length == 0) {
				return;
			}
			const userBalances = data.userBalances[0].balances;
			for (const userBalance of userBalances) {
				const ticker = userBalance.token.symbol.substr(1);
				const balance = userBalance.balance;
				Vue.set(this.balances['Compound'], ticker, balance);
			}
		},
		async loadFulcrum() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/fulcrum";
			const query = `
				query {
					tokens {
						symbol
						address
						index
						supplyRate
					}
					userBalances(where: {
						id: "${this.account.address}"
					}) {
						balances {
							token {
								symbol
							}
							balance
						}
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
				const rawRate = token.supplyRate;
				const index = token.index;
				const rawRateNumber = new BigNumber(rawRate);
				const rateNumber = rawRateNumber.div('1e18').div('1e2');
				const rate = rateNumber.toString();
				Vue.set(this.tokenAddresses['Fulcrum'], ticker, address);
				Vue.set(this.rates['Fulcrum'], ticker, rate);
				Vue.set(this.indices['Fulcrum'], ticker, index);
			}
			if (data.userBalances.length == 0) {
				return;
			}
			const userBalances = data.userBalances[0].balances;
			for (const userBalance of userBalances) {
				const ticker = userBalance.token.symbol.substr(1);
				const balance = userBalance.balance;
				Vue.set(this.balances['Fulcrum'], ticker, balance);
			}
		},
		async withdraw() {
			if (this.inPlatform == 'Compound') {
				await this.withdrawCompound();
			}
			if (this.inPlatform == 'Fulcrum') {
				await this.withdrawFulcrum();
			}
		},
		async deposit() {
			if (this.outPlatform == 'Compound') {
				await this.depositCompound();
			}
			if (this.outPlatform == 'Fulcrum') {
				await this.depositFulcrum();
			}
		},
		async checkAllowance(spender, address, amount) {
			const uintMax = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
			const account = this.account.address;
			const inputToken = new ethers.Contract(address, erc20Abi, signer);
			const inputTokenAllowance = await inputToken.allowance(account, spender);
			if (inputTokenAllowance.gte(amount)) {
				return;
			}
			try {
				this.txStatus = 'mining';
				const tx = await inputToken.approve(spender, uintMax);
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
		async depositCompound() {
			const assetAddress = addresses[this.asset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.asset];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const mintAmount = this.toLongAmount(this.amount, this.asset);
			await this.checkAllowance(cTokenAddress, assetAddress, mintAmount);
			try {
				this.txStatus = 'mining';
				const tx = await cToken.mint(mintAmount);
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
		async depositFulcrum() {
			const assetAddress = addresses[this.asset];
			const iTokenAddress = this.tokenAddresses['Fulcrum'][this.asset];
			const iToken = new ethers.Contract(iTokenAddress, fulcrumTokenAbi, signer);
			const account = this.account.address;
			const mintAmount = this.toLongAmount(this.amount, this.asset);
			await this.checkAllowance(iTokenAddress, assetAddress, mintAmount);
			try {
				this.txStatus = 'mining';
				const tx = await iToken.mint(account, mintAmount);
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
		async withdrawCompound() {
			const assetAddress = addresses[this.asset];
			const index = this.indices['Compound'][this.asset];
			const redeemAmount = this.toLongAmount(this.amount, this.asset);
			const redeemAmountNumber = new BigNumber(redeemAmount);
			const tokenAmountNumber = redeemAmountNumber.times('1e18').div(index);
			const tokenAmount = tokenAmountNumber.toFixed(0);
			const cTokenAddress = this.tokenAddresses['Compound'][this.asset];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			try {
				this.txStatus = 'mining';
				const tx = await cToken.redeem(tokenAmount);
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
		async withdrawFulcrum() {
			const account = this.account.address;
			const assetAddress = addresses[this.asset];
			const index = this.indices['Fulcrum'][this.asset];
			const burnAmount = this.toLongAmount(this.amount, this.asset);
			const burnAmountNumber = new BigNumber(burnAmount);
			const tokenAmountNumber = burnAmountNumber.times('1e18').div(index);
			const tokenAmount = tokenAmountNumber.toFixed(0);
			const iTokenAddress = this.tokenAddresses['Fulcrum'][this.asset];
			const iToken = new ethers.Contract(iTokenAddress, fulcrumTokenAbi, signer);
			try {
				this.txStatus = 'mining';
				const tx = await iToken.burn(account, tokenAmount);
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
		toShortAmount(amount, ticker) {
			const ten = new BigNumber(10);
			const tickerDecimals = decimals[ticker];
			const multiplier = ten.pow(tickerDecimals);
			const amountNumber = new BigNumber(amount);
			const shortAmountNumber = amountNumber.div(multiplier);
			const shortAmount = shortAmountNumber.toString();
			return shortAmount;
		},
		toLongAmount(amount, ticker) {
			const ten = new BigNumber(10);
			const tickerDecimals = decimals[ticker];
			const multiplier = ten.pow(tickerDecimals);
			const amountNumber = new BigNumber(amount);
			const longAmountNumber = amountNumber.times(multiplier);
			const longAmount = longAmountNumber.toFixed(0);
			return longAmount;
		},
		async setMax() {
			const tokenBalance = this.balances[this.inPlatform][this.asset];
			const tokenBalanceNumber = new BigNumber(tokenBalance);
			if (!tokenBalance) {
				return;
			}
			const index = this.indices[this.inPlatform][this.asset];
			const amountNumber = tokenBalanceNumber.times(index).div('1e18');
			const amount = this.toShortAmount(amountNumber, this.asset);
			this.amount = amount;
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
			const platformRates = this.rates[this.inPlatform];
			if (!platformRates) {
				return '0';
			}
			const rate = platformRates[this.asset];
			if (!rate) {
				return '0';
			}
			return rate;
		},
		outPlatformRate() {
			const platformRates = this.rates[this.outPlatform];
			if (!platformRates) {
				return '0';
			}
			const rate = platformRates[this.asset];
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
