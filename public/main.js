import Vue from 'vue';
import VueRouter from 'vue-router';

import App from './App.vue';

import Login from './views/Login.vue';
import Portfolio from './views/Portfolio.vue';

import Asset from './views/view/Asset.vue';
import Deposit from './views/view/Deposit.vue';
import Loan from './views/view/Loan.vue';
import Fund from './views/view/Fund.vue';

import Send from './views/manage/Send.vue';
import Swap from './views/manage/Swap.vue';
import ManageDeposit from './views/manage/Deposit.vue';
import ManageLoan from './views/manage/Loan.vue';
import ManageFund from './views/manage/Fund.vue';

import Leverage from './views/manage/advanced/Leverage.vue';
import CarryTrade from './views/manage/advanced/CarryTrade.vue';
import DepositBridge from './views/manage/advanced/DepositBridge.vue';
import SmartRepay from './views/manage/advanced/SmartRepay.vue';

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
	{ path: '/deposit/new', component: ManageDeposit },
	{ path: '/loan/new', component: ManageLoan },
	{ path: '/fund/new', component: ManageFund },

	{ path: '/leverage', component: Leverage },
	{ path: '/carry-trade', component: CarryTrade },
	{ path: '/deposit-bridge', component: DepositBridge },
	{ path: '/smart-repay', component: SmartRepay },
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
