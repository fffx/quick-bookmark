import browser from 'webextension-polyfill';

export function debounce(func, wait = 200) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, wait);
    };
}


// TODO change this to promise
export const getCurrentUrlData = (callbackFn) => {
    browser.tabs.query({'active': true, 'currentWindow': true}).then((tabs) => {
      callbackFn(tabs[0].url, tabs[0].title)
    });
}

export const removeHashtag = url => url.split('#')[0]
export const compareBookmarkUrl = (url1, url2) => {
  if(!url1 || !url2) return false 
  return removeHashtag(url1) === removeHashtag(url2)
}
