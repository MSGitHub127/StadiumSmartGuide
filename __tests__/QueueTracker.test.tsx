import React from 'react';
import { render, screen, act } from '@testing-library/react';
import QueueTracker from '../src/components/QueueTracker';
import '@testing-library/jest-dom';

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ sensors: [] }),
  })
) as jest.Mock;

describe('QueueTracker Component Tests', () => {
  test('renders header title', async () => {
    await act(async () => {
      render(<QueueTracker />);
    });
    expect(screen.getByText('Live Queue Tracker')).toBeInTheDocument();
  });
});
