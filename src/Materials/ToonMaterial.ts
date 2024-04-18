import * as THREE from 'three'
import { ArtisticRendering } from '../Shaders/ArtisticRendering'

export class ToonMaterial extends THREE.ShaderMaterial
{
    public ambient: THREE.Color;
    public diffuse: THREE.Color;
    public specular: THREE.Color;
    public shininess: number;
    public diffuseRamp: THREE.Texture | null;
    public specularRamp: THREE.Texture | null;

    constructor(diffuseRampFile: string, specularRampFile: string)
    {
        super({lights: true});
    
        this.uniforms = THREE.UniformsUtils.merge([
            THREE.UniformsLib['lights'],
            { 
                kAmbient: { type: 'vec3', value: null },
                kDiffuse: { type: 'vec3', value: null },
                kSpecular: { type: 'vec3', value: null },
                shininess: { type: 'float', value: null },
                diffuseRamp: { type: 't', value: null },
                specularRamp: { type: 't', value: null },
                lights: true
            }
        ]);

        this.ambient = new THREE.Color();
        this.uniforms.kAmbient.value = this.ambient;

        this.diffuse = new THREE.Color();
        this.uniforms.kDiffuse.value = this.diffuse;

        this.specular = new THREE.Color();
        this.uniforms.kSpecular.value = this.specular;

        this.shininess = 30;
        this.uniforms.shininess.value = this.shininess;

        this.diffuseRamp = new THREE.TextureLoader().load(diffuseRampFile);
        this.diffuseRamp.minFilter = THREE.NearestFilter;
        this.diffuseRamp.magFilter = THREE.NearestFilter;
        this.uniforms.diffuseRamp.value = this.diffuseRamp;

        this.specularRamp = new THREE.TextureLoader().load(specularRampFile);
        this.specularRamp.minFilter = THREE.NearestFilter;
        this.specularRamp.magFilter = THREE.NearestFilter;
        this.uniforms.specularRamp.value = this.specularRamp;
        
        this.vertexShader = ArtisticRendering.getToonVertexShader();
        this.fragmentShader = ArtisticRendering.getToonFragmentShader();
    }
}