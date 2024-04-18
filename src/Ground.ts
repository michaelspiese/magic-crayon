import * as THREE from 'three'
import { EdgeMesh } from './Materials/EdgeMesh'

export class Ground extends THREE.Mesh
{
    private segments: number;
    private vertices: number[];

    public edgeMesh: EdgeMesh;

    constructor(size: number, segments: number)
    {
        super();

        // to initialize ground geometry, a simple grid is used.  if it is running too slow,
        // you can turn down the resolution by decreasing the number of segments, but this will
        // make the hills look more jaggy.

        this.segments = segments;
        this.vertices = [];


        const normals = [];
        const indices = [];

        const increment = size / segments;
        for(let i = -size/2; i <= size/2; i += increment)
        {
            for(let j= -size/2; j <= size/2; j += increment)
            {
                this.vertices.push(i, 0, j);
                normals.push(0, 1, 0);
            }
        }

        for(let i = 0; i < segments; i++)
        {
            for(let j = 0; j < segments; j++)
            {
                // first triangle
                indices.push(this.convertRowColToIndex(i, j));
                indices.push(this.convertRowColToIndex(i, j+1));
                indices.push(this.convertRowColToIndex(i+1, j));

                // second triangle
                indices.push(this.convertRowColToIndex(i+1, j));
                indices.push(this.convertRowColToIndex(i, j+1));
                indices.push(this.convertRowColToIndex(i+1, j+1));
            }
        }

        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.geometry.setIndex(indices);

        // Create an edge mesh for the outline shader
        this.edgeMesh = new EdgeMesh();
        this.edgeMesh.createFromMesh(this); 
        this.add(this.edgeMesh);
    }


    // Modifies the vertices of the ground mesh to create a hill or valley based
    // on the input stroke.  The 2D path of the stroke on the screen is passed
    // in, this is the centerline of the stroke mesh that is actually drawn on
    // the screen while the user is drawing.
    public reshapeGround(screenPath: THREE.Vector2[], groundStartPoint: THREE.Vector3,  groundEndPoint: THREE.Vector3, camera: THREE.Camera): void
    {
        let silhouetteCurve : THREE.Vector3[] = [];

        // TO DO: Deform the 3D ground mesh according to the algorithm described in the
        // Cohen et al. Harold paper.

        // You might need the eye point and the look vector, these can be determined
        // from the view matrix as follows:

        // There are 3 major steps to the algorithm, outlined here:

        // 1. Define a plane to project the stroke onto.  The first and last points
        // of the stroke are guaranteed to project onto the ground plane.  The plane
        // should pass through these two points on the ground.  The plane should also
        // have a normal vector that points toward the camera and is parallel to the
        // ground plane.

        // Hint: the THREE.Plane class has a setFromNormalAndCoplanarPoint() convenience
        // function that will come in handy here.
        let SE = new THREE.Vector3().subVectors(groundEndPoint, groundStartPoint);
        let up = new THREE.Vector3(0,1,0);
        let n = new THREE.Vector3().crossVectors(SE, up).normalize();
        let reshapePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, groundStartPoint);

        // 2. Project the 2D stroke into 3D so that it lies on the "projection plane"
        // defined in step 1.

        // You will need to create a THREE.Raycaster, as discussed in class
        // You can use the raycaster.ray.intersectPlane() method to check
        // for an intersection with a THREE.Plane object.
        const rayCaster = new THREE.Raycaster();
        const point = new THREE.Vector2();
        for(let i=0; i < screenPath.length; i++)
        {
            point.set(screenPath[i].x, screenPath[i].y);
            rayCaster.setFromCamera(point, camera);

            const intersection = new THREE.Vector3();
            rayCaster.ray.intersectPlane(reshapePlane, intersection);
            silhouetteCurve.push(intersection);
        }



        // 3. Loop through all of the vertices of the ground mesh, and adjust the
        // height of each based on the equations in section 4.5 of the paper, also
        // repeated in the assignment readme.  The equations rely upon a function
        // h(), and we have implemented that for you as computeH() defined below.
        // Then, update the mesh geometry with the adjusted vertex positions.
        for (let i=0; i < this.vertices.length / 3; i++) 
        {
            let v = new THREE.Vector3(this.vertices[i*3], this.vertices[i*3+1], this.vertices[i*3+2]);
            const closestPointOnPlane = new THREE.Vector3();
            reshapePlane.projectPoint(v, closestPointOnPlane);

            let d = reshapePlane.distanceToPoint(v);
            let w = Math.max(0, 1-Math.pow(d/5, 2))
            let h = this.computeH(closestPointOnPlane, silhouetteCurve, reshapePlane);
            if (h != 0) 
            {
                this.vertices[i*3+1] = (1-w)*this.vertices[i*3+1] + w*h;
            }
        }
        
        // Finally, after the position buffer has been updated, we need to compute
        // new vertex normals and update the edge mesh for the outline shader.
        // You will not need to modify this part of the code.
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        this.geometry.computeVertexNormals();   
        this.edgeMesh.createFromMesh(this); 
    }


    // This implements the "h" term used in the equations described in section 4.5 of the paper. 
    // Three arguments are needed:
    //
    // 1. closestPoint: As described in the paper, this is the closest point within
    // the projection plane to the vertex of the mesh that we want to modify.  In other
    // words, it is the perpendicular projection of the vertex we want to modify onto
    // the projection plane.
    //
    // 2. silhouetteCurve: As described in the paper, the silhouette curve is a 3D version
    // of the curve the user draws with the mouse.  It is formed by projecting the
    // original 2D screen-space curve onto the 3D projection plane. 
    //
    // 3. projectionPlane: We need to know where the projection plane is in 3D space.
    private computeH(closestPoint: THREE.Vector3, silhouetteCurve: THREE.Vector3[], projectionPlane: THREE.Plane): number
    {
        // define the y axis for a "plane space" coordinate system as a world space vector
        const planeY = new THREE.Vector3(0, 1, 0);

         // define the x axis for a "plane space" coordinate system as a world space vector
        const planeX = new THREE.Vector3().crossVectors(planeY, projectionPlane.normal);
        planeX.normalize();

        // define the origin for a "plane space" coordinate system as the first point in the curve
        const origin = silhouetteCurve[0];

        // loop over line segments in the curve, find the one that lies over the point by
        // comparing the "plane space" x value for the start and end of the line segment
        // to the "plane space" x value for the closest point to the vertex that lies
        // in the projection plane.
        const xTarget = new THREE.Vector3().subVectors(closestPoint, origin).dot(planeX);
        for(let i=1; i < silhouetteCurve.length; i++)
        {
            const xStart = new THREE.Vector3().subVectors(silhouetteCurve[i-1], origin).dot(planeX);
            const xEnd = new THREE.Vector3().subVectors(silhouetteCurve[i], origin).dot(planeX);

            if((xStart <= xTarget) && (xTarget <= xEnd))
            {
                const alpha = (xTarget - xStart) / (xEnd - xStart);
                const yCurve = silhouetteCurve[i-1].y + alpha * (silhouetteCurve[i].y - silhouetteCurve[i-1].y);
                return yCurve - closestPoint.y;
            }
            else if((xEnd <= xTarget) && (xTarget <= xStart))
            {
                const alpha = (xTarget - xEnd) / (xStart - xEnd);
                const yCurve = silhouetteCurve[i].y + alpha * (silhouetteCurve[i-1].y - silhouetteCurve[i].y); 
                return yCurve - closestPoint.y;
            }
        }

        // return 0 because the point does not lie under the curve
        return 0;
    }

    private convertRowColToIndex(row: number, col: number): number
    {
        return row * (this.segments+1) + col;
    }
}