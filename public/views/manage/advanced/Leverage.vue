<template>
	<div>
		<div id="action-selector-wrapper">
			<span class="action-selector" @click="selectAction('long')" :class="{ 'selected': action == 'long' }">Long</span>
			<span class="action-selector" @click="selectAction('short')" :class="{ 'selected': action == 'short' }">Short</span>
		</div>
		<div id="picker-wrapper">
			<span v-if="action == 'long'">
				Long
			</span>
			<span v-if="action =='short'">
				Short
			</span>
			<span class="input-group">
				<Picker :value="targetAsset" :list="targetAssets" :onSelect="targetAssetSelected" class="inline"/>
			</span>
			against
			<span class="input-group">
				<Picker :value="accountAsset" :list="accountAssets" :onSelect="accountAssetSelected" class="inline"/>
			</span>
			using
			<span class="input-group">
				<Picker :value="platform" :list="platforms" :onSelect="platformSelected" class="inline"/>
			</span>
		</div>
		<div id="rate-wrapper">
			Leverage:
			<span v-if="action == 'long'">
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
			</span>
			<span v-if="action == 'short'">
				<span v-if="platform == 'Compound'">
					<span class="action-selector" @click="setRate('0.25')" :class="{ 'selected': rate == '0.25' }">.25x</span>
					<span class="action-selector" @click="setRate('0.5')" :class="{ 'selected': rate == '0.5' }">.5x</span>
					<span class="action-selector" @click="setRate('0.666')" :class="{ 'selected': rate == '0.666' }">.666x</span>
				</span>
				<span v-if="platform == 'Fulcrum'">
					<span class="action-selector" @click="setRate('1')" :class="{ 'selected': rate == '1' }">1x</span>
					<span class="action-selector" @click="setRate('2')" :class="{ 'selected': rate == '2' }">2x</span>
					<span class="action-selector" @click="setRate('3')" :class="{ 'selected': rate == '3' }">3x</span>
					<span class="action-selector" @click="setRate('4')" :class="{ 'selected': rate == '4' }">4x</span>
				</span>
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
			action: 'long',
			targetAsset: 'ETH',
			accountAsset: 'DAI',
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
			if (this.action == 'long') {
				if (this.platform == 'Compound') {
					this.rate = '1.5';
				}
				if (this.platform == 'Fulcrum') {
					this.rate = '3';
				}
			}
			if (this.action == 'short') {
				if (this.platform == 'Compound') {
					this.rate = '0.5';
				}
				if (this.platform == 'Fulcrum') {
					this.rate = '2';
				}
			}
		},
		setRate(rate) {
			this.rate = rate;
		},
		targetAssetSelected(ticker) {
			this.targetAsset = ticker;
		},
		accountAssetSelected(ticker) {
			this.accountAsset = ticker;
		},
		platformSelected(platform) {
			this.platform = platform;
			if (this.action == 'long') {
				if (this.platform == 'Compound') {
					this.rate = '1.5';
				}
				if (this.platform == 'Fulcrum') {
					this.rate = '3';
				}
			}
			if (this.action == 'short') {
				if (this.platform == 'Compound') {
					this.rate = '0.5';
				}
				if (this.platform == 'Fulcrum') {
					this.rate = '2';
				}
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
			if (this.platform == 'Compound') {
				await this.longDepositCompound();
				await this.longBorrowCompound();
				await this.longTradeKyber();
			}
			if (this.platform == 'Fulcrum') {
				await this.longFulcrum();
			}
		},
		async short() {
			if (this.platform == 'Compound') {
				await this.shortDepositCompound();
				await this.shortBorrowCompound();
				await this.shortTradeKyber();
			}
			if (this.platform == 'Fulcrum') {
				await this.shortFulcrum();
			}
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
		async longDepositCompound() {
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
		async longBorrowCompound() {
			const assetAddress = addresses[this.accountAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.accountAsset];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const positionAmountNumber = new BigNumber(this.amount);
			const depositAmountNumber = positionAmountNumber.div(this.rate);
			const borrowTargetAmountNumber = positionAmountNumber.minus(depositAmountNumber);
			const borrowAmountNumber = borrowTargetAmountNumber.times(prices[this.targetAsset]).div(prices[this.accountAsset]);
			const borrowAmount = this.toLongAmount(borrowAmountNumber, this.accountAsset);
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
		async longTradeKyber() {
			const assetAddress = addresses[this.accountAsset];
			const positionAmountNumber = new BigNumber(this.amount);
			const depositAmountNumber = positionAmountNumber.div(this.rate);
			const borrowTargetAmountNumber = positionAmountNumber.minus(depositAmountNumber);
			const borrowAmountNumber = borrowTargetAmountNumber.times(prices[this.targetAsset]).div(prices[this.accountAsset]);
			const minConversionRate = '1';
			const kyberProxy = new ethers.Contract(kyberProxyAddress, kyberProxyAbi, signer);
			if (this.targetAsset == 'ETH') {
				// Token to eth
				const inputAddress = this.getTokenAddress(this.accountAsset);
				const inputAmount = this.toLongAmount(borrowAmountNumber, this.accountAsset);
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
				const inputAddress = this.getTokenAddress(this.accountAsset);
				const inputAmount = this.toLongAmount(borrowAmountNumber, this.accountAsset);
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
		async longFulcrum() {
			const account = this.account.address;
			const uintMax = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
			const assetAddress = this.getTokenAddress(this.targetAsset);
			const pTokenAddress = this.getFulcrumPositionTokenAddress(this.targetAsset, this.accountAsset, true, this.rate);
			const pToken = new ethers.Contract(pTokenAddress, fulcrumPositionTokenAbi, signer);
			const positionAmountNumber = new BigNumber(this.amount);
			const depositAmountNumber = positionAmountNumber.div(this.rate);
			const depositAmount = this.toLongAmount(depositAmountNumber, this.targetAsset);
			if (this.targetAsset == 'ETH') {
				try {
					this.txStatus = 'mining';
					const valueNumber = new BigNumber(depositAmount);
					const options = {
						value: '0x' + valueNumber.toString(16),
					};
					const tx = await pToken.mintWithEther(account, uintMax, options);
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
				await this.checkAllowance(pTokenAddress, assetAddress, depositAmount);
				try {
					this.txStatus = 'mining';
					const tx = await pToken.mintWithToken(account, assetAddress, depositAmount, uintMax);
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
		async shortDepositCompound() {
			const assetAddress = addresses[this.accountAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.accountAsset];
			const positionAmountNumber = new BigNumber(this.amount);
			const targetAssetPrice = prices[this.targetAsset];
			const accountAssetPrice = prices[this.accountAsset];
			const depositAmountNumber = positionAmountNumber.times(targetAssetPrice).div(accountAssetPrice).div(this.rate);
			const depositAmount = this.toLongAmount(depositAmountNumber, this.accountAsset);
			if (this.accountAsset == 'ETH') {
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
		async shortBorrowCompound() {
			const assetAddress = addresses[this.targetAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.targetAsset];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const borrowAmount = this.toLongAmount(this.amount, this.targetAsset);
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
		async shortTradeKyber() {
			const assetAddress = addresses[this.accountAsset];
			const minConversionRate = '1';
			const kyberProxy = new ethers.Contract(kyberProxyAddress, kyberProxyAbi, signer);
			if (this.targetAsset == 'ETH') {
				// Eth to token
				const outputAddress = this.getTokenAddress(this.accountAsset);
				const value = this.toLongAmount(this.amount, 'ETH');
				const valueNumber = new BigNumber(value);
				const options = {
					value: '0x' + valueNumber.toString(16),
				};
				try {
					this.txStatus = 'mining';
					const tx = await kyberProxy.swapEtherToToken(outputAddress, minConversionRate, options);
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
				const inputAddress = this.getTokenAddress(this.targetAsset);
				const inputAmount = this.toLongAmount(this.amount, this.targetAsset);
				const outputAddress = this.getTokenAddress(this.accountAsset);
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
		async shortFulcrum() {
			const account = this.account.address;
			const uintMax = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
			const assetAddress = this.getTokenAddress(this.accountAsset);
			const pTokenAddress = this.getFulcrumPositionTokenAddress(this.targetAsset, this.accountAsset, false, this.rate);
			const pToken = new ethers.Contract(pTokenAddress, fulcrumPositionTokenAbi, signer);
			const positionAmountNumber = new BigNumber(this.amount);
			const targetAssetPrice = prices[this.targetAsset];
			const accountAssetPrice = prices[this.accountAsset];
			const depositAmountNumber = positionAmountNumber.times(targetAssetPrice).div(accountAssetPrice).div(this.rate);
			const depositAmount = this.toLongAmount(depositAmountNumber, this.targetAsset);
			await this.checkAllowance(pTokenAddress, assetAddress, depositAmount);
			try {
				this.txStatus = 'mining';
				const tx = await pToken.mintWithToken(account, assetAddress, depositAmount, uintMax);
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
		getFulcrumPositionTokenAddress(targetAssetTicker, accountAssetTicker, isLong, rate) {
			const accountAssetTickerPrefix = accountAssetTicker == 'DAI' ? 'd' : 'u';
			const isLongTickerPrefix = isLong ? 'L' : 's';
			const rateSuffix = rate == '1' ? '' : `${rate}x`;
			const positionTokenTicker = `${accountAssetTickerPrefix}${isLongTickerPrefix}${targetAssetTicker}${rateSuffix}`;
			const positionTokenMap = {
				'dLETH2x': '0x4ef522f0de44946e3eea716fa071c12e89d30774',
				'dLETH3x': '0x19a5c979e96823a79f05d3e7658ddbc2d50bd326',
				'dLETH4x': '0x8efe972de7ee0441d1e01fb0c84ea900fd1770d0',
				'dLREP2x': '0xfd6c76546d93e6120eb6eaa266966f51330280c3',
				'dLREP3x': '0xaf16308808361b203d4ed521cdde6dd2e9b168f0',
				'dLREP4x': '0x240fe85447a878f51a74a5dc0b644b4a72587839',
				'dLWBTC2x': '0x9fe6854447bb39dc8b78960882831269f9e78408',
				'dLWBTC3x': '0x6d08b86002221dc2fe4e27170ff90e1b92de3254',
				'dLWBTC4x': '0x4f4d523c69a47c5c3ef06c53ec64801f11a884dd',
				'dLZRX2x': '0x1b7395d7d8b289a78920a87ce12160bacd304c51',
				'dLZRX3x': '0x2a93cbec0d134205c352d92d81bb7c4ec5ef4d4e',
				'dLZRX4x': '0xf85753fb0dc0a6c9b4f230eb861708677ac3c00f',
				'dsETH': '0x29838a8f16ea5d23df476f1b1dab62fce7883a6b',
				'dsETH2x': '0x840d872c6aced0dc5ccd72a7c7bf71496bbc6c40',
				'dsETH3x': '0x2c6b9bbb0b17cf86b687f418f1d34fa92d15f6fc',
				'dsETH4x': '0xe650c2aa677935fb10c5e09ffa9ad97d1fbc4e9f',
				'dsREP': '0xe33297b993c89a55806932138804b0dbb8d7ca1c',
				'dsREP2x': '0x44262a6a07256f0711f815451f2cd1a028a0a755',
				'dsREP3x': '0xec3de33967898c47ec8fbb162b939c7014bd0601',
				'dsREP4x': '0x66564d3bcec69c7fbefea185bd6b9faa57faebb9',
				'dsWBTC': '0x9fc208947d92b1588f7bde245620439568a8587a',
				'dsWBTC2x': '0x671c7886c61a18fc6e94893a791eaa069d70eba7',
				'dsWBTC3x': '0x849548f5d966017b6b49f6a3a740bbdb78176edb',
				'dsWBTC4x': '0x2fc9f52240f68ef0f178e1b896435d8f64a8dfaa',
				'dsZRX': '0xdf0d727742a8a9eacfc3305c687a0d21826dae7e',
				'dsZRX2x': '0xe18e1789b96fef7369095de1303c3acdcf03775a',
				'dsZRX3x': '0x48786d243897c581e88b598d4f786fb7169e08ac',
				'dsZRX4x': '0xb70ae77ff9ecf13baea9807618ec7236acf44bd1',
				'uLETH2x': '0x6368b095a4f4702bf1373a0a2ad029696a2e7695',
				'uLETH3x': '0x23187365195e7059fa413b33ab46a465173eb787',
				'uLETH4x': '0x1287969821f9160c1af516af0ff18db2903386ad',
				'uLREP2x': '0x187234e7a0c64dcef6176a534ef1e9e627d9adc8',
				'uLREP3x': '0xf4bff845c2dd28060cdeacbd21a91cb6d2e7dd4b',
				'uLREP4x': '0x092ed67828357afc65e8aec93d434b0217d1850a',
				'uLWBTC2x': '0xbd408612bacccbf14ff26ca0def859facc3673bd',
				'uLWBTC3x': '0x431e5f6f3368230b10b732cef68acff62a9727f0',
				'uLWBTC4x': '0x619732be53bdfb270ee889cf3dfe6fcee4171261',
				'uLZRX2x': '0x04b272a21d9a0f0ae0cae2015e9c909596b82a4d',
				'uLZRX3x': '0xb0ae52a539e681b9d0d489fe34aba7a88f981d2e',
				'uLZRX4x': '0x392b9fae896594586b4e6b080916c6872e74d44f',
				'usETH': '0x29b9723a3d88fe4a0b78134fd209433443a36b23',
				'usETH2x': '0x3263b85a9e52cdae86e9b1560e2e04fb357c42ac',
				'usETH3x': '0x18fab5aff3b3bb8afb0840861d831c228c1cb68f',
				'usETH4x': '0x0ebf28c5252124b898ecaa41a15ca40db9bf2bfc',
				'usREP': '0xdbb0965046e142b4306ac453c7700bf768d6ac33',
				'usREP2x': '0x9d94cafb3cc67c5efe660fc988c51abb711cb7ca',
				'usREP3x': '0x5ad7bbb48b852c1c798bdb99911cbd59a5bfacfe',
				'usREP4x': '0x7ee12fff0a8f975fca5193825c215612a0eb07b7',
				'usWBTC': '0x9dfc724c04f3ef1b9d539dcd0f8e4391a8b86fa1',
				'usWBTC2x': '0x734317817bcf7254e6728b5a448a981d57d0a4fa',
				'usWBTC3x': '0xf7f59e42eea2f2f4db6d54ca87d5a17111ae1a7f',
				'usWBTC4x': '0x319acbdb595867c1dc6ab9c5278ea937acdbec58',
				'usZRX': '0x43baf2ec0c4236b661a84fd40ec076546e3bb9fd',
				'usZRX2x': '0xcedf540d158eb62dfdcde8398c3037b54705bceb',
				'usZRX3x': '0x903214d3d3616d8dc5ccb3d40a435dca08f08010',
				'usZRX4x': '0xde37db4269c6dfd4c81b9a11400d1bcbeec06515',
			};
			const positionTokenAddress = positionTokenMap[positionTokenTicker];
			return positionTokenAddress;
		},
	},
	computed: {
		targetAssets() {
			return ['ETH', 'WBTC', 'ZRX', 'REP'];
		},
		accountAssets() {
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
