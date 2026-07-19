import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../src/components/Sidebar';
import '@testing-library/jest-dom';

describe('Sidebar component', () => {
  test('renders active dashboard and inert/clickable placeholders', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  test('clicking Map dispatches highlight-amenity CustomEvent', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<Sidebar />);

    const mapBtn = screen.getByRole('button', { name: 'Map' });
    fireEvent.click(mapBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find(
      (call) => call[0].type === 'highlight-amenity'
    );
    expect(event).toBeDefined();
    expect((event?.[0] as CustomEvent).detail).toEqual({ type: null });
    dispatchSpy.mockRestore();
  });

  test('clicking placeholder modules dispatches show-system-alert CustomEvent', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<Sidebar />);

    const ticketsBtn = screen.getByRole('button', { name: 'Tickets' });
    fireEvent.click(ticketsBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find(
      (call) => call[0].type === 'show-system-alert'
    );
    expect(event).toBeDefined();
    expect((event?.[0] as CustomEvent).detail).toEqual({
      message: 'Tickets module is coming soon!',
    });
    dispatchSpy.mockRestore();
  });

  test('clicking Help & Support dispatches show-system-alert CustomEvent', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<Sidebar />);

    const helpBtn = screen.getByRole('button', { name: 'Help & Support' });
    fireEvent.click(helpBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find(
      (call) => call[0].type === 'show-system-alert'
    );
    expect(event).toBeDefined();
    expect((event?.[0] as CustomEvent).detail).toEqual({
      message: 'Help & Support module is coming soon!',
    });
    dispatchSpy.mockRestore();
  });
});
