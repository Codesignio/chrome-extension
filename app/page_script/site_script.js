function sendToken(token) {
  chrome.runtime.sendMessage('gaaecipbmihjphkblcmkjfjlgdegboog', {
    msg: 'stopOauth',
    token: token,
    fromSite: true
  });
}

function checkUrl() {

  if (window.location.toString().match(/codesign.io\/checkauthorization/)) {

    if(window.app_store.getState().storage.token){
      sendToken(window.app_store.getState().storage.token)
    } else {
      window.app_store.subscribe(()=>{
        if(window.app_store.getState().storage.token){
          sendToken(window.app_store.getState().storage.token);
        }
      });
    }

  } else if(window.location.toString().match(/codesign.io\/syncauthorization/)) {
    chrome.runtime.sendMessage('gaaecipbmihjphkblcmkjfjlgdegboog', {
        msg: 'syncAuthorization',
        token: JSON.parse(localStorage["token"] || 'null')
      }, {}, function (token) {
        window.app_store.dispatch({type: 'set_state', storage: {token: token}});
      chrome.runtime.sendMessage('gaaecipbmihjphkblcmkjfjlgdegboog', {msg: 'closeWindow'})
      })
  }

}


function checkChromeInstalled(url){
  if (url && url == '/chrome' || window.location.pathname == '/chrome' && !window.location.search) {
    window.location = '/chrome?already_installed=true'
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
checkUrl();