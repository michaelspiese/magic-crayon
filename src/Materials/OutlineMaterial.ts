import * as THREE from 'three'
import { ArtisticRendering } from '../Shaders/ArtisticRendering'

export class OutlineMaterial extends THREE.ShaderMaterial
{
    public color: THREE.Color;
    public thickness: number;

    constructor(thickness = 0.2, color = new THREE.Color(0, 0, 0))
    {
        super();       
        this.vertexShader = ArtisticRendering.getOutlineVertexShader();
        this.fragmentShader = ArtisticRendering.getOutlineFragmentShader();
        this.thickness = thickness;
        this.color = color;
        this.side = THREE.DoubleSide;

        const uniforms = {
            thickness: { type: 'float', value: this.thickness },
            color: { type: 'vec3', value: this.color }
        }
        this.uniforms = uniforms;
    }
}