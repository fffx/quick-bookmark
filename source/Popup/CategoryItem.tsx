import React, { forwardRef, useEffect } from "react";
import type Browser from "webextension-polyfill";
import browser from "webextension-polyfill";
import { HiOutlineFolderAdd } from "react-icons/hi";
import { VscAdd, VscRemove } from "react-icons/vsc";
import { SEPARATOR } from "../lib/constants";
import { getCurrentTab } from "../lib/browser";
import { fullTitle } from "../lib/tree";
import { isSameBookmarkUrl } from "../lib/url";
import { isNewFolderNode } from "./searchQuery";
import type { CategoryNode } from "./searchQuery";

export interface CategoryItemProps {
  node: CategoryNode;
  focused: boolean;
  resortCategoryNodes: () => void;
  isLast: boolean;
  resorted: boolean;
  saveDomainOnly: boolean;
}

export const CategoryItem = forwardRef<HTMLDivElement, CategoryItemProps>(
  function CategoryItem(props, ref) {
    const {
      node,
      focused,
      resortCategoryNodes,
      isLast,
      resorted,
      saveDomainOnly,
    } = props;

    useEffect(() => {
      if (focused && ref && typeof ref === "object") {
        ref.current?.scrollIntoView({
          behavior: "auto",
          block: "center",
          inline: "center",
        });
      }
      // Resorts after all items have been rendered, so folders containing the
      // current tab bubble to the top.
      if (!resorted && isLast) {
        resortCategoryNodes();
      }
    });

    const removeTabById = (nodeId: string) => {
      browser.bookmarks.remove(nodeId).then(() => {
        resortCategoryNodes();
        window.close();
      });
    };

    const processBookmark = (
      targetNode?: Browser.Bookmarks.BookmarkTreeNode,
    ) => {
      const target = targetNode || node;
      getCurrentTab().then(
        (currentTab) => {
          if (!currentTab?.url) return;
          // If the folder already contains the current tab, remove it instead.
          const bookmarkNode = target?.children?.find((x) =>
            isSameBookmarkUrl(x.url, currentTab.url),
          );
          if (bookmarkNode) {
            removeTabById(bookmarkNode.id);
            return;
          }

          const urlObject = new URL(currentTab.url);
          browser.bookmarks
            .create({
              parentId: target.id,
              title: saveDomainOnly ? urlObject.hostname : currentTab.title,
              url: saveDomainOnly
                ? `${urlObject.protocol}//${urlObject.hostname}`
                : currentTab.url,
            })
            .then(() => window.close());
        },
        (error) => console.log(error),
      );
    };

    const clickHandler = () => {
      if (isNewFolderNode(node)) {
        browser.bookmarks
          .create({
            title: node.title,
            parentId: node.parentId,
          })
          .then(processBookmark);
      } else {
        processBookmark();
      }
    };

    const renderIcon = () => {
      const color = node.containsCurrentTab ? "red" : "inherit";
      const iconProps = { color, size: "1.5em", className: "category-icon" };
      if (node.id === "NEW") {
        return <HiOutlineFolderAdd {...iconProps} />;
      }
      return node.containsCurrentTab ? (
        <VscRemove {...iconProps} />
      ) : (
        <VscAdd {...iconProps} />
      );
    };

    const renderTitle = () => {
      if (isNewFolderNode(node)) {
        return (
          <>
            {node.parentTitle}
            {SEPARATOR}
            <span className="new-folder-name">{node.title} </span>
          </>
        );
      }
      return `${fullTitle(node)} (${node.children?.length ?? 0})`;
    };

    const id = node.id;
    const count = node.children?.length ?? 0;
    const title = node.titlePrefix || node.title;

    const classNames: string[] = [];
    if (focused) classNames.push("focus");
    if (id === "NEW") classNames.push("create");
    if (node.containsCurrentTab) classNames.push("contains-current-tab");

    let hintTitle = "";
    if (isNewFolderNode(node)) {
      hintTitle = `New ${node.title} under ${node.parentTitle} and bookmark current tab to it`;
    } else {
      hintTitle = node.containsCurrentTab
        ? `Remove bookmark from ${node.title}`
        : `Bookmark current tab to ${node.title}`;
    }

    const showSaveDomainOnly =
      saveDomainOnly && focused && !node.containsCurrentTab;

    return (
      <div
        ref={ref}
        data-id={`${id}-${title}`}
        title={hintTitle}
        data-count={count}
        data-title={title}
        className={classNames.join(" ")}
        onClick={clickHandler}
      >
        {renderIcon()}
        {renderTitle()}
        {showSaveDomainOnly && (
          <>
            <br />
            <span className="small" style={{ marginLeft: "1rem" }}>
              {" "}
              Save Domain
            </span>
          </>
        )}
      </div>
    );
  },
);
