export const removeHashtag = (url) => url.split("#")[0];

export const isSameBookmarkUrl = (url1, url2) => {
  if (!url1 || !url2) return false;
  return removeHashtag(url1) === removeHashtag(url2);
};
