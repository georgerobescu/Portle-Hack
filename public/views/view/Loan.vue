<template>
	<div id="view" v-if="loan">
		<div id="label-type">Loan</div>
		<div id="label-platform">{{ loan.platform }}</div>
		<div id="amount">{{ formatBalance(loan.balance) }} {{ loan.ticker }}</div>
		<div id="rate">{{ formatRate(loan.rate) }} annual rate</div>
		<div id="value">{{ formatMoney(loan.value) }} @ {{ formatMoney(loan.price) }}/{{ loan.ticker }}</div>
		<div id="action-wrapper" v-if="account && account.auth">
			<button class="action" @click="openLoan('borrow')">Borrow</button>
			<button class="action" @click="openLoan('repay')">Repay</button>
		</div>
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import tokens from '../../data/tokens.json';
import decimals from '../../data/decimals.json';
import currencyIds from '../../data/currency-ids.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);

export default {
	data() {
		return {
			account: undefined,
			platform: '',
			ticker: '',
			balance: 0,
			rate: 0,
			prices: {},
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
		this.platform = this.$route.params.platform;
		this.ticker = this.$route.params.ticker;
		this.loadPrices();
		this.loadLoan();
	},
	methods: {
		openLoan(action) {
			const path = '/loan/new';
			this.$router.state = {
				assetTicker: this.ticker,
				platformName: this.platform,
				action,
			};
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
		loadLoan() {
			if (this.platform == 'Compound') {
				this._loadCompoundLoan();
			}
			if (this.platform == 'Torque') {
				this._loadTorqueLoan();
			}
		},
		getBalance(ticker) {
			const decimals = this.decimals[ticker];
			const balanceNumber = new BigNumber(this.balance);
			const ten = new BigNumber(10);
			const decimalNumber = ten.pow(decimals);
			const shortBalance = balanceNumber.div(decimalNumber);
			return shortBalance;
		},
		getValue(ticker) {
			const price = this.prices[ticker];
			const priceNumber = new BigNumber(price);
			const balance = this.getBalance(ticker);
			const value = priceNumber.times(balance);
			return value;
		},
		formatBalance(balance) {
			return `${balance.toFixed(2)}`;
		},
		formatMoney(price) {
			return `$${price.toFixed(2)}`;
		},
		formatRate(rateString) {
			const rate = parseFloat(rateString);
			return `${(rate * 100).toFixed(2)}%`;
		},
		async _loadCompoundLoan() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					userBalances(where: {
						id: "${this.account.address}"
					}) {
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
			const loans = data.userBalances[0].loans;
			for (const loan of loans) {
				const ticker = loan.token.symbol.substr(1);
				if (this.ticker != ticker) {
					continue;
				}
				const borrowIndex = loan.token.borrowIndex;
				const loanRawAmount = loan.amount;
				const loanIndex = loan.index;
				// Set balances
				const loanRawAmountNumber = new BigNumber(loanRawAmount);
				const loanAmountNumber = loanRawAmountNumber.times(borrowIndex).div(loanIndex);
				const loanAmount = loanAmountNumber.toString();
				this.balance = loanAmount;
				// Set rates
				const borrowRawRate = loan.token.borrowRate;
				const borrowRawRateNumber = new BigNumber(borrowRawRate);
				const borrowRateNumber = borrowRawRateNumber.times('2102400').div('1e18');
				const borrowRate = borrowRateNumber.toString();
				this.rate = borrowRate;
			}
		},
		async _loadTorqueLoan() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/torque";
			const query = `
				query {
					users(where: {
						id: "${this.account.address}"
					}) {
						loans {
							token {
								symbol
							}
							amount
							interestRate
							timestamp
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
			if (data.users.length == 0) {
				return;
			}
			const loans = data.users[0].loans;
			for (const loan of loans) {
				const ticker = loan.token.symbol.substr(1);
				if (this.ticker != ticker) {
					continue;
				}
				const timestamp = loan.timestamp;
				const interestRate = loan.interestRate;
				const loanRawAmount = loan.amount;
				// Set rates
				const borrowRawRateNumber = new BigNumber(interestRate);
				const borrowRateNumber = borrowRawRateNumber.div('1e20');
				const borrowRate = borrowRateNumber.toString();
				this.rate = borrowRate;
				// Set balances
				const loanRawAmountNumber = new BigNumber(loanRawAmount);
				const dailyOwedNumber = loanRawAmountNumber.times(borrowRateNumber).div(365.25);
				const fullTerm = 7884000;
				const currentTerm = Date.now() / 1000 - timestamp;
				const daysLeft = (fullTerm - currentTerm) / 60 / 60 / 24;
				const loanAmountNumber = loanRawAmountNumber.minus(dailyOwedNumber.times(daysLeft));
				const loanAmount = loanAmountNumber.toString();
				this.balance = loanAmount;
			}
		},
	},
	computed: {
		loan() {
			if (this.balance == 0) {
				return;
			}
			const ticker = this.ticker;
			const platform = this.platform;
			const rate = this.rate;
			const price = this.prices[ticker];
			if (!price) {
				return;
			}
			const loan = {
				platform,
				ticker,
				balance: this.getBalance(ticker),
				rate,
				price,
				value: this.getValue(ticker),
			};
			return loan;
		},
		tokens() {
			return tokens;
		},
		decimals() {
			return decimals;
		},
	},
}
</script>

<style scoped>
#view {
	display: flex;
	flex-direction: column;
	align-items: center;
}

#label-type {
	margin-top: 1em;
	padding: 0.25em 0.5em;
	color: grey;
	font-size: 0.8em;
	border: 1px solid gray;
}

#label-platform {
	margin-top: 2em;
}

#amount {
	font-size: 3em;
	font-weight: bold;
}

#value,
#rate {
	font-size: 1.15em;
}

#action-wrapper {
	margin-top: 3em;
}
</style>
