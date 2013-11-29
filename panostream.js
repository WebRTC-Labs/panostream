$ = function(id) {
  return document.getElementById(id);
};

var gVideoCounter = 1;

// Dict mapping video tag id to stream objects, i.e. "view1" and so on.
var gStreams = {};

function requestVideo(opt_video_id) {
  var devices = getSourcesFromField($('videosrc'));

  var videoId = devices.video_id;
  if (opt_video_id) {
    videoId = opt_video_id;
  }
  debug('Requesting video from device: ' + videoId);

  var constraints = {
      audio: false,
      video: {
          mandatory: {
              maxWidth: 320,
              maxHeight: 240,
          },
          optional: [
             {sourceId: videoId},
          ],
      },
  };
  // Call into getUserMedia via the polyfill (adapter.js).
  getUserMedia(
      constraints,
      function(stream) { getUserMediaOkCallback(stream, videoId); },
      getUserMediaFailedCallback
  );
}

function getSourcesFromField(video_select) {
  var source = { video_id: null };
  if (video_select.options.length > 0) {
    source.video_id = video_select.options[video_select.selectedIndex].value;
  }
  return source;
}

function getUserMediaFailedCallback(error) {
  alert("User media request denied with error code " + error.code);
}

function getUserMediaOkCallback(stream, video_id) {
   // Call the polyfill wrapper to attach the media stream to this element.
   var videoTagId = 'view' + gVideoCounter++;
   attachMediaStream($(videoTagId), stream);
   $(videoTagId + '-label').innerHTML = 'Video ID: ...' +
       video_id.substring(40);

   debug('Got video stream from device: ' + video_id);

   gStreams[videoTagId] = stream;
   localStorage[videoTagId] = video_id;

   // Due to crbug.com/110938 the size is 0 when onloadedmetadata fires.
   // videoTag.onloadedmetadata = displayVideoSize_(videoTag);.
   // Use setTimeout as a workaround for now.
   setTimeout(function() {displayVideoSize_($(videoTagId));}, 500);
}

/**
 * @private
 * @param {string} video_tag The ID of the video tag + stream used to
 *     write the size to a HTML tag based on id if the div's exists.
 */
function displayVideoSize_(video_tag) {
  if (video_tag.videoWidth > 0 || video_tag.videoHeight > 0) {
    $(video_tag.id + '-stream-size').innerHTML = '(stream size: ' +
                                                video_tag.videoWidth + 'x' +
                                                video_tag.videoHeight + ')';
    $(video_tag.id + '-size').innerHTML = video_tag.width + 'x' +
                                         video_tag.height;
  }
}

function getDevices() {
  // Fill the video dropdown with the available devices.
  var video_select = $('videosrc');
  MediaStreamTrack.getSources(function(devices) {
    for (var i = 0; i < devices.length; i++) {
      var option = document.createElement('option');
      option.value = devices[i].id;
      option.text = devices[i].label;
      if (devices[i].kind == 'video') {
        if (option.text == '') {
          option.text = 'Video: ' + devices[i].id;
        }
        video_select.appendChild(option);
      }
    }
  });

  // If a previous session is stored in local storage, try to acquire those
  // devices right away, if present.
  if (typeof(Storage) !== "undefined") {
    if (localStorage.view1 !=="undefined") {
      requestVideo(localStorage.view1);
    }
    if (localStorage.view2 !=="undefined") {
      requestVideo(localStorage.view2);
    }
    if (localStorage.view3 !=="undefined") {
      requestVideo(localStorage.view3);
    }
  } else {
    debug('Sorry! No web storage support in your browser.');
  }
}

// Resets all the video tags and wipes the local storage for remembering
// the video device IDs.
function resetAllVideo() {
  localStorage.view1 = undefined;
  localStorage.view2 = undefined;
  localStorage.view3 = undefined;
  gVideoCounter = 1;

  // Stop all streams to unlock the cameras.
  for (var id in gStreams) {
    gStreams[id].getVideoTracks()[0].stop();
  }
  // Reset the video tags to avoid the frozen image.
  for (var i=1; i<=3; i++) {
    var videoTag = $('view' + i);
    if (videoTag.currentTime > 0) {
      videoTag.currentTime = 0;
      videoTag.load();
    }
  }
}

var pixelsize = 4;

function updateOverlap() {
  var video1 = $('view1');
  var video2 = $('view2');
  var tmpcanvas1 = $('tmpcanvas1');
  var tmpcanvas2 = $('tmpcanvas2');
  var context1 = tmpcanvas1.getContext('2d');
  var context2 = tmpcanvas2.getContext('2d');
  context1.drawImage(video1, 0, 0, tmpcanvas1.width, tmpcanvas1.height);
  context2.drawImage(video2, 0, 0, tmpcanvas2.width, tmpcanvas2.height);
  var pixels1 = context1.getImageData(0, 0, tmpcanvas1.width, tmpcanvas1.height);
  var pixels2 = context2.getImageData(0, 0, tmpcanvas2.width, tmpcanvas2.height);
  var overlap = estimateOverlap(pixels1, pixels2);
  document.getElementById('overlapSlider').value = 100 * overlap / tmpcanvas1.width;
  var overlaptext = $('overlap');
  overlaptext.innerHTML = document.getElementById('overlapSlider').value;
}

function estimateOverlap(pixels1, pixels2) {
  var minOverlap = 1;
  var initialized = false;
  for (var y = 0; y < tmpcanvas1.height; ++y) {
    for (var c = 0; c < pixelsize; ++c) {
      if (pixels1.data[(tmpcanvas1.width * y + tmpcanvas1.width - 1) * pixelsize + c] != 0 && pixels2.data[(tmpcanvas2.width * y) * pixelsize + c] != 0) {
        initialized = true;
      }
    }
  }
  if (initialized) {
    var minCorrelation = 0;
    for (var y = 0; y < tmpcanvas1.height; y += 8) {
      for (var c = 0; c < (pixelsize - 1); ++c) {
        var tmp = pixels1.data[(tmpcanvas1.width * y + tmpcanvas1.width - 1) * pixelsize + c] - pixels2.data[(tmpcanvas2.width * y) * pixelsize + c];
        tmp *= tmp;
        minCorrelation += tmp;
      }
    }
    for (var overlap = 2; overlap < tmpcanvas1.width; ++overlap) {
      var correlation = 0;
      for (var x = 0; x < overlap; ++x) {
        for (var y = 0; y < tmpcanvas1.height; y += 8) {
          for (var c = 0; c < (pixelsize - 1); ++c) {
            var tmp = pixels1.data[(tmpcanvas1.width * y + tmpcanvas1.width - x - 1) * pixelsize + c] - pixels2.data[(tmpcanvas2.width * y + x) * pixelsize + c];
            tmp *= tmp;
            correlation += tmp;
          }
        }
      }
      correlation /= overlap;
      if (correlation < minCorrelation) {
        minCorrelation = correlation;
        minOverlap = overlap;
      }
    }
  } else {
    minOverlap = 0;
  }
  return minOverlap
}

function debug(txt) {
  console.log(txt);
}
