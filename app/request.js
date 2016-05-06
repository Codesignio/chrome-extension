function request(method, url, headers, body, logCallback){

  return new Promise((resolve, reject)=>{

    var xhr = new XMLHttpRequest();
    
    xhr.open(method, url, true);


    for (var i in headers) {
      xhr.setRequestHeader(i, headers[i]);
    };

    var token = localStorage['token'];
    xhr.setRequestHeader("Cookie", 'token:' +  token + ';');
    
    
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

    if(method == 'POST' || method == 'PUT') {
      if ('file') {
        xhr.setRequestHeader('Content-Type', 'image/jpeg');
      } else {
        body = JSON.stringify(body);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      }
    }
    xhr.send(body);
    
  })
};

request.get = request.bind(null, 'GET');
request.post = request.bind(null, 'POST');
request.put = request.bind(null, 'PUT');
request.delete = request.bind(null, 'DELETE');