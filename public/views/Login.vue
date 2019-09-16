<template>
	<div style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
		<h1 style="margin: 1.5em; font-size: 2em;">Portle</h1>
		<div>
			<span class="input-group">
				<input style="margin-left: 0.5em;" class="address" placeholder="Enter address" v-model="address">
				<span id="watch" @click="watch()">Watch</span>
			</span>
		</div>
		<div style="margin-top: 1em">or</div>
		<button class="primary big" @click="login()" style="margin-top: 0.5em">Login with Ethereum</button>
		<div style="height: 200px"></div>
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

<style>
#watch {
	margin-left: 1em;
	padding: 0.5em 1.25em 0.5em 1.25em;
	border-left: 1px solid #f2f2f2;
	cursor: pointer;
}

#watch:hover {
	background: #f2f2f2;
}
</style>
