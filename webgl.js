
// WebGL stuff copied from Mozilla Dev Network getting started with WebGL docs.
// http://developer.mozilla.org/en-US/docs/Web/WebGL/Getting_started_with_WebGL

var gl; // A global variable for the WebGL context

var videoElement;
var cameraTexture;
var videoElement2;
var cameraTexture2;
var videoElement3;
var cameraTexture3;

var CameraOverlapInPercentage;

function startWebGL() {
  var canvas = document.getElementById("glcanvas");

  gl = initWebGL(canvas);      // Initialize the GL context

  // Only continue if WebGL is available and working
  if (gl) {
    gl.clearColor(0.0, 1.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
    gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
  }

  initBuffers();

  initShaders();

  videoElement = document.getElementById("view1");
  videoElement.addEventListener("canplaythrough", startVideo, true);

  videoElement2 = document.getElementById("view2");
  videoElement2.addEventListener("canplaythrough", startVideo, true);

  videoElement3 = document.getElementById("view3");
  videoElement3.addEventListener("canplaythrough", startVideo, true);

  canvas = document.getElementById("glcanvas");
  gl.viewport(0, 0, canvas.width, canvas.height);

  CameraOverlapInPercentage = 10;
  return 1;
}

function startVideo() {
  console.log("starting video playback");
  initTextures();
  intervalID = setInterval(drawScene, 50);
}

function initWebGL(canvas) {
  gl = null;

  try {
    // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  }
  catch(e) {}

  // If we don't have a GL context, give up now
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
    gl = null;
  }
  console.log("WebGL context initialised.");

  return gl;
}

var horizAspect = 240.0/640.0;

function initBuffers() {
  squareVerticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  var vertices = [
    -1.33, -1.0,  3.0,
     1.33, -1.0,  3.0,
     1.33,  1.0,  3.0,
    -1.33,  1.0,  3.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);


  //squareVerticesNormalBuffer = gl.createBuffer();
  //gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesNormalBuffer);
  //var normals = [
  //  0.0,  0.0,  1.0,
  //  0.0,  0.0,  1.0,
  //  0.0,  0.0,  1.0,
  //  0.0,  0.0,  1.0
  //];
  //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  squareVerticesTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesTextureCoordBuffer);
  var textureCoordinates = [
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
      gl.STATIC_DRAW);

  squareVerticesIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareVerticesIndexBuffer);
  var squareVertexIndices = [
    0,  2,  3,
    0,  1,  2,
  ]
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(squareVertexIndices), gl.STATIC_DRAW);

  console.log("WebGL buffers initialised.");
}

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  // Create the shader program from the global GL context.
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert.
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }

  gl.useProgram(shaderProgram);
  console.log("WebGL shaders and program initialised.");

  //vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  //gl.enableVertexAttribArray(vertexNormalAttribute);

  vertexPositionAttribute =
      gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttribute);

  textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
  gl.enableVertexAttribArray(textureCoordAttribute);
}

//function initTextures() {
//  cameraTexture = createTextureFromImage(videoElement);
//  console.log("WebGL textures initialised");
//}

function initTextures() {
  cameraTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  cameraTexture2 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cameraTexture2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  cameraTexture3 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cameraTexture3);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  updateTexture();
}
function updateTexture() {
  gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, videoElement);
  gl.bindTexture(gl.TEXTURE_2D, null);

  gl.bindTexture(gl.TEXTURE_2D, cameraTexture2);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, videoElement2);
  gl.bindTexture(gl.TEXTURE_2D, null);

  gl.bindTexture(gl.TEXTURE_2D, cameraTexture3);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, videoElement3);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  CameraOverlapInPercentage = document.getElementById('overlapSlider').value;

  // 45 refers to a 45 degrees field of view.
  perspectiveMatrix = makePerspective(45, 640 / 240, 0.1, 100.0);

  loadIdentity();
  mvTranslate([-1.8, 0.0, -6.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesTextureCoordBuffer);
  gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, videoElement);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareVerticesIndexBuffer);
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindTexture(gl.TEXTURE_2D, null);


  mvTranslate([((100-CameraOverlapInPercentage)/50.0), 0.0, 0.0]);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, cameraTexture2);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, videoElement2);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 1);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareVerticesIndexBuffer);
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindTexture(gl.TEXTURE_2D, null);

  mvTranslate([((100-CameraOverlapInPercentage)/50.0), 0.0, 0.0]);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, cameraTexture3);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, videoElement3);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 2);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareVerticesIndexBuffer);
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindTexture(gl.TEXTURE_2D, null);


}


function getShader(gl, id) {
  var shaderScript, theSource, currentChild, shader;

  shaderScript = document.getElementById(id);

  if (!shaderScript) {
    return null;
  }

  theSource = "";
  currentChild = shaderScript.firstChild;

  while(currentChild) {
    if (currentChild.nodeType == currentChild.TEXT_NODE) {
      theSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    console.log("Fragment shader loaded.");
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
    console.log("Vertex shader loaded.");
  } else {
     // Unknown shader type
     return null;
  }

  gl.shaderSource(shader, theSource);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
      return null;
  }

  return shader;
}

////////////////////////////////////////////////////////////////////////////////
// Utility functions.

function loadIdentity() {
  mvMatrix = Matrix.I(4);
}

function multMatrix(m) {
  mvMatrix = mvMatrix.x(m);
}

function mvTranslate(v) {
  multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

function setMatrixUniforms() {
  var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
}
