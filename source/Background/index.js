import 'emoji-log';
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