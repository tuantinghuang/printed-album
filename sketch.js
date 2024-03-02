import { features, audioFeatureData, audioIsProcessing } from '/sketch/audio-processor.js';

const toggleCapture = document.getElementById("toggle-capture");
const toggleDownload = document.getElementById("download-data");


//------------------ capture -------------------------

let snap = false;
let snapInterval;
let startInterval = false;
let prev_soundTime = 0;
let isCapturing = false;
let imgIndex = "";

toggleCapture.addEventListener("click", toggleCaptureHandler);
toggleDownload.addEventListener('click', toggleDownloadHandler);

function capture(imgIndex) {
    const cav = document.querySelector('#container canvas');

    const base64 = cav.toDataURL('img/png');
    document.querySelector('#img').src = base64;

    let filename = 'image'.concat(imgIndex).concat('.png');
    downloadImage(base64, filename);
};

function downloadImage(data, filename) {
    var a = document.createElement('a');
    a.href = data;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
}

function captureStart() {
    toggleCapture.classList.toggle("capturing");
    toggleCapture.innerHTML = "Stop screen capture";
    toggleCapture.disabled = false;

    startInterval = true;
    //capture every 5 seconds
    snapInterval = setInterval(() => { snap = true }, 5000);
}

function captureStop() {
    startInterval = false;
    //clearInterval(snapInterval);
    toggleCapture.classList.toggle("capturing");
    toggleCapture.innerHTML = "Start screen capture";
    //reset image index
    imgIndex = 0;
    snap = false;
}

function toggleCaptureHandler() {
    //screen capture
    isCapturing = this.classList.contains("capturing");
    if (!isCapturing) {
        console.log('started capture')
        captureStart();
    } else {
        captureStop();
    }
}


let dataTxt = [];

function captureTimeCounter() {
    let soundTime = Math.floor(audioFeatureData['time']);

    if (soundTime % 5 === 0 && soundTime != prev_soundTime) {
        snap = true;
        console.log('new 5 sec!');
        prev_soundTime = soundTime;
    }

    if (snap) {
        imgIndex = features.Time;
        capture(imgIndex);
        dataTxt.push(features);
        snap = false;
    }
}

function toggleDownloadHandler() {
    downloadText('data.json', dataTxt);
}

function downloadText(filename, data) {

    let text = JSON.stringify(data);

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

/*-------------


















-----------three js-----*/

//imports
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const toggleSketch = document.querySelector('#toggle-sketches');
toggleSketch.addEventListener('change', toggleSketchHandler);

let aspectRatio, camera, renderer, composer;
let radius;

let activeScene;

let scene1;
let scene1Info = {};

let scene2;
let scene2Info = {};

let sceneInfos = [];

let clock = new THREE.Clock();

function toggleSketchHandler(e) {
    let index = parseInt(e.target.value) - 1;
    activeScene = sceneInfos[index].scene;
    console.log(index);
    composer = sceneInfos[index].composer;

}


function init() {

    aspectRatio = window.innerWidth / window.innerHeight;

    camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 1000);

    const container = document.getElementById('container');

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    let controls = new OrbitControls(camera, renderer.domElement);

    initScene1();
    initScene2();

    //by default start with sketch1
    activeScene = sceneInfos[0].scene;
    composer = sceneInfos[0].composer;
}


function initScene1() {

    scene1 = new THREE.Scene();
    scene1Info.scene = scene1;

    let mesh, mesh2;
    let light, light2;
    let lights = [];
    let composer;

    //let geometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 200, 200);
    let geo = new THREE.PlaneGeometry(3, 5, 1, 1000);
    //let geometry = new THREE.IcosahedronGeometry(0.3, 8);

    let mat = new THREE.MeshPhysicalMaterial({
        wireframe: true,
        color: 0xffffff,
        roughness: 0.15,
        specularColor: 0x0000ff,
        specularIntensity: 1,
        metalness: 1,
    });

    mesh = new THREE.Mesh(geo, mat);

    //mesh 2 is for textures in front of the main plane
    let geo2 = new THREE.PlaneGeometry(10, 10, 256, 256);
    let mat2 = new THREE.MeshPhysicalMaterial({
        transparent: true,
        transmission: 1,
        roughness: 0.02,
        //wireframe: true,
    })

    mesh2 = new THREE.Mesh(geo2, mat2);
    mesh2.position.z = 1;


    //lights
    light = new THREE.DirectionalLight(0x4255ff, 0.05);
    light.position.set(0, 0.1, -2);

    light2 = new THREE.DirectionalLight(0x4255ff, 0);
    light2.position.set(0, 0.1, -2);


    for (let i = 0; i < 3; i++) {
        let c = "hsl(".concat(180 + i * 20).concat(",100%,50%)");
        let light = new THREE.DirectionalLight(c, 0.05);
        light.position.set(i, 0.1, -2);
        lights.push(light);
        scene1Info.scene.add(lights[i])
    }

    scene1Info.scene.add(mesh, mesh2, light, light2);

    composer = postProcessing(scene1);

    scene1Info.mesh = mesh;
    scene1Info.mesh2 = mesh2;
    scene1Info.light = light;
    scene1Info.light2 = light2;
    scene1Info.lights = lights;
    scene1Info.composer = composer;

    sceneInfos.push(scene1Info);
}

function updateScene1() {





    let rms = audioFeatureData['rms'];
    let mfcc = audioFeatureData['mfcc']
    let spectrum = audioFeatureData['spectrum'];
    let energy = audioFeatureData['energy']

    camera.position.set(0, 0, 7 + rms * 10);
    let normals = scene1Info.mesh.geometry.attributes.normal.array;
    scene1Info.mesh.geometry.attributes.normal.needsUpdate = true;

    //use spectrum data to change mesh normal
    for (let i = 0; i < normals.length; i += 3) {
        let k = i % 256;
        let dir = Math.random() > 0.5 ? 1 : -1;
        normals[i] += spectrum[k] * 1000 * dir;
        dir = Math.random() > 0.5 ? 1 : -1;
        normals[i + 1] += spectrum[k + 1] * 1000 * dir;
        dir = Math.random() > 0.5 ? 1 : -1;
        normals[i + 2] += spectrum[k + 2] * 10000 * dir;
    }
    scene1Info.mesh.updateMatrix();


    //rms to change light positions
    let dir = Math.random() > 0.5 ? 2 : -2;
    scene1Info.light.position.set(rms * dir, 0, -2);
    scene1Info.light.intensity = 0.05 + rms * 10;


    for (let i = 0; i < scene1Info.lights.length; i++) {
        let dir = Math.random() > 0.5 ? 1 : -1;
        let dir2 = Math.random() > 0.5 ? 1 : -1;
        scene1Info.lights[i].position.set(i * 0.1 + rms * 10 * dir, i, -2);
        scene1Info.lights[i].intensity = rms * 20 * dir;
    }

}

function initScene2() {
    let mesh, mesh2, light, composer;

    scene2 = new THREE.Scene();
    scene2Info.scene = scene2;

    let vertexPars = document.getElementById("vertexShaderPars").textContent;
    let vertexMain = document.getElementById('vertexShaderMain').textContent;

    let fragmentPars = document.getElementById('fragmentPars').textContent;
    let fragmentMain = document.getElementById('fragmentMain').textContent;

    //let geometry = new THREE.CylinderGeometry(0.1, 0.6, 0.1, 800, 800, true);
    //let geometry = new THREE.CapsuleGeometry(0.3, 0.6, 800, 800);
    let geo = new THREE.IcosahedronGeometry(0.3, 400);

    let mat = new THREE.MeshStandardMaterial({
        //inserting our own shader into three materials
        onBeforeCompile: (shader) => {
            //storing a reference to the shader object
            mat.userData.shader = shader;

            //uniforms
            shader.uniforms.uTime = { value: 0.0 };
            shader.uniforms.uRms = { value: 0.0 };

            //replace shader code with our own code
            const parsVertexString = /*glsl*/ `#include <displacementmap_pars_vertex>`
            shader.vertexShader = shader.vertexShader.replace(parsVertexString, parsVertexString + vertexPars
            );

            const mainVertexString = /*glsl*/`#include <displacementmap_vertex>`
            shader.vertexShader = shader.vertexShader.replace(mainVertexString, mainVertexString + vertexMain);

            const mainFragmentString = /*glsl*/`#include <normal_fragment_maps>`
            const parsFragmentString = /*glsl*/`#include <bumpmap_pars_fragment>`

            shader.fragmentShader = shader.fragmentShader.replace(parsFragmentString, parsFragmentString + fragmentPars);
            shader.fragmentShader = shader.fragmentShader.replace(mainFragmentString, mainFragmentString + fragmentMain);
        },
    });

    mesh = new THREE.Mesh(geo, mat);

    let geo2 = new THREE.SphereGeometry(0.3, 32, 32);
    let mat2 = new THREE.MeshPhysicalMaterial({
        transparent: true,
        transmission: 1,
        roughness: 0.5,
        //wireframe: true
    })

    mesh2 = new THREE.Mesh(geo2, mat2);

    light = new THREE.DirectionalLight(0xffffff, 0.2);
    light.position.set(1, 0, 0.1);

    composer = postProcessing(scene2);

    //update elements into sceneInfo
    scene2Info.scene.add(mesh, mesh2, light);

    scene2Info.mat = mat;
    scene2Info.mesh = mesh;
    scene2Info.mesh2 = mesh2;
    scene2Info.light = light;
    scene2Info.composer = composer;

    sceneInfos.push(scene2Info);

}
let i = 0;
function updateScene2() {
    // camera.position.set(0, 0, 2);

    let rms = audioFeatureData['rms'];
    let spectrum = audioFeatureData['spectrum'];
    let time = clock.getElapsedTime() * 0.1;


    scene2Info.mat.userData.shader.uniforms.uTime.value = time * 2 + spectrum[i];
    scene2Info.mat.userData.shader.uniforms.uRms.value = rms * 2000;

    scene2Info.mesh2.material.roughness = 0.1;

    camera.position.x = Math.sin(time) * 2;
    camera.position.z = Math.cos(time) * 2;

    if (i < spectrum.length) {
        i += 10;
    } else {
        i = 0;
    }
}


function postProcessing(scene) {

    //post processing
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    //post processing setup
    const params = {
        exposure: 1,
        bloomStrength: 1,
        bloomThreshold: 0.1,
        bloomRadius: 0.5
    };

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    composer.addPass(bloomPass);

    return composer;
}



function render() {

    //pass the looping function name into requestAnimationFrame();
    requestAnimationFrame(render);
    composer.render();
    //renderer.render(scene, camera);


    if (audioIsProcessing) {
        if (activeScene == scene1) {
            updateScene1();
        } else if (activeScene == scene2) {
            updateScene2();
        }
    }

    camera.lookAt(0, 0, 0);

    if (startInterval) {
        captureTimeCounter();
    }


}

init();
render();







