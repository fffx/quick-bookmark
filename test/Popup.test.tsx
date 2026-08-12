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
