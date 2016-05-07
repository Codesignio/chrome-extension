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
