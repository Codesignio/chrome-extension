import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';
import {request} from './utils';



export default class LoginForm extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      status: null,
      signUpOrLogIn: false
    }
  }
  handleSubmit(e){
    var me = this;
    e.preventDefault();


    if(this.state.signUpOrLogIn){
      var xhr = new XMLHttpRequest();
      var json = JSON.stringify({"username": me.refs.email.value, "password1": me.refs.password.value, "password2": me.refs.password.value});
      xhr.open("POST", 'http://api.codesign.io/users/registration/', true);
      xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return;
        if (xhr.status != 201) {
          me.setState({status: xhr.status + ': ' + xhr.responseText});
        } else {
          console.log(xhr.responseText);

          var xhr2 = new XMLHttpRequest();
          var json = JSON.stringify({"username": me.refs.email.value, "password": me.refs.password.value});
          xhr2.open("POST", 'http://api.codesign.io/users/token/username/', true);
          xhr2.setRequestHeader('Content-type', 'application/json; charset=utf-8');
          xhr2.onreadystatechange = function() {
            if (xhr2.readyState != 4) return;
            if (xhr2.status != 200) {
              me.setState({status: xhr2.status + ': ' + xhr2.responseText});
            } else {
              console.log(xhr2.responseText);
              var token = JSON.parse(xhr2.responseText).token;
              localStorage.token = JSON.stringify(token);


              var xhr3 = new XMLHttpRequest();
              var json = JSON.stringify({"first_name": me.refs.name.value});
              xhr3.open("PUT", 'http://api.codesign.io/users/me/', true);
              xhr3.setRequestHeader('Content-type', 'application/json; charset=utf-8');
              xhr3.setRequestHeader('Authorization',  'Token ' + token);
              xhr3.onreadystatechange = function() {
                if (xhr3.readyState != 4) return;
                if (xhr3.status != 200) {
                  me.setState({status: xhr3.status + ': ' + xhr3.responseText});
                } else {
                  console.log(xhr3.responseText);
                  //window.close();
                  chrome.extension.sendRequest({msg: 'stopOauth', token: token, urlProvider: 'registered'});
                }
              };
              xhr3.send(json);

            }
          };
          xhr2.send(json);

        }
      };
      xhr.send(json);
    } else {
      var xhr = new XMLHttpRequest();
      var json = JSON.stringify({username: this.refs.email.value, password: this.refs.password.value});
      xhr.open("POST", 'http://api.codesign.io/users/token/username/', true);
      xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return;
        if (xhr.status != 200) {
          me.setState({status: xhr.status + ': ' + xhr.statusText});
        } else {
          console.log(xhr.responseText);
          var token = JSON.parse(xhr.responseText).token;
          localStorage.token = JSON.stringify(token);
          //window.close();
          chrome.extension.sendRequest({msg: 'stopOauth', token: token});
        }
      };
      xhr.send(json);
    }
  }

  changeMode(){
    this.state.signUpOrLogIn = !this.state.signUpOrLogIn;
    this.setState({})
  }

  handleOauth(){
    chrome.runtime.sendMessage({msg: 'startOauth'});
  }

  render(){
    var signUpOrLogIn = this.state.signUpOrLogIn;
    return (
      <div className="modal-root modal-backdrop">
        <div className="modal-body AuthModal">
          <div>
            {this.state.status && <p>{this.state.status}</p>}
            <div className="title">{signUpOrLogIn ? 'Sign Up' : 'Log In'}</div>
            <div>
              <a onClick={this.handleOauth.bind(this)} href="https://www.facebook.com/dialog/oauth?scope=email&client_id=528390150556681&redirect_uri=http://www.codesign.io/?oauthProvider=facebook&state=/" className="facebook-login-btn">
                <span>{signUpOrLogIn ? 'Sign Up' : 'Log In'}</span>
                <span> with Facebook</span></a>
              <div className="other-social-logins">
                <span>or </span>
                <a onClick={this.handleOauth.bind(this)} href="https://accounts.google.com/o/oauth2/auth?response_type=code&scope=openid%20email&client_id=577728361914-n4k1d2unaaqpje4r5pfivs7p3n095at8.apps.googleusercontent.com&redirect_uri=http://www.codesign.io/?oauthProvider=google&state=/" className="google">Google</a>
                </div>
            </div>
            <form className="auth-form">
              <span className="auth-form-title">or {signUpOrLogIn ? 'Sign Up' : 'Log In'} with Email</span>
              <div className="inputs">
                {signUpOrLogIn && <input name="name" type="text" ref="name" placeholder="Name"/>}
                <input name="email" type="text" ref="email" placeholder="Email"/>
                <input name="password" type="password" ref="password" placeholder="Password"/>
                <input type="submit" className="form-submit-btn" onClick={this.handleSubmit.bind(this)}
                       value={signUpOrLogIn ? 'Sign Up' : 'Log In'}/>
              </div>
            </form>
            <div className="auth-info">
          <span>
            <span>Please </span>
            <span className="auth-link" onClick={this.changeMode.bind(this)}>{signUpOrLogIn ? 'Log In': 'Sign Up'}</span>
            <span> if you already have an account</span>
          </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

ReactDOM.render(<LoginForm/>, document.getElementById('app'));