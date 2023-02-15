

uniform float time;
uniform sampler2D uTexture;

varying float pulse;
varying vec2 vUv;
varying vec3 vNormal;

void main() {

	gl_FragColor = vec4( vUv, 0., 1.);

}


