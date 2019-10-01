<template>
	<div id="view">
		<div id="swap-form">
			<div>
				<span class="input-group">
					<span class="max-label">MAX</span>
					<input class="amount" v-model="inputAmount" @input="updateAmount(true)">
					<AssetPicker :startTicker="inputAsset" :onSelect="inputTokenSelected" class="inline"/>
				</span>
			</div>
			<span id="swap-direction">
				<img :src="chevronDown" class="swap-icon swap-direction">
			</span>
			<div>
				<span class="input-group">
					<span class="max-label">MAX</span>
					<input class="amount" v-model="outputAmount" @input="updateAmount(false)">
					<AssetPicker :startTicker="outputAsset" :onSelect="outputTokenSelected" class="inline"/>
				</span>
			</div>
		</div>
		<div style="margin-top: 2em;">
			Rate: 1 {{ outputAsset }} = {{ formatRate(rate) }} {{ inputAsset }}
		</div>
		<div style="margin-top: 2em">
			<span class="badge badge-info">{{ message }}</span>
		</div>
		<!-- <div style="margin-top: 2em">
			<span class="badge badge-danger">
				Expected slippage is 1.58%.
			</span>
		</div> -->
		<div style="margin-top: 1em">
			<button class="primary big" @click="swap()">Swap</button>
		</div>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import AssetPicker from '../../components/AssetPicker.vue';

import erc20Abi from '../../data/abi/erc20.json';
import kyberOracleAbi from '../../data/abi/kyberOracle.json';
import kyberProxyAbi from '../../data/abi/kyberProxy.json';
import synthetixRatesAbi from '../../data/abi/synthetixRates.json';
import synthetixAbi from '../../data/abi/synthetix.json';
import decimals from '../../data/decimals.json';
import addresses from '../../data/addresses.json';

import chevronDown from '../../../assets/chevron-down.svg';

const kyberOracleAddress = '0xFd9304Db24009694c680885e6aa0166C639727D6';
const kyberProxyAddress = '0x818e6fecd516ecc3849daf6845e3ec868087b755';
const synthetixRatesAddress = '0x99a46c42689720d9118FF7aF7ce80C2a92fC4f97';
const synthetixAddress = '0xC011A72400E58ecD99Ee497CF89E3775d4bd732F';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const slippage = 0.01;

export default {
	components: {
		AssetPicker,
	},
	data() {
		return {
			account: undefined,
			inputAsset: 'ETH',
			outputAsset: 'DAI',
			inputAmount: '1',
			outputAmount: '0',
			isLastChangedInput: true,
			loading: false,
		}
	},
	mounted() {
		const address = localStorage.getItem('address');
		const auth = localStorage.getItem('auth') == 'true';
		if (!address || !auth) {
			this.$router.push('/login');
			return;
		}
		this.account = {
			address,
			auth,
		};
		this.loadPrice();
	},
	methods: {
		updateAmount(isChangedInput) {
			this.isLastChangedInput = isChangedInput;
			this.loadPrice();
		},
		inputTokenSelected(ticker) {
			this.inputAsset = ticker;
			if (this.isLastChangedInput) {
				this.outputAmount = '…';
			} else {
				this.inputAmount = '…';
			}
			this.loadPrice();
		},
		outputTokenSelected(ticker) {
			this.outputAsset = ticker;
			if (this.isLastChangedInput) {
				this.outputAmount = '…';
			} else {
				this.inputAmount = '…';
			}
			this.loadPrice();
		},
		async loadPrice() {
			this.loading = true;
			if (this.inputAmount == '0' && this.outputAmount == '0') {
				return;
			}
			if (this.isLastChangedInput) {
				this.outputAmount = '…';
			} else {
				this.inputAmount = '…';
			}
			const dex = this.getDex();
			if (dex == 'Kyber') {
				await this.loadKyberPrice();
			}
			if (dex == 'Synthetix') {
				await this.loadSynthetixPrice();
			}
			this.loading = false;
		},
		async swap() {
			const dex = this.getDex();
			if (dex == 'Kyber') {
				await this.swapKyber();
			}
			if (dex == 'Synthetix') {
				await this.swapSynthetix();
			}
		},
		async checkAllowance(address, amount) {
			const uintMax = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
			const account = this.account.address;
			const inputToken = new ethers.Contract(address, erc20Abi, signer);
			const inputTokenAllowance = await inputToken.allowance(account, kyberProxyAddress);
			if (inputTokenAllowance.gte(amount)) {
				return;
			}
			await inputToken.approve(kyberProxyAddress, uintMax);
		},
		async loadKyberPrice() {
			const inputAddress = this.getTokenAddress(this.inputAsset);
			const outputAddress = this.getTokenAddress(this.outputAsset);
			const kyberOracle = new ethers.Contract(kyberOracleAddress, kyberOracleAbi, provider);
			if (this.isLastChangedInput) {
				const inputAmount = this.toLongAmount(this.inputAmount, this.inputAsset);
				const outputAmount = await kyberOracle.getOutputAmount(inputAddress, outputAddress, inputAmount);
				this.outputAmount = this.toShortAmount(outputAmount, this.outputAsset);
			} else {
				const outputAmount = this.toLongAmount(this.outputAmount, this.outputAsset);
				const inputAmount = await kyberOracle.getOutputAmount(inputAddress, outputAddress, outputAmount);
				this.inputAmount = this.toShortAmount(inputAmount, this.inputAsset);
			}
		},
		async loadSynthetixPrice() {
			const synthetixRates = new ethers.Contract(synthetixRatesAddress, synthetixRatesAbi, provider);
			const amount = this.toLongAmount(1, 'ETH');
			const inputCurrencyCode = ethers.utils.formatBytes32String(this.inputAsset);
			const outputCurrencyCode = ethers.utils.formatBytes32String(this.outputAsset);
			const rate = await synthetixRates.effectiveValue(inputCurrencyCode, amount, outputCurrencyCode);
			const rateNumber = new BigNumber(rate.toString());
			const rateAfterFee = rateNumber.times(0.995);
			if (this.isLastChangedInput) {
				const inputAmountNumber = new BigNumber(this.inputAmount);
				const outputAmountNumber = inputAmountNumber.times(rateAfterFee);
				this.outputAmount = this.toShortAmount(outputAmountNumber, this.outputAsset);
			} else {
				const outputAmount = this.toLongAmount(this.outputAmount, this.outputAsset);
				const outputAmountNumber = new BigNumber(outputAmount);
				const inputAmountNumber = outputAmountNumber.div(rateAfterFee);
				this.inputAmount = inputAmountNumber.toString();
			}
		},
		async swapKyber() {
			const one = new BigNumber(1);
			const reverseRate = one.div(this.rate)
			const reverseRateAfterSlippage = reverseRate.times(one.minus(slippage));
			const conversionRate = this.toLongAmount(reverseRateAfterSlippage, 'ETH');
			const kyberProxy = new ethers.Contract(kyberProxyAddress, kyberProxyAbi, signer);
			if (this.inputAsset == 'ETH') {
				// Eth to token
				const outputAddress = this.getTokenAddress(this.outputAsset);
				const value = this.toLongAmount(this.inputAmount, 'ETH');
				const valueNumber = new BigNumber(value);
				const options = {
					value: '0x' + valueNumber.toString(16),
				};
				await kyberProxy.swapEtherToToken(outputAddress, conversionRate, options);
			} else if (this.outputAsset == 'ETH') {
				// Token to eth
				const inputAddress = this.getTokenAddress(this.inputAsset);
				const inputAmount = this.toLongAmount(this.inputAmount, this.inputAsset);
				await this.checkAllowance(inputAddress, inputAmount);
				await kyberProxy.swapTokenToEther(inputAddress, inputAmount, conversionRate);
			} else {
				// Token to token
				const inputAddress = this.getTokenAddress(this.inputAsset);
				const inputAmount = this.toLongAmount(this.inputAmount, this.inputAsset);
				const outputAddress = this.getTokenAddress(this.outputAsset);
				await this.checkAllowance(inputAddress, inputAmount);
				await kyberProxy.swapTokenToToken(inputAddress, inputAmount, outputAddress, conversionRate);
			}
		},
		async swapSynthetix() {
			const inputCurrencyCode = ethers.utils.formatBytes32String(this.inputAsset);
			const outputCurrencyCode = ethers.utils.formatBytes32String(this.outputAsset);
			const inputAddress = this.getTokenAddress(this.inputAsset);
			const inputAmount = this.toLongAmount(this.inputAmount, this.inputAsset);
			const synthetix = new ethers.Contract(synthetixAddress, synthetixAbi, signer);
			await this.checkAllowance(inputAddress, inputAmount);
			await synthetix.exchange(inputCurrencyCode, inputAmount, outputCurrencyCode, this.account.address);
		},
		getDex() {
			const isInputSynth = this.isSynth(this.inputAsset);
			const isOutputSynth = this.isSynth(this.outputAsset);
			if (isInputSynth && isOutputSynth) {
				return 'Synthetix';
			}
			if (!isInputSynth && !isOutputSynth) {
				return 'Kyber';
			}
			return 'Bridge';
		},
		isSynth(ticker) {
			const synths = [
				'sETH',
				'sBTC',
				'sUSD',
				'sEUR',
				'sGBP',
			];
			return synths.includes(ticker);
		},
		getTokenAddress(ticker) {
			if (ticker == 'ETH') {
				return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
			}
			return addresses[ticker];
		},
		toShortAmount(amount, ticker) {
			const ten = new BigNumber(10);
			const tickerDecimals = decimals[ticker];
			const multiplier = ten.pow(tickerDecimals);
			const amountNumber = new BigNumber(amount);
			const shortAmountNumber = amountNumber.div(multiplier);
			const shortAmount = shortAmountNumber.toFixed(6);
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
		formatRate(rate) {
			if (this.loading) {
				return '…';
			}
			return rate.toFixed(4);
		},
	},
	computed: {
		chevronDown() {
			return chevronDown;
		},
		rate() {
			if (this.outputAmount == '…') {
				return new BigNumber(0);
			}
			const inputAmount = new BigNumber(this.inputAmount);
			const outputAmount = new BigNumber(this.outputAmount);
			if (outputAmount.isZero()) {
				return new BigNumber(0);
			}
			return inputAmount.div(outputAmount);
		},
		message() {
			const one = new BigNumber(1);
			if (this.isLastChangedInput) {
				const outputAmount = new BigNumber(this.outputAmount);
				const outputAmountAfterSlippage = outputAmount.times(one.minus(slippage)).toFixed(6);
				return `Selling ${this.inputAmount} ${this.inputAsset} to get at least ${outputAmountAfterSlippage} ${this.outputAsset}`;
			} else {
				const inputAmount = new BigNumber(this.inputAmount);
				const inputAmountAfterSlippage = inputAmount.times(one.plus(slippage)).toFixed(6);
				return `Buying ${this.outputAmount} ${this.outputAsset} to spend no more than ${inputAmountAfterSlippage} ${this.inputAsset}`;
			}
		},
	},
}
</script>

<style scoped>
#view {
	margin-top: 2em;
}

#swap-direction {
	margin: 16px 0 16px 0;
	width: 556px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.inline {
	display: inline-block;
}

.swap-icon {
	width: 12px;
}
</style>
