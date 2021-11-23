<template>
  <div class="custom-select" :tabindex="tabindex" @blur="close">
    <div
      class="mouseover"
      :style="{
        width: width + 2 * padding + 'px',
        left: (-width/2) + 'px'
      }"
      @mouseup="captureOff"
      @mousedown="oneOff"
      @mouseleave="captureOff"
      @mousemove="drag"
      @touchend="captureOff"
      @touchmove="drag"
    >
      <div
        ref="line"
        class="line"
        :style="{ width: width + 'px', left: padding + 'px'}"
      />
      <div
        class="knob"
        :class="{ active: captureToggle }"
        :style="{ left: padding + (value / ratio) - (min / ratio) + 'px'}"
        @mousedown="captureOn"
        @mouseup="captureOff"
        @touchstart="captureOn"
        @touchend="captureOff"
      >
        &#x25CF;
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    evalue: {
      type: Number,
      required: false,
      default: 1850
    },
    default: {
      type: Number,
      required: false,
      default: 1850
    },
    width: {
      type: Number,
      required: false,
      default: 220
    },
    min: {
      type: Number,
      required: false,
      default: 1850
    },
    max: {
      type: Number,
      required: false,
      default: 2100
    },
    tabindex: {
      type: Number,
      required: false,
      default: 0
    }
  },

  data () {
    return {
      value: this.default || 1850,
      padding: 20,
      captureToggle: false,
      x: 0,
      start_x: 0,
      ratio: (this.max - this.min) / this.width,
      open_offset: 10
    }
  },

  mounted () {
    // this.$emit('input', this.selected)
  },

  watch: {
    evalue (newVal, oldVal) {
      // console.log(newVal);
      if (!this.captureToggle) {
        this.value = newVal
      }
    }
  },

  methods: {
    open () {
      this.open_offset = -((this.value / this.ratio) - (this.min / this.ratio))
      this.is_open = true
    },
    close () {
      this.captureToggle = false
      this.is_open = false
    },
    drag (event) {
      let touch
      if (event.touches) {
        touch = event.touches[0]
        event.preventDefault()
      } else {
        touch = event
      }
      if (this.captureToggle) {
        this.value = Math.max(this.min, Math.min(this.min + this.scale(touch.clientX - this.start_x), this.max))
        this.$emit('input', this.value)
        // document.addEventListener("touchmove",function(){
        //  event.preventDefault();
        // },false);
      }
    },
    scale (v) {
      return Math.floor(this.ratio * v)
    },
    captureOn (event) {
      this.start_x = this.$refs.line.getBoundingClientRect().left
      this.captureToggle = true
    },
    oneOff (event) {
      if (!this.captureToggle) {
        this.start_x = this.$refs.line.getBoundingClientRect().left
        this.value = Math.max(this.min, Math.min(this.min + this.scale(event.clientX - this.start_x), this.max))
      }
    },
    captureOff (event) {
      this.captureToggle = false
      this.close()
      this.$emit('input', this.value)
    }
  }
}
</script>

<style scoped>

.custom-select {
  position: relative;
  outline: none;
  display: block;
  height: 42px;
}

.custom-select .selected {
  cursor: pointer;
  text-align: left ;
  user-select: none;

}
.custom-select .selected:hover {
  color:  white
}

.mouseover {
  position: absolute;
  background: transparent;
  padding-top: 10px;
  left: 0px;
  top: 0px;
  z-index: 1;
  height: 14px;
  color: white;
  line-height: 1.4em;
  border: 0px;
  cursor: pointer;
}

.line {
  position: absolute;
  border-bottom: 1px solid #d0d0d0;
  opacity: 0.8;
}

.knob {
  color: #a0a0a0;
  position: absolute;
  font-size: 18px;
  margin-top: -11px;
  margin-left: -5px;
  cursor: move;
}
.knob.active {
  color: white;
  cursor: move;
}

.label {
  font-size: 0.75em;
  line-height: 18px;
}
.custom-select .mouseover div {
  user-select: none;
}

.custom-select .mouseover div:hover {
  /* color: gray; */
}

.custom-select .mouseover div.active {
  color: white;
}

.selectHide {
  display: none;
}
</style>
