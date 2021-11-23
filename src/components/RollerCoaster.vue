<script>
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';


import {
  RollerCoasterGeometry,
  RollerCoasterShadowGeometry,
  RollerCoasterLiftersGeometry,
  TreesGeometry,
  SkyGeometry
} from '../libs/RollerCoaster.js';

const PI2 = Math.PI * 2;

// float x = r*cos(t) + h;
// float y = r*sin(t) + k;

const curve = ( function () {
  const vector = new THREE.Vector3()
  const vector2 = new THREE.Vector3();
  return {
    getPointAt: function ( t ) {
      // t = t * PI2;
      const x = 50 * (t) *  Math.cos ( (t/10 - 0.05) * 200 )
      const y =  Math.cos( t * PI2 * 10 ) * 2 + 3;
      const z = 50 * (t) *  Math.sin ( (t/10 - 0.05) * 200 )
      return vector.set( x, y, z ).multiplyScalar( 2 );
    },
    getTangentAt: function ( t ) {
      const delta = 0.0001;
      const t1 = Math.max( 0, t - delta );
      const t2 = Math.min( 1, t + delta );
      return vector2.copy( this.getPointAt( t2 ) )
        .sub( this.getPointAt( t1 ) ).normalize();
    }
  };
} )();


const curveOrig = ( function () {
  const vector = new THREE.Vector3()
  const vector2 = new THREE.Vector3();
  return {
    getPointAt: function ( t ) {
      t = t * PI2;
      const x = Math.sin( t * 3 ) * Math.cos( t * 4 ) * 50;
      const y = Math.sin( t * 10 ) * 2 + Math.cos( t * 17 ) * 2 + 5;
      const z = Math.sin( t ) * Math.sin( t * 4 ) * 50;
      return vector.set( x, y, z ).multiplyScalar( 2 );
    },
    getTangentAt: function ( t ) {
      const delta = 0.0001;
      const t1 = Math.max( 0, t - delta );
      const t2 = Math.min( 1, t + delta );
      return vector2.copy( this.getPointAt( t2 ) )
        .sub( this.getPointAt( t1 ) ).normalize();
    }
  };
} )();

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
      prevTime: 0
    };
  },

  mounted () {
    this.element = this.$refs.scene;
    this.width = this.element.clientWidth
    this.height = this.element.clientWidth
    this.setupRenderer()
    this.setupScene()
    this.onResize()
    window.addEventListener('resize', this.onResize, false );
    this.initLoop()
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
      this.setupVR()
    },

    setupScene () {
      // create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color( 0xf0f0ff );

      // setup light(s)
      const light = new THREE.HemisphereLight( 0xfff0f0, 0x606066 );
      light.position.set( 1, 1, 1 );
      this.scene.add( light );

      // setup train
      this.train = new THREE.Object3D();
      this.scene.add( this.train );

      // create camera on train
      this.camera = new THREE.PerspectiveCamera( 50, this.width / this.height, 0.1, 500 );
      this.train.add( this.camera );

      // setup environment plane
			let geometry = new THREE.PlaneGeometry( 500, 500, 15, 15 );
			geometry.rotateX( - Math.PI / 2 );
			const positions = geometry.attributes.position.array;
			const vertex = new THREE.Vector3();
			for ( let i = 0; i < positions.length; i += 3 ) {
				vertex.fromArray( positions, i );
				vertex.x += Math.random() * 10 - 5;
				vertex.z += Math.random() * 10 - 5;
				const distance = ( vertex.distanceTo( this.scene.position ) / 5 ) - 25;
				vertex.y = Math.random() * Math.max( 0, distance );
				vertex.toArray( positions, i );
			}
			geometry.computeVertexNormals();
			let material = new THREE.MeshLambertMaterial( {
				color: 0x909090
			} );
			let landscape = new THREE.Mesh( geometry, material );
			this.scene.add( landscape );

      /*
      // trees
			geometry = new TreesGeometry( landscape );
			material = new THREE.MeshBasicMaterial( {
				side: THREE.DoubleSide, vertexColors: true
			} );
			mesh = new THREE.Mesh( geometry, material );
			this.scene.add( mesh );
      */

      const loader = new FBXLoader()
      loader.load('/data/buildings.fbx', (object) => {
        let geometries = [];
        object.traverse(child => {
          if (child.isMesh) {
            child.geometry.scale(0.01, 0.01, 0.01);
            //child.geometry.rotateX(-Math.PI/2);
            geometries.push(child.geometry);
          }
        });

        const raycaster = new THREE.Raycaster();
    		raycaster.ray.direction.set( 0, -1, 0 );


        for ( let i = 0; i < 2000; i ++ ) {
          const x = Math.random() * 500 - 250;
          const z = Math.random() * 500 - 250;
          raycaster.ray.origin.set( x, 50, z );
          const intersections = raycaster.intersectObject( landscape );
          if ( intersections.length === 0 ) continue;
          const y = intersections[ 0 ].point.y;
          const height = Math.random() * 20 + 0.5;
          material  = new THREE.MeshStandardMaterial({ color: 0xcccccc });
          mesh = new THREE.Mesh(geometries[THREE.MathUtils.randInt(0, geometries.length-1)], material);
          mesh.position.set(x, y, z);
          //mesh.lookAt(0, 0, 0);
          mesh.scale.y = THREE.MathUtils.randFloat(1, 4);
          mesh.building = true;
          // mesh.tween = TweenMax.to(mesh.scale, 2, { z: rnd(1, 1.5), ease:  Elastic.easeOut.config(1, 0.2), delay: rnd(0, 4)});
          this.scene.add(mesh);
        }


        for ( let i = 0; i < 500; i ++ ) {
          let point = new THREE.Vector3();
          point.copy( curve.getPointAt( i / 500 ) );
          point.y = 0;
          point.x += THREE.MathUtils.randFloat(3, 10) * (THREE.MathUtils.randFloat(0, 1) > 0.5 ? 1.0 : -1.0)
          point.z += THREE.MathUtils.randFloat(3, 10) * (THREE.MathUtils.randFloat(0, 1) > 0.5 ? 1.0 : -1.0)

          raycaster.ray.origin.set( point.x, 50, point.z );
          const intersections = raycaster.intersectObject( landscape );
          if ( intersections.length === 0 ) continue;
          point.y = intersections[ 0 ].point.y;
          const height = Math.random() * 20 + 0.5;
          material  = new THREE.MeshStandardMaterial({ color: 0xcccccc });
          mesh = new THREE.Mesh(geometries[THREE.MathUtils.randInt(0, geometries.length-1)], material);
          mesh.position.set(point.x, point.y, point.z);
          //mesh.lookAt(0, 0, 0);
          mesh.scale.y = THREE.MathUtils.randFloat(0.1, 0.3);
          mesh.building = true;
          // mesh.tween = TweenMax.to(mesh.scale, 2, { z: rnd(1, 1.5), ease:  Elastic.easeOut.config(1, 0.2), delay: rnd(0, 4)});
          this.scene.add(mesh);
        }

      }, () => {
        console.log('progress')
      }, () => {
        console.log('error')
      })

      // roller coaster geometry
			geometry = new RollerCoasterGeometry( curve, 2000 );
			material = new THREE.MeshPhongMaterial( {
				vertexColors: true
			} );
			let mesh = new THREE.Mesh( geometry, material );
			this.scene.add( mesh );

      /*
      // original sky
			geometry = new SkyGeometry();
			material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
			mesh = new THREE.Mesh( geometry, material );
			this.scene.add( mesh );
      */

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
        new THREE.SphereGeometry(100, 32, 32),
        new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide,
          map: videoTexture,
          transparent: false,
          opacity: 1,
        })
      );
      warmingvideo.name = "warmingvideo";
      this.scene.add(warmingvideo)

      // lifters
			geometry = new RollerCoasterLiftersGeometry( curve, 100 );
			material = new THREE.MeshPhongMaterial();
			mesh = new THREE.Mesh( geometry, material );
			mesh.position.y = 0.1;
			this.scene.add( mesh );

      // shadow
			geometry = new RollerCoasterShadowGeometry( curve, 500 );
			material = new THREE.MeshBasicMaterial( {
				color: 0x111111, depthWrite: false, transparent: true,
        opacity: 0.5,
			} );
			mesh = new THREE.Mesh( geometry, material );
			mesh.position.y = 0.1;
			this.scene.add( mesh );

    },

    setupVR() {
      // enable VR (if available)
      if ("xr" in window.navigator) {
        this.renderer.xr.enabled = true;
      } else {
        console.log('no webVR supported');
      }
      this.vrButton = VRButton.createButton( this.renderer )
      this.element.appendChild(document.body.appendChild( this.vrButton));
    },

    initLoop() {
      this.renderer.setAnimationLoop(this.render);
    },

    render() {
      this.framecounter++
      const time = performance.now();
      const delta = time - this.prevTime;

			this.progress += this.velocity;
			this.progress = this.progress % 1;

			this.position.copy( curve.getPointAt( this.progress ) );
			this.position.y += 0.2;

			this.train.position.copy( this.position );

			this.tangent.copy( curve.getTangentAt( this.progress ) );

			this.velocity -= this.tangent.y * 0.0001 * delta;
			this.velocity = Math.max( 0.001, Math.min( 0.0004, this.velocity ) );
      //velocity = 0.00008;

			this.train.lookAt( this.lookAt.copy( this.position ).sub( this.tangent ) );
      this.renderer.render(this.scene, this.camera)
      this.prevTime = time;
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

<template>
  <div ref="scene" class="scene"></div>
  <video ref="video" src="" muted playsinline loop style="display: none" />
</template>

<style>
.scene {
  height: 100%;
  padding: 0; margin: 0;
}
</style>
