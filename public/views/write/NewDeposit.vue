<template>
	<div>
		<h2>Manage deposits</h2>
		<div>
			<div class="list">
				<div v-for="asset in assets" class="asset-selector" :class="{ 'selected': asset == assetTicker }" @click="selectAsset(asset)">
					{{ asset }}
				</div>
			</div>
		</div>
		<div>
			<div class="list">
				<div v-for="platform in platforms" class="app-selector" :class="{ 'selected': platform == platformName }" @click="selectPlatform(platform)">
					<div>{{ platform }}</div>
					<div>{{ formatRate(rates[platform][assetTicker]) }}</div>
				</div>
			</div>
		</div>
		<div id="action-selector-wrapper">
			<span class="action-selector" @click="selectAction('deposit')" :class="{ 'selected': action == 'deposit' }">Deposit</span>
			<span class="action-selector" @click="selectAction('withdraw')" :class="{ 'selected': action == 'withdraw' }">Withdraw</span>
		</div>
		<div id="amount-wrapper">
			<span class="input-group">
				<span class="max-label" @click="setMax()">MAX</span>
				<input class="amount" v-model="assetAmount">
				<span class="label label-ghost label-right inline">{{ assetTicker }}</span>
			</span>
		</div>
		<!-- <div id="badge-wrapper">
			<span class="badge badge-info">
				You are depositing {{ assetAmount }} {{ assetTicker }} to {{ platformName }}.
			</span>
		</div> -->
		<div id="button-wrapper">
			<button class="primary big" @click="deposit()" v-if="action == 'deposit'">Deposit</button>
			<button class="primary big" @click="withdraw()" v-if="action == 'withdraw'">Withdraw</button>
		</div>
		<TxStatus :status="txStatus" :onHidden="hideStatus"/>
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import TxStatus from '../../components/TxStatus.vue';

import erc20Abi from '../../data/abi/erc20.json';
import compoundTokenAbi from '../../data/abi/compoundToken.json';
import fulcrumTokenAbi from '../../data/abi/fulcrumToken.json';
import decimals from '../../data/decimals.json';
import addresses from '../../data/addresses.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

export default {
	components: {
		TxStatus,
	},
	data() {
		return {
			account: undefined,
			assetTicker: 'DAI',
			assetAmount: '100',
			platformName: 'Compound',
			action: 'deposit',
			rates: {
				'Compound': {},
				'Fulcrum': {},
			},
			indices: {
				'Compound': {},
				'Fulcrum': {},
			},
			tokenAddresses: {
				'Compound': {},
				'Fulcrum': {},
			},
			balances: {
				'Compound': {},
				'Fulcrum': {},
			},
			txStatus: 'none',
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
		this.loadRouterState();
		this.loadCompound();
		this.loadFulcrum();
	},
	methods: {
		selectAsset(asset) {
			this.assetTicker = asset;
		},
		selectPlatform(platform) {
			this.platformName = platform;
		},
		selectAction(action) {
			this.action = action;
		},
		deposit() {
			if (this.platformName == 'Compound') {
				this.depositCompound();
			} else  {
				this.depositFulcrum();
			}
		},
		withdraw() {
			if (this.platformName == 'Compound') {
				this.withdrawCompound();
			} else  {
				this.withdrawFulcrum();
			}
		},
		loadAccount() {
			const address = localStorage.getItem('address');
			const auth = localStorage.getItem('auth') == 'true';
			if (!address || !auth) {
				return;
			}
			this.account = {
				address,
				auth,
			};
		},
		loadRouterState() {
			const routerState = this.$router.state;
			if (routerState) {
				if (routerState.assetTicker) {
					this.assetTicker = routerState.assetTicker;
				}
				if (routerState.platformName) {
					this.platformName = routerState.platformName;
				}
				if (routerState.action) {
					this.action = routerState.action;
				}
			}
		},
		async depositCompound() {
			const assetAddress = addresses[this.assetTicker];
			const cTokenAddress = this.tokenAddresses['Compound'][this.assetTicker];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const mintAmount = this.toLongAmount(this.assetAmount, this.assetTicker);
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
			const assetAddress = addresses[this.assetTicker];
			const iTokenAddress = this.tokenAddresses['Fulcrum'][this.assetTicker];
			const iToken = new ethers.Contract(iTokenAddress, fulcrumTokenAbi, signer);
			const account = this.account.address;
			const mintAmount = this.toLongAmount(this.assetAmount, this.assetTicker);
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
			const assetAddress = addresses[this.assetTicker];
			const index = this.indices['Compound'][this.assetTicker];
			const redeemAmount = this.toLongAmount(this.assetAmount, this.assetTicker);
			const redeemAmountNumber = new BigNumber(redeemAmount);
			const tokenAmountNumber = redeemAmountNumber.times('1e18').div(index);
			const tokenAmount = tokenAmountNumber.toFixed(0);
			const cTokenAddress = this.tokenAddresses['Compound'][this.assetTicker];
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
			const assetAddress = addresses[this.assetTicker];
			const index = this.indices['Fulcrum'][this.assetTicker];
			const burnAmount = this.toLongAmount(this.assetAmount, this.assetTicker);
			const burnAmountNumber = new BigNumber(burnAmount);
			const tokenAmountNumber = burnAmountNumber.times('1e18').div(index);
			const tokenAmount = tokenAmountNumber.toFixed(0);
			const iTokenAddress = this.tokenAddresses['Fulcrum'][this.assetTicker];
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
		async hideStatus() {
			this.txStatus = 'none';
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
			const account = this.account.address;
			if (this.assetTicker == 'ETH') {
				const etherBalance = await provider.getBalance(account);
				const assetAmount = this.toShortAmount(etherBalance.toString(), this.assetTicker);
				this.assetAmount = assetAmount;
			} else {
				const inputAddress = addresses[this.assetTicker];
				const inputToken = new ethers.Contract(inputAddress, erc20Abi, provider);
				const inputTokenBalance = await inputToken.balanceOf(account);
				const assetAmount = this.toShortAmount(inputTokenBalance.toString(), this.assetTicker);
				this.assetAmount = assetAmount;
			}
		},
		formatRate(rateString) {
			if (!rateString) {
				return 'Loading…';
			}
			const rate = new BigNumber(rateString);
			return `${rate.times(100).toFixed(2)}%`;
		}
	},
	computed: {
		assets() {
			return [ 'DAI', 'USDC' ];
		},
		platforms() {
			return [ 'Compound', 'Fulcrum' ];
		},
	},
}
</script>

<style scoped>
#action-selector-wrapper {
	margin-top: 0.5em;
}

#amount-wrapper {
	margin-top: 3em;
}

#badge-wrapper {
	margin-top: 2em;
}

#button-wrapper {
	margin-top: 1em;
}

.list {
	display: flex;
}

.inline {
	display: inline-block;
}
</style>
