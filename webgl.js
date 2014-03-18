// webgl.js is used via startWebGL() to create a GL canvas inside a div of name
// called "glcanvas". It will take the video feeds from up to three cameras
// rendered on <video> tags of IDs |view1| to |view3|. Up to three non visible
// canvases are needed named |canvas1| to |canvas3|, not displayed.
// The code in this file has taken inspiration from:
// Adapted from http://stemkoski.github.io/Three.js/#webcam-texture

// Amount of cameras to render in the 3D world.
var NUM_CAMERAS = 2;

// ThreeJS global variables.
var container, scene, camera, renderer, controls;

// Global variables to manipulate Videos/canvases.
var video = [];
var videoImage = [];
var videoImageContext = [];
var videoTexture = [];

var movieScreen = [];

// Profiler variable;
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
  var FAR = 10000;

  // Scene camera.
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  scene.add(camera);
  camera.position.set(0,150,800);
  camera.lookAt(scene.position);
  console.log("Three.JS camera initialized");

  // Renderer.
  renderer = new THREE.CanvasRenderer();
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  container.appendChild( renderer.domElement );
  console.log("Three.JS renderer initialized");

  //controls = new THREE.TrackballControls(camera, container);
  //controls.rotateSpeed = 1.0;
  //controls.zoomSpeed = 1.2;
  //controls.panSpeed = 0.8;
  //controls.noZoom = false;
  //controls.noPan = false;
  //controls.staticMoving = true;
  //controls.dynamicDampingFactor = 0.3;
  //controls.keys = [ 65, 83, 68 ];

  // Light source.
  var light = new THREE.PointLight(0xffffff);
  light.position.set(0,250,0);
  scene.add(light);
  console.log("Three.JS light source initialized");

  // Floor -> Disconnected but is useful when the camera is looking AWOL.
  var floorTexture = new THREE.ImageUtils.loadTexture( 'images/checkerboard.jpg' );
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set( 10, 10 );
  var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
  var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
  var floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.y = -240;
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);

  // Camera video input. The idea is to plug a camera <video> feed into a canvas
  // and use it to retrieve the data.
  for (var i=0; i < NUM_CAMERAS; i++) {
    video[i] = document.getElementById('vid' + (i+1));

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

    movieScreen[i].position.set(0, 0, -100);
    movieScreen[i].rotation.set(0, 0, 0); // (Math.PI /8)*(1-i)
    scene.add(movieScreen[i]);
  }
  camera.position.set(0,50,800);
  if (NUM_CAMERAS >1)
    camera.lookAt(movieScreen[1].position);
  else
    camera.lookAt(movieScreen[0].position);
  console.log("Three.JS GL context and video feeds initialized.");

  statprofiler.add("Render time");
  console.log("Profiler initialized.");
}

function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}

function render()  {
  statprofiler.new_frame();
  //controls.update();

  statprofiler.start("Render time");
  for (var i=0; i < NUM_CAMERAS; i++) {
    if (video[i].readyState === video[i].HAVE_ENOUGH_DATA) {
      videoImageContext[i].drawImage( video[i],
          0, 0, videoImage[i].width, videoImage[i].height);
      if (videoTexture[i])
        videoTexture[i].needsUpdate = true;  renderer.render(scene, camera);
    }
  }
  statprofiler.stop("Render time");

  document.getElementById('log').innerHTML  = (statprofiler.log());
}

function update() {
  // Empty for the moment.
}

function updateWebGLWithHomography(H) {
  // Now we need to calculate the movieScreen[1].position with the projection
  // of the four corners. Then reset the associated rotation.
  movieScreen[0].geometry = new THREE.PlaneGeometry(videoImage[0].width, videoImage[0].height);

  alpha = Math.max(Math.max(H[0][0], H[0][1]), Math.max(H[1][0], H[1][1]));
  //if (alpha>1.0) {
  //  H[0][0] = H[0][0] / alpha;
  //  H[0][1] = H[0][1] / alpha;
  //  H[1][0] = H[1][0] / alpha;
  //  H[1][1] = H[1][1] / alpha;
  //}

  var x1 = videoImage[0].width/2;
  var x0 = -1*x1;
  var y1 = videoImage[0].height/2;
  var y0 = -1*y1;

  movieScreen[0].geometry.vertices[0].x = applyPerspectiveToPoint_x(x0,y1,H);
  movieScreen[0].geometry.vertices[0].y = applyPerspectiveToPoint_y(x0,y1,H);
  movieScreen[0].geometry.vertices[1].x = applyPerspectiveToPoint_x(x1,y1,H);
  movieScreen[0].geometry.vertices[1].y = applyPerspectiveToPoint_y(x1,y1,H);
  movieScreen[0].geometry.vertices[2].x = applyPerspectiveToPoint_x(x0,y0,H);
  movieScreen[0].geometry.vertices[2].y = applyPerspectiveToPoint_y(x0,y0,H);
  movieScreen[0].geometry.vertices[3].x = applyPerspectiveToPoint_x(x1,y0,H);
  movieScreen[0].geometry.vertices[3].y = applyPerspectiveToPoint_y(x1,y0,H);
  movieScreen[0].geometry.verticesNeedUpdate = true;

  //H4 = new THREE.Matrix4(H[0][0], H[0][1], 0.0, H[0][2],
  //                       H[1][0], H[1][1], 0.0, H[1][2],
  //                           0.0,     0.0, 1.0,     0.0,
  //                       H[2][0], H[2][1], 0.0, H[2][2]);
  //movieScreen[0].geometry.applyMatrix(H4);
  //movieScreen[0].geometry.verticesNeedUpdate = true;

}

// Applying a perspective to a point (x,y) means:
// x' = (H11 x + H12 y + H13) / (H31 x + H32 y + H33)
// y' = (H21 x + H22 y + H23) / (H31 x + H32 y + H33)   (matrix index notation)
function applyPerspectiveToPoint_x(x, y, H) {
  return (H[0][0]*x + H[0][1]*y + H[0][2])/(H[2][0]*x + H[2][1]*y + H[2][2]);
}
function applyPerspectiveToPoint_y(x, y, H) {
  return (H[1][0]*x + H[1][1]*y + H[1][2])/(H[2][0]*x + H[2][1]*y + H[2][2]);
}
