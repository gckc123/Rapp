//Note to self:
//Window can use the following command in Package.json to set environmental variable
//”electron-dev”: "set ELECTRON_START_URL=http://localhost:3000 && electron .”
import React, {Component} from 'react';
import './App.css';
import { TopNavTabs } from './TopNavTabs';
import { Notebook } from './Notebook';
import { MediationPanel } from "./MediationPanel"
import { AnalysisPanelBar } from './AnalysisPanelBar';
import { DataPanel} from './DataPanel';


const electron = window.require('electron');
const mainProcess = electron.remote.require('./start.js');
const ipcRenderer = electron.ipcRenderer;

export class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      workingDir: "",
      tentativeScript: "",
      ActiveScript: "",
      ActiveBlkID: "",
      CurrentVariableList: [],
      CurrentData: [],
      nrow: 0,
      ncol: 0,
      NotebookBlkList: [],
      currentActiveAnalysisPanel: "",
      currentActiveLeftPanel: "",
      dataPanelWidth: 100,
      dataPanelHeight: 100,
    }
    this.DataPanelContainerRef = React.createRef();        
  }
  
  componentWillMount() {
    this.addExtraBlk("",false)
  }

  componentDidMount() {
    this.updateDataPanelDimention();
    window.addEventListener("resize", this.updateDataPanelDimention);

    ipcRenderer.on('RecvROutput', (event, content) => {
      let ResultsJSON = JSON.parse(content)
      if (ResultsJSON.OutputType[0] === "Normal" || ResultsJSON.OutputType[0] === "Warning" || ResultsJSON.OutputType[0] === "Message" || ResultsJSON.OutputType[0] === "Error") {
        let tmp = this.state.NotebookBlkList.slice()
        let Reply2BlkIndex = this.state.NotebookBlkList.findIndex( (item) => item.NotebookBlkID === ResultsJSON.toBlk[0])
        if (Reply2BlkIndex >= 0)
        {
          tmp[Reply2BlkIndex].NotebookBlkROutput = [...tmp[Reply2BlkIndex].NotebookBlkROutput, {OutputType: ResultsJSON.OutputType,
            Output: ResultsJSON.Output}];
          this.setState({NotebookBlkList:[...tmp]})
        }
      }else if (ResultsJSON.OutputType[0] === "getVariableList") {  
        this.setState({CurrentVariableList: ResultsJSON.Output})
      }else if (ResultsJSON.OutputType[0] === "getData") {
        console.log("receiving data")
        //console.log(ResultsJSON.Output)
        this.setState({CurrentData: ResultsJSON.Output, nrow: ResultsJSON.nrow, ncol: ResultsJSON.ncol})
      }else if(ResultsJSON.OutputType[0] === "END") {
        let tmp = this.state.NotebookBlkList.slice()
        let Reply2BlkIndex = this.state.NotebookBlkList.findIndex( (item) => item.NotebookBlkID === ResultsJSON.toBlk[0])
        if (Reply2BlkIndex >= 0)
        {
          tmp[Reply2BlkIndex].Busy = false
          this.setState({NotebookBlkList:[...tmp]})
        }
      }
    })
    
    ipcRenderer.on('file-opened', (event, directory, filename, ext, os) => {
      if (os === "win32") {
        directory = directory.replace(/\\/g,"\\\\")
      }
      
      let script = `setwd("${directory}") \n`;
      switch (ext) {
        case ".csv":
        case ".CSV":
          script = script + `currentDataset <- read.csv("${filename}")`
          break;
        case ".sav":
        case ".SAV":
          script = script + `library(foreign)\ncurrentDataset <- read.spss("${filename}", 
          to.data.frame=TRUE, use.value.labels = FALSE)`
          break;
        case ".dta":
        case ".DTA":
          script = script + `library(foreign)\ncurrentDataset <- read.dta("${filename}")`
          break;
        default:
          break;
      }
      this.setState({workingDir: directory}, () => this.addExtraBlk(script, true))
      console.log(directory)
    })
  }

  updateDataPanelDimention = () => {
    if (this.DataPanelContainerRef.current) {
      this.setState({
        dataPanelHeight: this.DataPanelContainerRef.current.offsetHeight - 30,
        dataPanelWidth: this.DataPanelContainerRef.current.offsetWidth - 20,
      })
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('RecvROutput')
    ipcRenderer.removeAllListeners('file-opened')
    window.removeEventListener('resize', this.updateDataPanelDimention)
  }

  selectLeftPanel = (panel) => {
    this.setState({currentActiveLeftPanel: panel})
  }

  selectAnalysisPanel = (panel) => {
    this.setState({currentActiveAnalysisPanel: panel})
  }

  savingFile = () => {
    console.log("Saving flie clicked!!")
    mainProcess.savingFile(JSON.stringify(this.state.NotebookBlkList),this.state.workingDir);
  }

  addExtraBlk = (script,runScript) => {
    let tmp = this.state.NotebookBlkList.slice()
    let CurrentActiveIndex = this.state.NotebookBlkList.findIndex( (item) => item.Active)
    if (CurrentActiveIndex >= 0) {
        tmp[CurrentActiveIndex].Active = false;
    }
    let randomID = Math.random().toString(36).substring(2, 15)
    if (runScript) {
        this.setState({ActiveBlkID: randomID,
        ActiveScript: script,
        NotebookBlkList: [...tmp, {NotebookBlkScript: script, 
          Active: true, 
          NotebookBlkID: randomID,
          NotebookBlkROutput: [],
          NotebookBlkNote: "",
          Busy: false,
          showEditor: false,
          editorHTML: "",
          Title: "--- Analysis Title Here ---",
        }]}, () => this.runScript())
    }else{
        this.setState({ActiveBlkID: randomID,
          ActiveScript: script,
          NotebookBlkList: [...tmp, {NotebookBlkScript: script, 
            Active: true, 
            NotebookBlkID: randomID,
            NotebookBlkROutput: [],
            NotebookBlkNote: "",
            Busy: false,
            showEditor: false,
            editorHTML: "",
            Title: "--- Analysis Title Here ---",
          }]})
    }  
  }

  gainFocus = (index) => {
    let tmp = this.state.NotebookBlkList.slice()
    let CurrentActiveIndex = this.state.NotebookBlkList.findIndex( (item) => item.Active)
    if (CurrentActiveIndex >= 0) {
        tmp[CurrentActiveIndex].Active = false;
    }
    tmp[index].Active = true;
    this.setState({ActiveScript: tmp[index].NotebookBlkScript})
    this.setState({ActiveBlkID: tmp[index].NotebookBlkID})
    this.setState({NotebookBlkList: [...tmp]})
  }

  delBlk = () => {
    let tmp = this.state.NotebookBlkList.filter( (item) => !item.Active)
    this.setState({NotebookBlkList: [...tmp]})
    this.setState({ActiveScript: ""})
    this.setState({ActiveBlkID: null})
  }

  updateNotebookBlkState = (index, script, title, editorHTML) => {
    let tmp = this.state.NotebookBlkList.slice()
    tmp[index].Title = title
    tmp[index].NotebookBlkScript = script
    tmp[index].editorHTML = editorHTML
    this.setState({NotebookBlkList: [...tmp]}, () => console.log(this.state.NotebookBlkList))
  }

  toggleTEditor = (index) => {
    let tmp = this.state.NotebookBlkList.slice()
    tmp[index].showEditor = !tmp[index].showEditor
    this.setState({NotebookBlkList: [...tmp]})
  }

  updateAEditorValue = (index, newValue, execute) => {
    let tmp = this.state.NotebookBlkList.slice()
    tmp[index].NotebookBlkScript = newValue
    if (execute) {
      this.setState({NotebookBlkList: [...tmp], ActiveScript: newValue}, () => this.runScript())  
    }else
    {
      this.setState({NotebookBlkList: [...tmp], ActiveScript: newValue})
    }
  }

  getData = () => {
    let ScriptJSON = {
      RequestType: "getData",
      Script: "",
      fromBlk: "",
      startIndex: 1,
      endIndex: 500,
    }
    let ScriptString = JSON.stringify(ScriptJSON)
    mainProcess.send2R(ScriptString);
  }

  getVariableList = () => {
    let ScriptJSON = { 
      RequestType: "getVariableList",
      Script: "",
      fromBlk: "",
    }
    let StriptString = JSON.stringify(ScriptJSON)
    mainProcess.send2R(StriptString);
  }

  runScript = () => {  
    let tmp = this.state.NotebookBlkList.slice()
    let CurrentActiveIndex = this.state.NotebookBlkList.findIndex( (item) => item.Active)
    if (CurrentActiveIndex >= 0) {
      tmp[CurrentActiveIndex].NotebookBlkROutput = [];
      tmp[CurrentActiveIndex].Busy = true;
      
      this.setState({NotebookBlkList: [...tmp]}, () => console.log(this.state.NotebookBlkList))
      let ScriptJSON = {
        RequestType: "RCode",
        Script: this.state.ActiveScript,
        fromBlk: this.state.ActiveBlkID,
      }
      let StriptString = JSON.stringify(ScriptJSON)
      mainProcess.send2R(StriptString);
    }
    this.getVariableList();
    console.log("Getting data")
    this.getData();
  }

  openFile = () => {
    mainProcess.getFileFromUser();
  }

  updateTentativeScript = (codeString) => {
    if (codeString !== this.state.tentativeScript) {
      this.setState({tentativeScript: codeString})
    }
  }
  
  render() {

      return (
          <div className="container-fluid p-2 flex-container">
            <TopNavTabs openFileCallback = {this.openFile}
            selectLeftPanelCallback = {this.selectLeftPanel}
            selectAnalysisPanelCallback = {this.selectAnalysisPanel}
            savingFileCallback = {this.savingFile}/>
            <div className="main-pane">
              <div className="left-pane p-2" ref={this.DataPanelContainerRef}>
                <div hidden={this.state.currentActiveLeftPanel !== "DataPanel"}>
                  <DataPanel CurrentData = {this.state.CurrentData}
                  CurrentVariableList = {this.state.CurrentVariableList}
                  nrow = {this.state.nrow}
                  ncol = {this.state.ncol}
                  dataPanelHeight = {this.state.dataPanelHeight}
                  dataPanelWidth = {this.state.dataPanelWidth}
                  addExtraBlkCallback = {this.addExtraBlk}/>
                </div>
                <div hidden={this.state.currentActiveLeftPanel !== "AnalysisPanel"}>
                  <div>
                  <AnalysisPanelBar addExtraBlkCallback = {this.addExtraBlk}
                  runScriptCallback = {this.runScript}
                  tentativeScript = {this.state.tentativeScript}/>
                  </div>
                  <div hidden={this.state.currentActiveAnalysisPanel !== "MediationPanel"}>
                    <MediationPanel CurrentVariableList = {this.state.CurrentVariableList}
                    updateTentativeScriptCallback = {this.updateTentativeScript}
                    tentativeScript = {this.state.tentativeScript}
                    addExtraBlkCallback = {this.addExtraBlk}/>
                  </div>
                </div>

              </div>
              <div className="right-pane p-2">
                  <Notebook
                    NotebookBlkList = {this.state.NotebookBlkList}
                    addExtraBlkCallback={this.addExtraBlk}
                    gainFocusCallback={this.gainFocus}
                    delBlkCallback = {this.delBlk}
                    updateAEditorValueCallback = {this.updateAEditorValue}
                    runScriptCallback={this.runScript}
                    toggleTEditorCallback = {this.toggleTEditor}
                    updateNotebookBlkStateCallback = {this.updateNotebookBlkState}
                  />  
              </div>
            </div>
         </div>          
      )
  };
}

