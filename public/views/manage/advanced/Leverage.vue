<template>
	<div>
		<div id="action-selector-wrapper">
			<span class="action-selector" @click="selectAction('long')" :class="{ 'selected': action == 'long' }">Long</span>
			<span class="action-selector" @click="selectAction('short')" :class="{ 'selected': action == 'short' }">Short</span>
		</div>
		<div id="picker-wrapper">
			Long
			<span class="input-group">
				<Picker :value="targetAsset" :list="targetAssets" :onSelect="targetAssetSelected" class="inline"/>
			</span>
			against
			<span class="input-group">
				<Picker :value="loanAsset" :list="loanAssets" :onSelect="loanAssetSelected" class="inline"/>
			</span>
			using
			<span class="input-group">
				<Picker :value="platform" :list="platforms" :onSelect="platformSelected" class="inline"/>
			</span>
		</div>
		<div id="rate-wrapper">
			Leverage:
			<span v-if="platform == 'Compound'">
				<span class="action-selector" @click="setRate('1.25')" :class="{ 'selected': rate == '1.25' }">1.25x</span>
				<span class="action-selector" @click="setRate('1.5')" :class="{ 'selected': rate == '1.5' }">1.5x</span>
				<span class="action-selector" @click="setRate('1.66')" :class="{ 'selected': rate == '1.66' }">1.66x</span>
			</span>
			<span v-if="platform == 'Fulcrum'">
				<span class="action-selector" @click="setRate('2')" :class="{ 'selected': rate == '2' }">2x</span>
				<span class="action-selector" @click="setRate('3')" :class="{ 'selected': rate == '3' }">3x</span>
				<span class="action-selector" @click="setRate('4')" :class="{ 'selected': rate == '4' }">4x</span>
			</span>
		</div>
		<div id="amount-wrapper">
			<span class="input-group">
				<span class="label">Position</span>
				<span class="max-label" @click="setMax()">MAX</span>
				<input class="amount" v-model="amount">
				<span class="label label-ghost label-right inline">{{ targetAsset }}</span>
			</span>
		</div>
		<div id="button-wrapper">
			<button class="primary big" @click="long()" v-if="action == 'long'">Long</button>
			<button class="primary big" @click="short()" v-if="action == 'short'">Short</button>
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
import fulcrumTokenAbi from '../../../data/abi/fulcrumToken.json';

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
			action: 'long',
			targetAsset: 'ETH',
			loanAsset: 'DAI',
			platform: 'Compound',
			rate: '1.5',
			amount: '1',
			tokenAddresses: {
				'Compound': {},
				'Fulcrum': {},
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
		selectAction(action) {
			this.action = action;
		},
		setRate(rate) {
			this.rate = rate;
		},
		targetAssetSelected(ticker) {
			this.targetAsset = ticker;
		},
		loanAssetSelected(ticker) {
			this.loanAsset = ticker;
		},
		platformSelected(platform) {
			this.platform = platform;
			if (platform == 'Compound') {
				this.rate = '1.5';
			}
			if (platform == 'Fulcrum') {
				this.rate = '3';
			}
		},
		async setMax() {
			const account = this.account.address;
			if (this.targetAsset == 'ETH') {
				const etherBalance = await provider.getBalance(account);
				const amount = this.toShortAmount(etherBalance.toString(), this.targetAsset);
				this.amount = amount;
			} else {
				const inputAddress = this.getTokenAddress(this.targetAsset);
				const inputToken = new ethers.Contract(inputAddress, erc20Abi, provider);
				const inputTokenBalance = await inputToken.balanceOf(account);
				const amount = this.toShortAmount(inputTokenBalance.toString(), this.targetAsset);
				this.amount = amount;
			}
		},
		async hideStatus() {
			this.txStatus = 'none';
		},
		async long() {
			await this.deposit();
			await this.borrow();
			await this.trade();
		},
		async short() {
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
		async deposit() {
			if (this.platform == 'Compound') {
				await this.depositCompound();
			}
			if (this.platform == 'Fulcrum') {
				await this.depositFulcrum();
			}
		},
		async borrow() {
			if (this.platform == 'Compound') {
				await this.borrowCompound();
			}
		},
		async trade() {
			await this.tradeKyber();
		},
		async depositCompound() {
			const assetAddress = addresses[this.targetAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.targetAsset];
			const positionAmountNumber = new BigNumber(this.amount);
			const depositAmountNumber = positionAmountNumber.div(this.rate);
			const depositAmount = this.toLongAmount(depositAmountNumber, this.targetAsset);
			if (this.targetAsset == 'ETH') {
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
		async depositFulcrum() {
			const account = this.account.address;
			const assetAddress = addresses[this.targetAsset];
			const iTokenAddress = this.tokenAddresses['Fulcrum'][this.targetAsset];
			const iToken = new ethers.Contract(iTokenAddress, fulcrumTokenAbi, signer);
			const positionAmountNumber = new BigNumber(this.amount);
			const mintAmountNumber = positionAmountNumber.div(this.rate);
			const mintAmount = this.toLongAmount(mintAmountNumber, this.targetAsset);
			if (this.targetAsset == 'ETH') {
				try {
					this.txStatus = 'mining';
					const valueNumber = new BigNumber(mintAmount);
					const options = {
						value: '0x' + valueNumber.toString(16),
					};
					const tx = await iToken.mintWithEther(account, options);
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
			}
		},
		async borrowCompound() {
			const assetAddress = addresses[this.loanAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.loanAsset];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const positionAmountNumber = new BigNumber(this.amount);
			const depositAmountNumber = positionAmountNumber.div(this.rate);
			const borrowTargetAmountNumber = positionAmountNumber.minus(depositAmountNumber);
			const borrowAmountNumber = borrowTargetAmountNumber.times(prices[this.targetAsset]).div(prices[this.loanAsset]);
			const borrowAmount = this.toLongAmount(borrowAmountNumber, this.loanAsset);
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
		async tradeKyber() {
			const assetAddress = addresses[this.loanAsset];
			const positionAmountNumber = new BigNumber(this.amount);
			const depositAmountNumber = positionAmountNumber.div(this.rate);
			const borrowTargetAmountNumber = positionAmountNumber.minus(depositAmountNumber);
			const borrowAmountNumber = borrowTargetAmountNumber.times(prices[this.targetAsset]).div(prices[this.loanAsset]);
			const minConversionRate = '1';
			const kyberProxy = new ethers.Contract(kyberProxyAddress, kyberProxyAbi, signer);
			if (this.targetAsset == 'ETH') {
				// Token to eth
				const inputAddress = this.getTokenAddress(this.loanAsset);
				const inputAmount = this.toLongAmount(borrowAmountNumber, this.loanAsset);
				await this.checkAllowance(kyberProxyAddress, inputAddress, inputAmount);
				try {
					this.txStatus = 'mining';
					const tx = await kyberProxy.swapTokenToEther(inputAddress, inputAmount, minConversionRate);
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
				// Token to token
				const inputAddress = this.getTokenAddress(this.loanAsset);
				const inputAmount = this.toLongAmount(borrowAmountNumber, this.loanAsset);
				const outputAddress = this.getTokenAddress(this.targetAsset);
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
		async loadCompound() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					tokens {
						symbol
						address
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
			}
		},
		async loadFulcrum() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/fulcrum";
			const query = `
				query {
					tokens {
						symbol
						address
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
		getTokenAddress(ticker) {
			if (ticker == 'ETH') {
				return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
			}
			return addresses[ticker];
		},
	},
	computed: {
		targetAssets() {
			return ['ETH', 'ZRX'];
		},
		loanAssets() {
			return ['DAI', 'USDC'];
		},
		platforms() {
			return ['Compound', 'Fulcrum'];
		},
	},
}
</script>

<style scoped>
#action-selector-wrapper {
	margin-top: 1em;
}

#picker-wrapper {
	margin-top: 3em;
}

#rate-wrapper {
	margin-top: 1em;
}

#amount-wrapper {
	margin-top: 3em;
}

#button-wrapper {
	margin-top: 1em;
}

</style>
