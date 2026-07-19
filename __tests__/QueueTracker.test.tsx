import React from 'react';
import { render, screen } from '@testing-library/react';
import QueueTracker from '../src/components/QueueTracker';
import '@testing-library/jest-dom';
import type { SensorRecord } from '../src/utils/csvParser';

// Mock the useSensorPolling hook so we can control what it returns
jest.mock('../src/hooks/useSensorPolling');
import { useSensorPolling } from '../src/hooks/useSensorPolling';
const mockUseSensorPolling = useSensorPolling as jest.MockedFunction<
  typeof useSensorPolling
>;

function makeSensor(
  overrides: Partial<SensorRecord> & { zone_id: string }
): SensorRecord {
  return {
    timestamp: '2026-07-19T14:00:00Z',
    current_occupancy_count: 30,
    max_safe_capacity: 100,
    average_wait_seconds: 120,
    occupancy_ratio: 0.3,
    congestion_band: 'green',
    ...overrides,
  };
}

describe('QueueTracker Component Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders header title', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: [],
      error: null,
      loading: false,
    });
    render(<QueueTracker />);
    expect(screen.getByText('Live Queue Tracker')).toBeInTheDocument();
  });

  test('renders section with correct aria-label', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: [],
      error: null,
      loading: false,
    });
    render(<QueueTracker />);
    expect(
      screen.getByLabelText('Amenity queue wait times')
    ).toBeInTheDocument();
  });

  // --- Loading state ---
  test('renders loading skeleton when sensors is null and no error', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: null,
      error: null,
      loading: true,
    });
    render(<QueueTracker />);
    // Loading skeleton renders an aria-labelled <ul>
    const loadingList = screen.getByLabelText('Loading queue data');
    expect(loadingList).toBeInTheDocument();
    // Should have 3 skeleton pulse items
    const skeletonItems = loadingList.querySelectorAll('li');
    expect(skeletonItems).toHaveLength(3);
    skeletonItems.forEach((li) => {
      expect(li.className).toContain('animate-pulse');
    });
  });

  // --- Error state ---
  test('renders error message when error is set', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: null,
      error: 'Live occupancy data is temporarily unavailable.',
      loading: false,
    });
    render(<QueueTracker />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      'Live occupancy data is temporarily unavailable.'
    );
  });

  // --- Green band sensor (occupancy_ratio < 0.4) ---
  test('renders green congestion band indicator for low occupancy', () => {
    const greenSensor = makeSensor({
      zone_id: 'ZONE-GATE-3',
      occupancy_ratio: 0.2,
      congestion_band: 'green',
      average_wait_seconds: 60,
    });
    mockUseSensorPolling.mockReturnValue({
      sensors: [greenSensor],
      error: null,
      loading: false,
    });
    render(<QueueTracker />);

    // Zone name: "ZONE-GATE-3" → "GATE 3"
    expect(screen.getByText('GATE 3')).toBeInTheDocument();
    // Wait time: 60s → 1 min
    expect(screen.getByText('1 min')).toBeInTheDocument();

    // The congestion dot should have the green CSS class
    const section = screen.getByLabelText('Amenity queue wait times');
    const dot = section.querySelector('.bg-emerald-400');
    expect(dot).toBeInTheDocument();

    // Time text should have the green color class
    const timeText = screen.getByText('1 min');
    expect(timeText.className).toContain('text-emerald-400');
  });

  // --- Amber band sensor (occupancy_ratio 0.4–0.7) ---
  test('renders amber congestion band indicator for medium occupancy', () => {
    const amberSensor = makeSensor({
      zone_id: 'ZONE-CONCOURSE-N',
      occupancy_ratio: 0.55,
      congestion_band: 'amber',
      average_wait_seconds: 300,
    });
    mockUseSensorPolling.mockReturnValue({
      sensors: [amberSensor],
      error: null,
      loading: false,
    });
    render(<QueueTracker />);

    // Zone name: "ZONE-CONCOURSE-N" → "CONCOURSE N"
    expect(screen.getByText('CONCOURSE N')).toBeInTheDocument();
    // Wait time: 300s → 5 min
    expect(screen.getByText('5 min')).toBeInTheDocument();

    // The congestion dot should have the amber CSS class
    const section = screen.getByLabelText('Amenity queue wait times');
    const dot = section.querySelector('.bg-amber-400');
    expect(dot).toBeInTheDocument();

    // Time text should have the amber color class
    const timeText = screen.getByText('5 min');
    expect(timeText.className).toContain('text-amber-400');
  });

  // --- Red band sensor (occupancy_ratio > 0.7) ---
  test('renders red congestion band indicator for high occupancy', () => {
    const redSensor = makeSensor({
      zone_id: 'ZONE-CONCESSION-02',
      occupancy_ratio: 0.9,
      congestion_band: 'red',
      average_wait_seconds: 600,
    });
    mockUseSensorPolling.mockReturnValue({
      sensors: [redSensor],
      error: null,
      loading: false,
    });
    render(<QueueTracker />);

    // Zone name: "ZONE-CONCESSION-02" → "CONCESSION 02"
    expect(screen.getByText('CONCESSION 02')).toBeInTheDocument();
    // Wait time: 600s → 10 min
    expect(screen.getByText('10 min')).toBeInTheDocument();

    // The congestion dot should have the red CSS class
    const section = screen.getByLabelText('Amenity queue wait times');
    const dot = section.querySelector('.bg-rose-500');
    expect(dot).toBeInTheDocument();

    // Time text should have the red color class
    const timeText = screen.getByText('10 min');
    expect(timeText.className).toContain('text-rose-400');
  });

  // --- Multiple sensors render correctly ---
  test('renders multiple sensors with correct bands', () => {
    const sensors: SensorRecord[] = [
      makeSensor({
        zone_id: 'ZONE-GATE-3',
        occupancy_ratio: 0.1,
        congestion_band: 'green',
        average_wait_seconds: 30,
      }),
      makeSensor({
        zone_id: 'ZONE-GATE-7',
        occupancy_ratio: 0.5,
        congestion_band: 'amber',
        average_wait_seconds: 180,
      }),
      makeSensor({
        zone_id: 'ZONE-CONCOURSE-N',
        occupancy_ratio: 0.85,
        congestion_band: 'red',
        average_wait_seconds: 480,
      }),
    ];
    mockUseSensorPolling.mockReturnValue({
      sensors,
      error: null,
      loading: false,
    });
    render(<QueueTracker />);

    // All three zone names should render
    expect(screen.getByText('GATE 3')).toBeInTheDocument();
    expect(screen.getByText('GATE 7')).toBeInTheDocument();
    expect(screen.getByText('CONCOURSE N')).toBeInTheDocument();

    // All three wait times
    expect(screen.getByText('1 min')).toBeInTheDocument(); // 30s rounds to 1
    expect(screen.getByText('3 min')).toBeInTheDocument();
    expect(screen.getByText('8 min')).toBeInTheDocument();

    // Should have list items for each sensor
    const section = screen.getByLabelText('Amenity queue wait times');
    const listItems = section.querySelectorAll('li');
    expect(listItems).toHaveLength(3);
  });

  // --- Congestion bar width varies by band ---
  test('renders congestion bars with correct width per band', () => {
    const sensors: SensorRecord[] = [
      makeSensor({
        zone_id: 'ZONE-GATE-3',
        congestion_band: 'green',
        average_wait_seconds: 60,
      }),
      makeSensor({
        zone_id: 'ZONE-GATE-7',
        congestion_band: 'amber',
        average_wait_seconds: 120,
      }),
      makeSensor({
        zone_id: 'ZONE-CONCOURSE-N',
        congestion_band: 'red',
        average_wait_seconds: 300,
      }),
    ];
    mockUseSensorPolling.mockReturnValue({
      sensors,
      error: null,
      loading: false,
    });
    const { container } = render(<QueueTracker />);

    // Each list item has an inner bar div with a width style
    const barDivs = container.querySelectorAll(
      'li div.h-1 > div'
    ) as NodeListOf<HTMLElement>;
    expect(barDivs).toHaveLength(3);

    // Green = 25%, Amber = 60%, Red = 90%
    expect(barDivs[0].style.width).toBe('25%');
    expect(barDivs[1].style.width).toBe('60%');
    expect(barDivs[2].style.width).toBe('90%');
  });

  // --- No loading skeleton when sensors are present ---
  test('does not render loading skeleton when sensors are available', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: [makeSensor({ zone_id: 'ZONE-GATE-3' })],
      error: null,
      loading: false,
    });
    render(<QueueTracker />);
    expect(
      screen.queryByLabelText('Loading queue data')
    ).not.toBeInTheDocument();
  });

  // --- No error alert when error is null ---
  test('does not render error alert when there is no error', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: [makeSensor({ zone_id: 'ZONE-GATE-3' })],
      error: null,
      loading: false,
    });
    render(<QueueTracker />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
