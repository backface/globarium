<template>
    <div>
      <div class="scene" ref="scene"></div>
      <!--
      <div v-if="!hasVR && !isPresenting" class="enterfs">
        <a @click="enterFullscreen">Enter Anyway</a>
      </div>
    -->
      <video ref="video" src="" muted playsinline loop style="display: none" />
      <div class="year">
        {{ year }}<br>
        <SelectSlider :evalue="year" @input="selectYear"/>
        <div v-if="year > 1850 && temp != 0" class="anomaly">
          {{ temp }}
        </div>
      </div>
      <!--
      <div class="chart">
        <LineChart v-if="global_means.length > 1" :data="global_means" :year="year" />
      </div>
      -->

      <div class="credits">
       Reference period for temperature averages: 1850 - 1900<br>
       Based on projections of CNRM-CERFACS CNRM-CM6-1-HR model output <br>
       prepared for CMIP6 ScenarioMIP ssp245 (v20191202) and historical (v20191021)<br>
       Averaged and rendered by <a href="https://m.ash.to">m.ash.to</a>
      </div>
      <div class="legend">
         <b>-</b>12°C <img height="12" width="180" src="/img/colorscaleDark.png" /> <b>+</b>12°C
      </div>
  </div>
</template>

<style scoped>
.year, .anomaly {
  position: absolute;
  left: 50%;
  transform: translate(-50%, 0);
  top: 18px;
  color: white;
  z-index: 1000;
}
.chart {
  position: absolute;
  right: 15px;
  bottom: 15px;
  color: white;
  z-index: 1000;
}
.scene {  }
.anomaly { top: 45px; font-size:24px; }

</style>

<script setup>
import LineChart from './LineChart.vue'
import SelectSlider from './SelectSlider.vue'
</script>

<script>
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from 'tween';
import { csv, json } from "d3-fetch";
import { min, max} from "d3-array";
import { geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";
import { range } from "d3-array";
import { interpolateRdBu } from "d3-scale-chromatic"
import { format } from "d3-format";
import { cartogram } from '../helpers/cartogram';

import * as topojson from 'topojson-client';
import { makeGeometry } from '../helpers/3d_helpers'

// require("../helpers/FireShader");
// require("../helpers/Fire");

var MY_DATA; // = require("../../public/data/data.json");

const d3 = Object.assign(
  {},
  {
    json, csv,
    min, max,
    geoPath,
    scaleLinear,
    range,
    interpolateRdBu,
    format,
  }
)

var tempMatrix = new THREE.Matrix4();

export default {

  data () {
    return {
      hasVR: false,
      gazed: null,
      selected: null,
      country_data: null,
      data: null,
      width: 0,
      font: null,
      height: 0,
      framecounter: 0,
      dataset_counter: 0,
      barchart : null,
      data_label : null,
      year: 2017,
      country_color: 0x666666,
      isPresenting: false,
      vrButton: null,
      year: 1861,
      playerInterval: null,
      video: null,
      global_means: [],
      rotation: 0.005,
    };
  },

  computed: {
    temp () {
      if (this.global_means.length) {
        let val = this.global_means.find((d) => +d.year === this.year).value
        return d3.format("+0.2f")(val) + "°C"
      } else {
        return "0"
      }
    }
  },

  mounted () {
    this.radius = 2
    this.loadGlobalMeansData()
    this.initRenderer()
    this.initMyScene();
    this.loadCountries();
    window.addEventListener("resize", this.onResize)
  },

  destroyed () {
    window.removeEventListener("resize", this.onResize)
  },

  methods: {

    loadGlobalMeansData () {
      var self = this;
      var file = 'data/global-means-CNRM-CM6-1-HR.csv';
      // console.log("loading " + file);
      d3.csv(file).then(function(data) {
        self.global_means = data //.map((d) => d.climatology)
        self.global_means.forEach((item, i) => {
          item.value = +item.climatology
          item.date =  new Date(+item.year, 12, 1, 12, 30, 0);
        });

      });
    },

    selectYear (e) {
      this.year = e
      this.$refs.video.pause()
      //video.play()
      let current =(this.$refs.video.currentTime * 25)/12
      this.$refs.video.currentTime = ((this.year - 1850) * 12)/25;
    },

    initRenderer () {
      const el = this.$refs.scene;

      this.width = window.innerWidth; // el.clientWidth;
      this.height = window.innerHeight; // this.width * 9 / 16;
      //this.width = el.clientWidth;
      //this.height =  el.clientHeight;

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha:true });
      this.renderer.xr.enabled = true;
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(this.width, this.height);
      this.renderer.sortObjects = false;
      this.renderer.shadowMapEnabled	= true

      el.appendChild(this.renderer.domElement);
      /*
      this.vrButton = VRButton.createButton( this.renderer )
      el.appendChild(document.body.appendChild( this.vrButton));
      */
      this.scene = new THREE.Scene();

      // add camera
      this.camera = new THREE.PerspectiveCamera(
        75, this.width / this.height, 0.0001, 1000
      );

      // add lights
      // this.scene.add(new THREE.HemisphereLight('#fff', '#666', 1.5));
      this.scene.add( new THREE.AmbientLight( 0xffffff ));

      if ("xr" in navigator) {
        navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
          this.xrSupport = supported
        })
      }


      if (this.xrSupport) {
        this.hasVR = true;
        /*
        this.renderer.vr.enabled = true;
        this.renderer.render(this.scene, this.camera);

        // add vr controller
        this.vrController = this.renderer.xr.getController(0);
        this.vrController.addEventListener('selectstart', this.onSelectStart);
        this.vrController.addEventListener('selectend', this.onSelectEnd);
        this.scene.add(this.vrController);

        // add vr controller beam
        var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
          [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]
        ));
        line.name = 'line';
        line.scale.z = 5;
        this.vrController.add(line.clone());
        */

      } else {
        console.log('no webVR supported');
      }
      this.controls = new OrbitControls(this.camera, el);
      this.controls.minDistance = 2.7;
      this.controls.maxDistance = 25;

      this.controls.addEventListener('change', () => {
        this.rotation = 0
      })

      this.renderer.render(this.scene, this.camera);

      this.camera.position.z = 4;
      this.camera.position.x = 0;
      this.camera.position.y = 0;

      this.clock = new THREE.Clock();
      this.renderer.setAnimationLoop(this.render);
    },


    initMyScene () {
      this.globe = new THREE.Group();

      var video = this.$refs.video
      video.src = "/data/warming-frames-CNRM-CM6-1-HR.mp4"
      video.play()
      video.currentTime = 1.5;

      var videoTexture = new THREE.VideoTexture( video );
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBAFormat;
      videoTexture.generateMipmaps = true;

      let videoMaterial =   new THREE.MeshPhongMaterial({
          side: THREE.DoubleSide,
          map: videoTexture,
          transparent: true,
          opacity: 1
        })
      videoMaterial.bumpMap  = THREE.ImageUtils.loadTexture('img/textures/bump_map.jpg')
      videoMaterial.bumpScale = 102.85
      videoMaterial.specularMap    = THREE.ImageUtils.loadTexture('img/textures/earthspec1k.jpg')
      videoMaterial.specular  = new THREE.Color('white')

      var warmingvideo = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius - 0.02, 32, 32),
        videoMaterial
      );
      warmingvideo.name = "warmingvideo";
      this.globe.add(warmingvideo)

      var stars = new THREE.Mesh(
        new THREE.SphereGeometry(30, 32, 32),
        new THREE.MeshPhongMaterial({
          side: THREE.DoubleSide,
          map: THREE.ImageUtils.loadTexture('img/textures/galaxy_starfield.png'),
          transparent: true, opacity: 1,
        })
      );
      stars.name = "stars";
      this.globe.add(stars)

      this.glowMaterial = new THREE.ShaderMaterial({
    		uniforms: {
    			coeficient	: {
    				type	: "f",
    				value	: 1.0
    			},
    			power		: {
    				type	: "f",
    				value	: 2
    			},
    			glowColor	: {
    				type	: "c",
    				value	: new THREE.Color('gray')
    			},
    		},
        vertexShader: `
          varying vec3	vVertexWorldPosition;
		      varying vec3	vVertexNormal;
      		void main() {
      			vVertexNormal	= normalize(normalMatrix * normal);
      			vVertexWorldPosition	= (modelMatrix * vec4(position, 1.0)).xyz;
      			// set gl_Position
      	  gl_Position	= projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
      	  uniform vec3	glowColor;
      		uniform float	coeficient;
      		uniform float	power;

      		varying vec3	vVertexNormal;
      		varying vec3	vVertexWorldPosition;

      		void main() {
      			vec3 worldCameraToVertex= vVertexWorldPosition - cameraPosition;
      			vec3 viewCameraToVertex	= (viewMatrix * vec4(worldCameraToVertex, 0.0)).xyz;
      			viewCameraToVertex	= normalize(viewCameraToVertex);
      			float intensity		= pow(coeficient + dot(vVertexNormal, viewCameraToVertex), power);
      			gl_FragColor		= vec4(glowColor, intensity);
          }`,
          //blending	: THREE.AdditiveBlending,
      		transparent	: true,
      		depthWrite	: false,
      });

      this.glow = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius * 1.03, 32, 32),
        this.glowMaterial
      );
      this.glowMaterial.uniforms.glowColor.value	=  new THREE.Color('gray')
      this.glowMaterial.uniforms.coeficient.value	= 0.7
	    this.glowMaterial.uniforms.power.value = 2.5
      this.glowMaterial.opacity =  1
      this.glow.name = "glow";
      this.globe.add(this.glow);

      let material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        map: THREE.ImageUtils.loadTexture('img/textures/texture4kn.jpg'),
        transparent: true,
        opacity: 0.2
      })

      material.bumpMap  = THREE.ImageUtils.loadTexture('img/textures/bump_map.jpg')
      material.bumpScale = 0.85
      material.specularMap    = THREE.ImageUtils.loadTexture('img/textures/earthspec1k.jpg')
      material.specular  = new THREE.Color('grey')

      this.topo = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius - 0.01, 32, 32),
        material
      );
      this.topo.name = "surface";
      this.globe.add(this.topo);

      this.scene.add(this.globe);
      this.globe.rotateY(THREE.Math.degToRad(-90));
      this.globe.rotateZ(THREE.Math.degToRad(-22.5));
    },


    enterFullscreen () {
      this.isPresenting = true;
      this.vrButton.remove();
      this.$emit("run")
    },


    render () {
      this.renderer.clear();

      if (this.framecounter % 10 === 0) {
        if (this.$refs.video) {
          let current = Math.floor((this.$refs.video.currentTime * 25)/12)
          this.year = 1850 + current
          if (this.global_means.length) {
            // this.glowMaterial.uniforms.glowColor =
            let v = Math.min(1.0, THREE.MathUtils.mapLinear(this.global_means[current].climatology, -2, 2, 0.0, 1.0))
            let r = v > 0.5 ? Math.floor( (v-0.5) * 255 * 2) : 0
            let g = v > 0.5 ? Math.abs(Math.floor((0.5 - v) * 200)) : Math.abs(Math.floor((0.5 - v) * 300))
            let b = (1 - v) > 0.5 ? Math.floor(((0.5 - v)) * 255 * 2) : 0
            let color = new THREE.Color('rgb(' + r + ',  ' + g + ', ' + b + ')');
            this.glowMaterial.uniforms.glowColor.value = color
          }
        }
      }

      if (this.rotation) {
        this.globe.rotateY(this.rotation)
      }

      this.renderer.render(this.scene, this.camera);
      this.renderer.clearDepth();
      this.framecounter++;
    },

    resizeRendererToDisplaySize (renderer) {
      const canvas = renderer.domElement;
      const pixelRatio = window.devicePixelRatio;
      const width = canvas.clientWidth * pixelRatio | 0;
      const height = canvas.clientHeight * pixelRatio | 0;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        renderer.setSize(width, height, false);
      }
      return needResize;
    },

    onResize () {
      console.log('resize');
      this.width = window.innerWidth; // el.clientWidth;
      this.height = window.innerHeight; // this.width * 9 / 16;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    },

    loadCountries () {
      var self = this;

      d3.json('data/ne_110m_admin_0_countries_topo.json').then(function(data) {
        self.country_data = data;
        // var features = carto.iterations(16)(data, data.objects.countries.geometries).features;
        var features = topojson.feature(self.country_data, self.country_data.objects.countries).features;
        self.countries = new THREE.Group();
        self.addCountries(features);
        self.loadData()
      });
    },

    loadData () {
      var self = this;
      var file = 'data/data.json';
      d3.json(file).then(function(data) {
        MY_DATA = data;
        //window.setTimeout(self.precalculateFeatures, 1000);
      });
    },

    precalculateFeatures() {
      var self = this;
      MY_DATA.forEach(function(d) {
        d["features"] = self.updateCartogram(d, ""+d.maxYear);
      })
      // self.removeDataLabel();
      // window.setTimeout(self.cycleThroughData, 5000);
    },

    cycleThroughData() {
      var self = this;
      this.data = MY_DATA[this.dataset_counter];
      this.year = this.data.maxYear;

      this.updateShapes(this.data["features"], 2000);
      new TWEEN.Tween({a:0.5}).to({a:0.0}, 1500)
        .easing(TWEEN.Easing.Exponential.InOut)
        .onUpdate(function()
          { self.topo.material.opacity = this.a})
        .start()

      this.updateDataLabel(this.data.label + " (" + this.year + ")");
      this.dataset_counter++;
      if (this.dataset_counter >= MY_DATA.length)
        this.dataset_counter = 0;

      window.setTimeout(this.resetShapes, 15000);
      window.setTimeout(this.cycleThroughData, 22000);
    },

    updateCartogram(data, year) {
      // console.log("Update Cartogram");
      var self = this;

      this.proj = function(d) { return d };
      this.scale = d3.scaleLinear()
        .domain([data.min, data.max])
        .range([1, 1000]);

      // this is a hack but I was not able to access the data otherwise.
      self.country_data.objects.countries.geometries.forEach(function(d) {
        if (d.properties.ISO_A3 in data.data) {
          if ((year) in data.data[d.properties.ISO_A3])
            d.properties.value = data.data[d.properties.ISO_A3][year];
          else
            d.properties.value = 0;
        } else  {
          //console.log(d.properties.ISO_A3);
          d.properties.value = 0;
        }
      })

      var carto = cartogram()
        .projection(this.proj)
        .properties(d => d.properties)
        .value(function(d) {
          return self.scale(d.properties.value)
        });

      var features = carto.iterations(10)(
            self.country_data,
            self.country_data.objects.countries.geometries
          ).features
      return features;
    },

    updateShapes(features, time=1000) {
      // console.log("Update Shapes");
      features.forEach(({ properties, geometry },i ) => {
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        var country = this.countries.children[i];

        polygons.forEach((coords, j) => {
          var new_geometry = makeGeometry(coords[0], this.radius, { reverse: true }).attributes.position.array;
          var old_geometry = country.children[j].geometry.attributes.position.array;
          new TWEEN.Tween(old_geometry).to(new_geometry, time)
          .easing(TWEEN.Easing.Exponential.InOut)
          .onUpdate(function() {
            //console.log(this);
            country.children[j].geometry.attributes.position.array = this;
            country.children[j].geometry.attributes.position.needsUpdate = true;
            country.children[j].geometry.computeBoundingSphere();
          }).onComplete(function() {
            country.value = properties.value;
          }).start();
        });
      });
    },

    resetShapes() {
      var self = this;
      // console.log("Reset Shapes");
      var features = topojson.feature(this.country_data, this.country_data.objects.countries).features;
      this.updateShapes(features, 3000);
      new TWEEN.Tween({a:0.0}).to({a:0.5}, 3000)
        .easing(TWEEN.Easing.Exponential.InOut)
        .onUpdate(function()
          { self.topo.material.opacity = this.a })
        .start()
      //this.topo.visible = true;
      this.removeDataLabel()
    },

    showData ( dataset=null) {
      // console.log("show gdp");
      var self = this;
      var features = topojson.feature(self.country_data, self.country_data.objects.countries).features;

      if (dataset) {
        var proj = function(d) { return d }; //d3.geoAlbersUsa()
        // var path = d3.geoPath().projection(proj);
        d3.geoPath().projection(proj);

        if (dataset === "GDP") {
          var lo = d3.min( self.country_data.objects.countries.geometries.map(d => +d.properties.GDP_MD_EST));
          var hi = d3.max( self.country_data.objects.countries.geometries.map(d => +d.properties.GDP_MD_EST));
          var scale = d3.scaleLinear()
            .domain([lo, hi])
            .range([1, 1000]);

          var carto = cartogram()
            .projection(proj)
            .properties(d => d.properties)
            .value(function(d) {
              return(scale(d.properties.GDP_MD_EST));
            });

          features = carto.iterations(10)(
            self.country_data,
            self.country_data.objects.countries.geometries
          ).features;
        }
      }

      features.forEach(({ properties, geometry },i ) => {
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        var country = self.countries.children[i];
        polygons.forEach((coords, j) => {
          var new_geometry = makeGeometry(coords[0], self.radius, { reverse: true }).attributes.position.array;
          var old_geometry = country.children[j].geometry.attributes.position.array;
          var tween = new TWEEN.Tween(old_geometry).to(new_geometry, 3000);
          tween.easing(TWEEN.Easing.Exponential.InOut);
          tween.onUpdate(function() {
            country.children[j].geometry.attributes.position.array = this;
            country.children[j].geometry.attributes.position.needsUpdate = true;
          });
          tween.start();

        });
      });
    },

    addBarCharts() {
      var self = this;
      // var lo = d3.min( self.country_data.objects.countries.geometries.map(d => +d.properties.GDP_MD_EST));
      var hi = d3.max( self.country_data.objects.countries.geometries.map(d => +d.properties.GDP_MD_EST));

      self.barchart = new THREE.Group();
      self.country_data.objects.countries.geometries.forEach( function(d, i) {
        const size = 0.01;
        const value = d.properties.GDP_MD_EST / hi * 2;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshPhongMaterial({ color: 0x999999, opacity: 0.7, transparent: true });
        var box = new THREE.Mesh(geometry, material);
        var cx = 0 + .5 * Math.sin((i * 360/self.country_data.objects.countries.geometries.length) * Math.PI / 180)
        var cy = 0 + .5 * Math.cos((i * 360/self.country_data.objects.countries.geometries.length) * Math.PI / 180)

        box.name = d.properties.NAME;
        self.barchart.add(box);
        box.position.set(cx, 0, cy )

        var tween = new TWEEN.Tween([size,size, size]).to([size,value,size], 3000);
        tween.easing(TWEEN.Easing.Linear.None);
        tween.onUpdate(function() {
          box.geometry.dispose();
          box.geometry = new THREE.BoxGeometry(this[0], this[1], this[2]);
          box.position.y = this[1]/2 - .8;
        });
        tween.start();

      })
      self.scene.add(self.barchart);
    },

    addCountries(features) {
      var self = this;

      features.forEach(({ properties, geometry }) => {
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        var country = new THREE.Object3D();

        polygons.forEach(coords => {
          var mesh = new THREE.Mesh(
            makeGeometry(coords[0], self.radius, { reverse: true }),
            new THREE.MeshPhongMaterial({
              //color: new THREE.Color("rgb(" + (Math.random() * 255 + 1) + ", " + (Math.random() * 255 + 1) + ", 0)"),
              color: self.country_color,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.1,
              wireframe: true
            })
          );
          mesh.name = properties.NAME;
          mesh.value = properties.GDP_MD_EST;
          country.add(mesh);
          //polygonMeshes.renderOrder = 1;
        });
        country.name = properties.NAME;
        country.value = properties.GDP_MD_EST;
        self.countries.add(country);
      });

      self.countries.position.set(0, 0, 0);
      self.countries.name = "countries"
      self.globe.add(self.countries);
    },

    setCountryColor(color) {
      this.country_color = color;
      this.topo.material.color.set(color);
      this.countries.children.forEach( function(country) {
        country.children.forEach( function(mesh) {
          mesh.material.color.set(color);
        });
      });
    },

    addCountryLabel() {
      var fontloader = new FontLoader();
      var self = this;
      fontloader.load( 'fonts/Charactron Simplex_Simplex-Regular.json', function ( font ) {
        self.font = font;
        self.updateCountryLabel("", new THREE.Vector3(1,1,1));
  	  });
    },

    removeCountryLabel() {
      if (this.country_label)
        this.scene.remove(this.country_label);
    },

    updateCountryLabel(text, position) {
      this.removeCountryLabel();

      if (this.font) {
        var geometry = new TextGeometry(text, {
          font: this.font,
          size: .2, height: .15,
          curveSegments: 12, bevelEnabled: false,
        } );

        geometry.center();
        geometry.computeBoundingSphere();

        this.country_label = new THREE.Mesh(
          geometry,
          new THREE.MeshPhongMaterial({
            color: 0x0000ff,
            side: THREE.FrontSide,
            transparent: false,
            opacity: 0.5,
        }) );
        this.country_label.visible = false;
        this.country_label.rotateX(THREE.Math.degToRad(90));
        this.country_label.rotateZ(THREE.Math.degToRad(180));
        this.country_label.position = position;
        this.scene.add(this.country_label);
      }
    },

    addDataLabel() {
      var fontloader = new FontLoader();
      var self = this;
      fontloader.load( 'fonts/Charactron Simplex_Simplex-Regular.json', function ( font ) {
        self.font = font;
        self.updateDataLabel("loading data ...", false);
  		});
    },

    removeDataLabel() {
      if (this.data_label)
        this.scene.remove(this.data_label);
    },

    updateDataLabel(text, fade=true) {
      var self = this;

      this.removeDataLabel();

      if (this.font) {
        var geometry = new TextGeometry(text, {
          font: this.font,
          size: .3, height: .15,
          curveSegments: 12, bevelEnabled: false,
        } );

        geometry.center();
        geometry.computeBoundingSphere();

        this.data_label = new THREE.Mesh(
          geometry,
          new THREE.MeshPhongMaterial({
            color: 0xffffff,
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0,
        }) );
        this.data_label.visible = true;
        this.data_label.rotateX(THREE.Math.degToRad(90));
        this.data_label.rotateZ(THREE.Math.degToRad(180));
        this.scene.add(this.data_label);

        if (fade) {
          var tween_in = new TWEEN.Tween({a:0.0}).to({a:1.0}, 3000)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(function() {
              self.data_label.material.opacity = this.a;
          });
          var tween_out = new TWEEN.Tween({a:1.0}).to({a:0.0}, 3000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(function() {
              self.data_label.material.opacity = this.a;
          });
          tween_in.chain(tween_out.delay(3000));
          tween_in.start();
        } else {
          self.data_label.material.opacity = 0.7;
        }
      }
    },
  }

};

</script>
