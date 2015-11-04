import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';


class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      progress: false,
      screenshot: null,
      contentURL: '',
      images: []
    }
  }

  componentWillMount() {
    chrome.extension.onRequest.addListener(function (request, sender, callback) {
      if (request.msg === 'capturePage') {
        this.capturePage(request, sender, callback);
      }
    }.bind(this));
  }

  takeScreenshoot(e) {
    chrome.tabs.captureVisibleTab(null, null, function (dataUrl) {
      var el = document.createElement('img');
      el.setAttribute('src', dataUrl);
      el.onclick = function () {
        chrome.tabs.create({url: dataUrl});
      };
      document.getElementById('images').appendChild(el);
    });
  }

  takeFullPageScreenshoot() {
    var me =this;
    chrome.tabs.getSelected(null, function (tab) {
      var loaded = false;
      chrome.tabs.executeScript(tab.id, {file: 'page.js'}, function () {
        loaded = true;
        this.sendScrollMessage(tab);
      }.bind(me));
    });
  }

  sendScrollMessage(tab) {
    var me = this;
    this.state.contentURL = tab.url;
    this.state.screenshot = {};
    chrome.tabs.sendRequest(tab.id, {msg: 'scrollPage'}, function () {
      this.openPage();
    }.bind(me));
  }

  capturePage(data, sender, callback) {
    this.setState({progress: parseInt(data.complete * 100, 10) + '%'});
    var screenshot = this.state.screenshot;
    var canvas;

    var scale = data.devicePixelRatio && data.devicePixelRatio !== 1 ?
    1 / data.devicePixelRatio : 1;
    if (scale !== 1) {
      data.x = data.x / scale;
      data.y = data.y / scale;
      data.totalWidth = data.totalWidth / scale;
      data.totalHeight = data.totalHeight / scale;
    }
    if (!screenshot.canvas) {
      canvas = document.createElement('canvas');
      canvas.width = data.totalWidth;
      canvas.height = data.totalHeight;
      screenshot.canvas = canvas;
      screenshot.ctx = canvas.getContext('2d');
    }

    chrome.tabs.captureVisibleTab(
      null, {format: 'png', quality: 100}, function (dataURI) {
        if (dataURI) {
          var image = new Image();
          image.onload = function () {
            screenshot.ctx.drawImage(image, data.x, data.y);
            callback(true);
          };
          image.src = dataURI;
        }
      });
  }

  openPage() {
    var screenshot = this.state.screenshot;

    var dataURI = screenshot.canvas.toDataURL();

    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([ab], {type: mimeString});
    var size = blob.size + (1024 / 2);
    var name = this.state.contentURL.split('?')[0].split('#')[0];
    if (name) {
      name = name
        .replace(/^https?:\/\//, '')
        .replace(/[^A-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[_\-]+/, '')
        .replace(/[_\-]+$/, '');
      name = '-' + name;
    } else {
      name = '';
    }
    name = 'screencapture' + name + '-' + Date.now() + '.png';

    var me = this;
    function onwriteend() {
      var url = 'filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name;
      me.state.images.push({link: url});
      me.setState({progress: false});
    }

    window.webkitRequestFileSystem(window.TEMPORARY, size, function (fs) {
      fs.root.getFile(name, {create: true}, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {
          fileWriter.onwriteend = onwriteend
          fileWriter.write(blob);
        });
      });
    });
  }

  imgClick(url, e){
    chrome.tabs.create({url: url});
  }

  render() {
    return (
      <div id="popup">
        {this.state.progress && <ProgressBar progress={this.state.progress}/>}
        <button onClick={this.takeScreenshoot.bind(this)}>Take Screenshot</button>
        <button onClick={this.takeFullPageScreenshoot.bind(this)}>Take FullPage Screenshot</button>
        <div id="images">
          {this.state.images && this.state.images.map(function(img){
            return <img src={img.link} onClick={this.imgClick.bind(this, img.link)} style={{heght: 500}}/>
          }.bind(this))}
        </div>
      </div>
    )
  }
}


class ProgressBar extends React.Component {
  render() {
    return <div className="progress_bar" style={{width: this.props.progress}}></div>
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));