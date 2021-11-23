<template>
  <div class="chart">
    <svg :width="width + 'px'" :height="height">
      <path
        :d="path"
        class="line"
        fill="none"
        stroke-width="1"
        stroke="white"
      />
      <g></g>
    </svg>
  </div>
</template>

<script>
import * as d3 from 'd3'

export default {

  name: 'LineChart',
  props: {
    date: Date,
    year: Number,
    data: Array,
    width: { default: 160, type: Number },
    height: { default: 80, type: Number },
    ticks: { default: false, type: Boolean },
  },

  data () {
    return {
      margin_x: 2,
      margin_y: 5,

    }
  },

  computed: {


    display_data () {
      return this.data.filter(d => +d.year <= this.year)
    },

    scale_x () {
      return  d3.scaleTime()
        .range([this.margin_x, this.width - this.margin_x])
        .domain([0, this.display_data.length]);
    },

    scale_y () {
      return  d3.scaleLinear()
        .range([this.height - this.margin_y * 2, this.margin_y])
        .domain(d3.extent(this.display_data , d => d.value))
    },

    path: function () {
      var self = this;
      return  d3.line()
        .x(function(d,i) { return self.scale_x(i); })
        .y(function(d) {  return self.scale_y(d.value); })(self.data)
    },

    axis_x() {
      if (this.ticks) {
        return d3.axisTop(this.scale_x)
          .tickValues(d3.range(0, this.display_data.length, 7))
          .tickFormat("");
      } else
        return false

    },
  },

  mounted () {
  },

  watch:  {
     year (newval, oldval) {
       if (this.ticks) {
         d3.select(this.$el).select("svg").select("g")
          .attr("class","axis")
          .attr("transform", "translate(0," + (this.height + 1) + ")")
          .call(this.axis_x);
      }
    }
  },
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#map {
  padding:0;margin:0;
  height: 100%;
  width: 100%;
}
svg { margin-top:10px}
.diff {margin:0px auto; opacity: 1;font-size:1em;}
.diff span {background:white;opacity: 0.8; padding:0px 5px 0px 5px;}
svg .axis path { display: none !important;}

</style>
