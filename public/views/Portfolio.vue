<template>
	<div id="view">
		<div class="header">
			<h2>Assets</h2>
			<div v-if="account.auth">
				<button onclick="location.href='./send.html';">Send</button>
				<button onclick="location.href='./swap.html';" style="margin-left: 8px">Swap</button>
			</div>
		</div>
		<AssetList :balances="balances" :prices="prices" :tokens="tokens" :decimals="decimals" />

		<div class="header">
			<h2>Deposits</h2>
			<div v-if="account.auth">
				<button onclick="location.href='./deposit-new.html';">New deposit</button>
			</div>
		</div>
		<DepositList :balances="depositBalances" :rates="rates" :prices="prices" :tokens="tokens" :decimals="decimals" />
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
			balances: {},
			depositBalances: {},
			rates: {
				'supply': {},
				'borrow': {},
			},
			prices: {
				'ETH': 0,
				'USDC': 1,
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
		this.loadPrices();
		this.loadBalances();
		this.loadCompound();
		this.loadFulcrum();
	},
	methods: {
		async loadPrices() {
			const tickers = {
				'0x': 'ZRX',
				'augur': 'REP',
				'basic-attention-token': 'BAT',
				'dai': 'DAI',
				'ethereum': 'ETH',
				'kyber-network': 'KNC',
				'link': 'LINK',
				'usd-coin': 'USDC',
				'wrapped-bitcoin': 'WBTC',
			};
			const assetIds = Object.keys(tickers).join('%2C');
			const url = `https://api.coingecko.com/api/v3/simple/price?ids=${assetIds}&vs_currencies=usd`;
			const response = await fetch(url);
			const prices = await response.json();
			for (const id in prices) {
				const ticker = tickers[id];
				const price = prices[id].usd;
				Vue.set(this.prices, ticker, price);
			}
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
				if (!(ticker in this.prices)) {
					const price = tokenData.tokenInfo.price.rate;
					Vue.set(this.prices, ticker, price);
				}
				Vue.set(this.balances, ticker, tokenData.balance);
				Vue.set(this.tokens, ticker, tokenData.tokenInfo.name);
				Vue.set(this.decimals, ticker, tokenData.tokenInfo.decimals);
			}
		},
		async loadCompound() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					userBalances(where: {
						id: "${this.account.address}"
					}) {
						balances(first: 10) {
							token {
								symbol
								index
								supplyRate
								borrowRate
							}
							balance
						}
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
			const balances = data.userBalances[0].balances;
			for (const balance of balances) {
				const ticker = balance.token.symbol.substr(1);
				const index = balance.token.index;
				const tokenRawBalance = balance.balance;
				// Set balances
				if (!(ticker in this.depositBalances)) {
					Vue.set(this.depositBalances, ticker, {});
				}
				const tokenRawBalanceNumber = new BigNumber(tokenRawBalance);
				const tokenBalanceNumber = tokenRawBalanceNumber.times(index).div('1e18');
				const tokenBalance = tokenBalanceNumber.toString();
				Vue.set(this.depositBalances[ticker], 'Compound', tokenBalance);
				// Set rates
				const supplyRawRate = balance.token.supplyRate;
				const borrowRawRate = balance.token.borrowRate;
				const supplyRawRateNumber = new BigNumber(supplyRawRate);
				const borrowRawRateNumber = new BigNumber(borrowRawRate);
				const supplyRateNumber = supplyRawRateNumber.times('2102400').div('1e18');
				const borrowRateNumber = borrowRawRateNumber.times('2102400').div('1e18');
				const supplyRate = supplyRateNumber.toString();
				const borrowRate = borrowRateNumber.toString();
				if (!(ticker in this.rates.supply)) {
					Vue.set(this.rates.supply, ticker, {});
				}
				if (!(ticker in this.rates.borrow)) {
					Vue.set(this.rates.borrow, ticker, {});
				}
				Vue.set(this.rates.supply[ticker], 'Compound', supplyRate);
				Vue.set(this.rates.borrow[ticker], 'Compound', borrowRate);
			}
		},
		async loadFulcrum() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/fulcrum";
			const query = `
				query {
					userBalances(where: {
						id: "${this.account.address}"
					}) {
						balances(first: 10) {
							token {
								symbol
								index
								supplyRate
								borrowRate
							}
							balance
						}
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
			const balances = data.userBalances[0].balances;
			for (const balance of balances) {
				const ticker = balance.token.symbol.substr(1);
				const index = balance.token.index;
				const tokenRawBalance = balance.balance;
				// Set balances
				if (!(ticker in this.depositBalances)) {
					Vue.set(this.depositBalances, ticker, {});
				}
				const tokenRawBalanceNumber = new BigNumber(tokenRawBalance);
				const tokenBalanceNumber = tokenRawBalanceNumber.times(index).div('1e18');
				const tokenBalance = tokenBalanceNumber.toString();
				Vue.set(this.depositBalances[ticker], 'Fulcrum', tokenBalance);
				// Set rates
				const supplyRawRate = balance.token.supplyRate;
				const borrowRawRate = balance.token.borrowRate;
				const supplyRawRateNumber = new BigNumber(supplyRawRate);
				const borrowRawRateNumber = new BigNumber(borrowRawRate);
				const supplyRateNumber = supplyRawRateNumber.div('1e18').div('1e2');
				const borrowRateNumber = borrowRawRateNumber.div('1e18').div('1e2');
				const supplyRate = supplyRateNumber.toString();
				const borrowRate = borrowRateNumber.toString();
				if (!(ticker in this.rates.supply)) {
					Vue.set(this.rates.supply, ticker, {});
				}
				if (!(ticker in this.rates.borrow)) {
					Vue.set(this.rates.borrow, ticker, {});
				}
				Vue.set(this.rates.supply[ticker], 'Fulcrum', supplyRate);
				Vue.set(this.rates.borrow[ticker], 'Fulcrum', borrowRate);
			}
		}
	},
}
</script>
