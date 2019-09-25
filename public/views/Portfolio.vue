<template>
	<div id="view">
		<div class="header">
			<h2>Assets</h2>
			<div v-if="account.auth">
				<button onclick="location.href='./send.html';">Send</button>
				<button onclick="location.href='./swap.html';" style="margin-left: 8px">Swap</button>
			</div>
		</div>
		<AssetList :balances="balances" :prices="prices" :tokens="tokens" :decimals="decimals" />

		<div class="header">
			<h2>Deposits</h2>
			<div v-if="account.auth">
				<button onclick="location.href='./deposit-new.html';">New deposit</button>
			</div>
		</div>
		<DepositList :balances="depositBalances" :rates="rates" :prices="prices" :tokens="tokens" :decimals="decimals" />

		<div class="header">
			<h2>Loans</h2>
			<div v-if="account.auth">
				<button onclick="location.href='./loan-new.html';">New loan</button>
			</div>
		</div>
		<LoanList :balances="loanBalances" :rates="rates" :prices="prices" :tokens="tokens" :decimals="decimals" />

		<div class="header">
			<h2>Funds</h2>
			<div v-if="account.auth">
				<button onclick="location.href='./fund-new.html';">New investment</button>
			</div>
		</div>
		<FundList :balances="fundBalances" :fundData="funds" :ethPrice="prices['ETH']" />
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';

import prices from '../data/prices.json';
import tokens from '../data/tokens.json';
import decimals from '../data/decimals.json';

import AssetList from '../components/AssetList.vue';
import DepositList from '../components/DepositList.vue';
import LoanList from '../components/LoanList.vue';
import FundList from '../components/FundList.vue';

export default {
	components: {
		AssetList,
		DepositList,
		LoanList,
		FundList,
	},
	data() {
		return {
			account: {
				address: '',
				auth: true,
			},
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
		const address = localStorage.getItem('address');
		const auth = localStorage.getItem('auth') == 'true';
		if (!address) {
			this.$router.push('/login');
			return;
		}
		this.account = {
			address,
			auth,
		};
		this.loadBalances();
		this.loadCompound();
		this.loadFulcrum();
		this.loadMelon();
	},
	methods: {
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
				if (!(ticker in this.prices)) {
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
						positions(first: 10) {
							token {
								symbol
								collateral {
									symbol
									supplyRate
									borrowRate
								}
								price
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
			const positions = data.userBalances[0].positions;
			for (const position of positions) {
				const ticker = position.token.symbol;
				const tokenBalance = position.balance;
				// Set balances
				if (!(ticker in this.loanBalances)) {
					Vue.set(this.loanBalances, ticker, {});
				}
				Vue.set(this.loanBalances[ticker], 'Fulcrum', tokenBalance);
				// Set rates
				const supplyRawRate = position.token.collateral.supplyRate;
				const borrowRawRate = position.token.collateral.borrowRate;
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
				// Set price and decimals
				const priceRaw = position.token.price;
				const priceRawNumber = new BigNumber(priceRaw);
				const priceNumber = priceRawNumber.div('1e18');
				const price = priceNumber.toString();
				Vue.set(this.prices, ticker, price);
				Vue.set(this.decimals, ticker, 18);
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
				const priceRaw = investment.fund.sharePrice;
				const priceRawNumber = new BigNumber(priceRaw);
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
	}
}
</script>
