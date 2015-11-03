function takeScreenshoot(e) {
  chrome.tabs.captureVisibleTab(null, null, function(dataUrl) {
    var el = document.createElement('img');
    el.setAttribute('src', dataUrl);
    el.onclick = function(){
      chrome.tabs.create({url: dataUrl});
    };
    document.getElementById('image').appendChild(el);
  });
};

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('takeScreenshot').addEventListener('click', takeScreenshoot);
});
