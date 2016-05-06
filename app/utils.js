var utils = {

  request(url, method, headers, body, callback){
    var xhr = new XMLHttpRequest();
    var json = JSON.stringify(body);
    xhr.open(method, url, true);
    for (var i in headers) {
      xhr.setRequestHeader(i, headers[i]);
    };
    xhr.onreadystatechange = function () {
      if (xhr.readyState != 4) return;
      callback(JSON.parse(xhr.responseText || '{}'));
    };

    chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse) {
        if (request.msg === 'cancelXHR') {
          xhr.abort();
        }
      });


    xhr.send(json);
  },

  s3Upload(url, imageFile, logCallback, callBack){

    var xhr = new XMLHttpRequest();
    xhr.onerror = e => {
      console.log('error')
    };

    xhr.upload.addEventListener('progress', e => {
      var percent = Math.round((e.loaded / e.total) * 100);
      logCallback(percent);
    }, false);

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status <= 299) {
          callBack(xhr.responseText)
        } else {
          console.log('error')
        }
      }
    };

    chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse) {
        if (request.msg === 'cancelXHR') {
          xhr.abort();
        }
      });

    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000');
    xhr.send(imageFile);
  },

  dataURItoBlob(dataURL) {
    var BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
      var parts = dataURL.split(',');
      var contentType = parts[0].split(':')[1];
      var raw = decodeURIComponent(parts[1]);

      return new Blob([raw], {type: contentType});
    }

    var parts = dataURL.split(BASE64_MARKER);
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;

    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {type: contentType});
  },


  elementsFromPoint(x, y){
    var elements = [], previousPointerEvents = [], current, i, d;

    // get all elements via elementFromPoint, and remove them from hit-testing in order
    while ((current = document.elementFromPoint(x, y)) && elements.indexOf(current) === -1 && current != null) {

      // push the element and its current style
      elements.push(current);
      previousPointerEvents.push({
        value: current.style.getPropertyValue('pointer-events'),
        priority: current.style.getPropertyPriority('pointer-events')
      });

      // add "pointer-events: none", to get to the underlying element
      current.style.setProperty('pointer-events', 'none', 'important');
    }

    // restore the previous pointer-events values
    for (i = previousPointerEvents.length; d = previousPointerEvents[--i];) {
      elements[i].style.setProperty('pointer-events', d.value ? d.value : '', d.priority);
    }

    // return our results
    return elements;
  }
};

module.exports = utils;