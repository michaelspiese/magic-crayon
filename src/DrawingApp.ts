import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { ToonMaterial } from './Materials/ToonMaterial'
import { GUI } from 'dat.gui'
import { GraphicsApp } from './GraphicsApp'
import { Billboard } from './Billboard';
import { Ground } from './Ground';


enum DrawState
{
    NO_DRAWING,
    DRAWING_GROUND,
    DRAWING_SKY,
    DRAWING_BILLBOARD
}

export class DrawingApp extends GraphicsApp
{ 
    private skySphere: THREE.Mesh;
    private ground: Ground;

    private skyMaterial: THREE.MeshBasicMaterial;
    private groundMaterial: ToonMaterial;

    private groundColor: string;
    private skyColor: string;
    private crayonColor: string;

    private drawState: DrawState;

    private currentBillboard: Billboard | null;
    private targetBillboard: Billboard | null;
    private billboards: Billboard[];

    private cameraControls: PointerLockControls;
    private inputVector : THREE.Vector2;

    constructor()
    {
        // Pass in the aspect ratio to the constructor
        super(60, 1920/1080, 0.1, 1000);

        this.ground = new Ground(100, 150);
        this.skySphere = new THREE.Mesh();

        this.skyMaterial = new THREE.MeshBasicMaterial();
        this.groundMaterial = new ToonMaterial('./toonDiffuse.png', './toonSpecular.png');

        this.skyColor = '#ffffff';
        this.groundColor = '#400040';
        this.crayonColor = '#800080';

        this.drawState = DrawState.NO_DRAWING;

        this.currentBillboard = null;
        this.targetBillboard = null;
        this.billboards = [];

        this.cameraControls = new PointerLockControls(this.camera, this.renderer.domElement);
        this.inputVector = new THREE.Vector2();
    }

    createScene(): void
    {
        // Setup camera
        this.camera.position.set(0, 1.5, 3.5);
        this.camera.lookAt(0, 1.5, 0);
        this.camera.up.set(0, 1, 0);
        this.scene.add(this.camera);

        // Setup camera controls
        this.cameraControls.unlock(); 

        // Create an ambient light
        const ambientLight = new THREE.AmbientLight('white', 0.25);
        this.scene.add(ambientLight);

        // Create a scene light
        const sceneLight = new THREE.PointLight('white', 0.6);
        sceneLight.color.set(new THREE.Color(0.6, 0.6, 0.6));
        sceneLight.position.set(10, 10, 10);
        this.scene.add(sceneLight);

        // Create the ground mesh
        this.scene.add(this.ground);

        // Create the sky sphere
        this.skyMaterial.side = THREE.DoubleSide;
        this.skySphere.material = this.skyMaterial;
        this.skySphere.geometry = new THREE.SphereGeometry(500);
        this.scene.add(this.skySphere);

        // Create the GUI
        const gui = new GUI();
        gui.width = 250;

        const controls = gui.addFolder("Harold's Crayons");
        controls.open();

        const crayonColorController = controls.addColor(this, 'crayonColor');
        crayonColorController.name('Crayon Color');
        crayonColorController.onChange(() => { this.updateColors() });

        const skyColorController = controls.addColor(this, 'skyColor');
        skyColorController.name('Sky Color');
        skyColorController.onChange(() => { this.updateColors() });

        const groundColorController = controls.addColor(this, 'groundColor');
        groundColorController.name('Ground Color');   
        groundColorController.onChange(() => { this.updateColors() });   

        this.groundMaterial.diffuse.set(new THREE.Color(0.4, 0.4, 0.4));
        this.groundMaterial.specular.set(new THREE.Color(0.6, 0.6, 0.6));
        this.groundMaterial.shininess = 50;
        this.updateColors();
        this.ground.material = this.groundMaterial;
    }

    update(deltaTime : number): void
    {
        if(this.drawState == DrawState.NO_DRAWING)
        {
            const cameraMoveSpeed = 2;
            this.camera.translateX(this.inputVector.x * cameraMoveSpeed * deltaTime);
            this.camera.translateZ(-this.inputVector.y * cameraMoveSpeed * deltaTime);
        }

        this.billboards.forEach((billboard: Billboard) => {
            const cameraOnGround = new THREE.Vector3(this.camera.position.x, 0, this.camera.position.z);
            billboard.lookAt(cameraOnGround);
        });
    }

    updateColors(): void
    {
        this.skyMaterial.color.set(this.skyColor);
        this.groundMaterial.ambient.set(this.groundColor);
    }

    onMouseDown(event: MouseEvent): void 
    {
        // Left mouse button
        if(event.button == 0)
        {
            // Get the mouse position in normalized device coordinates
            const deviceCoords = this.getDeviceCoordinates(event.x, event.y);

            // Create a ray caster
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(deviceCoords, this.camera);

            // Mouse-billboard Intersections
            const billboardIntersection = raycaster.intersectObjects(this.billboards);
            if(billboardIntersection.length > 0)
            {
                this.drawState = DrawState.DRAWING_BILLBOARD;
                this.targetBillboard = billboardIntersection[0].object as Billboard;
                this.currentBillboard = new Billboard(deviceCoords, billboardIntersection[0].point, this.crayonColor, 0.02);
                this.scene.add(this.currentBillboard);
                return;
            }

            // Mouse-ground Intersections
            const groundIntersection = raycaster.intersectObject(this.ground);
            if(groundIntersection.length > 0)
            {
                this.drawState = DrawState.DRAWING_GROUND;
                this.currentBillboard = new Billboard(deviceCoords, groundIntersection[0].point, this.crayonColor, 0.02);
                this.scene.add(this.currentBillboard);
                return;
            }

            // Mouse-Sky Interactions (Part 1)
            // Projects a 2D normalized screen point (e.g., the mouse position in normalized
            // device coordinates) to a 3D point on the "sky," which is really a huge sphere
            // that the viewer is inside.  This ray cast should always return a result
            // because any screen point can successfully be projected onto the sphere.
            // Note, this ray cast will only test if the ray passing through the screen point 
            // intersects the sphere; it does not check to see if the ray hits the ground or 
            // anything else first.  Then, you should create a new billboard at the sky
            // intersection point.  You should also set the draw state to correct mode,
            // similar to the code blocks above for the ground and billboard.

            // Mouse-ground Intersections
            const skyIntersection = raycaster.intersectObject(this.skySphere);
            if(skyIntersection.length > 0)
            {
                this.drawState = DrawState.DRAWING_SKY;
                this.currentBillboard = new Billboard(deviceCoords, skyIntersection[0].point, this.crayonColor, 0.02);
                this.scene.add(this.currentBillboard);
                return;
            }
        }

        // Right mouse button
        else if(event.button == 2)
        {
            this.cameraControls.lock();
        }
    }

    onMouseMove(event: MouseEvent): void 
    {
        if( this.drawState == DrawState.DRAWING_GROUND || 
            this.drawState == DrawState.DRAWING_BILLBOARD || 
            this.drawState == DrawState.DRAWING_SKY)
        {        
            const deviceCoords = this.getDeviceCoordinates(event.x, event.y);
            this.currentBillboard!.addNewPoint(deviceCoords);
            this.currentBillboard!.projectToNearPlane(this.camera);
        }
    }

    onMouseUp(event: MouseEvent): void 
    {
        // Left mouse button
        if(event.button == 0)
        {
            if(this.drawState == DrawState.DRAWING_GROUND)
            {
                const deviceCoords = this.getDeviceCoordinates(event.x, event.y);

                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(deviceCoords, this.camera);

                const intersection = raycaster.intersectObject(this.ground);
                if(intersection.length > 0)
                {
                    if(this.currentBillboard!.screenPath.length < 6)
                    {
                        console.log("Path is too short to reshape ground.");
                    }
                    else
                    {
                        this.ground.reshapeGround(
                            this.currentBillboard!.screenPath, 
                            this.currentBillboard!.worldOrigin,
                            intersection[0].point,
                            this.camera
                        );
                    }

                    this.currentBillboard!.removeFromParent();
                }
                else
                {
                    this.currentBillboard!.projectToWorld(this.camera);
                    this.billboards.push(this.currentBillboard!);
                }
            }
            else if(this.drawState == DrawState.DRAWING_BILLBOARD)
            {
                this.currentBillboard!.removeFromParent();
                this.currentBillboard!.projectToBillboard(this.targetBillboard!, this.camera);  
                this.targetBillboard!.add(this.currentBillboard!);
            }
            else if(this.drawState == DrawState.DRAWING_SKY)
            {
                this.currentBillboard!.projectToSky(this.camera, this.skySphere);
            }
        }
        else if(event.button == 2)
        {
            this.cameraControls.unlock();
        }
   
        this.drawState = DrawState.NO_DRAWING;
        this.currentBillboard = null; 
    }
    
    private getDeviceCoordinates(mouseX: number, mouseY: number): THREE.Vector2
    {
        const viewportCoords = new THREE.Vector4();
        this.renderer.getViewport(viewportCoords);

        return new THREE.Vector2
        (
            THREE.MathUtils.clamp((mouseX - viewportCoords.x) / viewportCoords.width * 2 - 1, -1, 1),
            THREE.MathUtils.clamp((mouseY - viewportCoords.y) / viewportCoords.height * -2 + 1, -1, 1)
        );
    }
    
    // Event handler for keyboard input
    // You don't need to modify this function
    onKeyDown(event: KeyboardEvent): void 
    {
        if(event.key == 'w' || event.key == 'ArrowUp')
            this.inputVector.y = 1;
        else if(event.key == 's' || event.key == 'ArrowDown')
            this.inputVector.y = -1;
        else if(event.key == 'a' || event.key == 'ArrowLeft')
            this.inputVector.x = -1;
        else if(event.key == 'd' || event.key == 'ArrowRight')
            this.inputVector.x = 1;
    }

    // Event handler for keyboard input
    // You don't need to modify this function
    onKeyUp(event: KeyboardEvent): void 
    {
        if((event.key == 'w' || event.key == 'ArrowUp') && this.inputVector.y == 1)
            this.inputVector.y = 0;
        else if((event.key == 's' || event.key == 'ArrowDown') && this.inputVector.y == -1)
            this.inputVector.y = 0;
        else if((event.key == 'a' || event.key == 'ArrowLeft')  && this.inputVector.x == -1)
            this.inputVector.x = 0;
        else if((event.key == 'd' || event.key == 'ArrowRight')  && this.inputVector.x == 1)
            this.inputVector.x = 0;
    }
}