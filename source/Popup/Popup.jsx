import * as React from 'react';
import CategoryItem from './CategoryItem'
import Pinyin from 'tiny-pinyin'
import Fuse from 'fuse.js'
import browser from 'webextension-polyfill';
import _ from 'lodash';

import './styles.scss';

const filterRecursively = (nodeArray, childrenProperty, filterFn, results, titlePrefix) => {
  results = results || [];

  nodeArray.forEach( function( node ) {
    node.titlePrefix = node.titlePrefix && titlePrefix ? titlePrefix + SEPARATOR + node.titlePrefix : titlePrefix
    if (filterFn(node)) results.push( node );
    
    var nextPrefix = node.id > 0 ?  node.title : ''
    if (node.children) filterRecursively(node.children, childrenProperty, filterFn, results, nextPrefix);
  });

  return results;

};
function triggerClick(element) {

  var categoryId = element.getAttribute("data-id");
  var newCategoryTitle;

  if (categoryId == "NEW") {

    newCategoryTitle = element.getAttribute("data-title");

    browser.bookmarks.create({
      title: newCategoryTitle
    }, function(res) {
      processBookmark(res.id);
    })

  } else {

    processBookmark(categoryId);

  }

}
const createUiElement = (node) => <Item node={node}/>

function processBookmark(categoryId) {

  getCurrentUrlData(function(url, title) {

    if (title && categoryId && url) {
      addBookmarkToCategory(categoryId, title, url);
      window.close();
    }

  });

}

function addBookmarkToCategory(categoryId, title, url) {

  browser.bookmarks.create({
    'parentId': categoryId,
    'title': title,
    'url': url
  });

}
function getCurrentUrlData(callbackFn) {

  browser.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
    callbackFn(tabs[0].url, tabs[0].title)
  });

}


function focusItem(index) {

  if (focusedElement) focusedElement.classList.remove("focus");
  focusedElement = wrapper.childNodes[index];
  focusedElement.classList.add("focus");

  focusedElement.scrollIntoView(false);

}

function addCreateCategoryButton(categoryName) {

  var el = document.createElement("span");
  el.setAttribute("data-id", "NEW");
  el.setAttribute("data-title", categoryName);
  el.classList.add("create");
  el.innerHTML = browser.i18n.getMessage("new") + ": " + categoryName;

  wrapper.appendChild(el);
  currentNodeCount = currentNodeCount + 1;

}



class Popup extends React.Component {
  constructor(props){
    super(props)
    const isSupportPinyin =  Pinyin.isSupported()
    this.state = {
      options: {
        keys: isSupportPinyin ? ['pinyinTitle', 'firstLetter'] : ['title'],
        threshold: 0.1
      },
      isSupportPinyin: isSupportPinyin,
      categoryNodes: []
    }
  }

  onInputChange = (e) => {
    this.delayedFilter(e);
  }
  onRejected = (error) => {
    alert(error)
  }

  resetcategoryNodes(){
    const { options, isSupportPinyin } = this.state
    browser.bookmarks.getTree().then(bookmarkItems => {
      const categoryNodes = filterRecursively(bookmarkItems, "children", function(node) {
        return !node.url && node.id > 0;
      }).sort(function(a, b) {
        return b.dateGroupModified - a.dateGroupModified;
      })
            
      // wrapper.style.width = wrapper.clientWidth + "px";
      let categoryNodesWithPinyin = null
      if(isSupportPinyin){
        categoryNodesWithPinyin = categoryNodes.map( x => {
          // TODO 汉字拼音用空格分开，让模糊搜索更好， 但是这样英语单词也会被分开
          if(x.title.match(/[\u3400-\u9FBF]/)){
            // console.log(x.title)
            x.pinyinTitle = Pinyin.convertToPinyin(x.title, ' ', true)
          } else {
            x.pinyinTitle = x.title
          }
          x.firstLetter = x.pinyinTitle.match(/\b\w/g).join('')
          // console.log(x.pinyinTitle)
          return x;
        });
      }

      this.setState({
        categoryNodes: categoryNodes,
        fuzzySearch: new Fuse(categoryNodesWithPinyin || categoryNodes, options)
      })
    }, this.onRejected)
  }
  componentDidMount(){
    this.delayedFilter = _.debounce( event => {
      const text = event.target.value
      if(text && text.length > 0){
        const filteredNodes = this.state.fuzzySearch.search(event.target.value).map(x => x.item);
        this.setState({categoryNodes: filteredNodes})
      } else {
        this.resetcategoryNodes()
      }
    }, 300);

    // TODO remember last filter?
    this.resetcategoryNodes()
  }

  render(){
    const { categoryNodes } = this.state
    console.log('categoryNodes', categoryNodes.length)
    return (
      <section id="popup">
        <input id="search" placeholder="Filter..." onChange={this.onInputChange}></input>
        <div id="wrapper">
          {categoryNodes.map(node => <CategoryItem node={node} key={node.id}/> )}
        </div>
      </section>
    );
  }
}

// TOOD
/*
 1. Show list

 2. Filter
*/

export default Popup;
