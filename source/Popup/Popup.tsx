import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import browser from "webextension-polyfill";
import { CategoryItem } from "./CategoryItem";
import FuseIndex from "./searchEngine";
import { loadBookmarkFolders } from "./loadBookmarks";
import {
  buildSearchResults,
  getVisibleWindow,
  isNewFolderNode,
} from "./searchQuery";
import type { CategoryNode } from "./searchQuery";
import type { BookmarkTreeNode, FolderNode } from "../lib/tree";
import { debounce } from "../lib/debounce";

import "./styles.scss";

// Synchronous part of pinyin support detection: false when the user has no
// Chinese locale preference, null when tiny-pinyin must be loaded to finish
// the isSupported() check. Keeping the import off the critical path keeps the
// popup bundle small for non-Chinese users.
const needsPinyinCheck = (): boolean | null => {
  const userLanguages = navigator.languages || [navigator.language];
  const isChinesePreferred = userLanguages.some((lang) =>
    lang.toLowerCase().startsWith("zh"),
  );
  return isChinesePreferred ? null : false;
};

export interface PopupProps {
  maxVisibleItems?: number;
}

export default function Popup({ maxVisibleItems = 50 }: PopupProps) {
  // null while tiny-pinyin is being loaded for the isSupported() check.
  const [isSupportPinyin, setIsSupportPinyin] = useState<boolean | null>(
    needsPinyinCheck,
  );
  // Complete, sorted folder list. Used to build the search index.
  const [allFolderNodes, setAllFolderNodes] = useState<FolderNode[]>([]);
  // Currently displayed items (full list or search results).
  const [categoryNodes, setCategoryNodes] = useState<CategoryNode[]>([]);
  const [rootNodes, setRootNodes] = useState<BookmarkTreeNode[]>([]);
  const [cursor, setCursor] = useState(0);
  const [saveDomainOnly, setSaveDomainOnly] = useState(false);

  const focusedCategoryItem = useRef<HTMLDivElement | null>(null);
  const filterInput = useRef<HTMLInputElement | null>(null);

  // Lazy Fuse index, rebuilt whenever the folder list changes.
  const searchIndex = useMemo(
    () => new FuseIndex(allFolderNodes, isSupportPinyin === true),
    [allFolderNodes, isSupportPinyin],
  );

  // Finish the pinyin check by loading tiny-pinyin on demand (Chinese users).
  useEffect(() => {
    if (isSupportPinyin !== null) return;
    let cancelled = false;
    import("tiny-pinyin").then(({ default: Pinyin }) => {
      if (!cancelled) setIsSupportPinyin(Pinyin.isSupported());
    });
    return () => {
      cancelled = true;
    };
  }, [isSupportPinyin]);

  const initBookmarkNodes = useCallback(async () => {
    if (isSupportPinyin === null) return;
    const { folderNodes, rootNodes } = await loadBookmarkFolders({
      isSupportPinyin,
    });
    setAllFolderNodes(folderNodes);
    setRootNodes(rootNodes);
    setCategoryNodes(folderNodes);
    setCursor((prev) => (folderNodes.length > prev ? prev : 0));
  }, [isSupportPinyin]);

  const handleSearchInput = useCallback(
    (text: string) => {
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
    debounce((text: string) => handleSearchInputRef.current(text), 80),
  );

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onSearchInput.current(e.target.value);
  }, []);

  // https://stackoverflow.com/questions/42036865/react-how-to-navigate-through-list-by-arrow-keys
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
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

  const onKeyUp = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Alt") {
      setSaveDomainOnly(false);
    }
  }, []);

  useEffect(() => {
    initBookmarkNodes();
  }, [initBookmarkNodes]);

  // Re-apply the search once the folder list has loaded, in case the user
  // typed before the bookmarks (and thus the search index) were ready. The
  // search index is rebuilt when allFolderNodes changes.
  useEffect(() => {
    const text = filterInput.current?.value ?? "";
    if (text) {
      const { categoryNodes, cursor } = buildSearchResults(text, {
        rootNodes,
        search: searchIndex,
      });
      setCategoryNodes(categoryNodes);
      setCursor(cursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFolderNodes]);

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
              // A path search offers a nested and a flat NEW option under the
              // same root; include the nested path so their keys stay unique.
              key={`${node.id}-${node.parentId}-${
                isNewFolderNode(node) ? (node.path?.join("/") ?? "") : ""
              }`}
              focused={cursor === index}
              saveDomainOnly={saveDomainOnly}
              ref={cursor === index ? focusedCategoryItem : null}
            />
          );
        })}
      </div>
    </section>
  );
}
