import React from 'react';
import {request} from './../utils';
import {s3Upload} from './../utils';
import {dataURItoBlob} from './../utils';

export default class SelectAndUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      folders: JSON.parse(localStorage.folders || '[]'),
      boards: JSON.parse(localStorage.boards || '{}'),
      activeBoard: JSON.parse(localStorage.activeBoard || 'null'),
      activeFolder: JSON.parse(localStorage.activeFolder || 'null')
    }
  }

  componentWillMount() {
    var token = localStorage.token;
    request('http://api.codesign.io/folders/', 'GET', {"Authorization": 'Token ' +  token}, null, function (data1) {
      var activeFolder = this.state.activeFolder || data1.results[0].id;
      request('http://api.codesign.io/folders/'+ activeFolder + '/boards/', 'GET', {"Authorization": 'Token ' + token}, null, function (data2) {

        var activeBoard = this.state.activeBoard && data2.results.map((res) => res.id).indexOf(this.state.activeBoard) > -1 ? this.state.activeBoard : data2.results[0].id;
        this.state.boards[activeFolder] = data2.results;
        localStorage.folders = JSON.stringify( data1.results);
        this.setState({
          folders: data1.results,
          activeFolder: this.state.activeFolder && data1.results.map((res)=>res.id).indexOf(this.state.activeFolder) > -1 ? this.state.activeFolder : data1.results[0].id,
          activeBoard: activeBoard
        });

      }.bind(this))
    }.bind(this));

  }

  setFolder(e) {
    var token = localStorage.token;
    this.setState({activeFolder: e.target.value});
    request('http://api.codesign.io/folders/'+ e.target.value + '/boards/', 'GET', {"Authorization": 'Token ' + token}, null, function (data) {
      localStorage.activeFolder = e.target.value;
      this.state.boards[e.target.value] = data.results;
      localStorage.boards = JSON.stringify(this.state.boards);
      this.setState({activeBoard: data.results[0].id});
    }.bind(this));
  }

  setBoard(e) {

      if (e.target.value !== "new_board") {
        localStorage.activeBoard = e.target.value;
      }

      this.setState({
        activeBoard: e.target.value
      });
  }

  logProgress(value){
    this.setState({progress: value})
  }


  uploadImage(){
    var me = this;


    this.setState({status: 'progress', progress: 0});
    chrome.runtime.sendMessage({
      msg: 'uploadImages',
      folders: this.state.folders,
      activeBoard: this.state.activeBoard,
      activeFolder: this.state.activeFolder,
      newBoardTitle: this.state.activeBoard == 'new_board' && me.refs['new_board'].value

    });

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.msg == 'upload_progress'){
        me.logProgress(request.value)
      }
    });

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.msg == 'upload_done'){
        me.props.handleUpload(request.payload)
      }
    });
  }

  handleCancel(){
    this.props.backToActions();
  }

  render(){
    return (
      <div className="uploadWidget">
        <p className="uploadTitle">Place to upload</p>
        {this.state.status == 'progress' && <div className="progress_bar" style={{width: this.state.progress}}></div>}
        <div className="selectors">
          <select value={this.state.activeFolder} onChange={this.setFolder.bind(this)}>
            {this.state.folders && this.state.folders.map(function(folder, i){
              return <option key={i} value={folder.id}>{folder.title}</option>
            })}
          </select>
          <select value={this.state.activeBoard} onChange={this.setBoard.bind(this)}>
            {this.state.boards[this.state.activeFolder] && this.state.boards[this.state.activeFolder].map(function(board,i){
              return <option key={i} value={board.id}>{board.title}</option>
            })}
            <option key="new board" className="new_board_option" value="new_board">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Create new board</option>
          </select>
          {this.state.activeBoard == 'new_board' && <input type="text" ref="new_board" placeholder="New board name"/>}
        </div>
        <div className="buttons">
          <button id="cancelButton" onClick={this.handleCancel.bind(this)}>Cancel</button>
          <button id="uploadButton" onClick={this.uploadImage.bind(this)}>Upload</button>
        </div>
      </div>
    )
  }
}