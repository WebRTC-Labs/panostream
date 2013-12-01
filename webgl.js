// webgl.js is used via startWebGL() to create a GL canvas inside a div of name
// called "glcanvas". It will take the video feeds from up to three cameras
// rendered on <video> tags of IDs |view1| to |view3|. Up to three non visible
// canvases are needed named |canvas1| to |canvas3|, not displayed.
// The code in this file has taken inspiration from:
// Adapted from http://stemkoski.github.io/Three.js/#webcam-texture

// Amount of cameras to render in the 3D world.
var NUM_CAMERAS = 3;

// ThreeJS global variables.
var container, scene, camera, renderer;

// Global variables to manipulate Videos/canvases.
var video = [];
var videoImage = [];
var videoImageContext = [];
var videoTexture = [];

var statprofiler = new profiler();

// Entry point of the webgl.js file.
function startWebGL() {
  init();
  animate();
}

function init()
{
  // New scene needed.
  scene = new THREE.Scene();

  // Retrieve canvas and Field Of View constants.
  container = document.getElementById("glcanvas");
  var SCREEN_WIDTH = 960;
  var SCREEN_HEIGHT = 240;
  var VIEW_ANGLE = 45;
  var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
  var NEAR = 0.1;
  var FAR = 1000;

  // Scene camera.
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  scene.add(camera);
  camera.position.set(0,150,400);
  camera.lookAt(scene.position);
  console.log("Three.JS camera initialized");

  // Renderer.
  renderer = new THREE.CanvasRenderer();
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  container.appendChild( renderer.domElement );
  console.log("Three.JS renderer initialized");

  // Light source.
  var light = new THREE.PointLight(0xffffff);
  light.position.set(0,250,0);
  scene.add(light);
  console.log("Three.JS light source initialized");

  // FLOOR
  //var floorTexture = new THREE.ImageUtils.loadTexture( 'images/checkerboard.jpg' );
  //floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  //floorTexture.repeat.set( 10, 10 );
  //var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
  //var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
  //var floor = new THREE.Mesh(floorGeometry, floorMaterial);
  //floor.position.y = -0.5;
  //floor.rotation.x = Math.PI / 2;
  //scene.add(floor);

  // Camera video input. The idea is to plug a camera <video> feed into a canvas
  // and use it to retrieve the data.
  var movieScreen = [];
  for (var i=0; i < NUM_CAMERAS; i++) {
    video[i] = document.getElementById('view' + (i+1));

    videoImage[i] = document.getElementById('canvas' + (i+1));
    videoImageContext[i] = videoImage[i].getContext('2d');
    // background color if no video present
    videoImageContext[i].fillStyle = '#000000';
    videoImageContext[i].fillRect( 0, 0, videoImage[0].width, videoImage[0].height);

    videoTexture[i] = new THREE.Texture(videoImage[i]);
    videoTexture[i].minFilter = THREE.LinearFilter;
    videoTexture[i].magFilter = THREE.LinearFilter;

    // Here is the magic: assign the video as a material of basic mesh.
    var movieMaterial = new THREE.MeshBasicMaterial(
        {map: videoTexture[i], overdraw: true, side:THREE.DoubleSide});
    var movieGeometry =
        new THREE.PlaneGeometry(videoImage[0].width, videoImage[0].height, 1, 1);
    movieScreen[i] = new THREE.Mesh(movieGeometry, movieMaterial);

    movieScreen[i].position.set(videoImage[0].width*(i-1), 50, 50*Math.abs(i-1));
    movieScreen[i].rotation.set(0, (Math.PI /8)*(1-i), 0);
    scene.add(movieScreen[i]);
  }
  camera.position.set(0,50,400);
  if (NUM_CAMERAS >1)
    camera.lookAt(movieScreen[1].position);
  else
    camera.lookAt(movieScreen[0].position);
  console.log("Three.JS GL context and video feeds initialized.");

  statprofiler.add("Render time");
  console.log(statprofiler.log());
}

function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}

function render()  {
  statprofiler.new_frame();
  statprofiler.start("Render time");

  for (var i=0; i < NUM_CAMERAS; i++) {
    if (video[i].readyState === video[i].HAVE_ENOUGH_DATA) {
       videoImageContext[i].drawImage(
       	  video[i], 0, 0, videoImage[i].width, videoImage[i].height);
    if (videoTexture[i])
      videoTexture[i].needsUpdate = true;
    }
  }
  renderer.render(scene, camera);

  statprofiler.stop("Render time");
  document.getElementById('log').innerHTML  = (statprofiler.log());
}

function update() {
  // Empty for the moment.
}
