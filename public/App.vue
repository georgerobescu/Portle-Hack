<template>
	<div>
		<header v-if="showNavigation()">
			<div class="header-part" @click="openHomePage()">
				<img src="../assets/logo.svg" height="32px">
				<h1 id="title">Portle</h1>
			</div>
			<div class="header-part">
				<span>{{ formatAddress() }}</span>
				<button @click="logout()" id="logout-button">Logout</button>
			</div>
		</header>
		<main>
			<aside></aside>
			<section>
				<router-view/>
			</section>
			<aside></aside>
		</main>
		<footer v-if="showNavigation()"></footer>
	</div>
</template>

<script>
export default {
	methods: {
		showNavigation() {
			const path = this.$route.path;
			if (path == '/login') {
				return false;
			}
			return true;
		},
		openHomePage() {
			this.$router.push('/');
		},
		logout() {
			localStorage.removeItem('address');
			localStorage.removeItem('auth');
			this.$router.push('/login');
		},
		formatAddress() {
			const address = localStorage.getItem('address');
			if (!address) {
				return '';
			}
			const ellipsizedAddress = `${address.substr(0, 6)}…${address.substr(38)}`;
			return ellipsizedAddress;
		}
	}
}
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Source+Code+Pro|Source+Sans+Pro&display=swap');

body {
	margin: 0;
	background: #f8f8f8;
	color: #282821;
	font-size: 20px;
	font-family: 'Source Sans Pro', -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}

header {
	padding: 0px 16px 0px 16px;
	display: flex;
	justify-content: space-between;
	box-shadow: 0px 1px 4px -2px rgba(0,0,0,0.75);
}

footer {
	height: 64px;
}

main {
	display: flex;
}

aside {
	flex: 2;
}

section {
	flex: 5;
}

h1#title {
	margin: 0.25em 0;
	font-size: 1.75em;
}

button {
	padding: 0px 1rem;
	font-size: 0.75em;
	height: 2rem;
	min-width: 2rem;
	background: none;
	cursor: pointer;
	border: none;
	background: #eedfbd;
	color: #333333;
	border-radius: 4px;
}

button.primary {
	background: #efb22d;
	color: white;
	border: none;
}

button.big {
	padding: 0px 1.5em;
	font-size: 1em;
	height: 2.5em;
}

button.action {
	margin: 0 0.5em;
}

button:hover {
	background: #dbbb74;
	box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 4px;
}

button.primary:hover {
	background: #e6a10d;
}

button:active {
	background: #dbbb74;
}

button.primary:active {
	background: #d79406;
}

button:disabled {
	opacity: 0.5;
	pointer-events: none;
}

input {
	height: 28px;
	border: none;
	font-size: 1em;
	color: #282821;
}

input.address {
	width: 480px;
	margin-left: 8px;
	text-transform: lowercase;
}

input.amount {
	text-align: right;
	font-family: 'Source Code Mono', monospace;
	width: 240px;
}

input.invalid {
	color: #c80815;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.input-group {
	padding: 0.5em 0;
	background: white;
}

.label {
	padding: 0.5em 1.25em 0.5em 1.25em;
	color: #393939;
	background: #d2d2d2;
	cursor: default;
}

.label-ghost {
	border-left: 1px solid #eeeeee;
	background: white;
}

.label-right {
	margin-left: 1em;
}

.max-label {
	margin-left: 1.25em;
	font-size: 0.75em;
	cursor: pointer;
	color: grey;
}

.max-label:hover {
	color: #282821;
}

.action-selector {
	padding: 0.25em 0.5em;
	margin: 0.5em 1em 0.5em 0;
	color: gray;
	cursor: pointer;
}

.action-selector:hover {
	color: #282821;
}

.action-selector.selected {
	color: #282821;
	border-bottom: 2px solid #efb22d;
}

.asset-selector {
	width: 60px;
	margin: 0.5em 1em 0.5em 0;
	padding: 0.5em 1em;
	cursor: pointer;
	font-size: 20px;
	color: grey;
	background: white;
	border: 2px solid #d3d3d3;
}

.asset-selector:hover {
	color: #282821;
	border-color: #a4a4a4;
}

.asset-selector.selected {
	color: #282821;
	border-color: #efb22d;
}

.app-selector {
	width: 100px;
	margin: 0.5em 1em 0.5em 0;
	padding: 0.5em 1em;
	cursor: pointer;
	color: grey;
	background: white;
	border: 2px solid #d3d3d3;
}

.app-selector:hover {
	color: #282821;
	border-color: #a4a4a4;
}

.app-selector.selected {
	color: #282821;
	border-color: #efb22d;
}

.fund-selector {
	width: 200px;
	margin: 0.5em 1em 0.5em 0;
	padding: 0.5em 1em;
	cursor: pointer;
	color: grey;
	background: white;
	border: 2px solid #d3d3d3;
}

.fund-selector:hover {
	color: #282821;
}

.fund-selector.selected {
	color: #282821;
	border-color: #efb22d;
}

.badge {
	padding: 0.75rem 1.25rem;
	font-size: 0.75em;
}

.badge-info {
	background: #eedfbd;
}

.badge-danger {
	background: #eedfbd;
}

.hidden {
	opacity: 0;
	cursor: inherit;
}
</style>

<style scoped>
.header-part {
	display: flex;
	align-items: center;
}

h1#title {
	margin-left: 0.5em;
	cursor: default;
}

#logout-button {
	margin-left: 16px;
}
</style>
