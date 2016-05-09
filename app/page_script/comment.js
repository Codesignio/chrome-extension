var React = require('react');
var ReactDOM = require('react-dom');
var cx = require('classnames');
var cssString = require("raw!./../../pageStyles.css");
var cssPath = require("css-path");
var {elementsFromPoint} = require('../utils');


class Frame extends React.Component{
  constructor(props){
    super(props);
    this.state = {}
  }

  render() {
    return !this.state.cancel && React.createElement('iframe', {...this.props, children: undefined});
  }
  componentDidMount() {
    this.renderFrameContents();
  }

  onKeyDown(e){
    if (e.keyCode == 27){
      var elem = document.getElementById('snap-overlay');
      if (elem){
        elem.parentNode.removeChild(elem);
        this.setState({cancel: true})
      }
    }
  }



  renderFrameContents() {
    var doc = ReactDOM.findDOMNode(this).contentDocument;
    if(doc && doc.readyState === 'complete') {
      if(!doc.getElementById('codesignStyle')){
        var styleTag = doc.createElement('style');
        styleTag.setAttribute('id', 'codesignStyle');
        var styles = cssString.replace(/module.exports = "/, '');
        styles = styles.replace(/\\n/g, ' ');
        styles = styles.replace(/\\"/g, '"');
        styleTag.innerHTML = styles;
        doc.head.appendChild(styleTag);
        var contentTag = doc.createElement('div');
        contentTag.setAttribute('style', 'width: 100%; height: 100%;');
        contentTag.setAttribute('id', 'contentTag');
        doc.body.appendChild(contentTag);
        doc.addEventListener('keydown', this.onKeyDown.bind(this), true)
      }
      var contents = React.createElement('div',
        undefined,
        this.props.head,
        this.props.children
      );

      ReactDOM.render(contents, doc.getElementById('contentTag'));
    } else {
      setTimeout(this.renderFrameContents, 0);
    }
  }
  componentDidUpdate() {
    this.renderFrameContents();
  }
}

class Comment extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      pins: [],
      screenPos: {
        y: window.parent.document.body.scrollTop + window.innerHeight,
        x: window.parent.document.body.scrollLeft + window.innerWidth
      },
      me: window.codesign.me,
      windowHeight: document.body.scrollHeight,
      windowWidth: document.body.scrollWidth,
    }
  }

  componentWillMount() {
    var me = this;
    chrome.extension.onRequest.addListener(function (request, sender, callback) {
      if (request.msg === 'contextMenu') {
        me.newPin({...codeSignMousePos, fromContextMenu: true})
      } else if(request.msg == 'removeOverlay'){
        var elem = document.getElementById('snap-overlay');
        if (elem){
          elem.parentNode.removeChild(elem);
          me.setState({cancel: true});
        }
        callback();
      }
    });
  }


  componentDidMount(){
    window.addEventListener('scroll', this.onScrollHandler.bind(this));
    window.addEventListener('resize', this.resizeHandler.bind(this));
  }

  componentWillUnmount(){
    window.removeEventListener('scroll', this.onScrollHandler.bind(this));
    window.removeEventListener('resize', this.resizeHandler.bind(this));
  }

  onScrollHandler(){
    this.setState({
      screenPos: {
        y: window.parent.document.body.scrollTop + window.innerHeight,
        x: window.parent.document.body.scrollLeft + window.innerWidth
      }
    });
  }

  resizeHandler(){
    this.state.pins.forEach(function(pin){
      var cssPath = pin.cssPath;
      if (cssPath){
        var elem = document.querySelector(cssPath);
        var elemRect = elem.getBoundingClientRect();
        pin.x = pin.relativeX * elemRect.width + elemRect.left;
        pin.y = pin.relativeY * elemRect.height + elemRect.top;
      }
    }.bind(this));
    this.setState({
      windowHeight: document.body.scrollHeight,
      windowWidth: document.body.scrollWidth,
    });
  }

  onMouseMoveHandler(e){
    if(this.state.drag){
      e.preventDefault();
      e.stopPropagation();
      var pin = this.state.dragPin;

      var scrollPos = {x: document.body.scrollLeft, y: document.body.scrollTop};


      var target = elementsFromPoint(e.pageX - scrollPos.x, e.pageY - scrollPos.y)[2];
      var elemRect = target.getBoundingClientRect();

      pin.x = e.pageX;
      pin.y = e.pageY;
      pin.relativeX = (e.pageX - elemRect.left)/elemRect.width;
      pin.relativeY = (e.pageY - elemRect.top)/elemRect.height;
      pin.cssPath = cssPath(target);
      this.setState({});
    } else {
      this.hidePin()
    }
  }

  startDrag(pin, e){
    if (pin.user.id !== this.state.me.id) return;
    if (e.target.getAttribute('class') !== "title unselectable") return;
    e.preventDefault();
    e.stopPropagation();
    this.state.drag = true;
    this.state.dragPin = pin;
    this.setState({})
  }

  endDrag(){
    this.sendData('movePin', this.state.dragPin);
    this.setState({
      drag: false,
      dragPin: null
    })
  }


  newPin(e) {
    if (e.fromContextMenu || e.target.getAttribute('id') == 'snap-overlay-inner') {
      this.state.pins.forEach(function(pin){
        if(!pin.text){
          this.state.pins.splice(this.state.pins.indexOf(pin) ,1);
        }
      }.bind(this));

      var scrollPos = {x: document.body.scrollLeft, y: document.body.scrollTop};
      var target = elementsFromPoint(e.pageX - scrollPos.x, e.pageY - scrollPos.y)[2];
      var elemRect = target.getBoundingClientRect();

      var pin  = {
        x: e.pageX,
        y: e.pageY,
        relativeX: (e.pageX - elemRect.left)/elemRect.width,
        relativeY: (e.pageY - elemRect.top)/elemRect.height,
        cssPath: cssPath(target),
        children: [],
        user: this.state.me,
      };
      this.state.pins.push(pin);
      this.setState({resentPin: pin});
    }
  }


  hidePin(){
    var me = this;
    if (this.timeout){
      return
    } else {
      this.timeout = setTimeout(function () {
        this.timeout = null;
        me.setState({activePin: null});
      }, 300)
    }
  }

  showPin(pin,e){
    e.stopPropagation();
    clearTimeout(this.timeout);
    this.timeout = null;
    this.setState({activePin: pin});
  }



  addComment(pin){
    pin.children.push({
      children: [],
      text: '',
      user: this.state.me,
    });
    pin.reply = false;
    this.setState({});
  }

  completePin(pin){
    pin.completed = !pin.completed;
    this.setState({});
    this.sendData('completePin', pin)
  }

  sendData(msg, pin, parentPin){
    var data = {
      msg: msg == 'addPin' ? (this.state.pins.indexOf(pin) > -1 ? 'addPin' : 'addComment') : (msg == 'deletePin' ? (this.state.pins.indexOf(pin) > -1 ? 'deletePin' : 'deleteComment') : msg),
      pins: this.state.pins,
      url: document.location.toString(),
      pageTitle: document.title,
      pin: pin,
      updated: pin.updated,
      commentMode: this.state.commentMode,
      width: document.body.scrollWidth,
      height: document.body.scrollHeight,
      boardData: window.codesignBoardData,
      parentPin: parentPin,
      liveUrl: this.state.webUrl,
      webUrl: this.state.liveUrl,
      documentTitle: document.title,
    };
    chrome.runtime.sendMessage(data);

  }


  render() {
    var styles = {
      width: '100%',
      height: '100%',
      zIndex: 1000001,
      position: 'absolute',
      left: 0,
      top: 0,
      cursor: 'crosshair'
    };

    return this.state.cancel ? null : <Frame style={{display: 'block' , width: this.state.windowWidth, height: this.state.windowHeight, border: 'none'}}><div id="snap-overlay" style={styles}
                                                                                                                                                              onClick={this.newPin.bind(this)}>
      <div id="snap-overlay-inner" style={styles} onMouseMove={this.onMouseMoveHandler.bind(this)}>
        {this.state.pins.map(function(pin, i){
          return (
            <div ref={pin} key={i} onMouseDown={this.startDrag.bind(this, pin)} onMouseUp={this.endDrag.bind(this)} className={cx("Pin movable",{completed: pin.completed})} style={{top: pin.y, left: pin.x, position: 'absolute'}} onMouseMove={!this.state.drag && this.showPin.bind(this, pin)}>
              <span className="title unselectable">{i+1}</span>
              <div onMouseDown={(e)=>e.stopPropagation()} onMouseUp={(e)=>e.stopPropagation()}  style={{display: this.state.activePin === pin || this.state.resentPin === pin ? 'block' : 'none'}}>
                <div className="Task">
                  <div className="task-box">
                    <CommentBox pin={pin}
                                user={pin.user}
                                pins={this.state.pins}
                                meUser={this.state.me}
                                parent={this}
                                sendData={this.sendData.bind(this)}
                                parentPin={null}
                    />

                    {pin.added ? [<div className="top-wrapper completed-wrapper">
                      <div className="mark-as-completed">
                        <input onClick={this.completePin.bind(this, pin)} checked={pin.completed} className="toggle" type="checkbox"/>
                        <span className="completed-title">{pin.completed ? 'Completed by ' + this.state.me.first_name + ' ' + this.state.me.last_name :  'Mark as completed'}</span>
                      </div>
                    </div>,


                      <div className="comments">
                        {pin.children.length ? pin.children.map(function (comment,i) {
                          return (
                            <div className="comment-area">
                              <CommentBox key={i}  pin={comment}
                                          user={comment.user}
                                          pins={pin.children}
                                          meUser={this.state.me}
                                          parent={this}
                                          sendData={this.sendData.bind(this)}
                                          parentPin={pin}

                              />
                            </div>
                          )
                        }.bind(this)) : null }
                      </div>,

                      (pin.reply || pin.reply === undefined) && <button onClick={this.addComment.bind(this, pin)} className="cs-btn-flat-active bottom-btn reply-btn">Reply</button>] : null}

                  </div>
                </div>
              </div>
            </div>
          )
        }.bind(this))}
      </div>
    </div>
    </Frame>

  }
}


class CommentBox extends React.Component {

  constructor(props){
    super(props);
    this.state = {}
  }

  showMenu(e){
    e.stopPropagation();
    this.state.menuActive = !this.state.menuActive;
    this.setState({})
  }

  editPin(pin, e){
    e.stopPropagation();
    pin.added = !pin.added;
    pin.updated = true;
    this.state.menuActive = false;
    if (this.props.parentPin && this.props.pins.indexOf(pin) == this.props.pins.length -1){
      this.props.parentPin.reply = false;
      this.props.parent.setState({})
    } else {
      this.props.parent.setState({})
    }
  }

  deletePin(pin, parentPin, local){
    this.props.pins.splice(this.props.pins.indexOf(pin), 1);
    this.props.parent.setState({});
    if (!local) this.props.sendData('deletePin', pin, parentPin)
  }


  addPin(pin, parentPin){
    var text = this.refs['textarea'].value;
    if (!text) return;
    pin.text = text;
    pin.added = true;
    var timeSeg = (new Date()).toString().split(' ');
    var time = timeSeg[4].split(':')[0]+':'+timeSeg[4].split(':')[1]+' '+timeSeg[1]+' '+timeSeg[2];
    pin.time = time;
    if(this.props.parentPin) this.props.parentPin.reply = true;
    this.props.sendData('addPin', pin, parentPin);
    pin.updated = false;
    this.props.parent.setState({});
  }

  keyDownHandler(pin, e){
    if(e.keyCode == 13 && !e.shiftKey){
      this.addPin(pin)
    }
  }

  cancelPin(pin){
    if (pin.text){
      pin.added = true;
      this.setState({});
    } else {
      this.deletePin(pin, null, true)
    }
  }

  componentDidMount(){
    this.refs.textarea.focus();
  }

  render(){
    var pin = this.props.pin;
    var user = this.props.user;

    return(
      <div>
        <div className="CommentBox">
          <div className="top-wrapper">
            <div className="profile">
              <div className="ProfileBar">
                <img className="avatar" src={user.avatar || `https://avatarius.herokuapp.com/get?name=${user.first_name}&size=128`}
                     style={{width:'27px', height:'27px'}}/>
                <div className="user-name">
                  <div>{user.first_name + ' ' + user.last_name}</div>
                  {pin.added && <div className="date">{pin.time}</div>}
                </div>
              </div>
            </div>


            <div className="menu" onClick={this.showMenu.bind(this)}>
              <div className="KebabMenu">
                <div className="dots">
                  <figure className="dot active"></figure>
                  <figure className="dot active"></figure>
                  <figure className="dot active"></figure>
                </div>
                {pin.user.id == this.props.meUser.id && this.state.menuActive && <div className="kebab-dropdown">
                  <div className="menu-item">
                    <span className="cs-link" onClick={this.editPin.bind(this, pin)}>Edit</span>
                  </div>
                  <div className="menu-item">
                    <span className="cs-link" onClick={this.deletePin.bind(this, pin, this.props.parentPin)}>Delete</span>
                  </div>
                </div>}
              </div>
            </div>


            <div className="comment">
              {pin.added ? <span className="Linkify"><div className="readonly-text">{pin.text}</div></span> : <textarea ref={"textarea"} onKeyDown={this.keyDownHandler.bind(this, pin)} className="input" defaultValue={pin.text} />}
            </div>
          </div>
          {!pin.added && <div className="create-buttons">
            <button className="bottom-btn cs-btn-flat-active" onClick={this.addPin.bind(this, pin, this.props.parentPin)}>Add</button>
            <button className="bottom-btn cs-btn-flat-gray" onClick={this.cancelPin.bind(this, pin)}>Cancel</button>
          </div>}
        </div>
      </div>
    )
  }
}


var el = document.createElement('div');
el.setAttribute('id', 'snap-overlay');
el.setAttribute('style', 'z-index:1000000; position: absolute; top: 0px; left: 0px;');
document.body.appendChild(el);
ReactDOM.render(<Comment />, el);