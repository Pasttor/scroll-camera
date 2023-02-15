import glsl from 'vite-plugin-glsl';

export default {
	plugins: [glsl()],
	assetsInclude: ['**/*.gltf', '**/*.glb'],
};
