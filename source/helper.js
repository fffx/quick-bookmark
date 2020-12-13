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

export const getCurrentUrlData = (callbackFn) => {
    browser.tabs.query({'active': true, 'currentWindow': true}).then((tabs) => {
      callbackFn(tabs[0].url, tabs[0].title)
    });
}

