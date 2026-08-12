import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import browser from "webextension-polyfill";
import Pinyin from "tiny-pinyin";
import { CategoryItem } from "./CategoryItem";
import FuseIndex from "./searchEngine";
import { loadBookmarkFolders } from "./loadBookmarks";
import { buildSearchResults, getVisibleWindow } from "./searchQuery";
import { debounce } from "../lib/debounce";
import { sortNodes } from "../lib/tree";

import "./styles.scss";

// Only enable Pinyin if Chinese is in the user's preferred languages.
const detectPinyinSupport = () => {
  const userLanguages = navigator.languages || [navigator.language];
  const isChinesePreferred = userLanguages.some((lang) =>
    lang.toLowerCase().startsWith("zh"),
  );
  return isChinesePreferred && Pinyin.isSupported();
};

export default function Popup({ maxVisibleItems = 50 }) {
  const [isSupportPinyin] = useState(detectPinyinSupport);
  // Complete, sorted folder list. Used to build the search index.
  const [allFolderNodes, setAllFolderNodes] = useState([]);
  // Currently displayed items (full list or search results).
  const [categoryNodes, setCategoryNodes] = useState([]);
  const [rootNodes, setRootNodes] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [saveDomainOnly, setSaveDomainOnly] = useState(false);
  const [resorted, setResorted] = useState(false); // resort after child check

  const focusedCategoryItem = useRef(null);
  const filterInput = useRef(null);

  // Lazy Fuse index, rebuilt whenever the folder list changes.
  const searchIndex = useMemo(
    () => new FuseIndex(allFolderNodes, isSupportPinyin),
    [allFolderNodes, isSupportPinyin],
  );

  const initBookmarkNodes = useCallback(async () => {
    const { folderNodes, rootNodes } = await loadBookmarkFolders({
      isSupportPinyin,
    });
    setAllFolderNodes(folderNodes);
    setRootNodes(rootNodes);
    setCategoryNodes(folderNodes);
    setCursor((prev) => (folderNodes.length > prev ? prev : 0));
  }, [isSupportPinyin]);

  const handleSearchInput = useCallback(
    (text) => {
      if (!text) {
        initBookmarkNodes();
        return;
      }
      const { categoryNodes, cursor } = buildSearchResults(text, {
        rootNodes,
        search: searchIndex,
      });
      setCategoryNodes(categoryNodes);
      setCursor(cursor);
    },
    [rootNodes, searchIndex, initBookmarkNodes],
  );

  // Debounce is created once; it always calls the latest handler.
  const handleSearchInputRef = useRef(handleSearchInput);
  useEffect(() => {
    handleSearchInputRef.current = handleSearchInput;
  }, [handleSearchInput]);
  const onSearchInput = useRef(
    debounce((text) => handleSearchInputRef.current(text), 150),
  );

  const onInputChange = useCallback((e) => {
    onSearchInput.current(e.target.value);
  }, []);

  const resortCategoryNodes = useCallback(() => {
    setResorted(true);
    setCategoryNodes((nodes) => [...nodes].sort(sortNodes));
  }, []);

  // https://stackoverflow.com/questions/42036865/react-how-to-navigate-through-list-by-arrow-keys
  const onKeyDown = useCallback(
    (e) => {
      if (e.altKey) {
        setSaveDomainOnly(true);
      }
      // arrow up/down button should select next/previous list element
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor(cursor > 0 ? cursor - 1 : categoryNodes.length - 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor(cursor < categoryNodes.length - 1 ? cursor + 1 : 0);
      } else if (e.key === "Enter" || e.key === "Delete") {
        focusedCategoryItem.current?.click();
      }
    },
    [cursor, categoryNodes.length],
  );

  const onKeyUp = useCallback((e) => {
    if (e.key === "Alt") {
      setSaveDomainOnly(false);
    }
  }, []);

  useEffect(() => {
    initBookmarkNodes();
  }, [initBookmarkNodes]);

  useEffect(() => {
    const focusSearchInput = () => filterInput.current?.focus();
    browser.windows.onFocusChanged.addListener(focusSearchInput);
    return () =>
      browser.windows.onFocusChanged.removeListener?.(focusSearchInput);
  }, []);

  const { visibleNodes, startIndex } = getVisibleWindow(
    categoryNodes,
    cursor,
    maxVisibleItems,
  );

  return (
    <section id="popup">
      <input
        id="search"
        ref={filterInput}
        placeholder="Filter ..."
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onChange={onInputChange}
        autoComplete="off"
        onBlur={({ target }) => target.focus()}
        autoFocus={true}
      ></input>
      <div id="wrapper">
        {visibleNodes.map((node, visibleIndex) => {
          const index = startIndex + visibleIndex;
          return (
            <CategoryItem
              node={node}
              key={`${node.id}-${node.parentId}`}
              focused={cursor === index}
              resortCategoryNodes={resortCategoryNodes}
              isLast={index === categoryNodes.length - 1}
              resorted={resorted}
              saveDomainOnly={saveDomainOnly}
              ref={cursor === index ? focusedCategoryItem : null}
            />
          );
        })}
      </div>
    </section>
  );
}
