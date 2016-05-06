//intercom

//(function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',intercomSettings);}else{var d=document;var i=function(){i.c(arguments)};i.q=[];i.c=function(args){i.q.push(args)};w.Intercom=i;function l(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/ufe67jbo';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);}if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})()

function track (event, data) {
  window.Intercom && window.Intercom('trackEvent', event, data);
}
var CoIntercom = {
  boot (id, name, email, created_at) {
    window.Intercom && window.Intercom('boot', {
      app_id: 'lid3oqje',
      user_id: id,
      name: name,
      email: email,
      created_at: created_at,
      extension: true,
    });
  },

  shutdown () {
    window.Intercom && window.Intercom('shutdown');
  },

  // facebook, github, email
  loggedIn (data) {
    track('#LOGGED IN VIA EXTENSION', data);
  },

  loggedOut (data) {
    track('#LOGGED OUT VIA EXTENSION', data);
  },
};

module.exports = {track, CoIntercom}