<template>
	<div>
		<h2>Manage loans</h2>
		<div>
			<div class="list">
				<div v-for="asset in assets" class="asset-selector" :class="{ 'selected': asset == assetTicker }" @click="selectAsset(asset)">
					{{ asset }}
				</div>
			</div>
		</div>
		<div>
			<div class="list">
				<div v-for="platform in platforms" class="app-selector" :class="{ 'selected': platform == platformName }" @click="selectPlatform(platform)">
					<div>{{ platform }}</div>
					<div>{{ formatRate(rates[platform][assetTicker]) }}</div>
				</div>
			</div>
		</div>
		<div id="action-selector-wrapper">
			<span class="action-selector" @click="selectAction('borrow')" :class="{ 'selected': action == 'borrow' }">Borrow</span>
			<span class="action-selector" @click="selectAction('repay')" :class="{ 'selected': action == 'repay' }">Repay</span>
		</div>
		<div id="amount-wrapper">
			<span class="input-group">
				<span class="max-label" @click="setMax()">MAX</span>
				<input class="amount" v-model="assetAmount">
				<span class="label label-ghost label-right inline">{{ assetTicker }}</span>
			</span>
		</div>
		<div id="button-wrapper">
			<button class="primary big" @click="borrow()" v-if="action == 'borrow'">Borrow</button>
			<button class="primary big" @click="repay()" v-if="action == 'repay'">Repay</button>
		</div>
		<TxStatus :status="txStatus" :onHidden="hideStatus"/>
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import TxStatus from '../../components/TxStatus.vue';

import decimals from '../../data/decimals.json';
import addresses from '../../data/addresses.json';
import currencyIds from '../../data/currency-ids.json';

import erc20Abi from '../../data/abi/erc20.json';
import comptrollerAbi from '../../data/abi/comptroller.json';
import compoundTokenAbi from '../../data/abi/compoundToken.json';
import fulcrumTokenAbi from '../../data/abi/fulcrumToken.json';
import bzxAbi from '../../data/abi/bzx.json';

const comptrollerAddress = '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

export default {
	components: {
		TxStatus,
	},
	data() {
		return {
			account: undefined,
			assetTicker: 'DAI',
			assetAmount: '100',
			platformName: 'Compound',
			action: 'borrow',
			rates: {
				'Compound': {},
				'Torque': {},
			},
			indices: {
				'Compound': {},
				'Torque': {},
			},
			tokenAddresses: {
				'Compound': {},
				'Torque': {},
			},
			prices: {},
			txStatus: 'none',
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
		this.loadRouterState();
		this.loadPrices();
		this.loadCompound();
		this.loadTorque();
	},
	methods: {
		selectAsset(asset) {
			this.assetTicker = asset;
		},
		selectPlatform(platform) {
			this.platformName = platform;
		},
		selectAction(action) {
			this.action = action;
		},
		borrow() {
			if (this.platformName == 'Compound') {
				this.borrowCompound();
			}
			if (this.platformName == 'Torque') {
				this.borrowTorque();
			}
		},
		repay() {
			if (this.platformName == 'Compound') {
				this.repayCompound();
			}
			if (this.platformName == 'Torque') {
				this.repayTorque();
			}
		},
		loadAccount() {
			const address = localStorage.getItem('address');
			const auth = localStorage.getItem('auth') == 'true';
			if (!address || !auth) {
				return;
			}
			this.account = {
				address,
				auth,
			};
		},
		loadRouterState() {
			const routerState = this.$router.state;
			if (routerState) {
				if (routerState.assetTicker) {
					this.assetTicker = routerState.assetTicker;
				}
				if (routerState.platformName) {
					this.platformName = routerState.platformName;
				}
				if (routerState.action) {
					this.action = routerState.action;
				}
			}
		},
		async loadPrices() {
			const assets = ['DAI', 'USDC', 'ETH', 'WBTC', 'REP', 'BAT', 'ZRX', 'LINK', 'KNC'];
			const assetIds = assets.map((asset) => currencyIds[asset]);
			const assetIdString = assetIds.join('%2C');
			const url = `https://api.coingecko.com/api/v3/simple/price?ids=${assetIdString}&vs_currencies=usd`;
 			const response = await fetch(url);
			const prices = await response.json();
			for (let i = 0; i < assets.length; i++) {
				const ticker = assets[i];
				const id = assetIds[i];
				const price = prices[id].usd;
				Vue.set(this.prices, ticker, price);
			}
		},
		async borrowCompound() {
			const assetAddress = addresses[this.assetTicker];
			const cTokenAddress = this.tokenAddresses['Compound'][this.assetTicker];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const borrowAmount = this.toLongAmount(this.assetAmount, this.assetTicker);
			await this.checkAllowance(cTokenAddress, assetAddress, borrowAmount);
			await this.enableBorrowCompound(cTokenAddress);
			try {
				this.txStatus = 'mining';
				const tx = await cToken.borrow(borrowAmount);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
			}
		},
		async borrowTorque() {
			const assetAddress = addresses[this.assetTicker];
			const iTokenAddress = this.tokenAddresses['Torque'][this.assetTicker];
			const iToken = new ethers.Contract(iTokenAddress, fulcrumTokenAbi, signer);
			const account = this.account.address;
			const borrowAmount = this.toLongAmount(this.assetAmount, this.assetTicker);
			const leverageAmount = '4000000000000000000';
			const initialLoanDuration = '7884000';
			const collateral = addresses['WETH'];
			const depositAmount = await iToken.getDepositAmountForBorrow(borrowAmount, leverageAmount, initialLoanDuration, collateral);
			const depositAmountNumber = new BigNumber(depositAmount.toString());
			const depositAmountWithInterest = depositAmountNumber.times(1.2).toFixed(0);
			const valueNumber = new BigNumber(depositAmountWithInterest);
			const ticker = this.assetTicker.toLowerCase();
			const borrowEns = `${ticker}.tokenloan.eth`;
			const borrowAddress = await provider.resolveName(borrowEns);
			const borrowTx = {
				value: '0x' + valueNumber.toString(16),
				to: borrowAddress
			};
			try {
				this.txStatus = 'mining';
				const tx = await signer.sendTransaction(borrowTx);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
			}
		},
		async repayCompound() {
			const assetAddress = addresses[this.assetTicker];
			const cTokenAddress = this.tokenAddresses['Compound'][this.assetTicker];
			const cToken = new ethers.Contract(cTokenAddress, compoundTokenAbi, signer);
			const repayAmount = this.toLongAmount(this.assetAmount, this.assetTicker);
			try {
				this.txStatus = 'mining';
				const options = {
					value: '0x' + repayAmount.toString(16),
				};
				const tx = this.assetTicker == 'ETH'
					? await cToken.repayBorrow(options)
					: await cToken.repayBorrow(repayAmount);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
			}
		},
		async repayTorque() {
			const account = this.account.address;
			const assetAddress = addresses[this.assetTicker];
			const erc20 = new ethers.Contract(assetAddress, erc20Abi, signer);
			const repayAmount = this.toLongAmount(this.assetAmount, this.assetTicker);
			const repayEns = `${account}.tokenloan.eth`;
			const repayAddress = await provider.resolveName(repayEns);
			if (!repayAddress) {
				return;
			}
			try {
				this.txStatus = 'mining';
				const tx = await erc20.transfer(repayAddress, repayAmount);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
			}
		},
		async hideStatus() {
			this.txStatus = 'none';
		},
		async enableBorrowCompound(cTokenAddress) {
			const account = this.account.address;
			const markets = [ cTokenAddress ];
			const comptroller = new ethers.Contract(comptrollerAddress, comptrollerAbi, signer);
			const isMember = await comptroller.checkMembership(account, cTokenAddress);
			if (isMember) {
				return;
			}
			try {
				this.txStatus = 'mining';
				const tx = await comptroller.enterMarkets(markets);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
			}
		},
		async checkAllowance(spender, address, amount) {
			const uintMax = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
			const account = this.account.address;
			const inputToken = new ethers.Contract(address, erc20Abi, signer);
			const inputTokenAllowance = await inputToken.allowance(account, spender);
			if (inputTokenAllowance.gte(amount)) {
				return;
			}
			try {
				this.txStatus = 'mining';
				const tx = await inputToken.approve(spender, uintMax);
				const txReceipt = await provider.getTransactionReceipt(tx.hash);
				if (txReceipt.status == 1) {
					this.txStatus = 'success';
				} else {
					this.txStatus = 'failure';
				}
			} catch(e) {
				this.txStatus = 'rejected';
			}
		},
		async loadCompound() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					tokens {
						symbol
						address
						borrowRate
						supplyIndex
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
			const tokens = data.tokens;
			for (const token of tokens) {
				const ticker = token.symbol.substr(1);
				const address = token.address;
				const rawRate = token.borrowRate;
				const index = token.supplyIndex;
				const rawRateNumber = new BigNumber(rawRate);
				const rateNumber = rawRateNumber.times('2102400').div('1e18');
				const rate = rateNumber.toString();
				Vue.set(this.tokenAddresses['Compound'], ticker, address);
				Vue.set(this.rates['Compound'], ticker, rate);
				Vue.set(this.indices['Compound'], ticker, index);
			}
		},
		async loadTorque() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/fulcrum";
			const query = `
				query {
					tokens {
						symbol
						address
						index
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
			const tokens = data.tokens;
			for (const token of tokens) {
				const ticker = token.symbol.substr(1);
				const address = token.address;
				const index = token.supplyIndex;
				Vue.set(this.tokenAddresses['Torque'], ticker, address);
				Vue.set(this.rates['Torque'], ticker, 0.16); // TODO
				Vue.set(this.indices['Torque'], ticker, index);
			}
		},
		toShortAmount(amount, ticker) {
			const ten = new BigNumber(10);
			const tickerDecimals = decimals[ticker];
			const multiplier = ten.pow(tickerDecimals);
			const amountNumber = new BigNumber(amount);
			const shortAmountNumber = amountNumber.div(multiplier);
			const shortAmount = shortAmountNumber.toString();
			return shortAmount;
		},
		toLongAmount(amount, ticker) {
			const ten = new BigNumber(10);
			const tickerDecimals = decimals[ticker];
			const multiplier = ten.pow(tickerDecimals);
			const amountNumber = new BigNumber(amount);
			const longAmountNumber = amountNumber.times(multiplier);
			const longAmount = longAmountNumber.toFixed(0);
			return longAmount;
		},
		async setMax() {
			const account = this.account.address;
			if (this.action == 'borrow') {
				if (this.platformName == 'Compound') {
					const netBalance = await this.getCompoundAvailableBorrowAmount();
					const netBalanceNumber = new BigNumber(netBalance);
					const tokenPrice = this.prices[this.assetTicker];
					const tokenAmount = netBalanceNumber.div(tokenPrice);
					this.assetAmount = tokenAmount.toString();
				}
				if (this.platformName == 'Torque') {
					// Get minimal collateral amount required to borrow 1 token
					const assetAddress = addresses[this.assetTicker];
					const iTokenAddress = this.tokenAddresses['Torque'][this.assetTicker];
					const iToken = new ethers.Contract(iTokenAddress, fulcrumTokenAbi, provider);
					const borrowAmount = this.toLongAmount('1', this.assetTicker);
					const leverageAmount = '4000000000000000000';
					const initialLoanDuration = '7884000';
					const collateral = addresses['WETH'];
					const amount = await iToken.getDepositAmountForBorrow(borrowAmount, leverageAmount, initialLoanDuration, collateral);
					const amountNumber = new BigNumber(amount.toString());
					const amountWithInterestNumber = amountNumber.times(1.2);
					// Get eth balance
					const account = this.account.address;
					const ethBalance = await provider.getBalance(account);
					const ethBalanceNumber = new BigNumber(ethBalance.toString());
					// Calculate max amount of tokens possible to borrow
					const assetAmountNumber = ethBalanceNumber.div(amountWithInterestNumber);
					const assetAmount = assetAmountNumber.toString();
					this.assetAmount = assetAmount;
				}
			}
			if (this.action == 'repay') {
				const assetAddress = addresses[this.assetTicker];
				const erc20 = new ethers.Contract(assetAddress, erc20Abi, provider);
				const tokenBalance = await erc20.balanceOf(account);
				const tokenBalanceNumber = new BigNumber(tokenBalance.toString());
				const loanAmount = this.platformName == 'Compound'
					? await this.getCompoundLoanAmount()
					: await this.getTorqueLoanAmount();
				const loanAmountNumber = new BigNumber(loanAmount);
				const maxRepayAmount = tokenBalanceNumber.lt(loanAmountNumber)
					? tokenBalance
					: loanAmount;
				this.assetAmount = this.toShortAmount(maxRepayAmount, this.assetTicker);
			}
		},
		async getCompoundLoanAmount() {
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					userBalances(where: {
						id: "${this.account.address}"
					}) {
						loans(first: 10) {
							token {
								symbol
								supplyIndex
								borrowIndex
								supplyRate
								borrowRate
							}
							amount
							index
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
			if (data.userBalances.length == 0) {
				return;
			}
			const loans = data.userBalances[0].loans;
			for (const loan of loans) {
				const ticker = loan.token.symbol.substr(1);
				if (ticker != this.assetTicker) {
					continue;
				}
				const loanAmount = loan.amount;
				return loanAmount;
			}
			return '0';
		},
		async getTorqueLoanAmount() {
			const bzxAddress = '0x1Cf226E9413AddaF22412A2E182F9C0dE44AF002';
			const bzx = new ethers.Contract(bzxAddress, bzxAbi, provider);
			const loans = await bzx.getBasicLoansData(this.account.address, 5);
			for (const loan of loans) {
				if (loan.loanOrderHash == '0x0000000000000000000000000000000000000000000000000000000000000000') {
					break;
				}
				const tickers = {
					'0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359': 'DAI',
					'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
				};
				const ticker = tickers[loan.loanTokenAddress];
				if (ticker != this.assetTicker) {
					continue;
				}
				const loanTokenAmountFilled = loan.loanTokenAmountFilled;
				const interestDepositRemaining = loan.interestDepositRemaining;
				const loanTokenAmountFilledNumber = new BigNumber(loanTokenAmountFilled.toString());
				const interestDepositRemainingNumber = new BigNumber(interestDepositRemaining.toString());
				const loanAmountNumber = loanTokenAmountFilledNumber.minus(interestDepositRemainingNumber);
				const loanAmount = loanAmountNumber.toString();
				return loanAmount;
			}
			return '0';
		},
		// Assets times collateral factor minus liabilities (e.g. how much value I can borrow)
		async getCompoundAvailableBorrowAmount() {
			// Load data
			const url = "https://api.thegraph.com/subgraphs/name/destiner/compound";
			const query = `
				query {
					userBalances(where: {
						id: "${this.account.address}"
					}) {
						balances(first: 10) {
							token {
								symbol
								supplyIndex
								borrowIndex
								supplyRate
								borrowRate
							}
							balance
						}
						loans(first: 10) {
							token {
								symbol
								supplyIndex
								borrowIndex
								supplyRate
								borrowRate
							}
							amount
							index
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
			if (data.userBalances.length == 0) {
				return '0';
			}
			// TODO load dynamically
			const collateralFactorMap = {
				'REP': 0.5,
				'USDC': 0.75,
				'ETH': 0.75,
				'BAT': 0.6,
				'ZRX': 0.6,
				'WBTC': 0,
				'DAI': 0.75,
			};
			// Net collateral value
			let depositTotalValue = new BigNumber(0);
			const balances = data.userBalances[0].balances;
			for (const balance of balances) {
				const ticker = balance.token.symbol.substr(1);
				const supplyIndex = balance.token.supplyIndex;
				const assetRawBalance = balance.balance;
				const assetRawBalanceNumber = new BigNumber(assetRawBalance);
				const assetBalanceNumber = assetRawBalanceNumber.times(supplyIndex).div('1e18');
				const assetBalance = assetBalanceNumber.toString();
				const assetShortBalance = this.toShortAmount(assetBalance, ticker);
				const assetShortBalanceNumber = new BigNumber(assetShortBalance);
				const assetPrice = this.prices[ticker];
				const assetValue = assetShortBalanceNumber.times(assetPrice);
				const collateralFactor = collateralFactorMap[ticker];
				const assetBorrowPower = assetValue.times(collateralFactor);
				depositTotalValue = depositTotalValue.plus(assetBorrowPower);
			}
			// Net liabilities
			let loanTotalValue = new BigNumber(0);
			const loans = data.userBalances[0].loans;
			for (const loan of loans) {
				const ticker = loan.token.symbol.substr(1);
				const borrowIndex = loan.token.borrowIndex;
				const loanRawAmount = loan.amount;
				const loanIndex = loan.index;
				const loanRawAmountNumber = new BigNumber(loanRawAmount);
				const loanAmountNumber = loanRawAmountNumber.times(borrowIndex).div(loanIndex);
				const loanAmount = loanAmountNumber.toString();
				const loanShortAmount = this.toShortAmount(loanAmount, ticker);
				const loanShortAmountNumber = new BigNumber(loanShortAmount);
				const tokenPrice = this.prices[ticker];
				const loanValue = loanShortAmountNumber.times(tokenPrice);
				loanTotalValue = loanTotalValue.plus(loanValue);
			}
			// Available borrow amount
			const availableBorrowAmount = depositTotalValue.minus(loanTotalValue);
			return availableBorrowAmount.toString();
		},
		formatRate(rateString) {
			if (!rateString) {
				return 'Loading…';
			}
			const rate = new BigNumber(rateString);
			return `${rate.times(100).toFixed(2)}%`;
		},
	},
	computed: {
		assets() {
			return [ 'DAI', 'USDC' ];
		},
		platforms() {
			return [ 'Compound', 'Torque' ];
		},
	},
}
</script>

<style scoped>
#action-selector-wrapper {
	margin-top: 0.5em;
}

#amount-wrapper {
	margin-top: 3em;
}

#button-wrapper {
	margin-top: 1em;
}

.list {
	display: flex;
}
</style>
