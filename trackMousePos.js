document.addEventListener('mousemove', trackMousePos);
document.addEventListener('contextmenu', fixMousePos);

function trackMousePos(e){
  window.codeSignMousePos = {pageX: e.pageX, pageY: e.pageY}
}

function clickHook(){
  document.addEventListener('mousemove', trackMousePos);
  document.removeEventListener('click',clickHook);
}

function fixMousePos(e){
  window.codeSignMousePos = {pageX: e.pageX, pageY: e.pageY};
  document.removeEventListener('mousemove', trackMousePos);
  document.addEventListener('click', clickHook);
}


chrome.extension.onRequest.addListener(function (request, sender, callback) {
  if (request.msg === 'stopTrack'){
    document.removeEventListener('mousemove', trackMousePos);
    callback();
  } else if (request.msg === 'startTrack') {
    document.addEventListener('mousemove', trackMousePos);
    callback();
  }
});

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}


function checkUrl(url) {

  if (window.location.toString().match(/codesign.io\/\?oauthProvider/)) {
    chrome.extension.sendRequest({msg: 'checkStartOauth'}, function (startOauth) {
      if (startOauth) {
        var urlProvider = getParameterByName('oauthProvider');
        if (urlProvider) {
          setInterval(function () {
            window.document.head.innerHTML = '';
            window.document.body.innerHTML = 'Log in successfully. Redirecting..';
          }, 50);

          var code = getParameterByName('code');
          console.log(urlProvider, code);
          var myxhr = new XMLHttpRequest();
          myxhr.open("GET", 'http://www.codesign.io/oauth/' + urlProvider + '?code=' + code + '&redirectUri=http:%2F%2Fwww.codesign.io%2F%3FoauthProvider%3D' + urlProvider, true);
          myxhr.setRequestHeader('Accept', 'application/json');
          myxhr.onreadystatechange = function () {
            if (myxhr.readyState != 4) return;
            if (myxhr.status != 200) {
              console.log({status: myxhr.status + ': ' + myxhr.statusText});
              chrome.extension.sendRequest({msg: 'stopOauth'});
            } else {
              console.log(myxhr.responseText);
              var access_token = JSON.parse(myxhr.responseText).access_token;

              var xhr = new XMLHttpRequest();
              var json = JSON.stringify({access_token: access_token});
              xhr.open("POST", 'http://api.codesign.io/users/token/' + urlProvider + '/', true);
              xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
              xhr.onreadystatechange = function () {
                if (xhr.readyState != 4) return;
                if (xhr.status != 200) {
                  console.log({status: xhr.status + ': ' + xhr.statusText});
                  chrome.extension.sendRequest({msg: 'stopOauth'});
                } else {
                  console.log(xhr.responseText);
                  var token = JSON.parse(xhr.responseText).token;
                  chrome.extension.sendRequest({msg: 'stopOauth', token: token, urlProvider: urlProvider});
                }
              };
              xhr.send(json);

            }
          };
          myxhr.send();
        }
      }
    });
  } else if (window.location.toString().match(/codesign.io\/checkauthorization/)) {
    chrome.extension.sendRequest({
      msg: 'stopOauth',
      token: JSON.parse(localStorage["user.token"] || 'null'),
      fromSite: true
    });
  } else if (window.location.toString().match(/codesign.io\/syncauthorization/)) {
    chrome.extension.sendRequest({
      msg: 'syncAuthorization',
      token: JSON.parse(localStorage["user.token"] || 'null')
    }, function (token) {
      localStorage["user.token"] = JSON.stringify(token);
      chrome.extension.sendRequest({msg: 'closeWindow'})
    })
  }

}


function checkLiveUrl(url, callB) {
  if (!url){
    url = window.location.toString()
  }
  if (url.match(/codesign.io|localhost:3000\/live\//) || window.location.toString().match(/codesign.io|localhost:3000\//) && url.match(/\/live\//)) {
    var match = url.match(/\/live\/(\w+)/);
    var code = match[1];
    callB(code);
  }
}

function checkChromeInstalled(url){
  if (url && url == '/chrome' || window.location.pathname == '/chrome') {
    window.location = '/chrome?already_installed'
  }
}


function replacePushState(){
  var pushState = window.history.pushState;
  window.history.pushState = function(state) {
    if (typeof history.onpushstate == "function") {
      history.onpushstate({state: state});
    }
    if (state) {
      checkLiveUrl(state.path, function (code) {
        console.log('send request live board', code);
        chrome.runtime.sendMessage('hdgakklpolkedaadooepdllhghhffjbk', {msg: 'liveBoard', boardCode: code})
        chrome.runtime.sendMessage('aigcmnpccgnaggehopdnmgkipmfgomdk', {msg: 'liveBoard', boardCode: code})
      });

      checkChromeInstalled(state.path);
      return pushState.apply(history, arguments);
    }
  }
}

if (window.location.toString().match(/codesign.io|localhost:3000\//)){
  document.addEventListener("DOMContentLoaded", function(){
    var headID = document.getElementsByTagName("head")[0];
    var newScript = document.createElement('script');
    newScript.type = 'text/javascript';
    newScript.innerHTML = checkChromeInstalled.toString() + ' ;' + checkLiveUrl.toString() + '; ' + replacePushState.toString() + '; replacePushState();';
    headID.appendChild(newScript);
  });
}

checkChromeInstalled();
checkUrl();
checkLiveUrl(undefined, function(code){
  chrome.runtime.sendMessage({msg: 'liveBoard', boardCode: code})
});