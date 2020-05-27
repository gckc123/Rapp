import React, {Component} from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-xcode";
import './Notebook.css';
import CircularProgress from '@material-ui/core/CircularProgress';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import IconButton from '@material-ui/core/IconButton';
import { withStyles } from '@material-ui/core/styles';

const StyledIconButton = withStyles({
    root: {
        '&:hover': {
            color: '#40a9ff',
            opacity: 1,
        },
        '&:focus': {
            outline: 'none',
        },
    },
})(IconButton);

//NEED TO ADD TITLE AND EDITORHTML TO APP.JS STATE 27.5.2020


export class NotebookBlk extends Component {

    constructor(props){
        super(props)
        this.state = {
            Script: "",
            Title: "--- Analysis Title Here ---",
            editorHTML: "",
        }
    }

    TEditorModules = {
        toolbar: [
          [{ 'header': [1, 2, false] }],
          ['bold', 'italic', 'underline','strike'],
          [{ 'script': 'sub'}, { 'script': 'super' }], 
          [{'list': 'ordered'}, {'list': 'bullet'}],
          [{ 'color': [] }, { 'background': [] }],  
          ['link', 'image'],
          [{ 'align': [] }],
          ['clean']    
        ],
      }

    componentDidMount() {
        this.setState({Script: this.props.Script})
    }

    onLoad = (editor) => {
        editor.on('change',(arg, activeEditor) => {
            const AEditor = activeEditor;
            const newHeight = AEditor.getSession().getScreenLength() *
            (AEditor.renderer.lineHeight) + AEditor.renderer.scrollBar.getWidth() + 20;
            AEditor.container.style.height = `${newHeight}px`;
            AEditor.resize();
        })
        //Update the size immediately if the editor is initialised with codes.
        let AEditor = editor;
        let newHeight = AEditor.getSession().getScreenLength() *
        (AEditor.renderer.lineHeight) + AEditor.renderer.scrollBar.getWidth() + 20;
        AEditor.container.style.height = `${newHeight}px`;
        AEditor.resize();
    }
    
    onAEBlur = (e, editor) => {
        this.props.updateAEditorValueCallback(this.props.index, this.state.Script, false)
    }

    updateAndRun = () => {
        this.props.updateAEditorValueCallback(this.props.index, this.state.Script, true);
    }

    onAEChange = (newValue) => {
        this.setState({Script: newValue})
    }

    onTitleChange = (event) => {
        this.setState({Title: event.target.value})
    }

    onTEChange = (html) => {
        this.setState({editorHTML: html})
    }

    render() {
        
        return (
            <div className={`pt-2 pb-2 pr-2 pl-5 notebook-block mt-2 ${this.props.Active ? "active-block" : "inactive-block"}`}
                onClick={() => this.props.gainFocusCallback(this.props.index)}>
                    <div className="notebook-title-grid" style={{width: this.props.ElementWidth}}>
                        <div><input value={this.state.Title} className="titleEdit" onChange={(event) => this.onTitleChange(event)}
                        /></div>
                        <div style={{float: "right"}}><CircularProgress style={{color: "#40a9ff"}} 
                        size={14} hidden={!this.props.Busy}/></div>
                        <div><StyledIconButton size="small" onClick={()=>{this.props.toggleEditorCallback(this.props.index)}}><FontAwesomeIcon icon={faEdit} /></StyledIconButton></div>                        
                    </div>
                    <AceEditor 
                    value = {this.state.Script}
                    onLoad={this.onLoad}
                    height="18px"
                    width={`${this.props.ElementWidth}px`}
                    fontSize={15}   
                    mode="python"
                    theme="xcode"
                    onChange={this.onAEChange}
                    onBlur={this.onAEBlur}
                    commands={[{   
                        name: 'runScript', 
                        bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'}, 
                        exec: this.updateAndRun
                      }]}                        
                    name={this.props.NotebookBlkID} 
                    editorProps={{ $blockScrolling: true }}
                    />
                    <div className="ROutputText p-2">
                        {
                            this.props.ROutput.map( (output, index) =>                                 
                                <code className={output.OutputType} key={index}>{output.Output}</code>                                
                            )
                        }
                    </div>          
                    <div style={{width: this.props.ElementWidth}} hidden={!this.props.showEditor}>
                        <ReactQuill
                            theme="snow"
                            modules={this.TEditorModules}
                            onChange={this.onTEChange}
                            value={this.state.editorHTML}
                            placeholder="--- Your Notes Here ---"                            
                        />

                    </div>              
            </div>
        )
    }
}