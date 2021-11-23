<script>
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default {
  data () {
    return {
      width: 0,
      height: 0,
      framecounter: 0,
      element: null
    };
  },
  mounted () {
    this.element = this.$refs.scene;
    this.width = this.element.clientWidth
    this.height = this.element.clientWidth

    this.setupRenderer()
    this.setupScene()
    this.setupControls()
    this.initLoop()
    this.setupVR()
    this.onResize()

    window.addEventListener('resize', this.onResize, false );
  },
  destroyed () {
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    setupRenderer () {
      console.log('setup renderer');
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(this.width, this.height);
      this.renderer.physicallyCorrectLights = true;
      this.element.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();


    },
    setupScene () {
      this.setupCamera()
      this.setupLights()
      const geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
      const material = new THREE.MeshStandardMaterial( {color: 0xcccccc } );
      const cube = new THREE.Mesh( geometry, material );
      cube.rotation.set(-0.5, -0.5, 0);
      this.scene.add(cube)
    },
    setupCamera() {
      this.camera = new THREE.PerspectiveCamera( 75, this.width / this.height, 0.0001, 1000);
      // this.camera.position.x = 1;
      this.camera.position.set(0, 0, 2);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    },
    setupLights() {
      const hemiLight = new THREE.HemisphereLight( 0xff0000 );
      const ambientLight = new THREE.AmbientLight( 0x00ff00 );
      this.scene.add(hemiLight)
      this.scene.add(ambientLight)
      const directionalLight = new THREE.DirectionalLight( 0x0000ff, 8 );
      directionalLight.position.set(10, 20, 10);
      // this.scene.add(directionalLight);
    },

    setupVR() {
      if ("xr" in window.navigator) {
        this.renderer.xr.enabled = true;
      } else {
        console.log('no webVR supported');
      }
      this.vrButton = VRButton.createButton( this.renderer )
      this.element.appendChild(document.body.appendChild( this.vrButton));
    },
    setupControls() {
      console.log('setup controls');
      if ("xr" in window.navigator) {
        // we need VR controls
      } else {
        this.controls = new OrbitControls(this.camera, this.element);
      }
    },

    initLoop() {
      this.renderer.setAnimationLoop(this.render);
    },
    render() {
      this.renderer.clear()
      this.renderer.render(this.scene, this.camera)
      this.renderer.clearDepth()
      this.framecounter++
    },
    onResize () {
      this.width = this.element.clientWidth;
      this.height = this.element.clientHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();

    },
  }
}

</script>

<template>
  <div ref="scene" class="scene"></div>
</template>

<style>
.scene {
  height: 100%;
}
</style>
