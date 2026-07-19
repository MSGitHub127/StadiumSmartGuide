import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatConcierge from '../src/components/ChatConcierge';
import '@testing-library/jest-dom';

describe('ChatConcierge Component Tests', () => {
  test('renders AI assistant header title and prompt buttons', () => {
    render(<ChatConcierge />);
    expect(screen.getByText('AI Concierge')).toBeInTheDocument();
    expect(screen.getByText('Nearest restroom?')).toBeInTheDocument();
  });
});
