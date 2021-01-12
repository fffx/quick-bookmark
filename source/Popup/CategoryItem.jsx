import * as React from 'react';
import browser from 'webextension-polyfill';
import * as helper from '../helper';

import { HiFolderAdd, HiFolderRemove, HiOutlineFolderAdd, HiOutlineFolderRemove } from "react-icons/hi";

const SEPARATOR = ' / '
export default class CategoryItem extends React.Component {
    constructor(props){
        super(props)
        this.categoryItemRef = React.createRef();
        this.scrollIntoView = helper.debounce(() => {
            this.props.focused && this.categoryItemRef.current.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center'})
        }, 100)

        this.state = {
            containsCurrentTab: false
        }
    }

    clickHandler = (event) => {
        const element = event.target
        const categoryId = element.getAttribute("data-id");
        var newCategoryTitle;

        if (categoryId === "NEW") {
          newCategoryTitle = element.getAttribute("data-title");
          // TODO create under folder
          browser.bookmarks.create({
            title: newCategoryTitle,
            parentId: this.props.node.parentId,
          }).then( (res) => this.processBookmark(res.id) )
        } else {
          this.processBookmark(categoryId);
        }
    }


    processBookmark = (categoryId) => {
        helper.getCurrentUrlData((url, title) => {
          if (title && categoryId && url) {
            browser.bookmarks.create({
                'parentId': categoryId,
                'title': title,
                'url': url
            }).then( () => window.close() )
          }
        });

    }

    componentDidMount(){
        this.scrollIntoView()
    }

    componentDidUpdate(){
        this.scrollIntoView()
        if(this.state.containsCurrentTab){
            // console.log('te...', this.props.resorted)
            if(!this.props.resorted){
                this.props.updateCategoryNode(this.props.index, {containsCurrentTab: true})
            }
        }
        if(!this.props.resorted && this.props.isLast) this.props.resortCategoryNodes()
    }


    renderIcon(){
        const { focused } = this.props
        const { containsCurrentTab } = this.state
        const color = containsCurrentTab ? 'red' : 'inherit'
        const iconProps = {color: color, size: '1.5em'}
        if (focused) {
            return containsCurrentTab ? <HiFolderRemove {...iconProps}/> : <HiFolderAdd {...iconProps}/>
        } else {
            return containsCurrentTab ? <HiOutlineFolderRemove {...iconProps}/>  : <HiOutlineFolderAdd {...iconProps}/>
        } 
    }

    static getDerivedStateFromProps(props, state) {
        const { currentActiveTab}  = props
        if(currentActiveTab && props.node.children.find( x => x.url && helper.compareBookmarkUrl(x.url, currentActiveTab.url)) ){
            return {containsCurrentTab: true}
        } else {
            return {containsCurrentTab: false}
        }
    }


    render(){
        const { node, focused} = this.props
        const { containsCurrentTab } = this.state
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

        if(containsCurrentTab){
            classNames.push('contains-current-tab')
        }
    
        // TODO hove show Delete, Rename, Move
        const hintTitle = containsCurrentTab ? `Remove bookmark from ${node.title}` : `Add bookmark to ${node.title}`
        return (<React.Fragment>
            <span
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
            </span>
        </React.Fragment>)
    }
}
