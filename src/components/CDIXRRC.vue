<template>
  <div @keyup="onKey" >
    <div ref="scene" class="scene" />
    <video ref="video" src="" muted playsinline loop style="display: none" />
    <div v-if="isMoving" class="info">
      {{ info.progress }}<br>
      <template v-if="info.price > 0">
        <b>{{ selected_option.units }} {{ info.price }}</b><br>
        ({{ selected_option.units }}  {{ info.inflated }})<br>
      </template>
      <template v-else>
        <b>{{ info.value }} {{ selected_option.units }} </b><br>
      </template>
      <b>{{ info.date }}</b><br>
    </div>
    <div class="title">
      CDI-XR-RC
    </div>
    <div class="debug">
      {{ runtime }}s<br>
      {{ fps }} fps
    </div>
    <div v-if="progress > 1" class="fin">
      Do not go gentle into that good night. <br>
      Rage, rage against the dying of the light.
    </div>
    <div v-if="!isMoving" class="start">
      <div class="">
        Choose Your Ride: <br>
        <br>
        <SelectBox v-if="selected_option" :options="options" :default="selected_option.id" @input="loadData" />
        <SelectBox v-else :options="options" @input="loadData" />
      </div><br>
      <div class="btn btn-start" @click="start">
          TAKE ME ON
      </div>
      <div class="attention">
        Best viewed in a VR headset. <br>
        Use at your own risk! <br>
        Can cause dizzy- and sickness.
      </div>
      <br>
      <LoadingSpinner v-if="updatingData"/>
    </div>
    <div v-if="!isMoving && selected_option" class="info source">
      Source: <span v-html="selected_option.source" />
    </div>
  </div>
  <transition name="slide-fade">
    <LoadingOverlay v-if="!fullyLoaded" background="black" color="white">
      <div>
        Welcome to the <br>
        <h1>Coupled Data Intercomparison <br> Extented Reality Roller Coaster</h1>
      </div>
    </LoadingOverlay>
  </transition>
</template>

<style>
  .scene {
    height: 100%;
    padding: 0; margin: 0;
  }
  .debug, .title {
    color: white;
    position: absolute;
  }
  .info {
    position: absolute; right: 15px; bottom: 15px;
    text-align: right;
  }
  .debug {
    position: absolute; left: 15px; bottom: 15px;
    text-align: right;
  }
  .title {
    position: absolute; top: 15px; left: 50%; transform: translate(-50%, 0);
    text-align: center;
  }
  .fin {
    position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%);
    text-align: center;
    font-size: 1.6em;
    font-style: italic;
    text-shadow: 2px 2px 2px black;
  }
  .start {
    position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%);
    text-align: center;
  }
  .attention {
    font-size: 0.8em;
    margin-top:2em;
    color: #d0d0d0
  }
  .source {
    opacity: .7;
    font-size: 0.75em;
    max-width: 300px;
  }
</style>

<script setup>
import LoadingOverlay from './LoadingOverlay.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import SelectBox from './SelectBox.vue'

</script>

<script>
import * as THREE from 'three'
import * as d3 from 'd3'
import * as Tone from 'tone'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import simplify from 'simplify-js'
import cSpline from 'cardinal-spline'
import { Easing, Tween, remove as removeTween, update as updateTweens } from '@tweenjs/tween.js';

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import ThreeMeshUI from 'three-mesh-ui';
import VRControl from 'three-mesh-ui/examples/utils/VRControl.js';

import {
  RollerCoasterGeometry,
  RollerCoasterShadowGeometry,
  RollerCoasterLiftersGeometry,
  TreesGeometry,
  SkyGeometry
} from '../libs/RollerCoaster.js';

import FontJSON from '../assets/T-Star-Regular-msdf.json';
import FontImage from '../assets/T-Star-Regular.png';

export default {
  data () {
    return {
      width: 0,
      height: 0,
      framecounter: 0,
      element: null,
      position: new THREE.Vector3(),
			tangent: new THREE.Vector3(),
			lookAt: new THREE.Vector3(),
			velocity: 0,
			progress: 0,
      prevTime: 0,
      isMoving: false,
      src_data: null,
      info: {},
      startTime: 0,
      runtime: 0,
      fps: 0,
      worldscale: 2.5,
      dataLoaded: false,
      updatingData: false,
      buildingsLoaded: false,
      options: [
        {
          id: 1,
          name: "Crude Oil price (1861 - 2021)",
          desc: "Historical Crude Oil Price (1861 - 2021), adjusted for inflation",
          file: "/data/historic_oil_price.csv",
          source: '<a href="http://www.ourworldindata.org">Our World in Datas</a> / BP, \
            <a href="https://www.officialdata.org/">officaldata.org</a>',
          units: "$"
        },
        {
          id: 2,
          name: "Dow Jones IA (1924 - 2021)",
          desc: "Dow Jones Industrial Average (1924 - 2021), adjusted for inflation",
          file: "/data/djia_historical.csv",
          source: '\
            <a href="http://www.econstats.com/eqty/eq_d_na_4.htm">econstats.com</a>, \
            <a href="https://finance.yahoo.com/quote/%5EDJI/history?p=%5EDJI">Yahoo</a>, \
            <a href="https://github.com/palewire/cpi">CPI</a>',
          units: "$"
        },
        {
          id: 3,
          name: "Bitcoin price (2010 - 2021)",
          desc: "Bitcoin price ",
          file: "/data/bitcoin_price.csv",
          source: '<a href="https://www.blockchain.com/charts/market-price">Blockchain.com</a>',
          units: "$"
        },
        {
          id: 4,
          name: "Atmospheric CO&#x2082; (2011 - 2021)",
          name_plain: "Atmospheric CO2 (2011 - 2021)",
          desc: "Atmospheric CO2 concentration",
          file: "/data/co2_trend.csv",
          source: '<a href="https://gml.noaa.gov/ccgg/trends/gl_data.html">NOAA/GML</a>',
          units: "ppm"
        },
        {
          id: 5,
          name: "CO&#x2082; - the last 800.000 years",
          desc: "Long term CO2" ,
          name_plain: "CO2 - the last 800.000 years",
          file: "/data/co2-concentration-long-term.csv",
          source: '<a href="https://ourworldindata.org/grapher/co2-concentration-long-term">Our World In Data</a> / \
            <a href="https://scrippsco2.ucsd.edu/data/atmospheric_co2/icecore_merged_products.html">Scripps</a> / \
            <a href="https://www.ncei.noaa.gov/access/paleo-search/study/17975">NOAA</a>',
          units: "ppm"
        },
        // TODO:
        /*
        {
          id: 6,
          name: "Global mean temperature (1750 - 2021)",
          desc: "" ,
          file: "data/global_monthly_mean_temp.csv",
          source: '<a href="https://berkeleyearth.org/data/">Berkeley Eearh </a>',
          units: "°C"
        },
        */
        {
          id: 7,
          name: "Global mean temperature (1880 - 2020)",
          desc: "" ,
          file: "data/global_annual_mean_temp.csv",
          source: '<a href="https://data.giss.nasa.gov/gistemp/graphs/graph_data/Global_Mean_Estimates_based_on_Land_and_Ocean_Data/graph.txt">NASA/GISS</a>',
          units: "°C"
        },
        {
          id: 9,
          name: "Covid19 Cases / Austria (2020 - 2021)",
          desc: "" ,
          file: "data/covid_cases_aut_20211121.csv",
          source: '<a href="https://ourworldindata.org/covid-cases">Our World in Data<a>',
          units: "cases"
        },
      ],
      selected_option: null,
    }
  },

  mounted () {
    const self = this

    this.element = this.$refs.scene;
    this.width = this.element.clientWidth
    this.height = this.element.clientWidth
    this.progress = 0

    self.mouse = new THREE.Vector2()
    self.mouse.x = null
    self.mouse.y = null
    self.selectState = false

    this.loadBuildings()
    this.setupRenderer()
    this.setupScene()
    this.setupVR()

    window.addEventListener('resize', this.onResize, false );
    this.onResize()
    window.addEventListener("keyup", this.onKey, false);

    window.addEventListener('pointermove', ( event) => {
    	self.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    	self.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    });

    window.addEventListener('pointerdown', () => { self.selectState = true });
    window.addEventListener('pointerup', () => { self.selectState = false });
    window.addEventListener('touchstart', ( event ) => {
    	self.selectState = true;
    	self.mouse.x = ( event.touches[0].clientX / window.innerWidth ) * 2 - 1;
    	self.mouse.y = - ( event.touches[0].clientY / window.innerHeight ) * 2 + 1;
    });
    window.addEventListener('touchend', ()=> {
    	self.selectState = false;
    	self.mouse.x = null;
    	self.mouse.y = null;
    });

    this.initLoop()
    this.loadData(this.options[4])
  },

  destroyed () {
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('keyup', this.onKey)
  },

  computed: {
    fullyLoaded () {
      return this.buildingsLoaded && this.dataLoaded
      //return true
    }
  },

  methods: {

    start () {
      // start
      this.tearDownCity()
      this.createCity(true)

      // startup audo (just testing)
      //this.osc = new Tone.Oscillator(100, "sine").toDestination().start
      const pingPong = new Tone.PingPongDelay("4n", 0.1).toDestination();

      this.osc = new Tone.PWMOscillator(4,0.0).toDestination().start()
      this.osc2 = new Tone.PWMOscillator(6, 0.0).connect(pingPong).start()
      // this.setUpAudio()

      // start video (if not playing)
      this.$refs.video.play()

      // now let's go
      this.progress = 0
      this.startTime = 0
      this.isMoving = true;
    },

    stop() {
      let self = this

      // stop audio
      //Tone.Transport.stop();
      if (this.osc) this.osc.stop()

      // stop moving
      this.isMoving = false
      this.progress = 0
      this.tearDownCity()
      this.setOverviewPosition()
    },

    loadData(e) {
      this.selected_option = e
      if (this.vrUIoption)
        this.vrUIoption.set( { content: String( e.name_plain || e.name ) })
      this.loadCurve(e.file)
    },

    loadCurve (file) {
      this.updatingData = true
      var self = this;
      if (!file)
        file = 'data/djia_historical.csv';

      if (self.rollerCoasterShadowMesh)
        self.scene.remove(self.rollerCoasterShadowMesh)

      if (self.rollerCoasterMesh)
        self.scene.remove(self.rollerCoasterMesh)

        if (self.rollerCoasterLifterMesh)
          self.scene.remove(self.rollerCoasterLifterMesh)

      d3.csv(file).then(function(data) {
        self.src_data = data
        self.src_data.forEach((item, i) => {
          item.date = d3.timeParse("%Y-%m-%d %H:%M:%S")(item.date) || d3.timeParse("%Y")(item.year);
          item.price = +item.price || +item.close
          item.inflated = +item.inflated || +item.value
        });
        let scaleX = d3.scaleLinear().domain([0, data.length]).range([0.0, 0.1])
        let scaleY = d3.scaleLinear().domain(d3.extent(data, d => +d.inflated)).range([0.0, 0.1])
        self.points = data.map((d, i) => {
          return { 'x': + scaleX(i), 'y': scaleY(+d.inflated) }
        })
        // console.log('points', points);
        let last = self.points[self.points.length - 1]
        self.points = simplify(self.points, 0.002, true)
        // console.log('simplified points', points);

        self.track_length = self.points.length
        //const length = 50;

        self.vectors = self.points.map((p, i) => {
          //console.log((i/self.points.length) * 30 * self.worldscale);
          // return new THREE.Vector3((i/track_length) * 50 * self.worldscale, 0.1 + p.y * 100, 0)
          return new THREE.Vector3(i * self.worldscale, 0.2 + p.y * 100, 0)
        })

        self.curve = new THREE.CatmullRomCurve3(self.vectors)
        self.curve.closed = false
        self.curve.tension = .8
        self.curve.curveType = "catmullrom"
        self.curveLength = self.curve.getLength()
        self.max_velocity = 0.05 / self.curveLength
        //console.log(self.curve.getLength());

        // roller coaster geometry
  			let geometry = new RollerCoasterGeometry(self.curve, self.curveLength * 10)
  			let material = new THREE.MeshPhongMaterial({ vertexColors: true })
  			self.rollerCoasterMesh = new THREE.Mesh(geometry, material)
        self.rollerCoasterMesh.position.y = 0.1;
  			self.scene.add(self.rollerCoasterMesh)

        // lifters
  			geometry = new RollerCoasterLiftersGeometry( self.curve, self.curveLength / 2);
  			material = new THREE.MeshPhongMaterial();
  			self.rollerCoasterLifterMesh = new THREE.Mesh( geometry, material );
  			self.rollerCoasterLifterMesh.position.y = 0.1;
  			self.scene.add(self.rollerCoasterLifterMesh)

        // shadow
  			geometry = new RollerCoasterShadowGeometry(self.curve, self.curveLength * 10);
  			material = new THREE.MeshBasicMaterial({
  				color: 0x111111, depthWrite: false, transparent: true,
          opacity: 0.5,
  			})
  			self.rollerCoasterShadowMesh = new THREE.Mesh(geometry, material)
  			self.rollerCoasterShadowMesh.position.y = 0.1
  			self.scene.add(self.rollerCoasterShadowMesh)

        //self.train.position.copy( self.curve.getPointAt(0.01));
        //self.train.lookAt(self.lookAt.copy(self.curve.getPointAt(0)).sub( self.curve.getTangentAt( 0.01 ) ));
        //self.controls = new OrbitControls(self.camera, self.renderer.domElement);
        //self.train.position.x = (self.vectors.length * self.worldscale) / 2
        //self.train.position.y = self.vectors.length / 20
        //self.train.position.z = (self.vectors.length) * 2.5
        //self.train.lookAt(self.lookAt.copy(new THREE.Vector3((self.vectors.length * self.worldscale) / 2, 500, 10000)))
        // self.createCity
        // self.isMoving = true
        // self.progress = 0.9

        //self.train.position.set(0, 0.2, 0)
        //self.train.lookAt(self.lookAt.copy(new THREE.Vector3(1, 1, 1 )))

        self.landscape.position.x = (self.track_length * self.worldscale) / 2
        self.setOverviewPosition()

        self.dataLoaded = true
        self.updatingData = false
      });
    },

    setOverviewPosition () {
      const self = this
      self.train.position.x = (self.track_length * self.worldscale) / 2
      self.train.position.y = self.track_length / 12
      self.train.position.z = self.track_length * self.worldscale * 1.2
      self.train.lookAt(self.lookAt.copy(new THREE.Vector3((self.track_length * self.worldscale) / 2, 800, 10000)))
      if (self.vrUIcontainer) {
        self.vrUIcontainer.position.set( self.train.position.x, self.train.position.y + 0.9, self.train.position.z - 1.6);
        self.vrButtonStartContainer.position.set( self.train.position.x, self.train.position.y + 0.7, self.train.position.z - 1.6);
      }
    },

    setupRenderer () {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.shadowMap.enabled = true;
      this.renderer.setClearColor( 0xffffee);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(this.width, this.height);
      this.renderer.physicallyCorrectLights = true;
      this.raycaster = new THREE.Raycaster();
      //hrethis.renderer.depthTest = false;
      this.element.appendChild(this.renderer.domElement);

    },

    setupScene () {
      const self = this;

      // create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color( 0xf0f0ff );

      // setup light(s)
      const light = new THREE.HemisphereLight( 0xfff0f0, 0x606066 );
      light.position.set( 1, 1, 1 );
      //light.castShadow = true;
      this.scene.add( light );

      const light2 = new THREE.DirectionalLight(0x999999, 0.5);
      //light2.castShadow = true;
      light2.position.set(0, 200, 100);
      light2.target.position.set(-4, 100, -4);
      this.scene.add(light2);
      this.scene.add(light2.target);

      // setup train
      this.train = new THREE.Object3D();
      this.train.position.set(0, 1.8, 0)
      this.scene.add( this.train );

      // create camera on train
      this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.01, 700 );
      this.train.add( this.camera);

      // setup environment plane / landscape
			let geometry = new THREE.PlaneGeometry( 600, 600, 50, 50 );
			geometry.rotateX( - Math.PI / 2 );
      //geometry.scale(0, 0, 0);
			const positions = geometry.attributes.position.array;
			const vertex = new THREE.Vector3();
			for ( let i = 0; i < positions.length; i += 3 ) {
				vertex.fromArray( positions, i );
				vertex.x += Math.random() * 10 - 5;
				vertex.z += Math.random() * 10 - 5;
				const distance = ( vertex.distanceTo( this.scene.position ) / 2 ) - 25;
        /*if (vertex.distanceTo( this.scene.position) > 120) {
          vertex.y = Math.random() * Math.min(Math.max( 0, distance * 30 ), 50);
        }
        */

        if (
          Math.abs(vertex.x) > 70 * this.worldscale ||
          (vertex.z - this.scene.position.z) < -120 ||
          (vertex.z - this.scene.position.z) > 260
        )
        {
          vertex.y = Math.random() * Math.min(Math.max( 0, distance ), 80);
        }

        // else {
        //   vertex.y = Math.random() * 1;
      //  }
        vertex.toArray( positions, i );
			}
			geometry.computeVertexNormals();

			let material = new THREE.MeshLambertMaterial( {
				color: 0x445544
			} );
			this.landscape = new THREE.Mesh( geometry, material );
      //this.landscape.position.x = 40 * this.worldscale
      //this.landscape.castShadow = false;
      //this.landscape.receiveShadow = true;
			this.scene.add( this.landscape );

      // we are inside a globe with video texture
      let video = this.$refs.video
      video.src = "/movies/warming-frames-CNRM-CM6-1-dark-hflip.mp4"
      video.play()

      let videoTexture = new THREE.VideoTexture( video );
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBFormat;
      videoTexture.generateMipmaps = false;
      let warmingvideo = new THREE.Mesh(
        new THREE.SphereGeometry(290, 32, 32),
        new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide,
          map: videoTexture,
          transparent: false,
          opacity: 1,
        })
      );
      warmingvideo.name = "warmingvideo";
      this.scene.add(warmingvideo)

      this.city = new THREE.Group()
      this.scene.add(this.city)
    },

    setUpAudio() {
      let self = this

      var mesh1 = new THREE.Mesh(
        new THREE.SphereGeometry( 2, 32, 16 ),
        new THREE.MeshPhongMaterial( { color: 0xffaa00, flatShading: true, shininess: 0 } )
      )
      mesh1.position.set( 10, 20, 10 );
      this.scene.add(mesh1)

      /*
      const listener = new THREE.AudioListener();
      const sound1 = new THREE.PositionalAudio(listener);
  		this.osc  = listener.context.createOscillator();
			this.osc.type = 'sine';
			this.osc.frequency.setValueAtTime( 144, sound1.context.currentTime );
			this.osc.start(0);
			sound1.setNodeSource(this.osc);
			sound1.setRefDistance( 20 );
			sound1.setVolume( 0.5 );
			mesh1.add( sound1 );
      */

      const listener = new THREE.AudioListener();
      const sound1 = new THREE.PositionalAudio(listener);
      this.camera.add( listener );

      Tone.setContext(sound1.context)
      this.osc = new Tone.Oscillator(440, "sine").start()
      sound1.setNodeSource (this.osc);
		// /	sound1.setNodeSource(this.osc);
			sound1.setRefDistance( 1 );
		//	sound1.setVolume( 0.5 );
			mesh1.add( sound1 );

      var mesh2 = new THREE.Mesh(
        new THREE.SphereGeometry( 2, 32, 16 ),
        new THREE.MeshPhongMaterial( { color: 0xffaa00, flatShading: true, shininess: 0 } )
      )
      mesh2.position.set( 10, 2, -50 );
      this.scene.add(mesh2)
      const listener2 = new THREE.AudioListener();
      const sound2 = new THREE.PositionalAudio(listener2);
      this.camera.add( listener2 );


      Tone.setContext(sound2.context)
      const osc2 = new Tone.Oscillator(240, "sine").start()
      sound2.setNodeSource (osc2);
      // /	sound1.setNodeSource(this.osc);
      sound2.setRefDistance( 1 );
      sound2.setVolume( 0.2 );
      mesh2.add( sound2 );

      //Tone.setContext(sound1.context)
      //this.osc = (new Tone.Oscillator(100, "sine")).toDestination().start()

    },

    setBuildingsLoaded() {
      this.buildingsLoaded = true
    },

    loadBuildings() {
      const self = this
      const loader = new FBXLoader()
      loader.load('/data/buildings.fbx', (object) => {
        self.buildingsGeometries = [];
        object.traverse(child => {
          if (child.isMesh) {
            child.geometry.scale(0.005, 0.005, 0.005);
            //child.geometry.rotateX(-Math.PI/2);
            self.buildingsGeometries.push(child.geometry);
          }
        })
        //setTimeout(() => { self.createCity(false) },500)
        self.buildingsLoaded = true
      }, () => {
        //console.log('progress')
      }, () => {
        console.log('error loading buildings')
      })
    },

    tearDownCity() {
      for( var i = this.city.children.length - 1; i >= 0; i--) {
         let obj = this.city.children[i];
         this.city.remove(obj);
      }
    },

    createCity(progressive) {
      const self = this
      const raycaster = new THREE.Raycaster();
      raycaster.ray.direction.set( 0, -1, 0 );

      for ( let i = -5; i < self.vectors.length + 5; i++ ) {
        for ( let j = -5; j <= 5; j++ ) {
          if (j != 0) {
            const x = i * self.worldscale
            const z = j * 1.8;
            raycaster.ray.origin.set( x, 50, z );
            const intersections = raycaster.intersectObject( self.landscape );
            if ( intersections.length === 0 ) continue;
            const y = intersections[ 0 ].point.y;
            const height = Math.random() * 20 + 0.5;
            let material  = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            let mesh = new THREE.Mesh(
                self.buildingsGeometries[THREE.MathUtils.randInt(0, self.buildingsGeometries.length-1)],
                material
            );
            mesh.position.set(x, y, z);
            mesh.building = true;
            mesh.castShadow = true;
            //mesh.receiveShadow = true;

            if (!progressive) {
              mesh.scale.set(1,  THREE.MathUtils.randFloat(0.1, 3), 1)
            } else {
              mesh.scale.set(1, 0, 1)
              mesh.tween =  new Tween(mesh.scale)
                .to({ x: 1, y: THREE.MathUtils.randFloat(0.1, 3), z: 1}, THREE.MathUtils.randInt(2000, 5000))
                .delay(i * 450)
                .easing(Easing.Elastic.Out)
                .start()
            }
            self.city.add(mesh);
          }
        }
      }
    },

    setupVR() {
      let self = this
      if ("xr" in window.navigator) {
        this.renderer.xr.enabled = true;
        this.vrControl = VRControl( this.renderer, this.camera, this.scene );
	      this.scene.add( this.vrControl.controllerGrips[0], this.vrControl.controllers[0] );
    	  this.vrControl.controllers[0].addEventListener('selectstart', () => { self.selectState = true } );
    	  this.vrControl.controllers[0].addEventListener('selectend', () => { self.selectState = false } );
        this.vrControl.controllers[1].addEventListener('selectstart', () => { self.selectState = true } );
    	  this.vrControl.controllers[1].addEventListener('selectend', () => { self.selectState = false } );
        this.train.add(this.vrControl.controllers[0])
        this.train.add(this.vrControl.controllerGrips[0]);
        this.makeVRUIPanel()
      } else {
        console.log('no webVR supported');
      }
      this.vrButton = VRButton.createButton( this.renderer )
      this.element.appendChild(document.body.appendChild( this.vrButton));
    },

    initLoop() {
      this.renderer.setAnimationLoop(this.render);
    },

    render () {
      this.renderer.clear();

      if (this.startTime === 0) {
        this.startTime = performance.now()
        this.framecounter = 0
      }

      const time = performance.now();
      const delta = time - this.prevTime;

      if (this.isMoving) {
        this.progress += this.velocity;

        if (this.progress <= 1 ) {
          this.osc.frequency.value = this.position.y * 30
          this.osc2.frequency.value = this.velocity * 20000

          this.position.copy( this.curve.getPointAt( this.progress ) );
          this.position.y += 0.2
          this.train.position.copy( this.position )
          this.tangent.copy( this.curve.getTangentAt( this.progress ) )
          this.velocity -= this.tangent.y * (this.curveLength * 1) * delta
          this.velocity = Math.max(this.max_velocity, Math.min(this.max_velocity, this.velocity ) );
          //velocity = 0.00008; // constant velocity
          this.train.lookAt( this.lookAt.copy( this.position ).sub( this.tangent ) );
        } else if (this.progress <= 1.05) {
          this.position.x += 0.2
          this.train.position.copy( this.position )
          this.train.lookAt( this.lookAt.copy( this.position ).sub( this.tangent ) );
        }  else if (this.progress <= 1.1) {
          // do nothing
        } else if (this.progress) {
          this.startTime = performance.now()
          this.framecounter = 0;
          this.stop()
        }

        if (this.framecounter % 20 == 0) {
          this.info.progress = d3.format(".2f")(this.progress)
          let index = Math.min(Math.floor(this.progress * this.src_data.length), this.src_data.length - 1)
          if (index) {
            this.info.price = d3.format(".2f")(this.src_data[index].price)
            this.info.value = d3.format(".2f")(this.src_data[index].value)
            this.info.inflated = d3.format(".2f")(this.src_data[index].inflated)
            if (this.src_data[index].date) {
              this.info.date = d3.timeFormat("%Y")(this.src_data[index].date)
            } else {
              this.info.date = this.src_data[index].Year
            }
          }
        }

      } else {
        ThreeMeshUI.update();
        this.checkVRButtonIntersections();
      }

      updateTweens()
      this.renderer.render(this.scene, this.camera)

      this.fps = d3.format(".0f")((this.framecounter * 1000 ) / ( time - this.startTime))
      this.runtime = d3.format(".1f")((time - this.startTime)/1000)
      this.prevTime = time;
      this.framecounter++;
    },

    onKey(e) {
      if (e.key === "Escape") {
        if (this.isMoving) {
          this.stop()
        }
      }
    },

    cycleThroughOptions(next=true) {
      let index = this.options.indexOf(this.selected_option)
      if (next) {
        if (index < this.options.length - 1) {
          index += 1
        } else {
          index = 0
        }
      } else {
        if (index > 0) {
          index -= 1
        } else {
          index = this.options.length - 1
        }
      }
      this.selected_option = this.options[index]
      if (this.vrUIoption) {
        this.vrUIoption.set({ content: String( this.selected_option.name_plain || this.selected_option.name ) })
      }
      this.loadCurve(this.selected_option.file)
      this.$forceUpdate()
    },

    makeVRUIPanel() {
      const self = this
      this.objsToTest = []

    	self.vrUIcontainer = new ThreeMeshUI.Block({
    		justifyContent: 'center',
    		alignContent: 'center',
    		contentDirection: 'row-reverse',
        fontFamily: FontJSON,
    		fontTexture: FontImage,
    		fontSize: 0.07,
    		padding: 0.03,
    		borderRadius: 0.08,
        backgroundOpacity: .7,
        height: 0.2
    	});
    	//self.uicontainer.position.set( self.train.position.x, self.train.position.y, self.train.position.z - 1);
    	//container.rotation.x = -0.55;
    	self.scene.add(self.vrUIcontainer);

    	// options Name

      this.vrUIoption = new ThreeMeshUI.Text({ content: "n/a" })
      const title = new ThreeMeshUI.Block({
        height: 0.15,
        width: 1,
        justifyContent: "center",
        backgroundOpacity: 0
      });

      title.add(this.vrUIoption);

      // BUTTONS

    	const buttonOptions = {
    		width: 0.15,
    		height: 0.15,
    		justifyContent: 'center',
    		alignContent: 'center',
    		borderRadius: 0.08,
    	};

      const startButtonOptions = {
        width: 0.5,
        height: 0.18,
        justifyContent: 'center',
        alignContent: 'center',
        offset: 0.05,
        margin: 0.02,
    		borderRadius: 0.08,
      };

    	const hoveredStateAttributes = {
    		state: "hovered",
    		attributes: {
    			offset: 0.035,
    			backgroundColor: new THREE.Color( 0x999999 ),
    			backgroundOpacity: 1,
    			fontColor: new THREE.Color( 0xffffff )
    		},
    	};
    	const idleStateAttributes = {
    		state: "idle",
    		attributes: {
    			offset: 0.035,
    			backgroundColor: new THREE.Color( 0x666666 ),
    			backgroundOpacity: 0.3,
    			fontColor: new THREE.Color( 0xffffff )
    		},
    	};
    	const selectedAttributes = {
    		offset: 0.02,
    		backgroundColor: new THREE.Color( 0x777777 ),
    		fontColor: new THREE.Color( 0x222222 )
    	};

      const buttonNext = new ThreeMeshUI.Block( buttonOptions );
      buttonNext.add(new ThreeMeshUI.Text({ content: ">" }));
    	buttonNext.setupState({
    		state: "selected",
    		attributes: selectedAttributes,
    		onSet: ()=> { self.cycleThroughOptions()	}
    	});
    	buttonNext.setupState( hoveredStateAttributes );
    	buttonNext.setupState( idleStateAttributes );

      const buttonPrevious = new ThreeMeshUI.Block( buttonOptions );
    	buttonPrevious.add(new ThreeMeshUI.Text({ content: "<" }));
    	buttonPrevious.setupState({
    		state: "selected",
    		attributes: selectedAttributes,
    		onSet: ()=> { self.cycleThroughOptions(false) }
    	});
    	buttonPrevious.setupState( hoveredStateAttributes );
    	buttonPrevious.setupState( idleStateAttributes );
      this.vrUIcontainer.add(buttonNext, title, buttonPrevious);

      // Start button
      this.vrButtonStartContainer = new ThreeMeshUI.Block({
        justifyContent: 'center',
    		alignContent: 'center',
        fontFamily: FontJSON,
    		fontTexture: FontImage,
    		fontSize: 0.07,
        backgroundOpacity: 0
      });

      const buttonStart = new ThreeMeshUI.Block( startButtonOptions );
      buttonStart.add(new ThreeMeshUI.Text({ content: "TAKE ME ON!" }));
      buttonStart.setupState({
    		state: "selected",
    		attributes: selectedAttributes,
    		onSet: ()=> { self.start() }
    	});
    	buttonStart.setupState(hoveredStateAttributes);
    	buttonStart.setupState(idleStateAttributes);
      this.vrButtonStartContainer.add(buttonStart)
      this.scene.add(this.vrButtonStartContainer);

    	this.objsToTest.push(buttonNext, buttonPrevious, buttonStart);
    },

    checkVRButtonIntersections () {
    	let intersect;
    	if ( this.renderer.xr.isPresenting ) {
    		this.vrControl.setFromController(0, this.raycaster.ray );
    		intersect = this.raycast();
    		// Position the little white dot at the end of the controller pointing ray
    		if ( intersect ) this.vrControl.setPointerAt( 0, intersect.point );
    	} /*
      else if ( this.mouse.x !== null && this.mouse.y !== null ) {
    		this.raycaster.setFromCamera(this.mouse, this.camera);
    		intersect = this.raycast();
    	}; */

    	if ( intersect && intersect.object.isUI ) {
    		if ( this.selectState ) {
    			intersect.object.setState( 'selected' );
    		} else {
    			intersect.object.setState( 'hovered' );
    		};
    	};
    	// Update non-targeted buttons state
    	if (this.objsToTest) {
          this.objsToTest.forEach( (obj)=> {
      		if ( (!intersect || obj !== intersect.object) && obj.isUI ) {
      			obj.setState('idle')
      		}
      	})
      }
    },

    raycast() {
    	return this.objsToTest.reduce( (closestIntersection, obj)=> {
    		const intersection = this.raycaster.intersectObject( obj, true );
    		if ( !intersection[0] ) return closestIntersection
    		if ( !closestIntersection || intersection[0].distance < closestIntersection.distance ) {
    			intersection[0].object = obj;
    			return intersection[0]
    		} else {
    			return closestIntersection
    		};
    	}, null );
    },

    onResize () {
      // resizie handler
      this.width = this.element.clientWidth;
      this.height = this.element.clientHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    },
  }
}

</script>
