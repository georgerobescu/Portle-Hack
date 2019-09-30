<template>
	<div id="view">
		<div id="swap-form">
			<div>
				<span class="input-group">
					<span class="max-label">MAX</span>
					<input class="amount" value="1000" placeholder="0">
					<AssetPicker :startTicker="'DAI'" :onSelect="inputTokenSelected" class="inline"/>
				</span>
			</div>
			<span id="swap-direction">
				<img :src="chevronDown" class="swap-icon swap-direction">
			</span>
			<div>
				<span class="input-group">
					<span class="max-label">MAX</span>
					<input class="amount" value="5.5175" placeholder="0">
					<AssetPicker :startTicker="'ETH'" :onSelect="outputTokenSelected" class="inline"/>
				</span>
			</div>
		</div>
		<div style="margin-top: 2em;">
			Rate: 1 ETH = 181.243 DAI
		</div>
		<div style="margin-top: 2em">
			<span class="badge badge-info">
				You are selling 1000 DAI to get at least 5.508 ETH.
			</span>
			<!-- <span class="badge badge-info">
				You are buying 5.5 DAI to spend no more than 1008 DAI.
			</span> -->
		</div>
		<!-- <div style="margin-top: 2em">
			<span class="badge badge-danger">
				Expected slippage is 1.58%.
			</span>
		</div> -->
		<div style="margin-top: 1em">
			<button class="primary big">Swap</button>
		</div>
	</div>
</template>

<script>
import AssetPicker from '../../components/AssetPicker.vue';

import chevronDown from '../../../assets/chevron-down.svg';

export default {
	components: {
		AssetPicker,
	},
	methods: {
		inputTokenSelected(ticker) {
		},
		outputTokenSelected(ticker) {
		},
	},
	computed: {
		chevronDown() {
			return chevronDown;
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
