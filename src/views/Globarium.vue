<script setup>
import Globarium from '../components/Globarium.vue'
</script>

<script>
export default {
  data () {
    return {
      hideIntro: false
    }
  }
}
</script>

<template>
  <div id="intro" v-if="!hideIntro"  @click="hideIntro = true">
    <h1>GLOBARIUM</h1>
    <p>A concave hollow globe experiment. <br />Inspired by the Mapparium in Boston, <br />
    and the climate crisis.</p>
    <p>A work in progress by <a href="http://m.ash.to">Michael Aschauer</a>,<br />
    Sound: Gridshifter by <a href="http://www.sonotope.org/innode/innode-gridshifter/">Innode</a> <br />
      <a href="http://fooviz.xyz">fooviz.xyz</a> &copy; 2019/21</p>
  </div>

  <Globarium @run="hideIntro = true" />
</template>

<style scoped>

#intro {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1;
  font-size:14px;
  width:50%;
  text-shadow: 3px 3px 5px black;
  /*background-color: rgba(0,0,0,.6);*/
}
#intro h1 {font-size:82px;font-weight:normal;margin-bottom:48px}
button { margin-bottom: 10px !important}

@media (max-width:767px){
   #intro  {font-size:13px;  width:90%;}
   #intro h1 {font-size:48px }
}

</style>
