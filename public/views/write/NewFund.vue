<template>
	<div>
		<h2>Manage funds</h2>
		<div>
			<div class="list">
				<div v-for="fund in funds" class="fund-selector" :class="{ 'selected': fund.name == fundName }" @click="selectFund(fund)">
					<div>{{ fund.name }}</div>
					<div>{{ formatMarketCap(fund.marketCap) }}</div>
				</div>
			</div>
		</div>
		<div id="action-selector-wrapper">
			<span class="action-selector" @click="selectAction('invest')" :class="{ 'selected': action == 'invest' }">Invest</span>
			<span class="action-selector" @click="selectAction('redeem')" :class="{ 'selected': action == 'redeem' }">Redeem</span>
		</div>
		<div id="amount-wrapper">
			<span class="input-group">
				<span class="max-label" @click="setMax()">MAX</span>
				<input class="amount" v-model="amount">
				<span class="label label-ghost label-right inline">WETH</span>
			</span>
		</div>
		<!-- <div id="badge-wrapper">
			<span class="badge badge-info">
				You are depositing {{ assetAmount }} {{ assetTicker }} to {{ platformName }}.
			</span>
		</div> -->
		<div id="button-wrapper">
			<button class="primary big" @click="invest()" v-if="action == 'invest'">Invest</button>
			<button class="primary big" @click="redeem()" v-if="action == 'redeem'">Redeem</button>
		</div>
		<TxStatus :status="txStatus" :onHidden="hideStatus"/>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import TxStatus from '../../components/TxStatus.vue';

import erc20Abi from '../../data/abi/erc20.json';
import melonFundAbi from '../../data/abi/melonFund.json';
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
			fundName: '',
			amount: '1',
			action: 'invest',
			funds: [],
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
		this.loadFunds();
	},
	methods: {
		selectFund(fund) {
			this.fundName = fund.name;
		},
		selectAction(action) {
			this.action = action;
		},
		async setMax() {
			const account = this.account.address;
			const inputAddress = addresses['WETH'];
			const inputToken = new ethers.Contract(inputAddress, erc20Abi, provider);
			const inputTokenBalance = await inputToken.balanceOf(account);
			const amount = this.toShortAmount(inputTokenBalance.toString(), 'WETH');
			this.amount = amount;
		},
		async invest() {
			const wethAddress = addresses['WETH'];
			let fundAddress = '';
			for (const fund of this.funds) {
				if (fund.name == this.fundName) {
					fundAddress = fund.address;
				}
			}
			if (!fundAddress) {
				return;
			}
			const fund = new ethers.Contract(fundAddress, melonFundAbi, signer);
			const investmentAmount = this.toLongAmount(this.amount, 'WETH');
			await this.checkAllowance(fundAddress, wethAddress, investmentAmount);
			try {
				this.txStatus = 'mining';
				const value = this.toLongAmount(0.015, 'ETH');
				const valueNumber = new BigNumber(value);
				const options = {
					value: '0x' + valueNumber.toString(16),
				};
				const tx = await fund.requestInvestment(investmentAmount, investmentAmount, wethAddress, options);
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
		async redeem() {

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
				if (routerState.fundName) {
					this.fundName = routerState.fundName;
				}
				if (routerState.action) {
					this.action = routerState.action;
				}
			}
		},
		async loadFunds() {
			const url = "https://api.thegraph.com/subgraphs/name/melonproject/melon";
			const query = `
				query {
					funds(
						first: 3, 
						orderBy: nav, 
						orderDirection: desc,
						where: {
							isShutdown: false,
						}
					) {
						name
						nav
						sharePrice
						participation {
							id
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
			const funds = data.funds;
			for (const fund of funds) {
				const melonFund = {
					name: fund.name,
					marketCap: fund.nav,
					sharePrice: fund.sharePrice,
					address: fund.participation.id,
				};
				this.funds.push(melonFund);
			}
			this.fundName = this.funds[0].name;
		},
		async hideStatus() {
			this.txStatus = 'none';
		},
		formatMarketCap(marketCapString) {
			const marketCap = new BigNumber(marketCapString);
			const shortMarketCap = marketCap.div('1e18');
			return `${shortMarketCap.toFixed(2)} ETH`;
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

.fund-selector {
	width: 120px;
	margin: 0.5em 1em 0.5em 0;
	padding: 0.5em 1em;
	cursor: pointer;
	font-size: 20px;
	color: grey;
	background: white;
	border: 2px solid #d3d3d3;
}

.fund-selector:hover {
	color: #282821;
}

.fund-selector.selected {
	color: #282821;
	border-color: #efb22d;
}
</style>
