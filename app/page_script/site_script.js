function checkChromeInstalled(url){
  if (url && url == '/chrome' || window.location.pathname == '/chrome' && !window.location.search) {
    window.location = '/chrome?already_installed'
  }
};

function replacePushState(){
  var pushState = window.history.pushState;
  window.history.pushState = function(state) {
    if (state) {
      checkChromeInstalled(state.path);
    }
    return pushState.apply(history, arguments);
  }
};

replacePushState();
checkChromeInstalled();