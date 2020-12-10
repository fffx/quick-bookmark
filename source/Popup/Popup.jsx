import * as React from 'react';
import Item from './Item'
import browser from 'webextension-polyfill';

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

function createUiFromNodes( categoryNodes ) {

  var categoryUiElements = [];
  currentNodeCount = categoryNodes.length;

  categoryNodes.forEach( function( node ) {
    categoryUiElements.push( createUiElement(node) );
  })

  categoryUiElements.forEach( function( element ) {
    wrapper.appendChild( element );
  });

};

function resetUi() {

  wrapper.innerHTML = "";

};


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

function addCreateCategoryButton(categoryName) {

  var el = document.createElement("span");
  el.setAttribute("data-id", "NEW");
  el.setAttribute("data-title", categoryName);
  el.classList.add("create");
  el.innerHTML = browser.i18n.getMessage("new") + ": " + categoryName;

  wrapper.appendChild(el);
  currentNodeCount = currentNodeCount + 1;

}

function createInitialTree() {

  browser.bookmarks.getTree( function(t) {

    wrapper = document.getElementById("wrapper");

    var options = {
      keys: ['pinyinTitle', 'firstLetter'],
      threshold: 0.1
    }
    
    categoryNodes = filterRecursively(t, "children", function(node) {
      return !node.url && node.id > 0;
    }).sort(function(a, b) {
      return b.dateGroupModified - a.dateGroupModified;
    })

    createUiFromNodes( categoryNodes );

    wrapper.style.width = wrapper.clientWidth + "px";

    if (currentNodeCount > 0) focusItem(0);

    if(Pinyin.isSupported()){
      categoryNodes = categoryNodes.map( x => {
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
    fuzzySearch = new Fuse(categoryNodes, options);

    wrapper.addEventListener("click", function(e) {
      triggerClick(e.target);
    })

  });

}
const Popup = () => {
  return (
    <section id="popup">
      <input id="search" placeholder="Filter..."></input>
      <div id="wrapper">

      </div>
    </section>
  );
};

// TOOD
/*
 1. Show list

 2. Filter
*/

export default Popup;
