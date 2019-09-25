import Vue from 'vue';
import VueRouter from 'vue-router';

import App from './App.vue';

import Login from './views/Login.vue';
import Portfolio from './views/Portfolio.vue';
import Asset from './views/read/Asset.vue';
import Deposit from './views/read/Deposit.vue';

Vue.use(VueRouter);

const routes = [
	{ path: '/login', component: Login },
	{ path: '/', component: Portfolio },
	{ path: '/asset/:ticker', component: Asset },
	{ path: '/deposit/:platform/:ticker', component: Deposit },
];

const router = new VueRouter({
	mode: 'history',
	routes
});

const app = new Vue({
	router,
	render: h => h(App),
	el: '#app'
});
