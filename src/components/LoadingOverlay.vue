<template>
  <div class="loading" :style="'background: '+ background">
    <div class="">
      <slot></slot>
    </div><br>
    <div>
      <LoadingSpinner :color="color" />
    </div>
  </div>
</template>

<script setup>
import LoadingSpinner from './LoadingSpinner.vue'
</script>

<script>
export default {
  name: "LoadingLayer",
  props: {
    background: {
      type: String,
      required: false,
      default: '#00a014'
    },
    color: {
      type: String,
      required: false,
      default: 'black'
    }
  }
}
</script>

<style scoped>

.loading {
  background: green;
  position: fixed;
  top: 0;
  left: 0;
  width:100%;
  height:100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

svg.spinner {
  animation: 2s linear infinite spinner-animation;
  width: 48px;
}

@keyframes spinner-animation {
  0% {
    transform: rotateZ(0deg);
  }
  100% {
    transform: rotateZ(360deg)
  }
}

svg.spinner circle {
  display: block;
  fill: transparent;
  stroke-linecap: round;
  stroke-dasharray: 28px;
  stroke-dashoffset: 18px;
  stroke-width: 5px;
  transform-origin: 50% 50%;
}
</style>
