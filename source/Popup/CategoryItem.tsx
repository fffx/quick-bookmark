import React, { forwardRef, memo, useEffect } from "react";
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
  saveDomainOnly: boolean;
  optionId: string;
}

export const CategoryItem = memo(
  forwardRef<HTMLDivElement, CategoryItemProps>(
    function CategoryItem(props, ref) {
      const { node, focused, saveDomainOnly, optionId } = props;

      useEffect(() => {
        if (focused && ref && typeof ref === "object") {
          ref.current?.scrollIntoView({
            behavior: "auto",
            block: "center",
            inline: "center",
          });
        }
      }, [focused, ref]);

      const removeTabById = (nodeId: string) => {
        browser.bookmarks.remove(nodeId).then(() => {
          window.close();
        });
      };

      // Creates each path segment as a nested folder and resolves to the
      // deepest one, which the current tab is then bookmarked into.
      const createNestedFolders = async (
        segments: string[],
        parentId: string,
      ): Promise<Browser.Bookmarks.BookmarkTreeNode> => {
        let currentParentId = parentId;
        for (const segment of segments) {
          const created = await browser.bookmarks.create({
            title: segment,
            parentId: currentParentId,
          });
          currentParentId = created.id;
        }
        return { id: currentParentId, title: "", children: [] };
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
          if (node.path && node.path.length > 1) {
            createNestedFolders(node.path, node.parentId).then(processBookmark);
          } else {
            browser.bookmarks
              .create({
                title: node.title,
                parentId: node.parentId,
              })
              .then(processBookmark);
          }
        } else {
          processBookmark();
        }
      };

      const renderIcon = () => {
        const color = node.containsCurrentTab ? "red" : "inherit";
        const iconProps = {
          color,
          size: "1.5em",
          className: "category-icon",
          "aria-hidden": true,
        };
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

      // Full spoken description for screen readers: the visible title plus the
      // action the row performs (aria-label replaces the read-out text).
      const ariaLabel = isNewFolderNode(node)
        ? `Create new folder ${node.title} under ${node.parentTitle} and bookmark the current tab to it`
        : node.containsCurrentTab
          ? `Remove current tab bookmark from ${fullTitle(node)}. Contains ${count} bookmark${count === 1 ? "" : "s"}`
          : `Bookmark current tab to ${fullTitle(node)}. Contains ${count} bookmark${count === 1 ? "" : "s"}`;

      return (
        <div
          ref={ref}
          id={optionId}
          role="option"
          aria-selected={focused}
          aria-label={ariaLabel}
          data-id={`${id}-${title}`}
          title={hintTitle}
          data-count={count}
          data-title={title}
          data-path={isNewFolderNode(node) ? node.path?.join("/") : undefined}
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
  ),
);
