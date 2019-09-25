<template>
	<div id="list">
		<div class="card" v-for="asset in assets" v-if="asset.value.gt(1)" @click="openAsset(asset)">
			<div class="balance">{{ formatBalance(asset.balance) }} {{ asset.ticker }}</div>
			<div class="title">{{ asset.title }}</div>
			<div class="value sparse">
				<div>{{ formatMoney(asset.price) }}</div>
				<div>{{ formatMoney(asset.value)}}</div>
			</div>
		</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';

export default {
	props: [ 'balances', 'prices', 'tokens', 'decimals' ],
	methods: {
		openAsset(asset) {
			const path = `/asset/${asset.ticker}`;
			this.$router.push(path);
		},
		getBalance(ticker) {
			const balance = this.balances[ticker];
			const decimals = this.decimals[ticker];
			const balanceNumber = new BigNumber(balance);
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
		assets() {
			const assets = [];
			for (const ticker in this.tokens) {
				const asset = {
					ticker,
					title: this.tokens[ticker],
					balance: new BigNumber(this.getBalance(ticker)),
					price: new BigNumber(this.prices[ticker]),
					value: new BigNumber(this.getValue(ticker)),
				};
				assets.push(asset);
			}
			assets.sort((a, b) => {
				return a.value.lt(b.value)
					? 1
					: a.value.gt(b.value)
						? -1
						: 0;
			})
			return assets;
		}
	}
}
</script>

<style scoped>
#list {
	display: flex;
	flex-wrap: wrap;
}

.card {
	width: 10em;
	height: 4.5em;
	margin: 0.5em;
	padding: 0.75em 1em;
	background: white;
	border-radius: 8px;
	box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 2px;
	cursor: pointer;
}

.card:hover {
	box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 4px;
}

.balance {
	font-size: 1.25em;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.title {
	margin-top: 0.25em;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.title,
.value {
	color: gray;
}

.sparse {
	display: flex;
	justify-content: space-between;
}
</style>