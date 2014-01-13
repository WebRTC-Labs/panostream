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

  document.getElementById('btn_click').disabled = false;
  document.getElementById('btn_calibrate').disabled = false;
}

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
      videoImageContext[i].drawImage(video[i], 0, 0, 320, 240);
      imageData[i] = videoImageContext[i].getImageData(0, 0, 320, 240);

      // After the NaCl module has loaded, common.naclModule is a reference to
      // the NaCl module's <embed> element. Method postMessage sends a message
      // to it. F.i.:
      common.naclModule.postMessage({'message' : 'data',
                                     'index' : i,
                                     'width' : 320,
                                     'height' : 240,
                                     'data' : imageData[i].data.buffer});
    }
  }

  common.naclModule.postMessage('Please calculate the homography.');
}
