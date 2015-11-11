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