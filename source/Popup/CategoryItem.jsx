import * as React from 'react';
import browser from 'webextension-polyfill';
import * as helper from '../helper';
const SEPARATOR = ' / '
export default class CategoryItem extends React.Component {
    constructor(props){
        super(props)
        this.categoryItemRef = React.createRef();

        this.state = {
            containsCurrentTab: false,
            active: false
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

    scrollIntoView = () => {
        this.props.focused && this.categoryItemRef.current.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center'})
    }

    componentDidMount(){
        this.scrollIntoView()
    }

    componentDidUpdate(){
        this.scrollIntoView()
        if(this.state.containsCurrentTab){
            console.log('te...', this.props.resorted)
            if(!this.props.resorted){
                this.props.updateCategoryNode(this.props.index, {containsCurrentTab: true})
            }
        }
        if(!this.props.resorted && this.props.isLast) this.props.resortCategoryNodes()
    }



    static getDerivedStateFromProps(props, state) {
        const { currentActiveTab}  = props
        if(currentActiveTab && props.node.children.find( x => x.url === currentActiveTab.url)){
            return {containsCurrentTab: true}
        }
        return null
    }


    render(){
        const { node, focused} = this.props
        const { containsCurrentTab } = this.state
        const { id } = node
        const count = node.children.length
        const title = node.titlePrefix ? node.titlePrefix + SEPARATOR + node.title : node.title;
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
        return (<React.Fragment>
            <span 
                ref={this.categoryItemRef}
                data-id={id}
                data-count={count} 
                data-title={title}
                className={classNames.join(' ')}
                onClick={this.clickHandler}>
                {id === 'NEW' && 'New: '} "{title}" {id === 'NEW' ? `under "${node.parentTitle}"` : ` (${count})`}
            </span>
        </React.Fragment>)
    }
}