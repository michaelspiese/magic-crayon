import * as THREE from 'three'

export class Billboard extends THREE.Object3D
{
    public strokeWidth: number;
    public screenPath: THREE.Vector2[];
    public worldOrigin: THREE.Vector3;

    // mesh data 
    private vertices: number[];
    private indices: number[];
    private mesh: THREE.Mesh;

    constructor(deviceCoords = new THREE.Vector2(), worldOrigin = new THREE.Vector3(), color = 'black', strokeWidth = 0.02)
    {
        super();

        this.strokeWidth = strokeWidth;
        this.worldOrigin = new THREE.Vector3(worldOrigin.x, worldOrigin.y, worldOrigin.z);

        this.screenPath = [];
        this.screenPath.push(new THREE.Vector2(deviceCoords.x, deviceCoords.y));

        this.vertices = [];
        this.vertices.push(deviceCoords.x, deviceCoords.y, -0.999);
        this.vertices.push(deviceCoords.x, deviceCoords.y, -0.999);

        this.indices = [];

        this.mesh = new THREE.Mesh();
        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        this.mesh.geometry.setIndex(this.indices);
        this.mesh.matrixAutoUpdate = false;
        this.add(this.mesh);

        this.mesh.material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });
    }

    addNewPoint(deviceCoords: THREE.Vector2): void
    {
        const newPoint = new THREE.Vector2(deviceCoords.x, deviceCoords.y);
        const endPoint = this.screenPath[this.screenPath.length-1];

        if(newPoint.distanceTo(endPoint) > this.strokeWidth / 2)
        {
            const strokeVector = new THREE.Vector2();
            strokeVector.subVectors(newPoint, endPoint);
            strokeVector.normalize();
            strokeVector.rotateAround(new THREE.Vector2(), Math.PI / 2);
            strokeVector.multiplyScalar(this.strokeWidth/2);

            const vertex1 = new THREE.Vector2();
            vertex1.subVectors(newPoint, strokeVector);

            const vertex2 = new THREE.Vector2();
            vertex2.addVectors(newPoint, strokeVector);
            
            const nextIndex = this.vertices.length / 3;
            this.vertices.push(vertex1.x, vertex1.y, -0.999);
            this.vertices.push(vertex2.x, vertex2.y, -0.999);

            this.indices.push(nextIndex, nextIndex + 1, nextIndex - 2);
            this.indices.push(nextIndex - 1, nextIndex - 2, nextIndex + 1);

            this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
            this.mesh.geometry.setIndex(this.indices);

            this.screenPath.push(newPoint);
        }
    }

    projectToNearPlane(camera: THREE.Camera): void
    {
        this.mesh.matrix.copy(camera.projectionMatrixInverse);
        this.position.copy(camera.position);
        this.rotation.copy(camera.rotation);
    }

    projectToWorld(camera: THREE.Camera): void
    {
        if(this.vertices.length < 3)
            return;

        const point = new THREE.Vector2(this.vertices[0], this.vertices[1]);
        const planeNormal = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const projectionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, this.worldOrigin);

        this.position.copy(this.worldOrigin);

        const cameraOnGround = new THREE.Vector3(camera.position.x, 0, camera.position.z);
        this.lookAt(cameraOnGround);

        this.mesh.matrix.identity();
        this.mesh.matrix.makeRotationFromEuler(this.rotation);
        this.mesh.matrix.invert();
        
        const rayCaster = new THREE.Raycaster();
        for(let i=0; i < this.vertices.length / 3; i++)
        {
            point.set(this.vertices[i*3], this.vertices[i*3+1]);
            rayCaster.setFromCamera(point, camera);

            const intersection = new THREE.Vector3();
            rayCaster.ray.intersectPlane(projectionPlane, intersection);
            this.vertices[i*3] = intersection.x - this.position.x;
            this.vertices[i*3+1] = intersection.y - this.position.y;
            this.vertices[i*3+2] = intersection.z - this.position.z;
        }

        // Assign the new mesh vertices
        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));

        // Recompute the bounding sphere.  This is necessary to for the 
        // renderer to correctly cull the object based on the view frustum
        this.mesh.geometry.computeBoundingSphere();
    }

    projectToBillboard(billboard: Billboard, camera: THREE.Camera): void
    {
        if(this.vertices.length < 3)
            return;

        const point = new THREE.Vector2(this.vertices[0], this.vertices[1]);
        const planeNormal = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const projectionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, this.worldOrigin);

        this.position.set(0, 0, 0);
        this.rotation.set(0, 0, 0);
        this.mesh.matrix.identity();
        
        const rayCaster = new THREE.Raycaster();
        for(let i=0; i < this.vertices.length / 3; i++)
        {
            point.set(this.vertices[i*3], this.vertices[i*3+1]);
            rayCaster.setFromCamera(point, camera);

            const intersection = new THREE.Vector3();
            rayCaster.ray.intersectPlane(projectionPlane, intersection);
            billboard.worldToLocal(intersection);
            this.vertices[i*3] = intersection.x;
            this.vertices[i*3+1] = intersection.y;
            this.vertices[i*3+2] = intersection.z;
        }

        // Assign the new mesh vertices
        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));

        // Recompute the bounding sphere.  This is necessary to for the 
        // renderer to correctly cull the object based on the view frustum
        this.mesh.geometry.computeBoundingSphere();
    }

    
    // Drawing in the Sky (Part 2)
    // First, you should take a look at the projectToNearPlane(), projectToWorld(), 
    // and projectToBillboard()` methods implemented above.  The structure for this
    // method will be similar, except you will be ray casting to the sky sphere.
    projectToSky(camera: THREE.Camera, sky: THREE.Mesh): void
    {
        // Reset the position and rotation of the billboard
        // You will not need to change these variables
        this.position.set(0, 0, 0);
        this.rotation.set(0, 0, 0);
        this.mesh.matrix.identity();

        const point = new THREE.Vector2(this.vertices[0], this.vertices[1]);
        const projectionSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 495);

        // TO DO: ADD YOUR CODE HERE
        const rayCaster = new THREE.Raycaster();
        for(let i=0; i < this.vertices.length / 3; i++)
        {
            point.set(this.vertices[i*3], this.vertices[i*3+1]);
            rayCaster.setFromCamera(point, camera);

            const intersection = new THREE.Vector3();
            rayCaster.ray.intersectSphere(projectionSphere, intersection);
            sky.worldToLocal(intersection);
            this.vertices[i*3] = intersection.x;
            this.vertices[i*3+1] = intersection.y;
            this.vertices[i*3+2] = intersection.z;
        }
        
        // Assign the new mesh vertices
        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));

        // Recompute the bounding sphere.  This is necessary to for the 
        // renderer to correctly cull the object based on the view frustum
        this.mesh.geometry.computeBoundingSphere();
    }
}   