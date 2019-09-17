<template>
	<div id="list">
		<div class="card" v-for="asset in assets" v-if="asset.value > 1">
			<div class="line line-amount">{{ formatBalance(asset.balance) }} {{ asset.ticker }}</div>
			<div class="line line-platform">{{ asset.title }}</div>
			<div class="line line-balance line-sparse">
				<div>{{ formatMoney(asset.price) }}</div>
				<div>{{ formatMoney(asset.value)}}</div>
			</div>
		</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';

export default {
	props: [ 'prices', 'balances', 'tokens', 'decimals' ],
	methods: {
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
			const worth = priceNumber.times(balance);
			return worth;
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

.line-amount {
	font-size: 1.25em;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.line-platform {
	margin-top: 0.25em;
}

.line-platform,
.line-balance {
	color: gray;
}

.line-sparse {
	display: flex;
	justify-content: space-between;
}
</style>