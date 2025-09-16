import * as React from 'react';
import browser from 'webextension-polyfill';
import * as helper from '../helper';
// import ReactTypingEffect from 'react-typing-effect';

import {
    HiOutlineFolderAdd
} from "react-icons/hi";

import { VscAdd, VscRemove } from 'react-icons/vsc'

// const SEPARATOR = <span className="separator"> </span>
const SEPARATOR = ' / '
class CategoryItem extends React.Component {
    constructor(props){
        super(props)
        this.categoryItemRef = React.createRef();
        this.scrollIntoView = helper.debounce(() => {
            this.props.focused && this.categoryItemRef.current.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center'})
        }, 50)

        this.state = {
            // containsCurrentTab: false
        }
    }

    clickHandler = (event) => {
        if (this.props.node.id === "NEW") {
            browser.bookmarks.create({
                title: this.props.node.title,
                parentId: this.props.node.parentId,
                index: 0
            }).then((newNode) => this.processBookmark(newNode) )
        } else {
            this.processBookmark();
        }
    }

    removeTabById(nodeId){
        browser.bookmarks.remove(nodeId).then( () => {
            this.props.resortCategoryNodes()
            window.close()
        })
    }


    processBookmark = (targetNode) => {
        targetNode = targetNode || this.props.node
        helper.getCurrentTab().then( currentTab => {
            // newNode have none children
            var bookmarkNode = targetNode?.children?.find(x => helper.isSameBookmarkUrl(x.url, currentTab.url))
            if(bookmarkNode){
                return this.removeTabById(bookmarkNode.id)
            }else{
                const urlObject = new URL(currentTab.url);
                browser.bookmarks.create({
                    'parentId': targetNode.id,
                    'title': this.props.saveDomainOnly ? urlObject.hostname : currentTab.title,
                    'url': this.props.saveDomainOnly ? `${urlObject.protocol}//${urlObject.hostname}` : currentTab.url
                }).then( () => window.close() )
            }
        }, (error) => console.log(error));

    }

    componentDidMount(){
        this.scrollIntoView()
    }

    componentDidUpdate(){
        this.scrollIntoView()
        if(!this.props.resorted && this.props.isLast) this.props.resortCategoryNodes()
    }


    renderIcon(node){
        const { focused } = this.props
        const color = node.containsCurrentTab ? 'red' : 'inherit'
        const iconProps = {color: color, size: '1.5em', className: "category-icon"}
        if(node.id === 'NEW'){
            return focused ? <HiOutlineFolderAdd {...iconProps}/> : <HiOutlineFolderAdd {...iconProps}/>
        } else {
            return node.containsCurrentTab ? <VscRemove {...iconProps}/> : <VscAdd {...iconProps}/>
        }
    }

    renderTitle(node){
        if(node.id === 'NEW'){
            return (<> {node.parentTitle}{SEPARATOR}<span className="new-folder-name">{node.title} </span> </>)
        } else {
            return `${node.titlePrefix || node.title} (${node.children.length})`
        }
    }

/*
    static getDerivedStateFromProps(props, state) {
        const { currentActiveTab}  = props
        if(currentActiveTab && props.node.children.find( x => x.url && helper.isSameBookmarkUrl(x.url, currentActiveTab.url)) ){
            return {containsCurrentTab: true}
        } else {
            return {containsCurrentTab: false}
        }
    } */



    render(){
        const { node, focused, saveDomainOnly } = this.props

        const { id } = node
        const count = node.children.length
        const title = node.titlePrefix || node.title;
        let classNames = []

        const showSaveDomainOnly = saveDomainOnly && focused && !node.containsCurrentTab
        if(focused){
            classNames.push('focus')
        }
        if(id === 'NEW') {
            classNames.push('create')
        }

        if(node.containsCurrentTab){
            classNames.push('contains-current-tab')
        }

        // TODO hove show Delete, Rename, Move
        let hintTitle = ""
        if(id === "NEW") {
            `New ${node.title} under ${node.parentTitle} and bookmark current tab to it`
        } else {
            node.containsCurrentTab ? `Remove bookmark from ${node.title}` : `Bookmark current tab to ${node.title}`
        }
        return (<div
            ref={this.categoryItemRef}
            data-id={`${id}-${title}`}
            title={hintTitle}
            data-count={count}
            data-title={title}
            className={classNames.join(' ')}
            onClick={this.clickHandler}>
                {this.renderIcon(node)}
                {this.renderTitle(node)}
                {showSaveDomainOnly && <> <br/> <span className="small" style={{marginLeft: "1rem"}}> Save Domain</span> </>}
        </div>)
    }
}


export {SEPARATOR, CategoryItem}
