import * as React from 'react';
import browser from 'webextension-polyfill';
const SEPARATOR = ' / '
export default class CategoryItem extends React.Component {
    constructor(props){
        super(props)
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
    render(){
        const node = this.props.node
        const { id } = node
        const count = node.children.length
        const title = node.titlePrefix ? node.titlePrefix + SEPARATOR + node.title : node.title;

        return (<span data-id={id} data-count={count} data-title={title} onClick={this.clickHandler}>
            {title}
        </span>)
    }
}