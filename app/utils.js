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

export function s3Upload(url, imageFile, callBack){

  var xhr = new XMLHttpRequest();
  xhr.onerror = e => {
    callbacks.onError(e);
  };

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
  xhr.setRequestHeader('Content-Type', 'image/png');
  xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000');
  xhr.send(imageFile);
}