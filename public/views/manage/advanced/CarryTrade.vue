<template>
	<div>
		<div id="deposit-picker-wrapper">
			<span class="input-group">
				<span class="label">Deposit asset</span>
				<Picker :value="depositAsset" :list="depositAssets" :onSelect="depositAssetSelected" class="inline"/>
			</span>
		</div>
		<div id="strategy-picker-wrapper">
			Borrow
			<span class="input-group">
				<Picker :value="fundingAsset" :list="assets" :onSelect="fundingAssetSelected" class="inline"/>
			</span>
			to lend
			<span class="input-group">
				<Picker :value="lendingAsset" :list="assets" :onSelect="lendingAssetSelected" class="inline"/>
			</span>
			using
			<span class="input-group">
				<Picker :value="platform" :list="platforms" :onSelect="platformSelected" class="inline"/>
			</span>
		</div>
		<div id="rate-wrapper">
			<p>USDC borrow rate: 8.9%</p>
			<p>DAI supply rate: 10.1%</p>
			<p>Net rate: 1.2%</p>
		</div>
		<div id="amount-picker-wrapper">
			<span class="input-group">
				<span class="label">Amount</span>
				<input class="amount" v-model="amount">
				<span class="label label-ghost label-right inline">{{ depositAsset }}</span>
			</span>
		</div>
		<div id="button-wrapper">
			<button class="primary big" @click="trade()">Trade</button>
		</div>
		<TxStatus :status="txStatus" :onHidden="hideStatus"/>
	</div>
</template>

<script>
import Vue from 'vue';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import Picker from '../../../components/Picker.vue';
import TxStatus from '../../../components/TxStatus.vue';

import erc20Abi from '../../../data/abi/erc20.json';
import kyberProxyAbi from '../../../data/abi/kyberProxy.json';
import compoundTokenAbi from '../../../data/abi/compoundToken.json';
import compoundEtherAbi from '../../../data/abi/compoundEther.json';
import fulcrumPositionTokenAbi from '../../../data/abi/fulcrumPositionToken.json';

import prices from '../../../data/prices.json';
import decimals from '../../../data/decimals.json';
import addresses from '../../../data/addresses.json';

const kyberProxyAddress = '0x818e6fecd516ecc3849daf6845e3ec868087b755';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

export default {
	components: {
		Picker,
		TxStatus,
	},
	data() {
		return {
			account: undefined,
			txStatus: 'none',
			depositAsset: 'ETH',
			fundingAsset: 'USDC',
			lendingAsset: 'DAI',
			platform: 'Compound',
			amount: '1',
		}
	},
	methods: {
		depositAssetSelected(depositAsset) {
			this.depositAsset = depositAsset;
		},
		fundingAssetSelected(fundingAsset) {
			this.fundingAsset = fundingAsset;
			if (fundingAsset == 'USDC') {
				this.lendingAsset = 'DAI';
			}
			if (fundingAsset == 'DAI') {
				this.lendingAsset = 'USDC';
			}
		},
		lendingAssetSelected(lendingAsset) {
			this.lendingAsset = lendingAsset;
			if (lendingAsset == 'USDC') {
				this.fundingAsset = 'DAI';
			}
			if (lendingAsset == 'DAI') {
				this.fundingAsset = 'USDC';
			}
		},
		platformSelected(platform) {
			this.platform = platform;
		},
		hideStatus() {
			this.txStatus = 'none';
		},
		async trade() {
		},
	},
	computed: {
		depositAssets() {
			return ['ETH', 'WBTC', 'ZRX', 'REP'];
		},
		assets() {
			return ['USDC', 'DAI'];
		},
		platforms() {
			return ['Compound', 'Fulcrum'];
		},
	}
}
</script>

<style scoped>
#deposit-picker-wrapper {
	margin-top: 2em;
}

#strategy-picker-wrapper {
	margin-top: 2em;
}

#rate-wrapper {
	margin-top: 1em;
}

#amount-picker-wrapper {
	margin-top: 2em;
}

#button-wrapper {
	margin-top: 1em;
}

</style>