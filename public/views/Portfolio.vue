<template>
	<div id="view">
		<div class="header">
			<h2>Assets</h2>
			<div>
				<button onclick="location.href='./send.html';">Send</button>
				<button onclick="location.href='./swap.html';" style="margin-left: 8px">Swap</button>
			</div>
		</div>
		<AssetList :prices="prices" :balances="balances" :tokens="tokens" :decimals="decimals" />
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';

import AssetList from '../components/AssetList.vue';

export default {
	components: {
		AssetList
	},
	data() {
		return {
			address: '',
			prices: {},
			balances: {},
			tokens: {},
			decimals: {},
		}
	},
	mounted() {
		this.address = localStorage.getItem('address');
		if (!this.address) {
			this.$router.push('/login');
			return;
		}
		this.loadBalances();
	},
	methods: {
		async loadBalances() {
			const url = `http://api.ethplorer.io/getAddressInfo/${this.address}?apiKey=freekey`;
			const response = await fetch(url);
			const balanceResponse = await response.json();
			// ETH
			const ethBalance = balanceResponse.ETH.balance;
			const ethBalanceNumber = new BigNumber(ethBalance);
			const ten = new BigNumber(10);
			const ethMultiplier = ten.pow(18);
			const ethBalanceInWei = ethBalanceNumber.times(ethMultiplier);
			Vue.set(this.prices, 'ETH', 200.62); // TODO
			Vue.set(this.balances, 'ETH', ethBalanceInWei.toString());
			Vue.set(this.tokens, 'ETH', 'Ethereum');
			Vue.set(this.decimals, 'ETH', 18);
			// ERC20
			for (const tokenData of balanceResponse.tokens) {
				const ticker = tokenData.tokenInfo.symbol;
				if (!tokenData.tokenInfo.price) {
					continue;
				}
				const price = tokenData.tokenInfo.price.rate;
				Vue.set(this.prices, ticker, price);
				Vue.set(this.balances, ticker, tokenData.balance);
				Vue.set(this.tokens, ticker, tokenData.tokenInfo.name);
				Vue.set(this.decimals, ticker, tokenData.tokenInfo.decimals);
			}
		}
	},
}
</script>
