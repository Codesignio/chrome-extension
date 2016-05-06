var siteScript = require("raw!./site_script.js");


function sendToken(value) {
  var token = JSON.parse(value || 'null');
  chrome.extension.sendRequest({
    msg: 'stopOauth',
    token: token,
    fromSite: true
  });
}

function checkUrl(url) {

  if (window.location.toString().match(/codesign.io\//)) {

    if(localStorage["token"]){
      sendToken(localStorage["token"])
    } else {
      var oldSetItem = localStorage.setItem ;
      localStorage.setItem = function (key, value) {
        if(key == 'token' && value){
          sendToken(value);
        }
        oldSetItem(key,value);
      }
    }

  } else if (window.location.toString().match(/codesign.io\/syncauthorization/)) {
    chrome.extension.sendRequest({
      msg: 'syncAuthorization',
      token: JSON.parse(localStorage["token"] || 'null')
    }, function (token) {
      localStorage["token"] = JSON.stringify(token);
      chrome.extension.sendRequest({msg: 'closeWindow'})
    })
  }

}

if (window.location.toString().match(/codesign.io|localhost:3000\//)){
  document.addEventListener("DOMContentLoaded", function(){
    var headID = document.getElementsByTagName("head")[0];
    if (headID) {
      var newScript = document.createElement('script');
      newScript.type = 'text/javascript';
      newScript.innerHTML = siteScript;
      headID.appendChild(newScript);
    }
  });
}


checkUrl();