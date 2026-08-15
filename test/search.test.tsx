import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Popup from "../source/Popup/Popup";

const bookmarkTree = [
  {
    id: "0",
    children: [
      {
        id: "1",
        title: "Bookmarks Bar",
        children: [
          {
            id: "2",
            title: "linux",
            children: [
              {
                id: "3",
                title: "bash",
                children: [
                  {
                    id: "4",
                    title: "zsh",
                    children: [
                      { id: "5", title: "dotfiles", url: "https://zsh.dev" },
                    ],
                  },
                ],
              },
              { id: "6", title: "bin", children: [] },
            ],
          },
          { id: "7", title: "news", children: [] },
          { id: "8", title: "work", children: [] },
        ],
      },
    ],
  },
];

const renderPopup = async () => {
  render(<Popup />);
  await waitFor(() => {
    expect(screen.getByPlaceholderText("Filter ...")).toBeInTheDocument();
  });
  return screen.getByPlaceholderText("Filter ...");
};

describe("Popup search", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(navigator, "languages", {
      writable: true,
      configurable: true,
      value: ["en-US"],
    });

    global.browser.bookmarks.getTree.mockResolvedValue(bookmarkTree);
    global.browser.tabs.query.mockResolvedValue([]);
  });

  it('should match nested folders by prefix letters like "lb" for linux/bash/zsh', async () => {
    const user = userEvent.setup();
    const input = await renderPopup();

    await user.type(input, "lb");

    // The "lb" NEW option only appears once the search has been applied
    await waitFor(() => {
      expect(screen.getByText("lb")).toBeInTheDocument();
    });
    // "lb" matches the whole linux/bash/zsh chain by prefix letters
    expect(screen.getByText("Bookmarks Bar / linux (2)")).toBeInTheDocument();
    expect(
      screen.getByText("Bookmarks Bar / linux / bash (1)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bookmarks Bar / linux / bash / zsh (1)"),
    ).toBeInTheDocument();

    // The top-ranked result is focused (the NEW create option is not)
    await waitFor(() => {
      expect(
        screen.getByText("Bookmarks Bar (3)").closest(".focus"),
      ).not.toBeNull();
    });
    expect(
      screen.getByText("Bookmarks Bar / linux / bash (1)").closest(".focus"),
    ).toBeNull();
  });

  it("should match a child folder by its own name", async () => {
    const user = userEvent.setup();
    const input = await renderPopup();

    await user.type(input, "bash");

    // Searching "bash" returns the full path "Bookmarks Bar / linux / bash"
    await waitFor(() => {
      expect(
        screen.getByText("Bookmarks Bar / linux / bash (1)"),
      ).toBeInTheDocument();
    });
    // The child folder is focused as the top result
    await waitFor(() => {
      expect(
        screen.getByText("Bookmarks Bar / linux / bash (1)").closest(".focus"),
      ).not.toBeNull();
    });
  });

  it("should show new folder options when nothing matches", async () => {
    const user = userEvent.setup();
    const input = await renderPopup();

    await user.type(input, "nonexistent");

    await waitFor(() => {
      const newFolderName = screen.getByText("nonexistent");
      expect(newFolderName).toBeInTheDocument();
      expect(newFolderName.closest(".create")).not.toBeNull();
      // The new folder option is focused
      expect(newFolderName.closest(".focus")).not.toBeNull();
    });
    // No existing folders are shown when there is no match
    expect(screen.queryByText(/\(\d+\)$/)).not.toBeInTheDocument();
  });

  it("should show nested and single folder options for path search when the parent does not exist", async () => {
    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              { id: "2", title: "linux", children: [] },
              { id: "7", title: "news", children: [] },
            ],
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    const input = await renderPopup();

    await user.type(input, "frontend/book");

    // Two create options are offered: nested folders and one flat folder
    await waitFor(() => {
      expect(screen.getAllByText("frontend / book")).toHaveLength(2);
    });
    const options = screen.getAllByText("frontend / book");
    options.forEach((option) => {
      expect(option.closest(".create")).not.toBeNull();
    });

    // The nested option (creating "frontend" then "book") is focused
    const nested = options[0].closest(".create")!;
    expect(nested.getAttribute("data-path")).toBe("frontend/book");
    expect(nested.classList.contains("focus")).toBe(true);
    const flat = options[1].closest(".create")!;
    expect(flat.getAttribute("data-path")).toBeNull();
  });

  it("should create the missing path as nested folders when the nested option is clicked", async () => {
    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              { id: "2", title: "linux", children: [] },
              { id: "7", title: "news", children: [] },
            ],
          },
        ],
      },
    ]);
    global.browser.bookmarks.create
      .mockResolvedValueOnce({ id: "frontend-created" })
      .mockResolvedValueOnce({ id: "book-created" })
      .mockResolvedValue({ id: "9" });
    global.browser.tabs.query.mockResolvedValue([
      { url: "https://react.dev", title: "React" },
    ]);

    const user = userEvent.setup();
    const input = await renderPopup();

    await user.type(input, "frontend/book");
    await waitFor(() => {
      expect(screen.getAllByText("frontend / book")).toHaveLength(2);
    });

    const nested = screen
      .getAllByText("frontend / book")[0]
      .closest(".create")!;
    fireEvent.click(nested);

    await waitFor(() => {
      expect(global.browser.bookmarks.create).toHaveBeenNthCalledWith(1, {
        title: "frontend",
        parentId: "1",
      });
      expect(global.browser.bookmarks.create).toHaveBeenNthCalledWith(2, {
        title: "book",
        parentId: "frontend-created",
      });
    });
    await waitFor(() => {
      expect(global.browser.bookmarks.create).toHaveBeenNthCalledWith(3, {
        parentId: "book-created",
        title: "React",
        url: "https://react.dev",
      });
    });
  });

  it("should create one flat folder when the single folder option is clicked", async () => {
    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              { id: "2", title: "linux", children: [] },
              { id: "7", title: "news", children: [] },
            ],
          },
        ],
      },
    ]);
    global.browser.bookmarks.create.mockResolvedValue({ id: "9" });
    global.browser.tabs.query.mockResolvedValue([
      { url: "https://react.dev", title: "React" },
    ]);

    const user = userEvent.setup();
    const input = await renderPopup();

    await user.type(input, "frontend/book");
    await waitFor(() => {
      expect(screen.getAllByText("frontend / book")).toHaveLength(2);
    });

    const flat = screen.getAllByText("frontend / book")[1].closest(".create")!;
    fireEvent.click(flat);

    await waitFor(() => {
      expect(global.browser.bookmarks.create).toHaveBeenNthCalledWith(1, {
        title: "frontend / book",
        parentId: "1",
      });
      expect(global.browser.bookmarks.create).toHaveBeenNthCalledWith(2, {
        parentId: "9",
        title: "React",
        url: "https://react.dev",
      });
    });
  });

  it("should focus the best match when the user types before bookmarks finish loading", async () => {
    // The current tab lives in "datastore", which sorts first in the full
    // list. The load is slow, so the first search runs on an empty index and
    // must be re-applied once the bookmarks arrive.
    const slowTree = [
      {
        id: "0",
        children: [
          {
            id: "1",
            title: "Bookmarks Bar",
            children: [
              {
                id: "2",
                title: "col",
                children: [
                  {
                    id: "3",
                    title: "unfiled",
                    children: [
                      {
                        id: "4",
                        title: "android_dev",
                        children: [
                          {
                            id: "5",
                            title: "datastore",
                            children: [
                              {
                                id: "6",
                                title: "tab",
                                url: "https://github.com",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                id: "7",
                title: "java",
                children: [{ id: "8", title: "b", url: "https://b.com" }],
              },
            ],
          },
        ],
      },
    ];
    global.browser.bookmarks.getTree.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(slowTree), 300)),
    );
    global.browser.tabs.query.mockResolvedValue([
      { url: "https://github.com", title: "GitHub" },
    ]);

    const user = userEvent.setup();
    render(<Popup />);
    const input = screen.getByPlaceholderText("Filter ...");
    await user.type(input, "java");

    // Once the bookmarks load, the search is re-applied and the "java" folder
    // is focused (not the current-tab folder "datastore").
    await waitFor(
      () => {
        expect(
          screen.getByText("Bookmarks Bar / java (1)").closest(".focus"),
        ).not.toBeNull();
      },
      { timeout: 2000 },
    );
    // The current-tab folder is not re-sorted to the front of the results and
    // is not focused.
    const datastore = screen.getByText(
      "Bookmarks Bar / col / unfiled / android_dev / datastore (1)",
    );
    expect(datastore.closest(".focus")).toBeNull();
  });
});
