<template>
  <svg class="spinner" viewBox="0 0 100 100">
    <line :style="'stroke: '+color" x1="0" y1="50" x2="100" y2="50" />
  </svg>
</template>

<script>
export default {
  props: {
    color: {
      type: String,
      required: false,
      default: 'white'
    }
  }
}
</script>

<style scoped>

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
svg.spinner line {
  display: block;
  fill: transparent;
  stroke-linecap: round;
  stroke-width: 5px;
}

</style>
