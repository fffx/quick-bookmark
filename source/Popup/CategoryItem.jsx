import * as React from 'react';
import browser from 'webextension-polyfill';
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
    getCurrentUrlData = (callbackFn) => {
        browser.tabs.query({'active': true, 'currentWindow': true}).then((tabs) => {
          callbackFn(tabs[0].url, tabs[0].title)
        });
    }

    processBookmark = (categoryId) => {
        this.getCurrentUrlData((url, title) => {
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
       this.props.focused && this.categoryItemRef.current.scrollIntoView()
    }

    render(){
        const { node, focused} = this.props
        const { id } = node
        const count = node.children.length
        const title = node.titlePrefix ? node.titlePrefix + SEPARATOR + node.title : node.title;

        // TODO hove show Delete, Rename, Move
        return (<React.Fragment>
            <span 
                ref={this.categoryItemRef}
                data-id={id}
                data-count={count} 
                data-title={title}
                className={`${focused && 'focus'}`}
                style={{paddingRight: '30px'}}
                onClick={this.clickHandler}>
                {title} ({count})
            </span>
        </React.Fragment>)
    }
}