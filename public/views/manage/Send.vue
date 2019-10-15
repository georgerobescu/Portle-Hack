<template>
	<div id="view">
		<div>
			<span class="input-group">
				<span class="label">Recipient</span>
				<input class="address inline" placeholder="Enter address" v-model="recipient">
			</span>
		</div>
		<div id="amount-form-wrapper">
			<span class="input-group">
				<span class="max-label" @click="setMax()">MAX</span>
				<input class="amount" v-model="amount">
				<AssetPicker :ticker="asset" :onSelect="assetSelected" class="inline"/>
			</span>
		</div>
		<!-- <div id="badge-wrapper">
			<span class="badge badge-info">Sending {{ amount }} {{ asset }} to {{ recipient }}</span>
			<span class="badge badge-danger">
				Expected slippage is 1.58%.
			</span>
		</div> -->
		<div id="button-wrapper">
			<button class="primary big" @click="send()">Send</button>
		</div>
		<TxStatus :status="txStatus" :onHidden="hideStatus"/>
	</div>
</template>

<script>
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import AssetPicker from '../../components/AssetPicker.vue';
import TxStatus from '../../components/TxStatus.vue';

import erc20Abi from '../../data/abi/erc20.json';
import decimals from '../../data/decimals.json';
import addresses from '../../data/addresses.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

export default {
	components: {
		AssetPicker,
		TxStatus,
	},
	data() {
		return {
			account: undefined,
			amount: '0',
			asset: 'ETH',
			recipient: '',
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
	},
	methods: {
		assetSelected(asset) {
			this.asset = asset;
		},
		hideStatus() {
			this.txStatus = 'none';
		},
		async setMax() {
			const account = this.account.address;
			if (this.asset == 'ETH') {
				const etherBalance = await provider.getBalance(account);
				const amount = this.toShortAmount(etherBalance.toString(), this.asset);
				this.amount = amount;
			} else {
				const inputAddress = addresses[this.asset];
				const inputToken = new ethers.Contract(inputAddress, erc20Abi, provider);
				const inputTokenBalance = await inputToken.balanceOf(account);
				const amount = this.toShortAmount(inputTokenBalance.toString(), this.asset);
				this.amount = amount;
			}
		},
		async send() {
			if (this.asset == 'ETH') {
				const value = this.toLongAmount(this.amount, 'ETH');
				const valueNumber = new BigNumber(value);
				const transferTx = {
					value: '0x' + valueNumber.toString(16),
					to: this.recipient
				};
				try {
					this.txStatus = 'mining';
					const tx = await signer.sendTransaction(transferTx);
					const txReceipt = await provider.getTransactionReceipt(tx.hash);
					if (txReceipt.status == 1) {
						this.txStatus = 'success';
					} else {
						this.txStatus = 'failure';
					}
				} catch(e) {
					this.txStatus = 'rejected';
				}
			} else {
				const address = addresses[this.asset];
				const amount = this.toLongAmount(this.amount, this.asset);
				const erc20 = new ethers.Contract(address, erc20Abi, signer);
				try {
					this.txStatus = 'mining';
					const tx = await erc20.transfer(this.recipient, amount);
					const txReceipt = await provider.getTransactionReceipt(tx.hash);
					if (txReceipt.status == 1) {
						this.txStatus = 'success';
					} else {
						this.txStatus = 'failure';
					}
				} catch(e) {
					this.txStatus = 'rejected';
				}
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
			if (routerState && routerState.asset) {
				this.asset = routerState.asset;
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
		formatValue(valueString, isInput) {
			if (this.isLastChangedInput == isInput) {
				return valueString;
			}
			if (this.loading) {
				return '…';
			}
			const value = new BigNumber(valueString);
			return value.toFixed(6);
		},
	},
}
</script>

<style scoped>
#view {
	margin-top: 2em;
}

#amount-form-wrapper {
	margin-top: 1em;
}

#badge-wrapper {
	margin-top: 2em;
}

#button-wrapper {
	margin-top: 1em;
}
</style>
