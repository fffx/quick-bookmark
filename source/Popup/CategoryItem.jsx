import React, { forwardRef, useEffect } from "react";
import browser from "webextension-polyfill";
import { HiOutlineFolderAdd } from "react-icons/hi";
import { VscAdd, VscRemove } from "react-icons/vsc";
import { SEPARATOR } from "../lib/constants";
import { getCurrentTab } from "../lib/browser";
import { fullTitle } from "../lib/tree";
import { isSameBookmarkUrl } from "../lib/url";

const CategoryItem = forwardRef(function CategoryItem(props, ref) {
  const {
    node,
    focused,
    resortCategoryNodes,
    isLast,
    resorted,
    saveDomainOnly,
  } = props;

  useEffect(() => {
    if (focused) {
      ref?.current?.scrollIntoView({
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

  const removeTabById = (nodeId) => {
    browser.bookmarks.remove(nodeId).then(() => {
      resortCategoryNodes();
      window.close();
    });
  };

  const processBookmark = (targetNode) => {
    const target = targetNode || node;
    getCurrentTab().then(
      (currentTab) => {
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
    if (node.id === "NEW") {
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
    if (node.id === "NEW") {
      return (
        <>
          {node.parentTitle}
          {SEPARATOR}
          <span className="new-folder-name">{node.title} </span>
        </>
      );
    }
    return `${fullTitle(node)} (${node.children.length})`;
  };

  const id = node.id;
  const count = node.children.length;
  const title = node.titlePrefix || node.title;

  const classNames = [];
  if (focused) classNames.push("focus");
  if (id === "NEW") classNames.push("create");
  if (node.containsCurrentTab) classNames.push("contains-current-tab");

  let hintTitle = "";
  if (id === "NEW") {
    hintTitle = `New ${node.title} under ${node.parentTitle} and bookmark current tab to it`;
  } else {
    hintTitle = node.containsCurrentTab
      ? `Remove bookmark from ${node.title}`
      : `Bookmark current tab to ${node.title}`;
  }

  const showSaveDomainOnly = saveDomainOnly && focused && !node.containsCurrentTab;

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
});

export { CategoryItem };
