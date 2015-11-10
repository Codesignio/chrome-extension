import React from 'react';
import {request} from './../utils';
import {s3Upload} from './../utils';
import {dataURItoBlob} from './../utils';

export default class SelectAndUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      folders: [],
      boards: [],
      activeFolder: null,
      activeBoard: null,
    }
  }

  componentWillMount() {
    request('http://api.codesign.io/folders/', 'GET', {"Authorization": 'Token ' + this.props.token}, null, function (data1) {
      request('http://api.codesign.io/folders/'+ data1.results[0].id + '/boards/', 'GET', {"Authorization": 'Token ' + this.props.token}, null, function (data2) {
        this.setState({
          folders: data1.results,
          activeFolder: data1.results[0].id,
          boards: data2.results,
          activeBoard: data2.results[0].id
        });
      }.bind(this))
    }.bind(this));

  }

  setFolder(e) {
    request('http://api.codesign.io/folders/'+ e.target.value + '/boards/', 'GET', {"Authorization": 'Token ' + this.props.token}, null, function (data) {
      this.setState({activeFolder: e.target.value, boards: data.results, activeBoard: data.results[0].id});
    }.bind(this));
  }

  setBoard(e) {
    this.setState({
      activeBoard: e.target.value
    })
  }

  logProgress(value){
    this.setState({progress: value})
  }


  uploadImage(){
    var token = this.props.token;
    var me = this;
    var capturedImage = this.props.image;
    var link = this.props.image.link;
    var activeBoard = this.state.activeBoard;
    this.setState({status: 'progress', progress: 0});
    request('http://api.codesign.io/boards/'+ activeBoard + '/posts/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8" }, {
      title: capturedImage.name
    }, function (data) {
      console.log(data);
      var uploadedPost = {boardID: activeBoard, postID: data.id};
      request('http://api.codesign.io/posts/'+ data.id + '/images/get_upload_url/?filename='+ capturedImage.name +'&image_type=image%2Fjpeg&thumbnail_type=image%2Fjpeg', 'GET', {"Authorization": 'Token ' + token}, null, function (data1) {
        console.log(data1);

        window.webkitResolveLocalFileSystemURL(link, function(fileEntry){
          fileEntry.file(function(file) {
            s3Upload(data1.image_upload_url, file, me.logProgress.bind(me), function (data2) {

              var canvas = document.createElement('canvas');
              canvas.width = 250;
              canvas.height = 150;
              var image = new Image();
              image.onload = function () {
                canvas.getContext('2d').drawImage(image, 0,0, this.width, this.height, 0,0, 250,150);

                var blob =  dataURItoBlob(canvas.toDataURL());
                s3Upload(data1.thumbnail_upload_url, blob, me.logProgress.bind(me), function () {

                  request('http://api.codesign.io/posts/'+ data.id +'/images/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8"}, {
                    image_upload_url:data1.image_upload_url,
                    thumbnail_upload_url: data1.thumbnail_upload_url,
                    width: capturedImage.size.width,
                    height: capturedImage.size.height
                  }, function (data3) {
                    me.props.handleUpload(uploadedPost)
                  });

                });

              };
              image.src = link;

            });
          });
        });


      });

    });
  }

  handleCancel(){
    localStorage.currentCaptureImage = '';
    this.props.handleUpload();
  }

  render(){
    return (
      <div className="uploadWidget">
        <p className="uploadTitle">Place to upload</p>
        {this.state.status == 'progress' && <div className="progress_bar" style={{width: this.state.progress}}></div>}
        <div className="selectors">
          <select onChange={this.setFolder.bind(this)}>
            {this.state.folders && this.state.folders.map(function(folder, i){
              return <option key={i} value={folder.id}>{folder.title}</option>
            })}
          </select>
          <select onChange={this.setBoard.bind(this)}>
            {this.state.boards && this.state.boards.map(function(board,i){
              return <option key={i} value={board.id}>{board.title}</option>
            })}
          </select>
        </div>
        <div className="buttons">
          <button id="cancelButton" onClick={this.handleCancel.bind(this)}>Cancel</button>
          <button id="uploadButton" onClick={this.uploadImage.bind(this)}>Upload</button>
        </div>
      </div>
    )
  }
}