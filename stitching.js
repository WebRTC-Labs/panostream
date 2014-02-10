// Global variables to manipulate Videos/canvases.
var video = [];
var videoImage = [];
var videoImageContext = [];
var imageData = [];

var homography = [[],[],[]];

// This function is called by common.js when the NaCl module is loaded.
function moduleDidLoad() {
  // Once we load, hide the plugin. In this example, we don't display anything
  // in the plugin, so it is fine to hide it.
  common.hideModule();

  document.getElementById('btn_calibrate').disabled = false;
}

var byteArray = [];
// This function is called by common.js when a message is received from the
// NaCl module.
function handleMessage(message) {
  // Via this single communication channel comes messages to dump to console and
  // hopefully the H matrix as well, coefficient by coefficient.
  if (message.data['message'] == "H") {
    // Uncomment next line for Debug:
    //console.log(message.data['row'] +" " +message.data['column'] +" "+message.data['value']);

    // |row|, |column| range from 0 to 2 and value is float.
    homography[message.data['row']][message.data['column']] =
        message.data['value'];

    if (homography[0].length==3 && homography[1].length==3 && homography[2].length==3) {
      console.log(" H=[" + homography[0][0].toFixed(3) +" "+ homography[0][1].toFixed(3) +" "+ homography[0][2].toFixed(3) + "]");
      console.log("   [" + homography[1][0].toFixed(3) +" "+ homography[1][1].toFixed(3) +" "+ homography[1][2].toFixed(3) + "]");
      console.log("   [" + homography[2][0].toFixed(3) +" "+ homography[2][1].toFixed(3) +" "+ homography[2][2].toFixed(3) + "]");

      updateWebGLWithHomography(homography);
      homography[0].length = homography[1].length = homography[2].length = 0;
    }
  } else if (message.data['message'] == "I") {
    var int8View = new Int8Array(message.data['value']);
    console.log(" Got image " + message.data['value'] + " - " +
        int8View.byteLength + "B");

    if (0) {
      var cnv1 = document.getElementById('canvas3');
      var ctx1 = cnv1.getContext('2d');
      var imageData1 = ctx1.getImageData(0, 0, 320, 240);
      var data1 = imageData1.data;
      var p = 0;
      for (var i = 0; i < data1.length; i += 4) {
        data1[i]     = int8View[p++];
        data1[i + 1] = int8View[p++];//int8View[i + 1];
        data1[i + 2] = int8View[p++];//int8View[i + 2];
        data1[i + 3] = 255;//int8View[p++];//int8View[i + 3];
        p++;
      }
      ctx1.putImageData(imageData1, 0, 0);
    }

  } else {
    // Dump stuff to special PNaCl output area.
    var logEl = document.getElementById('log');
    logEl.textContent += message.data;

    // And/Or to JS Console.
    console.log(message.data);
  }
}

// Calibrate does a whole lot of things: Plugs the <video> tags into their
// respective hidden <canvas> eleemnts, and then passes the data from those
// canvas snapshots to the stiching module, via a protocol of 3 steps:
// first the index of the next data buffer, then the buffer itself, repeat for
// each buffer; when done, send a string asking politely to do the stitching.
function calibrate() {

  // Plug the <video> vidX into canvasX.
  for(var i=0; i<2; i++) {
    video[i] = document.getElementById('vid' + (i+1));

    videoImage[i] = document.getElementById('canvas' + (i+1));
    videoImageContext[i] = videoImage[i].getContext('2d');
    // background color if no video present
    videoImageContext[i].fillStyle = '#000000';
    videoImageContext[i].fillRect( 0, 0, videoImage[0].width, videoImage[0].height);
  }

  for(var i=0; i<2; i++) {
    if (video[i].readyState === video[i].HAVE_ENOUGH_DATA) {
      videoImageContext[i].drawImage(
          video[i], 0, 0, videoImage[0].width, videoImage[0].height);
      imageData[i] = videoImageContext[i].getImageData(
          0, 0, videoImage[0].width, videoImage[0].height);

      // After the NaCl module has loaded, common.naclModule is a reference to
      // the NaCl module's <embed> element. Method postMessage sends a message
      // to it. F.i.:
      common.naclModule.postMessage({'message' : 'data',
                                     'index' : i,
                                     'width' : videoImage[0].width,
                                     'height' : videoImage[0].height,
                                     'data' : imageData[i].data.buffer});
    }
  }
  common.naclModule.postMessage('Please calculate the homography.');
}
