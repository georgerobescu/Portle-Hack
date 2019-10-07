<template>
	<div id="view" v-if="asset">
		<div id="label-type">Asset</div>
		<div id="label-name">{{ asset.name }}</div>
		<div id="amount">{{ formatBalance(asset.balance) }} {{ asset.ticker }}</div>
		<div id="value">{{ formatMoney(asset.value) }} @ {{ formatMoney(asset.price) }}/ETH</div>
		<div id="action-wrapper">
			<button class="action" @click="openSwap()">Swap</button>
			<button class="action" @click="openSend()">Send</button>
		</div>
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
			account: undefined,
			ticker: '',
			balance: 0,
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
		this.ticker = this.$route.params.ticker;
		this.loadBalance();
	},
	methods: {
		openSend() {
			const path = '/send';
			this.$router.state = {
				asset: this.ticker,
			};
			this.$router.push(path);
		},
		openSwap() {
			const path = `/swap`;
			this.$router.state = {
				inputAsset: this.ticker,
			};
			this.$router.push(path);
		},
		async loadBalance() {
			const url = `https://api.ethplorer.io/getAddressInfo/${this.account.address}?apiKey=freekey`;
			const response = await fetch(url);
			const balance = await response.json();
			if (this.ticker == 'ETH') {
				// ETH
				const etherBalance = balance.ETH.balance;
				const etherBalanceNumber = new BigNumber(etherBalance);
				const ten = new BigNumber(10);
				const etherMultiplier = ten.pow(18);
				const etherBalanceInWei = etherBalanceNumber.times(etherMultiplier);
				this.balance = etherBalanceInWei.toString()
				return;
			}
			// ERC20
			if (!balance.tokens) {
				return;
			}
			for (const tokenData of balance.tokens) {
				const ticker = tokenData.tokenInfo.symbol;
				if (ticker == this.ticker) {
					this.balance = tokenData.balance;
				}
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
	},
	computed: {
		asset() {
			if (!this.ticker) {
				return;
			}
			const ticker = this.ticker;
			const asset = {
				name: this.tokens[ticker],
				ticker,
				balance: this.getBalance(ticker),
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
