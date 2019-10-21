<template>
	<div>
		<h1 id="header">{{ formatMoney(totalBalance) }}</h1>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';

import tokens from '../data/tokens.json';
import decimals from '../data/decimals.json';

export default {
	props: [ 'assets', 'deposits', 'loans', 'funds', 'fundData', 'prices' ],
	methods: {
		getShortBalance(balance, ticker) {
			if (!balance) {
				return new BigNumber(0);
			}
			const decimals = this.decimals[ticker];
			const balanceNumber = new BigNumber(balance);
			const ten = new BigNumber(10);
			const decimalNumber = ten.pow(decimals);
			const shortBalance = balanceNumber.div(decimalNumber);
			return shortBalance;
		},
		getValue(balance, ticker) {
			const price = this.prices[ticker];
			const priceNumber = new BigNumber(price);
			const shortBalance = this.getShortBalance(balance, ticker);
			const value = priceNumber.times(shortBalance);
			return value;
		},
		getFundValue(balance, platform, fundName) {
			const price = this.fundData[platform][fundName].price;
			const priceNumber = new BigNumber(price);
			const shortBalance = this.getShortBalance(balance, 'ETH');
			const value = priceNumber.times(shortBalance);
			return value;
		},
		formatMoney(moneyString) {
			const money = new BigNumber(moneyString);
			return `$${money.toFixed(2)}`;
		},
	},
	computed: {
		totalBalance() {
			const balance = this.assetValue
				.plus(this.depositValue)
				.minus(this.loanValue)
				.plus(this.fundValue);
			return balance;
		},
		assetValue() {
			let assetValue = new BigNumber(0);
			for (const ticker in this.assets) {
				const balance = this.assets[ticker];
				const value = this.getValue(balance, ticker);
				assetValue = assetValue.plus(value);
			}
			return assetValue;
		},
		depositValue() {
			let depositValue = new BigNumber(0);
			for (const ticker in this.deposits) {
				for (const platform in this.deposits[ticker]) {
					const balance = this.deposits[ticker][platform];
					const value = this.getValue(balance, ticker);
					depositValue = depositValue.plus(value);
				}
			}
			return depositValue;
		},
		loanValue() {
			let loanValue = new BigNumber(0);
			for (const ticker in this.loans) {
				for (const platform in this.loans[ticker]) {
					const balance = this.loans[ticker][platform];
					const value = this.getValue(balance, ticker);
					loanValue = loanValue.plus(value);
				}
			}
			return loanValue;
		},
		fundValue() {
			let fund = new BigNumber(0);
			for (const platform in this.funds) {
				for (const name in this.funds[platform]) {
					const balance = this.funds[platform][name];
					const value = this.getFundValue(balance, platform, name);
					fund = fund.plus(value);
				}
			}
			return fund;
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
#header {
	display: flex;
	justify-content: center;
}
</style>
