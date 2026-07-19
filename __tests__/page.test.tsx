import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import FanDashboard from '../src/app/page';
import '@testing-library/jest-dom';

// Mock child components to keep the page test focused and prevent duplicate execution
jest.mock('../src/components/LiveMap', () => {
  return function MockLiveMap() {
    return <div data-testid="live-map">Mocked Live Map</div>;
  };
});

jest.mock('../src/components/ChatConcierge', () => {
  return function MockChatConcierge() {
    return <div data-testid="chat-concierge">Mocked Chat Concierge</div>;
  };
});

jest.mock('../src/components/QueueTracker', () => {
  return function MockQueueTracker() {
    return <div data-testid="queue-tracker">Mocked Queue Tracker</div>;
  };
});

// Mock the useSensorPolling hook
jest.mock('../src/hooks/useSensorPolling', () => ({
  useSensorPolling: () => ({
    sensors: [
      {
        timestamp: '2026-07-19T14:00:00Z',
        zone_id: 'ZONE-GATE-3',
        current_occupancy_count: 50,
        max_safe_capacity: 100,
        average_wait_seconds: 120,
        occupancy_ratio: 0.5,
        congestion_band: 'amber',
      },
    ],
    error: null,
    loading: false,
  }),
}));

describe('FanDashboard Page Component Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  test('renders page header title and FIFA subtitle', () => {
    render(<FanDashboard />);
    expect(screen.getByText('Stadium SmartGuide')).toBeInTheDocument();
    expect(screen.getByText('FIFA World Cup 2026')).toBeInTheDocument();
  });

  test('renders status metrics (21°C, Moderate, 127K)', () => {
    render(<FanDashboard />);
    expect(screen.getByText('21°C')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('127K')).toBeInTheDocument();
  });

  test('allows toggling accessibility switches (wheelchair routing and audio assistance)', () => {
    render(<FanDashboard />);

    const switches = screen.getAllByRole('switch');
    const wheelchairSwitch = switches[0]!;
    const audioSwitch = switches[1]!;

    expect(wheelchairSwitch).toHaveAttribute('aria-checked', 'false');
    expect(audioSwitch).toHaveAttribute('aria-checked', 'false');

    // Click wheelchair toggle
    fireEvent.click(wheelchairSwitch);
    expect(wheelchairSwitch).toHaveAttribute('aria-checked', 'true');

    // Click audio toggle
    fireEvent.click(audioSwitch);
    expect(audioSwitch).toHaveAttribute('aria-checked', 'true');
  });

  test('allows changing origin and destination dropdowns', () => {
    render(<FanDashboard />);

    const originSelect = screen.getByLabelText('From');
    const destSelect = screen.getByLabelText('To');

    fireEvent.change(originSelect, { target: { value: 'ZONE-GATE-7' } });
    fireEvent.change(destSelect, { target: { value: 'AMN-ELEVATOR-01' } });

    expect(originSelect).toHaveValue('ZONE-GATE-7');
    expect(destSelect).toHaveValue('AMN-ELEVATOR-01');
  });

  test('find best route successfully displays path details', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          path: ['ZONE-GATE-3', 'ZONE-CONCOURSE-N', 'AMN-RESTROOM-04'],
          rerouted: false,
          reason: 'Standard route calculated.',
        }),
    });

    render(<FanDashboard />);

    const findBtn = screen.getByRole('button', { name: /FIND BEST ROUTE/i });
    await act(async () => {
      fireEvent.click(findBtn);
    });

    expect(screen.getByText('Estimated Time')).toBeInTheDocument();
    expect(screen.getByText(/min/)).toBeInTheDocument();
    expect(screen.getByText(/km/)).toBeInTheDocument();
  });

  test('displays error alert when routing api fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Routing service is offline.' }),
    });

    render(<FanDashboard />);

    const findBtn = screen.getByRole('button', { name: /FIND BEST ROUTE/i });
    await act(async () => {
      fireEvent.click(findBtn);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Routing service is offline.'
    );
  });

  test('handles quick action buttons header clicks dispatch custom events', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<FanDashboard />);

    const hydrationBtn = screen.getByTitle('Hydration Points');
    fireEvent.click(hydrationBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find(
      (call) => call[0].type === 'highlight-amenity'
    );
    expect(event).toBeDefined();
  });

  test('mobile bottom navigation switches active tabs', () => {
    render(<FanDashboard />);

    const mobileNav = screen.getByRole('navigation', {
      name: 'Primary navigation',
    });

    // Default tab is Map
    const mapTabBtn = within(mobileNav).getByRole('button', { name: 'Map' });
    expect(mapTabBtn).toHaveAttribute('aria-current', 'page');

    // Click Settings
    const settingsTabBtn = within(mobileNav).getByRole('button', {
      name: 'Settings',
    });
    fireEvent.click(settingsTabBtn);
    expect(settingsTabBtn).toHaveAttribute('aria-current', 'page');
    expect(mapTabBtn).not.toHaveAttribute('aria-current', 'page');

    // Click Assistant
    const assistantTabBtn = within(mobileNav).getByRole('button', {
      name: 'Assistant',
    });
    fireEvent.click(assistantTabBtn);
    expect(assistantTabBtn).toHaveAttribute('aria-current', 'page');
  });

  test('notification bell toggle displays alerts popup', () => {
    render(<FanDashboard />);

    const bellBtn = screen.getByLabelText('Notifications');
    // Initially not visible
    expect(screen.queryByText('Safety & Live Alerts')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(bellBtn);
    expect(screen.getByText('Safety & Live Alerts')).toBeInTheDocument();

    // Click again to close
    fireEvent.click(bellBtn);
    expect(screen.queryByText('Safety & Live Alerts')).not.toBeInTheDocument();
  });

  test('SOS button click displays custom alert modal and can be dismissed', () => {
    render(<FanDashboard />);
    const sosBtn = screen.getByTitle('Emergency Call');
    fireEvent.click(sosBtn);

    expect(
      screen.getByText('SOS: Emergency services dispatched to Gate 3.')
    ).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(closeBtn);
    expect(
      screen.queryByText('SOS: Emergency services dispatched to Gate 3.')
    ).not.toBeInTheDocument();
  });

  test('Report Issue button click displays custom prompt modal, accepts input, and displays success alert', () => {
    render(<FanDashboard />);
    const reportBtn = screen.getByTitle('Report Issue');
    fireEvent.click(reportBtn);

    expect(
      screen.getByText('What issue would you like to report?')
    ).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Type details here...');
    fireEvent.change(input, { target: { value: 'Broken seat at Gate 7' } });

    // Submit prompt
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    // Prompt resolves to success alert modal
    expect(
      screen.getByText('Thank you for reporting: Broken seat at Gate 7')
    ).toBeInTheDocument();

    // Dismiss alert modal
    const okBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(okBtn);
    expect(
      screen.queryByText('Thank you for reporting: Broken seat at Gate 7')
    ).not.toBeInTheDocument();
  });

  test('Lost & Found button click displays custom alert modal', () => {
    render(<FanDashboard />);
    const lostBtn = screen.getByTitle('Lost & Found');
    fireEvent.click(lostBtn);

    expect(
      screen.getByText('Lost & Found catalog loaded.')
    ).toBeInTheDocument();
  });

  test('responds to show-system-alert CustomEvent on window and displays modal alert', () => {
    render(<FanDashboard />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('show-system-alert', {
          detail: { message: 'Tickets module is coming soon!' },
        })
      );
    });

    expect(
      screen.getByText('Tickets module is coming soon!')
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);
    expect(
      screen.queryByText('Tickets module is coming soon!')
    ).not.toBeInTheDocument();
  });
});
