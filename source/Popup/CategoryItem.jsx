import * as React from 'react';
import browser from 'webextension-polyfill';
import * as helper from '../helper';
const SEPARATOR = ' / '
export default class CategoryItem extends React.Component {
    constructor(props){
        super(props)
        this.categoryItemRef = React.createRef();

        this.state = {
            active: false
        }
    }

    clickHandler = (event) => {
        const element = event.target
        const categoryId = element.getAttribute("data-id");
        var newCategoryTitle;
      
        if (categoryId === "NEW") {
          newCategoryTitle = element.getAttribute("data-title");
          browser.bookmarks.create({
            title: newCategoryTitle
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
        this.props.focused && this.categoryItemRef.current.scrollIntoView(false)
    }

    componentDidMount(){
        this.scrollIntoView(true)
        if(this.props.currentActiveTab && this.props.node.children.find( x => x.url === this.props.currentActiveTab.url)){
            this.setState({containsCurrentTab: true})
        }
    }

    componentDidUpdate(){
        this.scrollIntoView(true)
    }



    // static getDerivedStateFromProps(props, state) {
        
    // }
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
                {id === 'NEW' && 'New: '} {title} {id === 'NEW' ? '' : ` (${count})`}
            </span>
        </React.Fragment>)
    }
}