<template>
	<div id="view" v-if="fund">
		<div id="label-type">Melon Fund</div>
		<div id="label-name">{{ fund.name }}</div>
		<div id="amount">{{ formatBalance(fund.balance) }} shares</div>
		<div id="value">{{ formatMoney(fund.value) }} @ {{ formatMoney(fund.price) }}/ETH</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';

import prices from '../../data/prices.json';

export default {
	data() {
		return {
			name: '',
			price: 0,
			balance: 0,
			ethPrice: 0,
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
		this.name = this.$route.params.name;
		this.loanFund();
	},
	methods: {
		async loanFund() {
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
				const name = investment.fund.name;
				if (this.name != name) {
					continue;
				}
				// Save balance
				const balance = investment.shares;
				this.balance = balance;
				// Save price
				const ethPrice = prices['ETH'];
				const priceInEthRaw = investment.fund.sharePrice;
				const priceInEthRawNumber = new BigNumber(priceInEthRaw);
				const priceInEthNumber = priceInEthRawNumber.div('1e18');
				const priceNumber = priceInEthNumber.times(ethPrice);
				const price = priceNumber.toString();
				this.price = price;
			}
		},
		getBalance() {
			const balanceNumber = new BigNumber(this.balance);
			const ten = new BigNumber(10);
			const decimalNumber = ten.pow(18);
			const shortBalance = balanceNumber.div(decimalNumber);
			return shortBalance;
		},
		getValue(price) {
			const priceNumber = new BigNumber(price);
			const balance = this.getBalance();
			const value = priceNumber.times(balance);
			return value;
		},
		formatBalance(balance) {
			return `${balance.toFixed(2)}`;
		},
		formatMoney(price) {
			const priceNumber = new BigNumber(price);
			return `$${priceNumber.toFixed(2)}`;
		},
	},
	computed: {
		fund() {
			if (!this.name) {
				return;
			}
			const price = this.price;
			const asset = {
				name: this.name,
				balance: this.getBalance(),
				price,
				value: this.getValue(price),
			};
			return asset;
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

#label-name {
	margin-top: 2em;
}

#amount {
	font-size: 3em;
	font-weight: bold;
}

#value {
	font-size: 1.15em;
}
</style>
