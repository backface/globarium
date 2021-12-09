import { createWebHistory, createWebHashHistory, createRouter } from "vue-router";
import Globe from "./views/Globe.vue";
import Globe1951 from "./views/Globe1951.vue";
import Globarium from "./views/Globarium.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Globarium,
  },
  {
    path: "/globe1951",
    name: "Globe",
    component: Globe,
  },
  {
    path: "/globe",
    name: "Globe",
    component: Globe,
  },
  {
    path: "/globarium",
    name: "Globarium",
    component: Globarium,
  },
  { path: '/:pathMatch(.*)', redirect: '/' },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
