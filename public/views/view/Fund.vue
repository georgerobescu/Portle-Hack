<template>
	<div id="view" v-if="fund">
		<div id="label-type">Melon Fund</div>
		<div id="label-name">{{ fund.name }}</div>
		<div id="amount">{{ formatBalance(fund.balance) }} shares</div>
		<div id="value">{{ formatMoney(fund.value) }} @ {{ formatMoney(fund.price) }}/share</div>
		<div id="action-wrapper">
			<button class="action" @click="openFund('invest')">Invest</button>
			<button class="action" @click="openFund('redeem')">Redeem</button>
		</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';

export default {
	data() {
		return {
			account: undefined,
			name: '',
			price: 0,
			balance: 0,
			ethPrice: 0,
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
		this.name = this.$route.params.name;
		this.loadEthPrice();
		this.loadFund();
	},
	methods: {
		openFund(action) {
			const path = '/fund/new';
			this.$router.state = {
				fundName: this.name,
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
		async loadEthPrice() {
			const url = `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`;
 			const response = await fetch(url);
			const prices = await response.json();
			this.ethPrice = prices.ethereum.usd;;
		},
		async loadFund() {
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
				const ethPrice = this.ethPrice;
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
	padding: 0.25em 0.5em;
	color: grey;
	font-size: 0.8em;
	border: 1px solid gray;
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

#action-wrapper {
	margin-top: 3em;
}
</style>
