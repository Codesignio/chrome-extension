var qs = require('qs');

function request(method, url, headers, body, logCallback){

  return new Promise((resolve, reject)=>{

    var xhr = new XMLHttpRequest();

    if(method == 'POST' || method == 'PUT') {
      var bodyType = body.toString().slice(8, -1);

      if (bodyType == 'File' || bodyType == 'Blob') {

        var metainfo = {
          filename: body.name,
          filesize: body.size,
        };

        if(url.match(/\?/)){
          url += '&'+qs.stringify(metainfo)
        } else {
          url += '?'+qs.stringify(metainfo)
        }

      } else {
        body = JSON.stringify(body);
      }
    }
    
    xhr.open(method, url, true);


    for (var i in headers) {
      xhr.setRequestHeader(i, headers[i]);
    };

    var token = localStorage['token'];
    xhr.setRequestHeader("Auth-Token", token);
    if(bodyType == 'Object'){
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status <= 299) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        console.log('error')
      }
    };

    xhr.onerror =(e)=>{
      reject();
    };

    xhr.upload.addEventListener('progress', e => {
      var percent = Math.round((e.loaded / e.total) * 100);
      chrome.runtime.sendMessage({msg: 'progress', progress: percent, progressMsg: 'Uploading...'})
    });

    chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse) {
        if (request.msg === 'cancelXHR') {
          xhr.abort();
          resolve()
        }
      });

    xhr.send(body);
  })
};

request.get = request.bind(null, 'GET');
request.post = request.bind(null, 'POST');
request.put = request.bind(null, 'PUT');
request.delete = request.bind(null, 'DELETE');

module.exports = request;