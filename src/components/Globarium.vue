<template>
    <div>
      <div class="scene" ref="scene"></div>
      <audio loop id="music" preload="auto" style="display: none" />
      <div v-if="!hasVR && !isPresenting" class="enterfs">
        <a @click="enterFullscreen">Enter Anyway</a>
      </div>
      <video ref="video" src="" muted playsinline loop style="display: none" />
  </div>
</template>

<style scoped>
</style>

<script>
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import * as TWEEN from '@tweenjs/tween.js';
import * as TWEEN from 'tween';
import { csv, json } from "d3-fetch";
import { min, max} from "d3-array";
import { geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";
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
    scaleLinear
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
      radius: 9.4,
      framecounter: 0,
      dataset_counter: 0,
      year: 2017,
      carto: null,
      scale: null,
      country_color: 0xffffff,
      isPresenting: false,
    };
  },

  mounted () {
    this.initRenderer();
    this.initMyScene();
    this.loadCountries();
    window.addEventListener("resize", this.onResize)
  },

  destroyed () {
    window.removeEventListener("resize", this.onResize)
  },

  methods: {

    loadCountries () {
      var self = this;

      d3.json('data/ne_110m_admin_0_countries_topo.json').then(function(data) {
        self.country_data = data;
        // var features = carto.iterations(16)(data, data.objects.countries.geometries).features;
        var features = topojson.feature(self.country_data, self.country_data.objects.countries).features;
        self.addCountries(features);

        // window.setTimeout(self.loadFires, 2000);

        /*
        var tween = new TWEEN.Tween(360).to(0, 3000);
        tween.easing(TWEEN.Easing.Elastic.InOut);
        tween.onUpdate(function(d) {
          console.log(d);
          self.globe.rotateY(THREE.Math.degToRad(d));
        });
        tween.start();
        */
        //self.addBarCharts();

        //window.setTimeout(self.loadData, 10000);
        //window.setTimeout(self.precalculateFeatures, 5000);
        self.loadData()
        //self.setupFire();

      });
    },

    loadData () {
      var self = this;
      var file = 'data/data.json';
      // console.log("loading " + file);
      d3.json(file).then(function(data) {
        MY_DATA = data;
        window.setTimeout(self.precalculateFeatures, 1000);
      });
    },

    precalculateFeatures() {
      var self = this;
      MY_DATA.forEach(function(d) {
        d["features"] = self.updateCartogram(d, ""+d.maxYear);
      })
      self.removeDataLabel();
      window.setTimeout(self.cycleThroughData, 5000);
      // window.setTimeout(this.randomFireActivate, Math.random() * 30000);
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

      // console.log("showing " + this.data.label + " - " + this.year);
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
          var new_geometry = makeGeometry(coords[0], this.radius, { reverse:true, flip:true }).attributes.position.array;
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
          { self.topo.material.opacity = this.a})
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
              //console.log(scale(d.properties.POP_EST));
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
        // console.log(properties)

        polygons.forEach((coords, j) => {
          var new_geometry = makeGeometry(coords[0], self.radius,  { reverse:true, flip:true }).attributes.position.array;
          var old_geometry = country.children[j].geometry.attributes.position.array;
          //console.log(old_geometry);
          //console.log(new_geometry);

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
      //console.log(self.barchart);
      self.scene.add(self.barchart);
    },


    addCountries(features) {
      var self = this;

      features.forEach(({ properties, geometry }) => {
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        var country = new THREE.Object3D();

        polygons.forEach(coords => {
          var mesh = new THREE.Mesh(
            //new THREE.ConicPolygonGeometry(coords, 9.4, 9.6, true, true,true),
            makeGeometry(coords[0], self.radius,  { reverse:true, flip:true }),
            new THREE.MeshPhongMaterial({
              //color: new THREE.Color("rgb(" + (Math.random() * 255 + 1) + ", " + (Math.random() * 255 + 1) + ", 0)"),
              color: this.country_color,
              side: THREE.DoubleSide,
              transparent: true, opacity: 0.2,
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

      this.vrButton = VRButton.createButton( this.renderer )
      el.appendChild(this.renderer.domElement);
      el.appendChild(document.body.appendChild( this.vrButton));

      this.scene = new THREE.Scene();

      // add camera
      this.camera = new THREE.PerspectiveCamera(
        75, this.width / this.height, 0.0001, 1000
      );

      // add lights
      this.scene.add(new THREE.HemisphereLight('#fff', '#666', 1.5));
      //var light = new THREE.PointLight(0xffffff, 0.5);
      //light.position.set(0, 15, 15).normalize();
      //this.scene.add(light);

      // add raycaster
      this.raycaster = new THREE.Raycaster();

      /*
      // add mouse listener
      this.renderer.domElement.addEventListener('click', this.onMouseClick)
      */

      if ("xr" in navigator) {
        navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
          this.xrSupport = supported
        })
      }

      if (this.xrSupport) {
        this.hasVR = true;
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

      } else {
        console.log('no webVR supported');
        this.controls = new OrbitControls(this.camera, el);
        this.controls.minDistance = 0;
        this.renderer.render(this.scene, this.camera);
        this.camera.position.z = 0.00001;
        this.camera.position.x = 0.0000;
        this.camera.position.y = 0.0000;
      }

      this.clock = new THREE.Clock();
      this.renderer.setAnimationLoop(this.render);
    },


    addCountryLabel() {
      var fontloader = new FontLoader();
      var self = this;
      fontloader.load('fonts/Charactron-Simplex_Simplex-Regular.json',  ( font ) => {
        self.font = font;
        //self.updateCountryLabel("", new THREE.Vector3(1,1,1));
		  }, () => {
      }, () => {
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
      fontloader.load( 'fonts/Charactron-Simplex_Simplex-Regular.json', function ( font ) {
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

    initMyScene () {
      this.globe = new THREE.Group();

      var video = this.$refs.video
      video.src = "/img/textures/warming-dark.mp4"
      // video.currentTime = 110;
      video.play()

      // video.play

      //console.log(video);

      var videoTexture = new THREE.VideoTexture( video );
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBFormat;
      videoTexture.generateMipmaps = false;
      videoTexture.wrapS = THREE.RepeatWrapping;
      videoTexture.repeat.x = - 1;
      var warmingvideo = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius + 5.5, 32, 32),
        new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide,
          map: videoTexture,
          transparent: false,
          opacity: 1,
        })
      );
      warmingvideo.name = "warmingvideo";
      this.globe.add(warmingvideo)

      var stars = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius + 5.5, 32, 32),
        new THREE.MeshPhongMaterial({
          side: THREE.DoubleSide,
          map: THREE.ImageUtils.loadTexture('img/textures/galaxy_starfield.png'),
          transparent: true, opacity: 0.2,
        })
      );
      stars.name = "stars";
      this.globe.add(stars)

      let topoMaterial = new THREE.MeshPhongMaterial({
        side: THREE.BackSide,
        map: THREE.ImageUtils.loadTexture('img/textures/texture4k.png'),
        transparent: true,
        opacity: 0.5
      })
      this.topo = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius + 0.2, 32, 32),
        topoMaterial
      );
      topoMaterial.bumpMap  = THREE.ImageUtils.loadTexture('img/textures/bump_map.jpg')
      topoMaterial.bumpScale = 2.85
      //topoMaterial.specularMap    = THREE.ImageUtils.loadTexture('img/textures/earthspec1k.jpg')
      //topoMaterial.specular  = new THREE.Color('green')
      this.topo.name = "surface";
      this.globe.add(this.topo);

      this.scene.add(this.globe);

      this.countries = new THREE.Group();

      this.addCountryLabel();
      this.addDataLabel();

      var listener = new THREE.AudioListener();
      this.camera.add( listener );

      var audioElement = document.getElementById( 'music' );
      audioElement.src = "/audio/gridshifter_excerpt.mp3"
      audioElement.play();

      var positionalAudio = new THREE.PositionalAudio( listener );
      positionalAudio.setMediaElementSource( audioElement );
      positionalAudio.setRefDistance( 1 );
      positionalAudio.setDirectionalCone( 180, 230, 0.1 );

    },


    enterFullscreen () {
      /* getting a weird error from AudioListener postioning
      const el = this.renderer.domElement
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      } else {
        console.log('can\'t do fullscreen');
      }
      */
      this.isPresenting = true;
      this.vrButton.remove();
      this.$emit("run")
    },


    showIntersectedCountry() {
      var self = this;
      var intersects = this.raycaster.intersectObjects(this.countries.children, true);
      if (intersects.length > 0) {
        var intersect = intersects[0].object.parent;

        // console.log(intersect);
        // console.log(intersect.name + "(clicked)");

        this.updateCountryLabel(intersect.name, intersect.children[0].geometry.boundingSphere.center);
        this.country_label.visible = true;

        if (intersect.active !== true) {
          intersect.children.forEach( function(obj) { obj.material.color.set(0x0000ff) });
          intersect.active = true;
        } else {
          intersect.children.forEach( function(obj) { obj.material.color.set(self.country_color) });
          intersect.active = false;
        }
      }
    },


    showGazedCountry() {
      var self = this;
      var intersects = this.raycaster.intersectObjects(this.countries.children, true);
      if (intersects.length > 0) {
        if (this.gazed !== intersects[0].object.parent) {

          if (this.gazed) {
            this.gazed.children.forEach( function(obj) { obj.material.color.set(self.country_color) });
            if (this.barchart)
              this.barchart.getObjectByName(this.gazed.name).material.color.set(self.country_color);
          }
          this.gazed = intersects[0].object.parent;

          this.gazed.children.forEach( function(obj) { obj.material.color.set(0x0000ff) });
          if (this.barchart)
            this.barchart.getObjectByName(this.gazed.name).material.color.set(0x0000ff);

          if (this.gazed.name) {
            if(this.data)
              this.updateCountryLabel(
                this.gazed.name + "\n" + format(",.0~s")(this.gazed.value) + " " + this.data.units,
                intersects[0].object.geometry.boundingSphere.center
              );
            else
              this.updateCountryLabel(
                this.gazed.name,
                intersects[0].object.geometry.boundingSphere.center
              );
          }
        }
      } else {
        if (this.gazed) {
          this.gazed.children.forEach( function(obj) { obj.material.color.set(self.country_color) });
          if (this.barchart)
            this.barchart.getObjectByName(this.gazed.name).material.color.set(self.country_color);

        }
        this.gazed = undefined;
        this.removeCountryLabel();
      }
    },


    onMouseClick (event) {
      var mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(mouse, this.camera);
      this.showIntersectedCountry();
    },


    onSelectStart (event) {
      var controller = event.target;
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      this.showIntersectedCountry();
    },


    onSelectEnd () {
      // this.debugText.material.map.text  = event.target;
    },


    render () {
      /*
      if (!this.renderer.vr.isPresenting() && this.resizeRendererToDisplaySize(this.renderer)) {
        const canvas = this.renderer.domElement;
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
      }
      */
      if (this.data_label) {
        const lookAtVector = new THREE.Vector3(0, 0, -7);
        lookAtVector.applyQuaternion(this.camera.quaternion);
        this.data_label.lookAt( this.camera.position );
        this.data_label.position.x = lookAtVector.x;
        this.data_label.position.y = lookAtVector.y;
        this.data_label.position.z = lookAtVector.z;
      }

      // find intersections

      /*
      if (false) {
      //if (this.hasVR === false && this.framecounter % 2 == 0) {
      //if (this.framecounter % 2 == 0) {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        this.showGazedCountry()

        var lookAtVector;

        if (this.country_label) {
          lookAtVector = new THREE.Vector3(0, -.5, -6);
          lookAtVector.applyQuaternion(this.camera.quaternion);
          this.country_label.lookAt( this.camera.position );
          this.country_label.position = lookAtVector;
          this.country_label.visible = true;
        }
      }
      */

      TWEEN.update();

      // var delta = this.clock.getDelta();
      // var t = this.clock.elapsedTime;
      //console.log(t, delta)

      this.renderer.clear();
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
      this.width = window.innerWidth; // el.clientWidth;
      this.height = window.innerHeight; // this.width * 9 / 16;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    },
  }

};

</script>
