<template>
	<div id="view" v-if="deposit">
		<div id="label-type">Deposit</div>
		<div id="label-platform">{{ deposit.platform }}</div>
		<div id="amount">{{ formatBalance(deposit.balance) }} {{ deposit.ticker }}</div>
		<div id="rate">{{ formatRate(deposit.rate) }} annual rate</div>
		<div id="value">{{ formatMoney(deposit.value) }} @ {{ formatMoney(deposit.price) }}/ETH</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';

import prices from '../../data/prices.json';
import tokens from '../../data/tokens.json';
import decimals from '../../data/decimals.json';

export default {
	data() {
		return {
			platform: '',
			ticker: '',
			balance: 0,
			rate: 0,
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
		this.platform = this.$route.params.platform;
		this.ticker = this.$route.params.ticker;
		this.loadDeposit();
	},
	methods: {
		loadDeposit() {
			if (this.platform == 'Compound') {
				this._loadCompoundDeposit();
			}
			if (this.platform == 'Fulcrum') {
				this._loadFulcrumDeposit();
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
		async _loadCompoundDeposit() {
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
				if (this.ticker != ticker) {
					continue;
				}
				const supplyIndex = balance.token.supplyIndex;
				const tokenRawBalance = balance.balance;
				// Set balance
				const tokenRawBalanceNumber = new BigNumber(tokenRawBalance);
				const tokenBalanceNumber = tokenRawBalanceNumber.times(supplyIndex).div('1e18');
				const tokenBalance = tokenBalanceNumber.toString();
				this.balance = tokenBalance;
				// Set rate
				const rawRate = balance.token.supplyRate;
				const rawRateNumber = new BigNumber(rawRate);
				const rateNumber = rawRateNumber.times('2102400').div('1e18');
				const rate = rateNumber.toString();
				this.rate = rate;
			}
		},
		async _loadFulcrumDeposit() {
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
				if (this.ticker != ticker) {
					continue;
				}
				const index = balance.token.index;
				const tokenRawBalance = balance.balance;
				// Set balance
				const tokenRawBalanceNumber = new BigNumber(tokenRawBalance);
				const tokenBalanceNumber = tokenRawBalanceNumber.times(index).div('1e18');
				const tokenBalance = tokenBalanceNumber.toString();
				this.balance = tokenBalance;
				// Set rate
				const rawRate = balance.token.supplyRate;
				const rawRateNumber = new BigNumber(rawRate);
				const rateNumber = rawRateNumber.div('1e18').div('1e2');
				const rate = rateNumber.toString();
				this.rate = rate;
			}
		}
	},
	computed: {
		deposit() {
			if (this.balance == 0) {
				return;
			}
			const ticker = this.ticker;
			const platform = this.platform;
			const rate = this.rate;
			const asset = {
				platform,
				ticker,
				balance: this.getBalance(ticker),
				rate,
				price: prices[ticker],
				value: this.getValue(ticker),
			};
			return asset;
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
</style>
