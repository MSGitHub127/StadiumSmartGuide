import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatConcierge from '../src/components/ChatConcierge';
import '@testing-library/jest-dom';

beforeAll(() => {
  window.HTMLElement.prototype.scrollTo = jest.fn();
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-' + Math.random(),
    },
  });
});

describe('ChatConcierge Component Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders AI assistant header title and prompt buttons', () => {
    render(<ChatConcierge />);
    expect(screen.getByText('AI Concierge')).toBeInTheDocument();
    expect(screen.getByText('Nearest restroom?')).toBeInTheDocument();
  });

  test('clicking a quick prompt triggers fetch call and displays message history', async () => {
    const mockResponse = {
      response_text: 'Restrooms are at Gate 3 and Concourse N.',
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<ChatConcierge />);

    const chip = screen.getByText('Nearest restroom?');
    fireEvent.click(chip);

    // Should show user message immediately
    expect(screen.getByText('Nearest restroom?')).toBeInTheDocument();

    // Wait for the mock assistant response to load and display
    await waitFor(() => {
      expect(
        screen.getByText('Restrooms are at Gate 3 and Concourse N.')
      ).toBeInTheDocument();
    });
  });

  test('submitting custom text input triggers chat flow', async () => {
    const mockResponse = {
      response_text: 'Yes, refillable water bottles are permitted.',
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<ChatConcierge />);

    const input = screen.getByPlaceholderText('Ask anything...');
    const submitBtn = screen.getByLabelText('Send message');

    fireEvent.change(input, { target: { value: 'Can I bring water?' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Can I bring water?')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Yes, refillable water bottles are permitted.')
      ).toBeInTheDocument();
    });
  });

  test('displays fallback error message on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('API rate limit exceeded.')
    );

    render(<ChatConcierge />);

    const input = screen.getByPlaceholderText('Ask anything...');
    const submitBtn = screen.getByLabelText('Send message');

    fireEvent.change(input, { target: { value: 'Hi' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'API rate limit exceeded.'
      );
    });
  });
});
