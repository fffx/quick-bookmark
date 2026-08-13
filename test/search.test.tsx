import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
});
