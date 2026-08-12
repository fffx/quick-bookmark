export const removeHashtag = (url: string): string => url.split("#")[0];

export const isSameBookmarkUrl = (
  url1: string | null | undefined,
  url2: string | null | undefined,
): boolean => {
  if (!url1 || !url2) return false;
  return removeHashtag(url1) === removeHashtag(url2);
};
