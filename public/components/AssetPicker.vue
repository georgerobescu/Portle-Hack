<template>
	<div>
		<div class="picker" @click="toggle()">
			<div class="container">
				<div class="asset">
					<span>{{ ticker }}</span>
					<span>({{ name }})</span>
				</div>
				<img :src="chevron" class="swap-icon">
			</div>
		</div>
		<div class="modal scrollable" v-if="modal">
			<div class="option" @click="select(ticker)" v-for="ticker in tickers">
				{{ ticker }}
			</div>
		</div>
	</div>
</template>

<script>
import tokens from '../data/tokens.json';

import chevronUp from '../../assets/chevron-up.svg';
import chevronDown from '../../assets/chevron-down.svg';

export default {
	props: ['ticker', 'onSelect'],
	data() {
		return {
			'modal': false,
		}
	},
	methods: {
		toggle() {
			this.modal = !this.modal;
		},
		select(ticker) {
			this.modal = false;
			this.onSelect(ticker);
		},
	},
	computed: {
		name() {
			return tokens[this.ticker];
		},
		chevron() {
			return this.modal
				? chevronUp
				: chevronDown;
		},
		tickers() {
			return Object.keys(tokens);
		},
	},
}
</script>

<style scoped>
.picker {
	width: 210px;
	display: inline-block;
	margin-left: 1em;
	padding: 0.5em 0.75em 0.5em 0.75em;
	border-left: 1px solid #eeeeee;
	cursor: pointer;
}

.picker:hover {
	background: #eeeeee;
}

.container {
	display: flex;
	justify-content: space-between;
}

.modal {
	width: 241px;
	position: absolute;
	margin-left: 1em;
	background: white;
	border-left-color: white;
	cursor: pointer;
}

.scrollable {
	height: 300px;
	overflow: hidden;
	overflow-y: scroll;
}

.option {
	padding: 0.25em 0.75em;

}

.option:hover {
	background: #eeeeee;
}

.asset {
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
}

.swap-icon {
	width: 12px;
}
</style>
