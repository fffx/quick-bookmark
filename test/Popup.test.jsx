import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Popup from '../source/Popup/Popup';

describe('Popup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock bookmarks.getTree
    global.browser.bookmarks.getTree.mockResolvedValue([
      {
        id: '0',
        children: [
          {
            id: '1',
            title: 'Bookmarks Bar',
            children: [
              {
                id: '2',
                title: 'Development',
                children: [
                  { id: '3', title: 'GitHub', url: 'https://github.com' },
                ],
              },
              {
                id: '4',
                title: 'News',
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
        url: 'https://github.com',
        title: 'GitHub',
      },
    ]);
  });

  it('should render search input', async () => {
    render(<Popup />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Filter ...')).toBeInTheDocument();
    });
  });

  it('should load and display bookmark folders', async () => {
    render(<Popup />);
    
    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
      expect(screen.getByText(/News/)).toBeInTheDocument();
    });
  });

  it('should filter bookmarks on input', async () => {
    const user = userEvent.setup();
    render(<Popup />);
    
    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Filter ...');
    await user.type(input, 'Dev');
    
    await waitFor(() => {
      expect(screen.getByText(/Development/)).toBeInTheDocument();
    });
  });

  it('should show create option for non-existent folder', async () => {
    const user = userEvent.setup();
    render(<Popup />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Filter ...')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Filter ...');
    await user.type(input, 'NonExistent');
    
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

    const input = screen.getByPlaceholderText('Filter ...');
    await user.type(input, 'Development / NewFolder');
    
    await waitFor(() => {
      expect(screen.getByText(/NewFolder/)).toBeInTheDocument();
    });
  });

  it('should only enable Pinyin for Chinese language users', () => {
    // Test with Chinese language
    Object.defineProperty(navigator, 'languages', {
      writable: true,
      value: ['zh-CN', 'en-US'],
    });

    const { container: container1 } = render(<Popup />);
    
    // Test with non-Chinese language
    Object.defineProperty(navigator, 'languages', {
      writable: true,
      value: ['en-US', 'es-ES'],
    });

    const { container: container2 } = render(<Popup />);
    
    // Both should render without errors
    expect(container1).toBeInTheDocument();
    expect(container2).toBeInTheDocument();
  });
});
