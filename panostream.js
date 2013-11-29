$ = function(id) {
  return document.getElementById(id);
};

var gVideoCounter = 1;

function requestVideo() {
  // Call into getUserMedia via the polyfill (adapter.js).
  var devices = getSourcesFromField($('videosrc'));
  var constraints = {
      audio: false,
      video: {
          mandatory: {
              minWidth: 320,
              minHeight: 240,
              maxWidth: 320,
              maxHeight: 240,
          },
          optional: [
             {sourceId: devices.video_id},
          ],
      },
  };
  getUserMedia(
      constraints,
      function(stream) { getUserMediaOkCallback(stream, devices.video_id); },
      getUserMediaFailedCallback
  );
}

function getSourcesFromField(video_select) {
  var source = {
    video_id: null
  };
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
       video_id.substring(40)

    // Due to crbug.com/110938 the size is 0 when onloadedmetadata fires.
   // videoTag.onloadedmetadata = displayVideoSize_(videoTag);.
   // Use setTimeout as a workaround for now.
   setTimeout(function() {displayVideoSize_($(videoTagId));}, 500);
}

/**
 * @private
 * @param {string} videoTag The ID of the video tag + stream used to
 *     write the size to a HTML tag based on id if the div's exists.
 */
function displayVideoSize_(videoTag) {
  if (videoTag.videoWidth > 0 || videoTag.videoHeight > 0) {
    $(videoTag.id + '-stream-size').innerHTML = '(stream size: ' +
                                                videoTag.videoWidth + 'x' +
                                                videoTag.videoHeight + ')';
    $(videoTag.id + '-size').innerHTML = videoTag.width + 'x' +
                                         videoTag.height;
  }
}

function getDevices() {
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
}

function debug(txt) {
  console.log(txt);
}
