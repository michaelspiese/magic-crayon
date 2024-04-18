import * as THREE from 'three'
import { OutlineMaterial } from './OutlineMaterial'

export class EdgeMesh extends THREE.Mesh
{
    private edgeMap: Map<string, number>;

    constructor()
    {
        super();

        this.edgeMap = new Map<string, number>();
        this.material = new OutlineMaterial();
        this.material.polygonOffset = true;
        this.material.polygonOffsetFactor = 1;
        this.material.polygonOffsetUnits = 1;
    }

    createFromMesh(mesh: THREE.Mesh): void
    {
        this.edgeMap.clear();

        // Load mesh data from GPU memory
        const vArray = mesh.geometry.getAttribute('position').array;
        const nArray = mesh.geometry.getAttribute('normal').array;
        const iArray = mesh.geometry.getIndex()!.array;

        // Move into more convenient data structures
        const meshVertices: THREE.Vector3[] = [];
        const meshNormals: THREE.Vector3[] = [];
        const meshFaces: THREE.Vector3[] = [];
        for(let i=0; i < vArray.length / 3; i++)
        {
            meshVertices.push(new THREE.Vector3(vArray[i*3], vArray[i*3+1], vArray[i*3+2]));
            meshNormals.push(new THREE.Vector3(nArray[i*3], nArray[i*3+1], nArray[i*3+2]));
        }
        for(let i=0; i < iArray.length / 3; i++)
        {
            meshFaces.push(new THREE.Vector3(iArray[i*3], iArray[i*3+1], iArray[i*3+2]));
        }

        const vertices: number[] = [];
        const normals: number[] = [];
        const leftNormals: number[] = [];
        const rightNormals: number[] = [];
        const triangles: number[] = [];
        for(let i=0; i < meshFaces.length; i++)
        {
            const edge1 = new THREE.Vector3().subVectors(meshVertices[meshFaces[i].y], meshVertices[meshFaces[i].x]);
            const edge2 = new THREE.Vector3().subVectors(meshVertices[meshFaces[i].z], meshVertices[meshFaces[i].x]);
            edge1.normalize();
            edge2.normalize();
            const faceNormal = new THREE.Vector3().crossVectors(edge1, edge2);

            this.addEdge(vertices, normals, leftNormals, rightNormals, triangles, meshVertices, meshNormals, 
                meshFaces[i].x, meshFaces[i].y, faceNormal);
            this.addEdge(vertices, normals, leftNormals, rightNormals, triangles, meshVertices, meshNormals, 
                meshFaces[i].y, meshFaces[i].z, faceNormal);
            this.addEdge(vertices, normals, leftNormals, rightNormals, triangles, meshVertices, meshNormals, 
                meshFaces[i].z, meshFaces[i].x, faceNormal);
        }
        
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.geometry.setAttribute('leftNormal', new THREE.Float32BufferAttribute(leftNormals, 3));
        this.geometry.setAttribute('rightNormal', new THREE.Float32BufferAttribute(rightNormals, 3));
        this.geometry.setIndex(triangles);
    }

    private addEdge(vertices: number[], 
                    normals: number[], 
                    leftNormals: number[], 
                    rightNormals: number[],
                    triangles: number[],
                    meshVertices: THREE.Vector3[],
                    meshNormals: THREE.Vector3[],
                    v1: number,
                    v2: number, 
                    n: THREE.Vector3): void
    {
        // Swap order so that v1 is always lower
        let pair: string;
        if(v1 < v2)
            pair = [v1, v2].join(',');
        else
            pair = [v2, v1].join(',');

        const vertex = this.edgeMap.get(pair);
        if(vertex)
        {
            rightNormals[vertex*3] = n.x;
            rightNormals[vertex*3+1] = n.y;
            rightNormals[vertex*3+2] = n.z;
            rightNormals[(vertex+1)*3] = n.x;
            rightNormals[(vertex+1)*3+1] = n.y;
            rightNormals[(vertex+1)*3+2] = n.z;
            rightNormals[(vertex+2)*3] = n.x;
            rightNormals[(vertex+2)*3+1] = n.y;
            rightNormals[(vertex+2)*3+2] = n.z;
            rightNormals[(vertex+3)*3] = n.x;
            rightNormals[(vertex+3)*3+1] = n.y;
            rightNormals[(vertex+3)*3+2] = n.z;
        }
        else
        {
            const newVertex = vertices.length / 3;
            this.edgeMap.set(pair, newVertex);

            vertices.push(meshVertices[v1].x, meshVertices[v1].y, meshVertices[v1].z);
            vertices.push(meshVertices[v1].x, meshVertices[v1].y, meshVertices[v1].z);
            vertices.push(meshVertices[v2].x, meshVertices[v2].y, meshVertices[v2].z);
            vertices.push(meshVertices[v2].x, meshVertices[v2].y, meshVertices[v2].z);

            normals.push(0, 0, 0);
            normals.push(meshNormals[v1].x, meshNormals[v1].y, meshNormals[v1].z);
            normals.push(0, 0, 0);
            normals.push(meshNormals[v2].x, meshNormals[v2].y, meshNormals[v2].z);

            leftNormals.push(n.x, n.y, n.z);
            leftNormals.push(n.x, n.y, n.z);
            leftNormals.push(n.x, n.y, n.z);
            leftNormals.push(n.x, n.y, n.z);

            const nInverse = n.clone();
            nInverse.multiplyScalar(-1);
            rightNormals.push(nInverse.x, nInverse.y, nInverse.z);
            rightNormals.push(nInverse.x, nInverse.y, nInverse.z);
            rightNormals.push(nInverse.x, nInverse.y, nInverse.z);
            rightNormals.push(nInverse.x, nInverse.y, nInverse.z);

            triangles.push(newVertex, newVertex+2, newVertex+3);
            triangles.push(newVertex, newVertex+3, newVertex+1);
        }
    }
}