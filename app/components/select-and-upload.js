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
      newBoardTitle: "New Board"

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

  toogleSelectors(){
    this.setState({
      edit: !this.state.edit
    })
  }

  render(){
    return (
      <div className="uploadWidget">
        <button id="uploadButton" onClick={this.uploadImage.bind(this)}>UPLOAD IMAGES</button>
        {this.state.status == 'progress' && <div className="progress_bar" style={{width: this.state.progress}}></div>}
        { !this.state.edit ? <div className="selectors-titles">
          {this.state.activeBoard == 'new_board' ? [<p>Wiil creating new board</p>,<p>in folder: {/*this.state.folders.filter((fol)=>fol.id == this.state.activeFolder)[0].title */'My Boards'}</p>] :
          [<p>Folder: {this.state.activeFolder}</p>, <p>Board: {this.state.activeBoard}</p>]}
        </div> : <div className="selectors">
          <p>FOLDER</p>
          <select value={this.state.activeFolder} onChange={this.setFolder.bind(this)}>
            {this.state.folders && this.state.folders.map(function(folder, i){
              return <option key={i} value={folder.id}>{folder.title}</option>
            })}
          </select>
          <p>BOARD</p>
          <select value={this.state.activeBoard} onChange={this.setBoard.bind(this)}>
            {this.state.boards[this.state.activeFolder] && this.state.boards[this.state.activeFolder].map(function(board,i){
              return <option key={i} value={board.id}>{board.title}</option>
            })}
            <option key="new board" className="new_board_option" value="new_board">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Create new board</option>
          </select>
        </div>}
        <div className="upload-actions">
          <a onClick={this.toogleSelectors.bind(this)}>{this.state.edit ? 'Save' : 'Edit'}</a>
          <a onClick={this.handleCancel.bind(this)}>Cancel</a>
          <a>+ Make one more snap</a>
        </div>
      </div>
    )
  }
}