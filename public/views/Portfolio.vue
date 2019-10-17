<template>
	<div id="view">
		<TotalBalance :assets="balances" :deposits="depositBalances" :loans="loanBalances" :funds="fundBalances" :fundData="funds"/>
		<div class="header">
			<h2>Assets</h2>
			<div v-if="account && account.auth">
				<button @click="openSend()">Send</button>
				<button @click="openSwap()" id="swap-button">Swap</button>
			</div>
		</div>
		<AssetList :balances="balances" :prices="prices" :tokens="tokens" :decimals="decimals" />

		<div class="header">
			<h2>Deposits</h2>
			<div v-if="account && account.auth">
				<button @click="openNewDeposit()">New deposit</button>
			</div>
		</div>
		<DepositList :balances="depositBalances" :rates="rates" :prices="prices" :tokens="tokens" :decimals="decimals" />

		<div class="header">
			<h2>Loans</h2>
			<div v-if="account && account.auth">
				<button @click="openNewLoan()">New loan</button>
			</div>
		</div>
		<LoanList :balances="loanBalances" :rates="rates" :prices="prices" :tokens="tokens" :decimals="decimals" />

		<div class="header">
			<h2>Funds</h2>
			<div v-if="account && account.auth">
				<button @click="openNewFund()">New investment</button>
			</div>
		</div>
		<FundList :balances="fundBalances" :fundData="funds" />

		<div class="header">
			<h2>Advanced</h2>
		</div>
		<button @click="openLeverage()">Leverage</button>
		<button @click="openCarryTrade()">Carry trade</button>
		<button @click="openDepositBridge()">Deposit bridge</button>
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import prices from '../data/prices.json';
import tokens from '../data/tokens.json';
import decimals from '../data/decimals.json';
import addresses from '../data/addresses.json';

import bzxAbi from '../data/abi/bzx.json';

import TotalBalance from '../components/TotalBalance.vue';
import AssetList from '../components/AssetList.vue';
import DepositList from '../components/DepositList.vue';
import LoanList from '../components/LoanList.vue';
import FundList from '../components/FundList.vue';

const provider = new ethers.providers.Web3Provider(window.ethereum);

export default {
	components: {
		TotalBalance,
		AssetList,
		DepositList,
		LoanList,
		FundList,
	},
	data() {
		return {
			account: undefined,
			balances: {},
			depositBalances: {},
			loanBalances: {},
			fundBalances: {
				'Melon': {},
			},
			rates: {
				'supply': {},
				'borrow': {},
			},
			funds: {
				'Melon': {},
			},
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
		this.loadBalances();
		this.loadCompound();
		this.loadFulcrum();
		this.loadTorque();
		this.loadMelon();
	},
	methods: {
		openSend() {
			const path = '/send';
			this.$router.push(path);
		},
		openSwap() {
			const path = `/swap`;
			this.$router.push(path);
		},
		openNewDeposit() {
			const path = '/deposit/new';
			this.$router.push(path);
		},
		openNewLoan() {
			const path = '/loan/new';
			this.$router.push(path);
		},
		openNewFund() {
			const path = '/fund/new';
			this.$router.push(path);
		},
		openLeverage() {
			const path = '/leverage';
			this.$router.push(path);
		},
		openCarryTrade() {
			const path = '/carry-trade';
			this.$router.push(path);
		},
		openDepositBridge() {
			const path = '/deposit-bridge';
			this.$router.push(path);
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
		async loadBalances() {
			const url = `https://api.ethplorer.io/getAddressInfo/${this.account.address}?apiKey=freekey`;
			const response = await fetch(url);
			const balance = await response.json();
			// ETH
			const etherBalance = balance.ETH.balance;
			const etherBalanceNumber = new BigNumber(etherBalance);
			const ten = new BigNumber(10);
			const etherMultiplier = ten.pow(18);
			const etherBalanceInWei = etherBalanceNumber.times(etherMultiplier);
			Vue.set(this.balances, 'ETH', etherBalanceInWei.toString());
			// ERC20
			if (!balance.tokens) {
				return;
			}
			for (const tokenData of balance.tokens) {
				const ticker = tokenData.tokenInfo.symbol;
				const address = tokenData.tokenInfo.address;
				if (!(ticker in this.prices)) {
					continue;
				}
				const tickerAddress = this.addresses[ticker].toLowerCase();
				if (address != tickerAddress) {
					continue;
				}
				Vue.set(this.balances, ticker, tokenData.balance);
			}
		},
		async loadCompound() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					userBalances(where: {
						id: "${this.account.address}"
					}) {
						balances(first: 10) {
							token {
								symbol
								supplyIndex
								borrowIndex
								supplyRate
								borrowRate
							}
							balance
						}
						loans(first: 10) {
							token {
								symbol
								supplyIndex
								borrowIndex
								supplyRate
								borrowRate
							}
							amount
							index
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
			if (data.userBalances.length == 0) {
				return;
			}
			const balances = data.userBalances[0].balances;
			for (const balance of balances) {
				const ticker = balance.token.symbol.substr(1);
				const supplyIndex = balance.token.supplyIndex;
				const tokenRawBalance = balance.balance;
				// Set balances
				if (!(ticker in this.depositBalances)) {
					Vue.set(this.depositBalances, ticker, {});
				}
				const tokenRawBalanceNumber = new BigNumber(tokenRawBalance);
				const tokenBalanceNumber = tokenRawBalanceNumber.times(supplyIndex).div('1e18');
				const tokenBalance = tokenBalanceNumber.toString();
				Vue.set(this.depositBalances[ticker], 'Compound', tokenBalance);
				// Set rates
				const supplyRawRate = balance.token.supplyRate;
				const borrowRawRate = balance.token.borrowRate;
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
			const loans = data.userBalances[0].loans;
			for (const loan of loans) {
				const ticker = loan.token.symbol.substr(1);
				const borrowIndex = loan.token.borrowIndex;
				const loanRawAmount = loan.amount;
				const loanIndex = loan.index;
				// Set balances
				if (!(ticker in this.loanBalances)) {
					Vue.set(this.loanBalances, ticker, {});
				}
				const loanRawAmountNumber = new BigNumber(loanRawAmount);
				const loanAmountNumber = loanRawAmountNumber.times(borrowIndex).div(loanIndex);
				const loanAmount = loanAmountNumber.toString();
				Vue.set(this.loanBalances[ticker], 'Compound', loanAmount);
				// Set rates
				const supplyRawRate = loan.token.supplyRate;
				const borrowRawRate = loan.token.borrowRate;
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
					userBalances(where: {
						id: "${this.account.address}"
					}) {
						balances(first: 10) {
							token {
								symbol
								index
								supplyRate
								borrowRate
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
			if (data.userBalances.length == 0) {
				return;
			}
			const balances = data.userBalances[0].balances;
			for (const balance of balances) {
				const ticker = balance.token.symbol.substr(1);
				const index = balance.token.index;
				const tokenRawBalance = balance.balance;
				// Set balances
				if (!(ticker in this.depositBalances)) {
					Vue.set(this.depositBalances, ticker, {});
				}
				const tokenRawBalanceNumber = new BigNumber(tokenRawBalance);
				const tokenBalanceNumber = tokenRawBalanceNumber.times(index).div('1e18');
				const tokenBalance = tokenBalanceNumber.toString();
				Vue.set(this.depositBalances[ticker], 'Fulcrum', tokenBalance);
				// Set rates
				const supplyRawRate = balance.token.supplyRate;
				const borrowRawRate = balance.token.borrowRate;
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
		async loadTorque() {
			const bzxAddress = '0x1Cf226E9413AddaF22412A2E182F9C0dE44AF002';
			const bzx = new ethers.Contract(bzxAddress, bzxAbi, provider);
			const loans = await bzx.getBasicLoansData(this.account.address, 5);
			for (const loan of loans) {
				if (loan.loanOrderHash == '0x0000000000000000000000000000000000000000000000000000000000000000') {
					break;
				}
				const tickers = {
					'0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359': 'DAI',
					'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
				};
				const ticker = tickers[loan.loanTokenAddress];
				const loanAmount = loan.loanTokenAmountFilled.toString();
				// Set balances
				if (!(ticker in this.loanBalances)) {
					Vue.set(this.loanBalances, ticker, {});
				}
				Vue.set(this.loanBalances[ticker], 'Torque', loanAmount);
				// Set rates
				if (!(ticker in this.rates.borrow)) {
					Vue.set(this.rates.borrow, ticker, {});
				}
				Vue.set(this.rates.borrow[ticker], 'Torque', 0.16);
			}
		},
		async loadMelon() {
			const url = "https://api.thegraph.com/subgraphs/name/melonproject/melon";
			const query = `
				query {
					investments(where: {
						owner: "${this.account.address}"
					}) {
						fund {
							name
							sharePrice
						}
						shares
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
			const investments = data.investments;
			for (const investment of investments) {
				const balance = investment.shares;
				const name = investment.fund.name;
				const ethPriceRaw = investment.fund.sharePrice;
				const ethPriceRawNumber = new BigNumber(ethPriceRaw);
				const priceRawNumber = ethPriceRawNumber.times(prices['ETH']);
				const priceNumber = priceRawNumber.div('1e18');
				const price = priceNumber.toString();
				const roi = 1; // TODO
				const fund = {
					price,
					roi,
				};
				Vue.set(this.fundBalances['Melon'], name, balance);
				Vue.set(this.funds['Melon'], name, fund);
			}
		}
	},
	computed: {
		prices() {
			return prices;
		},
		tokens() {
			return tokens;
		},
		decimals() {
			return decimals;
		},
		addresses() {
			return addresses;
		},
	}
}
</script>

<style scoped>
#swap-button {
	margin-left: 8px;
}
</style>
