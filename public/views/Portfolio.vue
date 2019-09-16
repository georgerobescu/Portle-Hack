<template>
	<div>
	</div>
</template>

<script>
export default {
	mounted() {
		const address = localStorage.getItem('address');
		console.log(address);
		if (!address) {
			this.$router.push('/login');
		}
	},
}
</script>
