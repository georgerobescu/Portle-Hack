<template>
	<div id="view" v-if="loan">
		<div id="label-type">Loan</div>
		<div id="label-platform">{{ loan.platform }}</div>
		<div id="amount">{{ formatBalance(loan.balance) }} {{ loan.ticker }}</div>
		<div id="rate">{{ formatRate(loan.rate) }} annual rate</div>
		<div id="value">{{ formatMoney(loan.value) }} @ {{ formatMoney(loan.price) }}/ETH</div>
		<div id="action-wrapper">
			<button class="action" @click="openLoan('borrow')">Borrow</button>
			<button class="action" @click="openLoan('repay')">Repay</button>
		</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import prices from '../../data/prices.json';
import tokens from '../../data/tokens.json';
import decimals from '../../data/decimals.json';

import bzxAbi from '../../data/abi/bzx.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);

export default {
	data() {
		return {
			account: undefined,
			platform: '',
			ticker: '',
			balance: 0,
			rate: 0,
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
			const bzxAddress = '0x1Cf226E9413AddaF22412A2E182F9C0dE44AF002';
			const bzx = new ethers.Contract(bzxAddress, bzxAbi, provider);
			const loans = await bzx.getBasicLoansData(this.account.address, 5);
			for (const loan of loans) {
				if (loan.orderHash == '0x0000000000000000000000000000000000000000000000000000000000000000') {
					break;
				}
				const tickers = {
					'0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359': 'DAI',
					'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
				};
				const ticker = tickers[loan.loanTokenAddress];
				if (this.ticker != ticker) {
					continue;
				}
				const loanAmount = loan.loanTokenAmountFilled.toString();
				// Set balances
				this.balance = loanAmount;
				// Set rates
				this.rate = 0.16;
			}
		}
	},
	computed: {
		loan() {
			if (this.balance == 0) {
				return;
			}
			const ticker = this.ticker;
			const platform = this.platform;
			const rate = this.rate;
			const loan = {
				platform,
				ticker,
				balance: this.getBalance(ticker),
				rate,
				price: prices[ticker],
				value: this.getValue(ticker),
			};
			return loan;
		},
		prices() {
			return prices;
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
	color: grey;
	font-size: 0.8em;
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
