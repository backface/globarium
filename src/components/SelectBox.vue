<template>
  <div class="custom-select" :tabindex="tabindex" @blur="open = false">
    <div class="selected"
      :class="{ open: open }"
      @click="open = !open"
      v-html="selected.name || defaultText"
    />
    <div class="mouseover" :class="{ selectHide: !open }">
      <div v-if="intro" class="intro">
        {{ intro }}
      </div>
      <!-- eslint-disable -->
      <div
        v-for="(option, i) of options"
        :key="i"
        :class="{ item: true, active: selected === option}"
        @click="
          selected = option;
          open = false;
          $emit('input', option);
        "
        v-html="option.name"
      ></div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    options: {
      type: Array,
      required: true
    },
    default: {
      type: Number,
      required: false,
      default: null
    },
    intro: {
      type: String,
      required: false,
      default: null
    },
    tabindex: {
      type: Number,
      required: false,
      default: 0
    },
    defaultText: {
      type: String,
      required: false,
      default: 'Choose a value'
    }
  },

  data () {
    return {
      selected: this.default ? this.options.find(d => d.id === this.default) : this.options.length > 0 ? this.options[0] : 0,
      open: false
    }
  },

  watch: {
    default (newval, oldval) {
      this.selected = this.options.find(d => d.id === newval)
    }
  },

  computed: {
    unselected () {
      return this.options.filter(d => d.id !== this.selected.id)
    }
  },

  mounted () {
    // this.$emit('input', this.selected)
  }
}
</script>

<style scoped>

.custom-select {
  position: relative;
  outline: none;
  font-size: 16px;
}

.custom-select .selected {
  background-color: none;
  border: 0px solid white;
  color: #7e7a00 ;
  cursor: pointer;
  text-align: center;
  user-select: none;
  padding: 0px 10px;;
}

.custom-select .selected.open {
}

.mouseover {
  position: absolute;
  left: 50%;
  top: -8px;
  width: 300px;
  transform: translate(-50%, 0);
  background: black;
  color: white;
  line-height: 1.6em;
  padding: 5px 10px;
  text-align: center;
  box-shadow: 10px 6px 12px rgba(0,0,0,0.35)
}

.mouseover sup {
    line-height: 0;

    /* The following rules (or similar) likely come from browser
     * style and are not needed
     */
    font-size: 2.83em;
    vertical-align: super;
}


.custom-select .mouseover .item {
  cursor: pointer;
  user-select: none;
}

.custom-select .mouseover .intro {
  line-height: 1.2em; padding-bottom: 8px
}

.custom-select .mouseover .item:hover {
  opacity: 0.8
}
.custom-select .mouseover .item.active {
  color: #7e7a00;
  opacity: 0.8
}

.selectHide {
  display: none;
}
</style>
