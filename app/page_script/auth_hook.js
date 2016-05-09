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


var siteScript = require("raw!./site_script.js");

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
