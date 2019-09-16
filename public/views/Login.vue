<template>
	<div id="view">
		<h1 id="title">Portle</h1>
		<div>
			<span class="input-group">
				<input id="address" class="address" placeholder="Enter address" v-model="address">
				<span id="watch" @click="watch()">Watch</span>
			</span>
		</div>
		<div id="divider">or</div>
		<button id="main" class="primary big" @click="login()">Login with Ethereum</button>
		<div id="placeholder"></div>
	</div>
</template>

<script>
export default {
	data() {
		return {
			address: '',
		}
	},
	methods: {
		async login() {
			const addresses = await ethereum.enable();
			const address = addresses[0];
			localStorage.setItem('address', address);
			localStorage.setItem('auth', true);
			this.$router.push('/');
		},
		async watch() {
			const address = this.address;
			localStorage.setItem('address', address);
			localStorage.setItem('auth', false);
			this.$router.push('/');
		},
		async isAddressValid(address) {
			if (address.length == 0) {
				return true;
			}
			const addressRegex = /0x[0-9A-Fa-f]{40}/g;
			return addressRegex.test(address);
		},
	}
}
</script>

<style scoped>
h1#title {
	margin: 1.5em;
	font-size: 2em;
}

div#view {
	height: 100vh;
	display: flex;
	flex-direction:column;
	justify-content: center;
	align-items: center;
}

div#placeholder {
	height: 200px;
}

input#address {
	margin-left: 0.5em;
}

button#main {
	margin-top: 0.5em;
}

#watch {
	margin-left: 1em;
	padding: 0.5em 1.25em 0.5em 1.25em;
	border-left: 1px solid #f2f2f2;
	cursor: pointer;
}

#watch:hover {
	background: #f2f2f2;
}

#divider {
	margin-top: 1em;
}
</style>
