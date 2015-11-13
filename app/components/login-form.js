import React from 'react';

export default class LoginForm extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      status: null
    }
  }
  handleSubmit(e){
    var me = this;
    e.preventDefault();

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
        me.props.handleLogin(JSON.parse(xhr.responseText).token);
      }
    };
    xhr.send(json);
  }
  render(){
    return (
      <div className="login-form">
        {this.state.status && <p>Wrong email or password</p>}
        <p className="title">Log in</p>
        <button className="facebook-login">Log In with Facebook</button>
        <p>or <a className="google-login">Google</a>, <a className="github-login">Github</a></p>
        <p className="email-login">or Log in with Email</p>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <input type="email" ref="email" placeholder="Email"/>
          <input type="password" ref="password" placeholder="Password"/>
          <input type="submit" value="Log in"/>
        </form>
        <p className="signup-title">Please <a className="sign-up">Sign Up</a> if you don't have an account</p>
      </div>
    )
  }
}