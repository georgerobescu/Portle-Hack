<template>
	<div>
		<div id="picker-wrapper">
			Repay
			<span class="input-group">
				<Picker :value="loanAsset" :list="loanAssets" :onSelect="loanAssetSelected" class="inline"/>
			</span>
			loan with
			<span class="input-group">
				<Picker :value="repayAsset" :list="repayAssets" :onSelect="repayAssetSelected" class="inline"/>
			</span>
			on using
			<span class="input-group">
				<Picker :value="platform" :list="platforms" :onSelect="platformSelected" class="inline"/>
			</span>
		</div>
		<div id="amount-picker-wrapper">
			<span class="input-group">
				<span class="label">Amount</span>
				<input class="amount" v-model="amount" @input="amountUpdated()">
				<span class="label label-ghost label-right inline">{{ repayAsset }}</span>
			</span>
		</div>
		<div id="repay-amount-wrapper">
			{{ repayAmount }} {{ loanAsset }} will be repaid on {{ platform }}.
		</div>
		<div id="button-wrapper">
			<button class="primary big" @click="repay()">Repay</button>
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
import kyberOracleAbi from '../../../data/abi/kyberOracle.json';
import kyberProxyAbi from '../../../data/abi/kyberProxy.json';
import compoundTokenAbi from '../../../data/abi/compoundToken.json';
import addresses from '../../../data/addresses.json';
import decimals from '../../../data/decimals.json';

const kyberOracleAddress = '0xFd9304Db24009694c680885e6aa0166C639727D6';
const kyberProxyAddress = '0x818e6fecd516ecc3849daf6845e3ec868087b755';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const slippage = 0.01;

export default {
	components: {
		Picker,
		TxStatus,
	},
	data() {
		return {
			account: undefined,
			txStatus: 'none',
			loanAsset: 'DAI',
			repayAsset: 'ETH',
			platform: 'Compound',
			amount: '1',
			repayAmount: '0',
			tokenAddresses: {
				Compound: {},
			},
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
		this.loadKyberPrice();
		this.loadCompound();
	},
	methods: {
		loanAssetSelected(loanAsset) {
			this.loanAsset = loanAsset;
		},
		repayAssetSelected(repayAsset) {
			this.repayAsset = repayAsset;
		},
		platformSelected(platform) {
			this.platform = platform;
		},
		amountUpdated() {
			this.loadKyberPrice();
		},
		hideStatus() {
			this.txStatus = 'none';
		},
		async repay() {
			await this.sellRepayAsset();
			if (this.platform == 'Compound') {
				await this.repayCompound();
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
		async loadKyberPrice() {
			const inputAddress = this.getTokenAddress(this.repayAsset);
			const outputAddress = this.getTokenAddress(this.loanAsset);
			const kyberOracle = new ethers.Contract(kyberOracleAddress, kyberOracleAbi, provider);
			const inputAmount = this.toLongAmount(this.amount, this.repayAsset);
			const outputAmount = await kyberOracle.getOutputAmount(inputAddress, outputAddress, inputAmount);
			const repayAmount = this.toShortAmount(outputAmount, this.loanAsset);
			this.repayAmount = (parseFloat(repayAmount) * (1 - slippage)).toFixed(2);
		},
		async loadCompound() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					tokens {
						symbol
						address
						borrowRate
						supplyIndex
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
				const rawRate = token.borrowRate;
				const index = token.supplyIndex;
				const rawRateNumber = new BigNumber(rawRate);
				const rateNumber = rawRateNumber.times('2102400').div('1e18');
				const rate = rateNumber.toString();
				Vue.set(this.tokenAddresses['Compound'], ticker, address);
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
		async sellRepayAsset() {
			const one = new BigNumber(1);
			const amount = new BigNumber(this.amount);
			const repayAmount = new BigNumber(this.repayAmount);
			const rate = repayAmount.div(amount).times(1 - slippage);
			const conversionRate = this.toLongAmount(rate, 'ETH');
			const kyberProxy = new ethers.Contract(kyberProxyAddress, kyberProxyAbi, signer);
			if (this.repayAsset == 'ETH') {
				// Eth to token
				const outputAddress = this.getTokenAddress(this.loanAsset);
				const value = this.toLongAmount(this.amount, 'ETH');
				const valueNumber = new BigNumber(value);
				const options = {
					value: '0x' + valueNumber.toString(16),
				};
				try {
					this.txStatus = 'mining';
					const tx = await kyberProxy.swapEtherToToken(outputAddress, conversionRate, options);
					const txReceipt = await provider.getTransactionReceipt(tx.hash);
					if (txReceipt.status == 1) {
						this.txStatus = 'success';
					} else {
						this.txStatus = 'failure';
					}
				} catch(e) {
					console.log(1, e);
					this.txStatus = 'rejected';
				}
			} else {
				// Token to token
				const inputAddress = this.getTokenAddress(this.repayAsset);
				const inputAmount = this.toLongAmount(this.amount, this.repayAsset);
				const outputAddress = this.getTokenAddress(this.loanAsset);
				await this.checkAllowance(kyberProxyAddress, inputAddress, inputAmount);
				try {
					this.txStatus = 'mining';
					const tx = await kyberProxy.swapTokenToToken(inputAddress, inputAmount, outputAddress, conversionRate);
					const txReceipt = await provider.getTransactionReceipt(tx.hash);
					if (txReceipt.status == 1) {
						this.txStatus = 'success';
					} else {
						this.txStatus = 'failure';
					}
				} catch(e) {
					console.log(2, e);
					this.txStatus = 'rejected';
				}
			}
		},
		async repayCompound() {
			const assetAddress = addresses[this.loanAsset];
			const cTokenAddress = this.tokenAddresses['Compound'][this.loanAsset];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const repayAmount = this.toLongAmount(this.repayAmount, this.loanAsset);
			try {
				this.txStatus = 'mining';
				const options = {
					value: '0x' + repayAmount.toString(16),
				};
				const tx = this.loanAsset == 'ETH'
					? await cToken.repayBorrow(options)
					: await cToken.repayBorrow(repayAmount);
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
		getTokenAddress(ticker) {
			if (ticker == 'ETH') {
				return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
			}
			return addresses[ticker];
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
	},
	computed: {
		loanAssets() {
			return ['DAI', 'USDC'];
		},
		repayAssets() {
			return ['ETH', 'WBTC', 'ZRX', 'REP'];
		},
		platforms() {
			return ['Compound'];
		},
	},
}
</script>

<style scoped>
#picker-wrapper {
	margin-top: 2em;
}

#amount-picker-wrapper {
	margin-top: 2em;
}

#repay-amount-wrapper {
	margin-top: 1em;
}

#button-wrapper {
	margin-top: 1em;
}
</style>
