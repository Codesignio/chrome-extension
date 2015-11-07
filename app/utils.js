export function request(url, method, headers, body, callback){
  var xhr = new XMLHttpRequest();
  var json = JSON.stringify(body);
  xhr.open(method, url, true);
  for (var i in headers){
    xhr.setRequestHeader(i, headers[i]);
  };
  xhr.onreadystatechange = function() {
    if (xhr.readyState != 4) return;
    callback(JSON.parse(xhr.responseText));
  };
  xhr.send(json);
}

export function s3Upload(url, imageFile, logCallback, callBack){

  var xhr = new XMLHttpRequest();
  xhr.onerror = e => {
    callbacks.onError(e);
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

  xhr.open('PUT', url, true);
  xhr.setRequestHeader('Content-Type', 'image/jpeg');
  xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000');
  xhr.send(imageFile);
}

export function dataURItoBlob(dataURL) {
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
}