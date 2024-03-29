<template>
	<div id="list">
		<div class="card" v-for="deposit in deposits" v-if="deposit.value.gt(0)" @click="openDeposit(deposit)">
			<div class="balance">{{ formatBalance(deposit.balance) }} {{ deposit.ticker }}</div>
			<div class="platform sparse">
				<div>{{ deposit.platform }}</div>
				<div>{{ formatRate(deposit.rate)}}</div>
			</div>
			<div class="details sparse">
				<div>{{ formatMoney(deposit.price) }}</div>
				<div>{{ formatMoney(deposit.value)}}</div>
			</div>
		</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';

export default {
	props: [ 'balances', 'rates', 'prices', 'tokens', 'decimals' ],
	methods: {
		openDeposit(deposit) {
			const path = `/deposit/${deposit.platform}/${deposit.ticker}`;
			this.$router.push(path);
		},
		getBalance(ticker, platform) {
			const tokenBalances = this.balances[ticker];
			const balance = tokenBalances[platform];
			const decimals = this.decimals[ticker];
			const balanceNumber = new BigNumber(balance);
			const ten = new BigNumber(10);
			const decimalNumber = ten.pow(decimals);
			const shortBalance = balanceNumber.div(decimalNumber);
			return shortBalance;
		},
		getValue(ticker, platform) {
			const price = this.prices[ticker];
			const priceNumber = new BigNumber(price);
			const balance = this.getBalance(ticker, platform);
			const value = priceNumber.times(balance);
			return value;
		},
		formatBalance(balance) {
			return `${balance.toFixed(2)}`;
		},
		formatRate(rateString) {
			const rate = parseFloat(rateString);
			return `${(rate * 100).toFixed(2)}%`;
		},
		formatMoney(price) {
			return `$${price.toFixed(2)}`;
		},
	},
	computed: {
		deposits() {
			const deposits = [];
			for (const ticker in this.balances) {
				const price = this.prices[ticker];
				const tokenBalances = this.balances[ticker];
				for (const platform in tokenBalances) {
					const deposit = {
						balance: this.getBalance(ticker, platform),
						ticker,
						platform,
						price,
						rate: this.rates.supply[ticker][platform],
						value: this.getValue(ticker, platform),
					};
					deposits.push(deposit);
				}
			}
			deposits.sort((a, b) => {
				return a.value.lt(b.value)
					? 1
					: a.value.gt(b.value)
						? -1
						: 0;
			});
			return deposits;
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

.platform {
	margin-top: 0.25em;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.platform,
.details {
	color: gray;
}

.sparse {
	display: flex;
	justify-content: space-between;
}
</style>
