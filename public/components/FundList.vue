<template>
	<div id="list">
		<div class="card" v-for="fund in funds" v-if="fund.value.gt(0)" @click="openFund(fund)">
			<div class="balance">{{ formatBalance(fund.balance) }} {{ fund.name }}</div>
			<div class="platform">{{ fund.platform }}</div>
			<div class="details sparse">
				<div>{{  }}</div>
				<div>{{ formatMoney(fund.value)}}</div>
			</div>
		</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';

export default {
	props: [ 'balances', 'fundData' ],
	methods: {
		openFund(fund) {
			const path = `/fund/melon/${fund.name}`;
			this.$router.push(path);
		},
		getBalance(platform, fundName) {
			const balance = this.balances[platform][fundName];
			const balanceNumber = new BigNumber(balance);
			const ten = new BigNumber(10);
			const decimalNumber = ten.pow(18);
			const shortBalance = balanceNumber.div(decimalNumber);
			return shortBalance;
		},
		getValue(platform, fundName) {
			const price = this.fundData[platform][fundName].price;
			const priceNumber = new BigNumber(price);
			const balance = this.getBalance(platform, fundName);
			const value = priceNumber.times(balance);
			return value;
		},
		formatBalance(balance) {
			return `${balance.toFixed(2)}`;
		},
		formatRoi(aprString) {
			const apr = parseFloat(aprString);
			return `${(apr * 100).toFixed(2)}% ROI`;
		},
		formatMoney(value) {
			return `$${value.toFixed(2)}`;
		},
	},
	computed: {
		funds() {
			const funds = [];
			for (const platform in this.balances) {
				for (const name in this.balances[platform]) {
					const roi = this.fundData[platform][name].roi;
					const fund = {
						balance: this.getBalance(platform, name),
						name,
						platform,
						roi,
						value: this.getValue(platform, name),
					};
					funds.push(fund);
				}
			}
			funds.sort((a, b) => {
				return a.value.lt(b.value)
					? 1
					: a.value.gt(b.value)
						? -1
						: 0;
			});
			return funds;
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
