import Vue from 'vue';
import VueRouter from 'vue-router';

import App from './App.vue';

import Login from './views/Login.vue';
import Portfolio from './views/Portfolio.vue';

import Asset from './views/read/Asset.vue';
import Deposit from './views/read/Deposit.vue';
import Loan from './views/read/Loan.vue';
import Fund from './views/read/Fund.vue';

import Send from './views/write/Send.vue';
import Swap from './views/write/Swap.vue';
import NewDeposit from './views/write/NewDeposit.vue';
import NewLoan from './views/write/NewLoan.vue';
import NewFund from './views/write/NewFund.vue';

Vue.use(VueRouter);

const routes = [
	{ path: '/login', component: Login },
	{ path: '/', component: Portfolio },

	{ path: '/asset/:ticker', component: Asset },
	{ path: '/deposit/:platform/:ticker', component: Deposit },
	{ path: '/loan/:platform/:ticker', component: Loan },
	{ path: '/fund/melon/:name', component: Fund },

	{ path: '/send', component: Send },
	{ path: '/swap', component: Swap },
	{ path: '/deposit/new', component: NewDeposit },
	{ path: '/loan/new', component: NewLoan },
	{ path: '/fund/new', component: NewFund },
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
