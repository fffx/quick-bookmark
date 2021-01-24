import * as React from 'react';
import browser from 'webextension-polyfill';
import * as helper from '../helper';

import { 
    HiOutlineFolderAdd, HiOutlineFolderRemove 
} from "react-icons/hi";

import { VscDiffAdded, VscDiffRemoved, VscAdd, VscRemove } from 'react-icons/vsc'

const SEPARATOR = ' / '
export default class CategoryItem extends React.Component {
    constructor(props){
        super(props)
        this.categoryItemRef = React.createRef();
        this.scrollIntoView = helper.debounce(() => {
            this.props.focused && this.categoryItemRef.current.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center'})
        }, 100)

        this.state = {
            // containsCurrentTab: false
        }
    }

    clickHandler = (event) => {        
        if (this.props.node.id === "NEW") {
            browser.bookmarks.create({
                title: this.props.node.title,
                parentId: this.props.node.parentId,
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
                browser.bookmarks.create({
                    'parentId': targetNode.id,
                    'title': currentTab.title,
                    'url': currentTab.url
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


    renderIcon(){
        const { focused, node } = this.props
        const color = node.containsCurrentTab ? 'red' : 'inherit'
        const iconProps = {color: color, size: '1.5em'}
        if(node.id === 'NEW'){
            return focused ? <HiOutlineFolderAdd {...iconProps}/> : <HiOutlineFolderAdd {...iconProps}/>
        } else if(focused) {
            return node.containsCurrentTab ? <VscDiffRemoved {...iconProps}/> : <VscDiffAdded {...iconProps}/>
        } else {
            return node.containsCurrentTab ? <VscRemove {...iconProps}/> : <VscAdd {...iconProps}/>
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
        const { node, focused } = this.props

        const { id } = node
        const count = node.children.length
        const title = node.titlePrefix || node.title;
        let classNames = []

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
        const hintTitle = node.containsCurrentTab ? `Remove bookmark from ${node.title}` : `Add bookmark to ${node.title}`
        return (<span
            ref={this.categoryItemRef}
            data-id={id}
            title={hintTitle}
            data-count={count}
            data-title={title}
            className={classNames.join(' ')}
            onClick={this.clickHandler}>
            <span className="node-icon">
                {this.renderIcon()}
            </span>
            {id === 'NEW' ? `New: "${title}"` : title} {id === 'NEW' ? `under "${node.parentTitle}"` : ` (${count})`}
        </span>)
    }
}
