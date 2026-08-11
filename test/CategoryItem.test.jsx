import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryItem } from '../source/Popup/CategoryItem';

describe('CategoryItem Component', () => {
  const mockNode = {
    id: '1',
    title: 'Test Folder',
    children: [
      { id: '2', title: 'Bookmark 1', url: 'https://example.com' },
    ],
    containsCurrentTab: false,
  };

  const mockProps = {
    node: mockNode,
    focused: false,
    currentActiveTab: { url: 'https://example.com', title: 'Example' },
    updateCategoryNode: vi.fn(),
    resortCategoryNodes: vi.fn(),
    isLast: false,
    index: 0,
    resorted: false,
    saveDomainOnly: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render folder title and count', () => {
    render(<CategoryItem {...mockProps} />);
    
    expect(screen.getByText(/Test Folder/)).toBeInTheDocument();
    expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
  });

  it('should show focused state', () => {
    const { container } = render(<CategoryItem {...mockProps} focused={true} />);
    
    expect(container.querySelector('.focus')).toBeInTheDocument();
  });

  it('should show containsCurrentTab state', () => {
    const nodeWithTab = { ...mockNode, containsCurrentTab: true };
    const { container } = render(<CategoryItem {...mockProps} node={nodeWithTab} />);
    
    expect(container.querySelector('.contains-current-tab')).toBeInTheDocument();
  });

  it('should render NEW folder correctly', () => {
    const newNode = {
      id: 'NEW',
      title: 'New Folder',
      parentTitle: 'Parent',
      parentId: '1',
      children: [],
    };
    
    const { container } = render(<CategoryItem {...mockProps} node={newNode} />);
    
    expect(screen.getByText(/New Folder/)).toBeInTheDocument();
    expect(screen.getByText(/Parent/)).toBeInTheDocument();
    expect(container.querySelector('.create')).toBeInTheDocument();
  });

  it('should show saveDomainOnly hint when focused', () => {
    render(<CategoryItem {...mockProps} focused={true} saveDomainOnly={true} />);
    
    expect(screen.getByText(/Save Domain/)).toBeInTheDocument();
  });

  it('should call create bookmark on NEW folder click', async () => {
    const newNode = {
      id: 'NEW',
      title: 'New Folder',
      parentTitle: 'Parent',
      parentId: '1',
      children: [],
    };

    global.browser.bookmarks.create.mockResolvedValue({ id: '999', ...newNode });
    global.browser.tabs.query.mockResolvedValue([
      { url: 'https://test.com', title: 'Test' },
    ]);

    const { container } = render(<CategoryItem {...mockProps} node={newNode} />);
    const element = container.querySelector('[data-id]');
    
    fireEvent.click(element);
    
    expect(global.browser.bookmarks.create).toHaveBeenCalledWith({
      title: 'New Folder',
      parentId: '1',
    });
  });

  it('should remove bookmark when folder contains the current tab', async () => {
    const nodeWithTab = { ...mockNode, containsCurrentTab: true };
    global.browser.bookmarks.remove.mockResolvedValue();
    global.browser.tabs.query.mockResolvedValue([
      { url: 'https://example.com', title: 'Example' },
    ]);

    const { container } = render(<CategoryItem {...mockProps} node={nodeWithTab} />);
    const element = container.querySelector('[data-id]');

    fireEvent.click(element);

    await waitFor(() => {
      expect(global.browser.bookmarks.remove).toHaveBeenCalledWith('2');
    });
    expect(global.window.close).toHaveBeenCalled();
  });

  it('should add current tab to folder on click', async () => {
    global.browser.bookmarks.create.mockResolvedValue({ id: '9' });
    global.browser.tabs.query.mockResolvedValue([
      { url: 'https://other.com', title: 'Other' },
    ]);

    const { container } = render(<CategoryItem {...mockProps} />);
    const element = container.querySelector('[data-id]');

    fireEvent.click(element);

    await waitFor(() => {
      expect(global.browser.bookmarks.create).toHaveBeenCalledWith({
        parentId: '1',
        title: 'Other',
        url: 'https://other.com',
      });
    });
  });

  it('should save domain only when saveDomainOnly is set', async () => {
    global.browser.bookmarks.create.mockResolvedValue({ id: '9' });
    global.browser.tabs.query.mockResolvedValue([
      { url: 'https://sub.example.com/path?q=1', title: 'Full Title' },
    ]);

    const { container } = render(
      <CategoryItem {...mockProps} focused={true} saveDomainOnly={true} />
    );
    const element = container.querySelector('[data-id]');

    fireEvent.click(element);

    await waitFor(() => {
      expect(global.browser.bookmarks.create).toHaveBeenCalledWith({
        parentId: '1',
        title: 'sub.example.com',
        url: 'https://sub.example.com',
      });
    });
  });

  it('should render with titlePrefix', () => {
    const nodeWithPrefix = {
      ...mockNode,
      titlePrefix: 'Root / Parent',
    };
    
    render(<CategoryItem {...mockProps} node={nodeWithPrefix} />);
    
    expect(screen.getByText(/Root \/ Parent \/ Test Folder/)).toBeInTheDocument();
  });
});
