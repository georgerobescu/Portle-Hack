<template>
	<div>
		<div id="picker-wrapper">
			Repay
			<span class="input-group">
				<Picker :value="loanAsset" :list="loanAssets" :onSelect="loanAssetSelected" class="inline"/>
			</span>
			loan with
			<span class="input-group">
				<Picker :value="repayAsset" :list="repayAssets" :onSelect="repayAssetSelected" class="inline"/>
			</span>
			on using
			<span class="input-group">
				<Picker :value="platform" :list="platforms" :onSelect="platformSelected" class="inline"/>
			</span>
		</div>
		<div id="amount-picker-wrapper">
			<span class="input-group">
				<span class="label">Amount</span>
				<input class="amount" v-model="amount">
				<span class="label label-ghost label-right inline">{{ repayAsset }}</span>
			</span>
		</div>
		<div id="button-wrapper">
			<button class="primary big" @click="repay()">Repay</button>
		</div>
		<TxStatus :status="txStatus" :onHidden="hideStatus"/>
	</div>
</template>

<script>
import Picker from '../../../components/Picker.vue';
import TxStatus from '../../../components/TxStatus.vue';

export default {
	components: {
		Picker,
		TxStatus,
	},
	data() {
		return {
			account: undefined,
			txStatus: 'none',
			loanAsset: 'DAI',
			repayAsset: 'ETH',
			platform: 'Compound',
			amount: '1',
		}
	},
	mounted() {
		this.loadAccount();
		if (!this.account) {
			this.$router.push('/login');
			return;
		}
	},
	methods: {
		loanAssetSelected(loanAsset) {
			this.loanAsset = loanAsset;
		},
		repayAssetSelected(repayAsset) {
			this.repayAsset = repayAsset;
		},
		platformSelected(platform) {
			this.platform = platform;
		},
		hideStatus() {
			this.txStatus = 'none';
		},
		async repay() {
		},
		loadAccount() {
			const address = localStorage.getItem('address');
			const auth = localStorage.getItem('auth') == 'true';
			if (!address) {
				return;
			}
			this.account = {
				address,
				auth,
			};
		},
	},
	computed: {
		loanAssets() {
			return ['DAI', 'USDC'];
		},
		repayAssets() {
			return ['ETH', 'WBTC', 'ZRX', 'REP'];
		},
		platforms() {
			return ['Compound'];
		},
	},
}
</script>

<style scoped>
#picker-wrapper {
	margin-top: 2em;
}

#amount-picker-wrapper {
	margin-top: 2em;
}

#button-wrapper {
	margin-top: 1em;
}
</style>
