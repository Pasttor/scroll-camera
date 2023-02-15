


varying vec2 vUv;
uniform float time;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(
    position, 1.0);
}



