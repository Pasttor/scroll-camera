import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import fragmentShader from './shaders/fragment.glsl';
import vertexShader from './shaders/vertex.glsl';
import gsap from 'gsap';
import model from './src/human.glb';
// import model from './src/khater-agency-3d-logo.gltf';
import env from './src/environment-mapp.jpg';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { HoloEffect } from './HoloEffect.js';

import * as dat from 'dat.gui';

export default class Sketch {
  constructor(options) {
    this.container = options.domElement;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      10
    );

    //this.camera.position.z = 1;
    this.camera.position.set(-1, 0.3, 0);

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(2);
    //this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(
      'https://raw.githubusercontent.com/mrdoob/three.js/r147/examples/js/libs/draco/'
    );
    this.gltf = new GLTFLoader();
    this.gltf.setDRACOLoader(this.dracoLoader);

    this.time = 0;
    this.initPost();
    this.resize();
    this.addObjects();
    // this.addLights();
    this.render();

    this.setupResize();

    this.settings();
  }
  initPost() {
    this.renderScene = new RenderPass(
      this.scene,
      this.camera
    );

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        window.innerWidth,
        window.innerHeight
      ),
      1.5,
      0.4,
      0.85
    );
    this.bloomPass.threshold = this.settings.bloomThreshold;

    this.bloomPass.threshold = 0.06;
    // this.bloomPass.strength = 0.51;
    this.bloomPass.radius = 0.42;

    this.holoEffect = new ShaderPass(HoloEffect);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderScene);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.holoEffect);
  }

  settings() {
    let that = this;

    this.settings = {
      progress: 0,
      exposure: 2,
      bloomStrength: 3,
      bloomThreshold: 0.05,
      bloomRadius: 0.8,
    };
    this.gui = new dat.GUI();
    dat.GUI.toggleHide();
    this.gui
      .add(this.settings, 'progress', 0, 3, 0.01)
      .onChange(() => {
        that.holoEffect.uniforms.progress.value =
          this.settings.progress;
      });
    this.gui
      .add(this.settings, 'exposure', 0, 3, 0.01)
      .onChange(() => {
        that.renderer.toneMappingExposure =
          this.settings.exposure;
      });
    this.gui
      .add(this.settings, 'bloomStrength', 0, 3, 0.01)
      .onChange((val) => {
        that.bloomPass.strength = val;
      });
    this.gui
      .add(this.settings, 'bloomThreshold', 0, 3, 0.01)
      .onChange((val) => {
        that.bloomPass.threshold = val;
      });
    this.gui
      .add(this.settings, 'bloomRadius', 0, 3, 0.01)
      .onChange((val) => {
        that.bloomPass.radius = val;
      })
      .closed(true);
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }
  setupResize() {
    window.addEventListener('resize', this.resize.bind(this));
  }

  addObjects() {
    this.pmremGenerator = new THREE.PMREMGenerator(
      this.renderer
    );

    this.pmremGenerator.compileEquirectangularShader();

    this.envMap = new THREE.TextureLoader().load(
      env,
      (texture) => {
        this.envMap =
          this.pmremGenerator.fromEquirectangular(
            texture
          ).texture;
        this.pmremGenerator.dispose();
      }
    );

    this.gltf.load(model, (gltf) => {
      this.scene.add(gltf.scene);
      this.human = gltf.scene.children[0];
      this.human.scale.set(0.06, 0.06, 0.06);
      this.human.position.set(-0.8, -0.75, 0);
      //this.human.geometry.center();
      // this.human.material = new THREE.MeshBasicMaterial({
      // 	color: 0xff6600,
      // });
      // console.log(this.human);
      this.human.rotation.set(0, 0, 0);

      this.m = new THREE.MeshStandardMaterial({
        metalness: 1,
        roughness: 0.28,
      });

      this.m.envMap = this.envMap;

      this.m.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };

        shader.fragmentShader =
          `

				uniform float uTime;
				mat4 rotationMatrix(vec3 axis, float angle) {
					axis = normalize(axis);
					float s = sin(angle);
					float c = cos(angle);
					float oc = 1.0 - c;
					
					return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
								oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
								oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
								0.0,                                0.0,                                0.0,                                1.0);
				}
				
				vec3 rotate(vec3 v, vec3 axis, float angle) {
					mat4 m = rotationMatrix(axis, angle);
					return (m * vec4(v, 1.0)).xyz;
				}
				` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
          `#include <envmap_physical_pars_fragment>`,

          `
					#if defined( USE_ENVMAP )
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#if defined( ENVMAP_TYPE_CUBE_UV )
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#if defined( ENVMAP_TYPE_CUBE_UV )
			vec3 reflectVec = reflect( - viewDir, normal );
			// Mixing the reflection with the normal is more accurate and keeps rough objects from gathering light from behind their tangent plane.
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );

			reflectVec = rotate(reflectVec, vec3(1.0, 0.0, 0.0), uTime * 0.04);
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
#endif
					`
        );

        this.m.userData.shader = shader;
      };

      this.human.material = this.m;
    });
  }

  addLights() {
    const light1 = new THREE.AmbientLight(0xfff, 0.4);
    this.scene.add(light1);
    const light2 = new THREE.DirectionalLight(0xffffff, 0.1);
    light2.position.set(0.5, 0, 0.866);

    this.scene.add(light2);
  }

  render() {
    this.time += 0.05;
    this.controls.update();

    requestAnimationFrame(this.render.bind(this));
    // this.renderer.render(this.scene, this.camera);
    this.composer.render(this.scene, this.camera);

    if (this.human) {
      if (this.m.userData) {
        // console.log(this.m.userData);
        this.human.material.userData.shader.uniforms.uTime.value =
          this.time;

        this.holoEffect.uniforms.uTime.value = this.time;
      }
      this.human.rotation.y = 5;
    }
  }
}

new Sketch({
  domElement: document.getElementById('container'),
});
