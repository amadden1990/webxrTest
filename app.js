
        
import {GLTFLoader} from './GLTFLoader.js';
import * as THREE from './three.module.js';

var scene;
var camera;
var renderer;
var isHit = false;
var reticle;
var model;

//Listen for button press to enter ar
(async function()
{
    console.log(navigator.userAgent);
    //check for mobile os name. if android then register event listener to activate the XR session.
    //if ios or apple anything, populate enter ar button with link to usdz file
    if(/Android/i.test(navigator.userAgent))
    {
        var usdz = document.getElementById("usdz");
        usdz.remove();

        var button = document.createElement("button");
        document.body.appendChild(button);
        button.id = "enter-ar";
        button.innerHTML = "Enter AR";
        document.getElementById("enter-ar").addEventListener("click",activateXR);
    }
    
    if(/iPhone|iPad|iPod/i.test(navigator.userAgent))
    {
        var a = document.getElementById("usdz");
        a.setAttribute("href","techCity.usdz");

        var img = document.getElementById("preview");
        img.setAttribute("src","techCity-preview.png");
    }


    
})();



async function activateXR()
{
    const canvas  = document.createElement("canvas");
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl",{xrCompatible: true});

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        preserveDrawingBuffer: true,
        canvas: canvas,
        context: gl
    });

    renderer.autoClear = false;

    //load scene
    LoadScene();

    //load reticle
    LoadReticle();

    // Initialize a WebXR session using "immersive-ar".
    const session = await navigator.xr.requestSession("immersive-ar",{requiredFeatures: ['hit-test']});
    session.updateRenderState({
    baseLayer: new XRWebGLLayer(session, gl)
    });

    // A 'local' reference space has a native origin that is located
    // near the viewer's position at the time the session was created.
    const referenceSpace = await session.requestReferenceSpace('local');

    // Create another XRReferenceSpace that has the viewer as the origin.
    const viewerSpace = await session.requestReferenceSpace('viewer');
    // Perform hit testing using the viewer as origin.
    const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

    session.addEventListener("select", OnHit);

    // Create a render loop that allows us to draw on the AR view.
    const onXRFrame = (time, frame) => {
        // Queue up the next draw request.
        session.requestAnimationFrame(onXRFrame);

        // Bind the graphics framebuffer to the baseLayer's framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer)

        // Retrieve the pose of the device.
        // XRFrame.getViewerPose can return null while the session attempts to establish tracking.
        const pose = frame.getViewerPose(referenceSpace);
        if (pose) {
            // In mobile AR, we only have one view.
            const view = pose.views[0];
        
            const viewport = session.renderState.baseLayer.getViewport(view);
            renderer.setSize(viewport.width, viewport.height)
        
            // Use the view's transform matrix and projection matrix to configure the THREE.camera.
            camera.matrix.fromArray(view.transform.matrix)
            camera.projectionMatrix.fromArray(view.projectionMatrix);
            camera.updateMatrixWorld(true);

            // Conduct hit test.
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            // If we have results, consider the environment stabilized.
            if (!this.stabilized && hitTestResults.length > 0) {
                this.stabilized = true;
                document.body.classList.add('stabilized');
            }

            if (hitTestResults.length > 0) {
                const hitPose = hitTestResults[0].getPose(referenceSpace);

                // Update the reticle position
                if(isHit == false)
                {
                    reticle.visible = true;
                    reticle.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z)
                    reticle.updateMatrixWorld(true);
                }
                else
                {
                    HideReticle();
                }              
            }


            // Render the scene with THREE.WebGLRenderer.
            renderer.render(scene, camera)
        }
    }

    session.requestAnimationFrame(onXRFrame);


}

    
function OnHit()
{ 
    model.visible = true;
    model.position.copy(reticle.position);
    model.lookAt(camera.position);
    var rotation = model.rotation;
    var newRotation = new THREE.Euler(0,rotation.y,0,'XYZ');
    model.setRotationFromEuler(newRotation);

    isHit = true;
}

function LoadReticle()
{
    const rLoader = new GLTFLoader();
    rLoader.load("reticle.gltf",(gltf)=>{

        gltf.scene.traverse(function(child){
            if(child.isMesh)
            {
                child.material.alphaTest = 0.5;
            }
        });

        reticle = gltf.scene;
        reticle.visible = false;
        scene.add(reticle);
    });
}

function HideReticle()
{
    reticle.visible = false;
}


function LoadScene()
{

    const light = new THREE.AmbientLight(0xffffff,1.0);
    scene.add(light);

    const loader = new GLTFLoader();
    loader.load('./techCity.gltf', function(gltf){
    
        model = gltf.scene;
        model.visible = false;
        scene.add(model);
    }, undefined, function(error){
        console.error(error);
    });
    
}


        




