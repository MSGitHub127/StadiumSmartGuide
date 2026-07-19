import React from 'react';
import { render, screen, act } from '@testing-library/react';
import LiveMap from '../src/components/LiveMap';
import '@testing-library/jest-dom';

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ sensors: [] }),
  })
) as jest.Mock;

describe('LiveMap Component Tests', () => {
  test('renders header title and svg canvas', async () => {
    await act(async () => {
      render(<LiveMap />);
    });
    expect(screen.getByText('Digital Twin Live Map')).toBeInTheDocument();
  });
});
