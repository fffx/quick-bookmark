import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Popup from "../source/Popup/Popup";

describe("Popup Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(navigator, "languages", {
      writable: true,
      configurable: true,
      value: ["en-US"],
    });

    // Mock bookmarks.getTree
    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              {
                id: "2",
                title: "Development",
                children: [
                  { id: "3", title: "GitHub", url: "https://github.com" },
                ],
              },
              {
                id: "4",
                title: "News",
                children: [],
              },
            ],
          },
        ],
      },
    ]);

    // Mock tabs.query
    global.browser.tabs.query.mockResolvedValue([
      {
        url: "https://github.com",
        title: "GitHub",
      },
    ]);
  });

  it("should render search input", async () => {
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Filter ...")).toBeInTheDocument();
    });
  });

  it("should load and display bookmark folders", async () => {
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
      expect(screen.getByText(/News/)).toBeInTheDocument();
    });
  });

  it("should filter bookmarks on input", async () => {
    const user = userEvent.setup();
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    await user.type(input, "Dev");

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    // Non-matching folder should be filtered out
    await waitFor(() => {
      expect(screen.queryByText(/News/)).not.toBeInTheDocument();
    });
  });

  it("should show create option for non-existent folder", async () => {
    const user = userEvent.setup();
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Filter ...")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    await user.type(input, "NonExistent");

    await waitFor(() => {
      expect(screen.getAllByText(/NonExistent/).length).toBeGreaterThan(0);
    });
  });

  it('should handle path search like "foo / bar"', async () => {
    const user = userEvent.setup();
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    await user.type(input, "Development / NewFolder");

    await waitFor(() => {
      expect(screen.getByText(/NewFolder/)).toBeInTheDocument();
    });
  });

  it("should navigate bookmark list with arrow keys", async () => {
    const { container } = render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    const focusedText = () =>
      container.querySelector(".focus")?.textContent || "";

    // Development contains the current tab, so it sorts first and is focused
    expect(focusedText()).toContain("Development");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(focusedText()).toContain("Bookmarks Bar");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(focusedText()).toContain("News");

    // Wraps around to the first item
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(focusedText()).toContain("Development");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(focusedText()).toContain("News");
  });

  it("should bookmark current tab to focused folder on Enter", async () => {
    global.browser.bookmarks.create.mockResolvedValue({ id: "9" });
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    // Move focus from Development down to Bookmarks Bar
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(global.browser.bookmarks.create).toHaveBeenCalledWith({
        parentId: "1",
        title: "GitHub",
        url: "https://github.com",
      });
    });
  });

  it("should remove bookmark from focused folder on Delete", async () => {
    global.browser.bookmarks.remove.mockResolvedValue(undefined);
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    // Development (cursor 0) contains the current tab (https://github.com)
    fireEvent.keyDown(input, { key: "Delete" });

    await waitFor(() => {
      expect(global.browser.bookmarks.remove).toHaveBeenCalledWith("3");
    });
  });

  it("should match Chinese folder by pinyin for Chinese language users", async () => {
    Object.defineProperty(navigator, "languages", {
      writable: true,
      configurable: true,
      value: ["zh-CN", "en-US"],
    });

    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              {
                id: "2",
                title: "开发",
                children: [
                  { id: "3", title: "GitHub", url: "https://github.com" },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/开发/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    await user.type(input, "kai");

    await waitFor(() => {
      expect(screen.getByText(/开发/)).toBeInTheDocument();
    });
  });

  it("should expose the ARIA combobox/listbox pattern to screen readers", async () => {
    const { container } = render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-controls", "wrapper");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-label", "Filter bookmarks");

    const listbox = screen.getByRole("listbox", {
      name: "Bookmark folders",
    });
    expect(listbox).toBeInTheDocument();

    // The focused (first) option is referenced by aria-activedescendant
    expect(input.getAttribute("aria-activedescendant")).toMatch(/^option-\d+$/);

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    // Exactly one option is selected at a time
    expect(
      options.filter((o) => o.getAttribute("aria-selected") === "true"),
    ).toHaveLength(1);

    // Options carry a spoken description of the action they perform
    const focusedOption = document.getElementById(
      input.getAttribute("aria-activedescendant")!,
    );
    // Development contains the current tab (GitHub), so it offers removal
    const label = focusedOption?.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Development/);
    expect(label).toMatch(
      /(Bookmark current tab to|Remove current tab bookmark from)/,
    );
    expect(container.querySelector(".sr-only")).not.toBeNull();
  });

  it("should update aria-activedescendant when the cursor moves", async () => {
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    const firstId = input.getAttribute("aria-activedescendant");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).not.toBe(firstId);
    expect(input.getAttribute("aria-activedescendant")).toMatch(/^option-\d+$/);
  });

  it("should announce search results in a live region", async () => {
    const user = userEvent.setup();
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    await user.type(input, "Dev");

    await waitFor(() => {
      expect(
        screen.getByRole("status").textContent?.match(/\d+ result(s)? found/),
      ).toBeTruthy();
    });
  });

  it("should announce domain-only mode in a live region", async () => {
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    fireEvent.keyDown(input, { key: "Alt", altKey: true });

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "Domain only mode on",
      );
    });
  });

  it("should surface folder whose title matches a tab URL keyword", async () => {
    global.browser.tabs.query.mockResolvedValue([
      { url: "https://www.java.com/en/", title: "Java" },
    ]);
    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            dateGroupModified: 300,
            children: [
              {
                id: "2",
                title: "java",
                dateGroupModified: 50,
                children: [
                  { id: "3", title: "docs", url: "https://docs.oracle.com" },
                ],
              },
              {
                id: "4",
                title: "News",
                dateGroupModified: 200,
                children: [
                  { id: "5", title: "BBC", url: "https://bbc.com" },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const { container } = render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/java/i)).toBeInTheDocument();
    });

    expect(container.querySelector(".focus")?.textContent).toMatch(/java/i);
  });

  it("should surface folder with child bookmarks matching tab URL keywords", async () => {
    global.browser.tabs.query.mockResolvedValue([
      { url: "https://www.java.com/en/", title: "Java" },
    ]);
    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            dateGroupModified: 300,
            children: [
              {
                id: "2",
                title: "programming",
                dateGroupModified: 50,
                children: [
                  {
                    id: "3",
                    title: "blog",
                    url: "https://www.javablog.com",
                  },
                ],
              },
              {
                id: "4",
                title: "News",
                dateGroupModified: 200,
                children: [
                  { id: "5", title: "BBC", url: "https://bbc.com" },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const { container } = render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/programming/i)).toBeInTheDocument();
    });

    expect(container.querySelector(".focus")?.textContent).toMatch(
      /programming/i,
    );
  });

  it("should not match Chinese folder by pinyin for non-Chinese users", async () => {
    Object.defineProperty(navigator, "languages", {
      writable: true,
      configurable: true,
      value: ["en-US", "es-ES"],
    });

    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              {
                id: "2",
                title: "开发",
                children: [
                  { id: "3", title: "GitHub", url: "https://github.com" },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/开发/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter ...");
    await user.type(input, "kai");

    // Pinyin is disabled, so the Chinese folder is filtered out
    await waitFor(() => {
      expect(screen.queryByText(/开发/)).not.toBeInTheDocument();
    });
  });
});
