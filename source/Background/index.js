import 'emoji-log';
import * as helper from '../helper';
import browser from 'webextension-polyfill';

// browser.runtime.onInstalled.addListener(() => {
//   console.emoji('🦄', 'extension installed');
// });


// browser.runtime.onMessage.addListener(
//   function(request, sender, sendResponse) {
//     // read `newIconPath` from request and read `tab.id` from sender
//     chrome.browserAction.setIcon({
//         path: request.newIconPath,
//         tabId: sender.tab.id
//     });
// });
var currentTab;
var currentBookmark;

/*
 * Updates the browserAction icon to reflect whether the current page
 * is already bookmarked.
 */
/* function updateIcon() {
  browser.browserAction.setIcon({
    path: currentBookmark ? {
      19: "icons/star-filled-19.png",
      38: "icons/star-filled-38.png"
    } : {
      19: "icons/star-empty-19.png",
      38: "icons/star-empty-38.png"
    },
    tabId: currentTab.id
  });
  */
 
 function updateBadge(currentTab, bookmarks){ 
  //  browser.browserAction.set Title({
  //    title: currentBookmark ? 'Unbookmark it!' : 'Bookmark it!',
  //    tabId: currentTab.id
  //  }); 
  const text =  bookmarks.length > 0 ? `${bookmarks.length}` : ''
  browser.browserAction.setBadgeText({
    tabId: currentTab.id,
    text: text
  })
}

/*
 * Switches currentTab and currentBookmark to reflect the currently active tab
 */
function updateActiveTab() {
  console.log("updateActiveTab ---------------")
  /*   
  function isSupportedProtocol(urlString) {
    var supportedProtocols = ["https:", "http:", "ftp:", "file:"];
    var url = document.createElement('a');
    url.href = urlString;
    return supportedProtocols.indexOf(url.protocol) != -1;
  }
 */
  function updateTab(tabs) {
    console.log("updateTabs", tabs)
    if (tabs[0]) {
      currentTab = tabs[0];
      
      browser.bookmarks.getTree().then(bookmarkItems => {
        let bookmarks = []  
        const filter = (node) => { 
          if(node.url){ 
            helper.compareBookmarkUrl(currentTab.url, node.url) && bookmarks.push(node)
          } else {
            node.children.forEach(x => filter(x) )
          }
         }
        bookmarkItems.forEach( x=> filter(x) )
        updateBadge(currentTab, bookmarks);
      })
    }
  }
  
  var gettingActiveTab = browser.tabs.query({active: true, currentWindow: true});
  gettingActiveTab.then(updateTab);
}

// listen for bookmarks being created
browser.bookmarks.onCreated.addListener(updateActiveTab);

// listen for bookmarks being removed
browser.bookmarks.onRemoved.addListener(updateActiveTab);

// listen to tab URL changes
browser.tabs.onUpdated.addListener(updateActiveTab);

// listen to tab switching
browser.tabs.onActivated.addListener(updateActiveTab);

// listen for window switching
browser.windows.onFocusChanged.addListener(updateActiveTab);

// update when the extension loads initially
updateActiveTab()