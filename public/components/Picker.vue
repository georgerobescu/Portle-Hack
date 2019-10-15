<template>
	<div id="picker" @blur="hide()" tabindex="0">
		<div class="picker" @click="toggle()">
			<div class="container">
				<div class="value">
					<span>{{ value }}</span>
				</div>
				<img :src="chevron" class="chevron-icon">
			</div>
		</div>
		<div class="modal scrollable" v-if="modal">
			<div class="option" @click="select(item)" v-for="item in list">
				{{ item }}
			</div>
		</div>
	</div>
</template>

<script>
import chevronUp from '../../assets/chevron-up.svg';
import chevronDown from '../../assets/chevron-down.svg';

export default {
	props: ['value', 'list', 'onSelect'],
	data() {
		return {
			'modal': false,
		}
	},
	methods: {
		toggle() {
			this.modal = !this.modal;
		},
		hide() {
			this.modal = false;
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
#picker:focus {
	outline: none;
}

.picker {
	width: 120px;
	display: inline-block;
	padding: 0.5em 0.75em 0.5em 0.75em;
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
	width: 151px;
	position: absolute;
	background: white;
	border-left-color: white;
	cursor: pointer;
}

.scrollable {
	max-height: 300px;
	overflow: hidden;
	overflow-y: scroll;
}

.option {
	padding: 0.25em 0.75em;

}

.option:hover {
	background: #eeeeee;
}

.value {
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
}

.chevron-icon {
	width: 12px;
}
</style>
