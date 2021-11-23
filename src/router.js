import { createWebHistory, createWebHashHistory, createRouter } from "vue-router";
import Globe from "./views/Globe.vue";
import Globe1951 from "./views/Globe1951.vue";
import Globarium from "./views/Globarium.vue";
import Home from "./views/Home.vue";
import Model from "./views/Model.vue";
import RollerCoaster from "./views/RollerCoaster.vue";
import CDIXRRC from "./views/CDIXRRC.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
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
    path: "/globe-1951",
    name: "Globe1951",
    component: Globe1951,
  },
  {
    path: "/globarium",
    name: "Globarium",
    component: Globarium,
  },
  {
    path: "/rollercoaster",
    name: "RollerCoaster",
    component: RollerCoaster,
  },
  {
    path: "/cdixrrc",
    name: "CDIXRRC",
    component: CDIXRRC,
  },
  {
    path: "/model",
    name: "Model",
    component: Model,
  },

];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
