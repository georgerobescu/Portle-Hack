<template>
	<div id="view">
		<div class="header">
			<h2>Assets</h2>
			<div v-if="account.auth">
				<button onclick="location.href='./send.html';">Send</button>
				<button onclick="location.href='./swap.html';" style="margin-left: 8px">Swap</button>
			</div>
		</div>
		<AssetList :prices="prices" :balances="balances" :tokens="tokens" :decimals="decimals" />

		<div class="header">
			<h2>Deposits</h2>
			<div v-if="account.auth">
				<button onclick="location.href='./deposit-new.html';">New deposit</button>
			</div>
		</div>
		<DepositList :prices="prices" :depositBalances="depositBalances" :tokens="tokens" :decimals="decimals" />
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';

import AssetList from '../components/AssetList.vue';
import DepositList from '../components/DepositList.vue';

export default {
	components: {
		AssetList,
		DepositList,
	},
	data() {
		return {
			account: {
				address: '',
				auth: true,
			},
			prices: {
				'ETH': 0,
				'USDC': 1,
			},
			balances: {},
			depositBalances: {
				'DAI': {
					'Fulcrum': '1000000000000000000000',
				},
				'USDC': {
					'Compound': '500000000',
				},
			},
			tokens: {
				'USDC': 'USD Coin',
			},
			decimals: {
				'USDC': 6,
			},
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
		this.loadEtherPrice();
		this.loadBalances();
	},
	methods: {
		async loadEtherPrice() {
			const url = `https://api.cryptonator.com/api/ticker/eth-usd`;
			const response = await fetch(url);
			const price = await response.json();
			const etherPrice = parseFloat(price.ticker.price);
			Vue.set(this.prices, 'ETH', etherPrice);
		},
		async loadBalances() {
			const url = `https://api.ethplorer.io/getAddressInfo/${this.account.address}?apiKey=freekey`;
			const response = await fetch(url);
			const balance = await response.json();
			// ETH
			const etherBalance = balance.ETH.balance;
			const etherBalanceNumber = new BigNumber(etherBalance);
			const ten = new BigNumber(10);
			const etherMultiplier = ten.pow(18);
			const etherBalanceInWei = etherBalanceNumber.times(etherMultiplier);
			Vue.set(this.balances, 'ETH', etherBalanceInWei.toString());
			Vue.set(this.tokens, 'ETH', 'Ethereum');
			Vue.set(this.decimals, 'ETH', 18);
			// ERC20
			if (!balance.tokens) {
				return;
			}
			for (const tokenData of balance.tokens) {
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
		},
	},
}
</script>
