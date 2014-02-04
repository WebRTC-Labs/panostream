$ = function(id) {
  return document.getElementById(id);
};

var gVideoCounter = 1;

// Dict mapping video tag id to stream objects, i.e. "vid1" and so on.
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
              maxWidth: 640,
              maxHeight: 480,
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
   var videoTagId = 'vid' + gVideoCounter++;
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
    //if (localStorage.view3 !=="undefined") {
    //  requestVideo(localStorage.view3);
    //}
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
  for (var i=1; i<=2; i++) {
    var videoTag = $('vid' + i);
    if (videoTag.currentTime > 0) {
      videoTag.currentTime = 0;
      videoTag.load();
    }
  }
}

function debug(txt) {
  console.log(txt);
}
