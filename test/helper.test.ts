import { describe, it, expect } from "vitest";
import { filterRecursively, sortNodes } from "../source/lib/tree";
import { debounce } from "../source/lib/debounce";
import { getBrowserName, getCurrentTab } from "../source/lib/browser";
import { removeHashtag, isSameBookmarkUrl } from "../source/lib/url";

describe("helper functions", () => {
  describe("filterRecursively", () => {
    it("should filter nodes recursively", () => {
      const nodes = [
        {
          id: "1",
          title: "Folder 1",
          children: [
            { id: "2", title: "Subfolder", children: [] },
            { id: "3", title: "Bookmark", url: "https://example.com" },
          ],
        },
        {
          id: "4",
          title: "Folder 2",
          children: [],
        },
      ];

      const result = filterRecursively(nodes, null, (node) => !node.url);

      expect(result).toHaveLength(3);
      expect(result.map((n) => n.id)).toEqual(["1", "2", "4"]);
    });

    it("should set titlePrefix and dirPath correctly", () => {
      const nodes = [
        {
          id: "1",
          title: "Parent",
          children: [{ id: "2", title: "Child", children: [] }],
        },
      ];

      const result = filterRecursively(nodes, null, () => true);

      expect(result[0].titlePrefix).toBeNull();
      expect(result[1].titlePrefix).toBe("Parent");
    });
  });

  describe("removeHashtag", () => {
    it("should remove hashtag from URL", () => {
      expect(removeHashtag("https://example.com#section")).toBe(
        "https://example.com",
      );
      expect(removeHashtag("https://example.com")).toBe("https://example.com");
    });
  });

  describe("isSameBookmarkUrl", () => {
    it("should compare URLs without hashtags", () => {
      expect(
        isSameBookmarkUrl(
          "https://example.com#section1",
          "https://example.com#section2",
        ),
      ).toBe(true);

      expect(
        isSameBookmarkUrl("https://example.com", "https://different.com"),
      ).toBe(false);
    });

    it("should handle null URLs", () => {
      expect(isSameBookmarkUrl(null, "https://example.com")).toBe(false);
      expect(isSameBookmarkUrl("https://example.com", null)).toBe(false);
    });
  });

  describe("sortNodes", () => {
    it("should prioritize nodes containing current tab", () => {
      const nodes = [
        { title: "B", containsCurrentTab: false, dateGroupModified: 100 },
        { title: "A", containsCurrentTab: true, dateGroupModified: 50 },
      ];

      const sorted = [...nodes].sort(sortNodes);

      expect(sorted[0].title).toBe("A");
      expect(sorted[1].title).toBe("B");
    });

    it("should sort by dateGroupModified when both have same containsCurrentTab", () => {
      const nodes = [
        { title: "Old", containsCurrentTab: false, dateGroupModified: 100 },
        { title: "New", containsCurrentTab: false, dateGroupModified: 200 },
      ];

      const sorted = [...nodes].sort(sortNodes);

      expect(sorted[0].title).toBe("New");
      expect(sorted[1].title).toBe("Old");
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      let counter = 0;
      const increment = () => counter++;
      const debouncedIncrement = debounce(increment, 50);

      debouncedIncrement();
      debouncedIncrement();
      debouncedIncrement();

      expect(counter).toBe(0);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(counter).toBe(1);
    });
  });

  describe("getBrowserName", () => {
    it("should cache browser name", () => {
      const name1 = getBrowserName();
      const name2 = getBrowserName();

      expect(name1).toBe(name2);
      expect(["chrome", "firefox", "edge", "opera"]).toContain(name1);
    });
  });

  describe("getCurrentTab", () => {
    it("should resolve with the first tab from query", async () => {
      const mockTab = {
        id: 1,
        url: "https://example.com",
        title: "Example",
      };
      global.browser.tabs.query.mockResolvedValue([mockTab]);

      await expect(getCurrentTab()).resolves.toBe(mockTab);
    });

    it("should resolve undefined when there are no tabs", async () => {
      global.browser.tabs.query.mockResolvedValue([]);

      await expect(getCurrentTab()).resolves.toBeUndefined();
    });
  });
});
