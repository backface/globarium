<template>
    <div>
      <div class="scene" ref="scene"></div>
      <!--
      <div v-if="!hasVR && !isPresenting" class="enterfs">
        <a @click="enterFullscreen">Enter Anyway</a>
      </div>
    -->
    <div class="title" :style="titlestyles">
      <h1>BACK<b>FACE</b></h1>
      X Reality Lab
    </div>
    <div class="legend">
     <div class="copy">&copy;</div> <a href="https://m.ash.to">m.ash.to</a>
    </div>
  </div>
</template>

<style scoped>
.enterfs {
  text-align: center;
  position: absolute;
  bottom: 0px;
  width: 100%;
  margin: 0 auto
}
.enterfs a {
  font-size: 0.7em;
  text-decoration: none;
  cursor:pointer;
  opacity:0.7;
}
.title {
  text-align: center;
  position: absolute;
  top: 41%;
  left: 50%;
  letter-spacing: 2px;
  transform: translate(-50%, -50%);
  font-size: 1.5em
}
.select {
  position: absolute;
  width: 200px;
  height: 50px;
  right: 15px;
  top: 15px;
  display: block;
}
.title h1 {  letter-spacing: 10px; font-weight: normal; font-size: 4em; margin: 0 }
.title h1 b { font-size: 0.95em}
.scene {  }
</style>

<script setup>
import SelectBox from './SelectBox.vue'
</script>

<script>
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js'


import starTexture from '../assets/star.png'
import * as TWEEN from 'tween';

export default {

  data () {
    return {
      hasVR: false,
      width: 0,
      height: 0,
      framecounter: 0,
      isPresenting: false,
      vrButton: null,
      rotation: 0.002,
      titlestyles: {
        opacity: 0,
      },
      options: [{
        id: 1,
        name: 'test1'
      }, {
        id: 2,
        name: 'test2'
      }]
    }
  },

  mounted () {
    this.initRenderer()
    this.initMyScene()
    this.setupVR()
    window.addEventListener("resize", this.onResize)
  },

  destroyed () {
    window.removeEventListener("resize", this.onResize)
  },

  methods: {
    setupVR() {
      const self = this
      // enable VR (if available)
      this.vrButton = VRButton.createButton( this.renderer )
      this.$el.appendChild(document.body.appendChild( this.vrButton));
      if ("xr" in window.navigator) {
        this.hasVR = true
        this.renderer.xr.enabled = true;

        this.controller = this.renderer.xr.getController( 0 );
        //this.controller.addEventListener( 'selectstart', onSelectStart );
        //this.controller.addEventListener( 'selectend', onSelectEnd );
        this.controller.addEventListener('connected', function ( event ) {
          this.add(self.buildController(event.data ) );
        } );
        this.controller.addEventListener('disconnected', function () {
          this.remove( this.children[ 0 ] );
        } );
        this.scene.add(self.controller );

        const controllerModelFactory = new XRControllerModelFactory();
        this.controllerGrip = this.renderer.xr.getControllerGrip(0);
        this.controllerGrip.add( controllerModelFactory.createControllerModel(this.controllerGrip));
        this.scene.add(this.controllerGrip);
      } else {
        console.log('no webVR supported');
      }
    },

    buildController( data ) {
    	let geometry, material;
    	switch ( data.targetRayMode ) {
    		case 'tracked-pointer':
    			geometry = new THREE.BufferGeometry();
    			geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, -3 ], 3 ) );
    			geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 1, 1, 1, 0.5, 0.5, 0,.5 ], 3 ) );
    			material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );
    			// return new THREE.Line( geometry, material );
          return new THREE.Line(new THREE.BufferGeometry().setFromPoints(
            [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]
          ));
    		case 'gaze':
    			geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
    			material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
    			return new THREE.Mesh( geometry, material );
    	}
    },

    initRenderer () {
      const el = this.$refs.scene
      this.width = window.innerWidth
      this.height = window.innerHeight
      //this.width = el.clientWidth;
      //this.height =  el.clientHeight;

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha:true });
      this.renderer.xr.enabled = true;
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(this.width, this.height);
      this.renderer.sortObjects = false;
      this.renderer.shadowMap.enabled	= true
      this.renderer.physicallyCorrectLights = true

      el.appendChild(this.renderer.domElement);

      /*
      this.vrButton = VRButton.createButton( this.renderer )
      el.appendChild(document.body.appendChild( this.vrButton));
      */

      this.scene = new THREE.Scene();

      // add camera
      this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.0001, 1000);

      // add lights
      this.scene.add(new THREE.HemisphereLight('#fff', '#333', 1.5))
      this.scene.add( new THREE.AmbientLight( 0xffffff, 0.4 ))

      this.controls = new OrbitControls(this.camera, el);
      this.controls.minDistance = 2.7;
      this.controls.maxDistance = 25;

      this.controls.addEventListener('change', () => {
        this.rotation = 0
      })

      this.renderer.render(this.scene, this.camera);

      //this.camera.position.z = 4;
      //this.camera.position.x = 0;
      //this.camera.position.y = 0;

      this.clock = new THREE.Clock();
      this.renderer.setAnimationLoop(this.render);
    },

    initMyScene () {
      let self = this

      // this.scene.add(new THREE.AxesHelper(5))

      this.starPoints = []
      for(let i=0; i < 6000; i++) {
          let star = new THREE.Vector3(
            Math.random() * 600 - 300,
            Math.random() * 600 - 300,
            Math.random() * 600 - 300
          );
          star.velocity = 0
          star.acceleration = 0.5 // 0.05
          this.starPoints.push(star)
      }
      this.starGeo = new THREE.BufferGeometry().setFromPoints( this.starPoints )

      let sprite = new THREE.TextureLoader().load('/img/star.png');
      // let sprite = THREE.ImageUtils.loadTexture('/img/star.png')
      let starMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.7,
        map: sprite,
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      this.stars = new THREE.Points(this.starGeo, starMaterial);
      this.scene.add(this.stars);

      const loader = new GLTFLoader();
      let dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('/js/draco/')
      loader.setDRACOLoader(dracoLoader)
      loader.load('/models/David_with_drum.glb', (gltf) => {
        //console.log(gltf.scene);
        // self.scene.add(gltf.scene);
        gltf.scene.traverse(function (child) {
          if (child.type === "Mesh") {
              child.receiveShadow = true
              child.castShadow = true
              self.model = child
              self.scene.add(self.model);
          }
        })
        self.model.position.y = -0.2;
        self.model.position.z = -3;
        self.model.scale.set(0.000, 0.000, 0.000)
        let t1 = new TWEEN.Tween(self.model.scale)
          .to({ x: 0.01, y: 0.01, z: 0.01 }, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .delay(500)
          .start();

        let t2 = new TWEEN.Tween(self.titlestyles)
          .to({ opacity: 1.0 }, 4000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .delay(1500)
          .start();
      })
    },

    enterFullscreen () {
      this.isPresenting = true;starGeo
      this.vrButton.remove();
      this.$emit("run")
    },

    render () {

      if (this.starPoints) {
        this.starPoints.forEach((p, i) => {
          let y = this.starGeo.attributes.position.array[i * 3 + 2]
          p.velocity += p.acceleration
          // @ts-ignore
          y += p.velocity
          if ( y > 200) {
            y = -200
            // @ts-ignore
            p.velocity = 0
          }
           this.starGeo.attributes.position.array[i * 3 + 2] = y
        })
        this.starGeo.attributes.position.needsUpdate = true;
        this.stars.rotation.z += 0.002
      }

      this.renderer.clear();

      if (this.model && this.rotation) {
        this.model.rotateY(this.rotation)
        if (this.rotation < .05)
          this.rotation += 0.001
      }

      TWEEN.update()
      this.renderer.render(this.scene, this.camera);
      this.renderer.clearDepth();
      this.framecounter++;
    },

    onResize () {
      console.log('resize');
      this.width = window.innerWidth; // el.clientWidth;
      this.height = window.innerHeight; // this.width * 9 / 16;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }
  }
}

</script>
