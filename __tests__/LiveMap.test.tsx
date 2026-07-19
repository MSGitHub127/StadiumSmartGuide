import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LiveMap from '../src/components/LiveMap';
import '@testing-library/jest-dom';
import type { SensorRecord } from '../src/utils/csvParser';

// Mock the useSensorPolling hook
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

const MOCK_SENSORS: SensorRecord[] = [
  makeSensor({
    zone_id: 'ZONE-GATE-3',
    occupancy_ratio: 0.5,
    congestion_band: 'amber',
  }),
  makeSensor({
    zone_id: 'ZONE-GATE-7',
    occupancy_ratio: 0.2,
    congestion_band: 'green',
  }),
  makeSensor({
    zone_id: 'ZONE-CONCOURSE-N',
    occupancy_ratio: 0.85,
    congestion_band: 'red',
  }),
  makeSensor({
    zone_id: 'ZONE-CONCOURSE-S',
    occupancy_ratio: 0.3,
    congestion_band: 'green',
  }),
  makeSensor({
    zone_id: 'ZONE-ELEVATOR-A2',
    occupancy_ratio: 0.1,
    congestion_band: 'green',
  }),
  makeSensor({
    zone_id: 'ZONE-CONCESSION-02',
    occupancy_ratio: 0.6,
    congestion_band: 'amber',
  }),
];

describe('LiveMap Component Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders header title and subtitle', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);
    expect(screen.getByText('Digital Twin Live Map')).toBeInTheDocument();
    expect(
      screen.getByText('Real-time stadium status & navigation')
    ).toBeInTheDocument();
  });

  test('renders section with correct aria-label', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);
    expect(
      screen.getByLabelText(
        'Live stadium map with real-time congestion overlay'
      )
    ).toBeInTheDocument();
  });

  // --- Loading state ---
  test('renders loading skeleton when sensors is null and no error', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: null,
      error: null,
      loading: true,
    });
    render(<LiveMap />);
    const loadingDiv = screen.getByLabelText('Loading live map data');
    expect(loadingDiv).toBeInTheDocument();
    expect(loadingDiv.className).toContain('animate-pulse');
  });

  // --- Error state ---
  test('renders error message when error is set', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: null,
      error: 'Live occupancy data is temporarily unavailable.',
      loading: false,
    });
    render(<LiveMap />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      'Live occupancy data is temporarily unavailable.'
    );
  });

  // --- SVG canvas renders with sensors ---
  test('renders SVG canvas when sensors are available', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);
    const svg = screen.getByRole('img', {
      name: 'Stadium block layout with congestion heatmap',
    });
    expect(svg).toBeInTheDocument();
  });

  // --- Level filter buttons ---
  test('renders level filter buttons (L3, L2, L1, G)', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    const levels = ['L3', 'L2', 'L1', 'G'];
    levels.forEach((level) => {
      const btn = screen.getByLabelText(`Level ${level}`);
      expect(btn).toBeInTheDocument();
    });
  });

  test('L1 is the default active level (aria-pressed=true)', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    const l1Btn = screen.getByLabelText('Level L1');
    expect(l1Btn).toHaveAttribute('aria-pressed', 'true');

    const gBtn = screen.getByLabelText('Level G');
    expect(gBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking G level button changes aria-pressed', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    const gBtn = screen.getByLabelText('Level G');
    expect(gBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(gBtn);

    // After clicking, G should be active and L1 should not be
    expect(gBtn).toHaveAttribute('aria-pressed', 'true');
    const l1Btn = screen.getByLabelText('Level L1');
    expect(l1Btn).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking L2 level button activates L2', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    const l2Btn = screen.getByLabelText('Level L2');
    fireEvent.click(l2Btn);
    expect(l2Btn).toHaveAttribute('aria-pressed', 'true');
  });

  // --- Zoom controls ---
  test('renders zoom in and zoom out buttons', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
  });

  test('zoom in button is clickable', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    const zoomInBtn = screen.getByLabelText('Zoom in');
    // Click should not throw
    fireEvent.click(zoomInBtn);
    expect(zoomInBtn).toBeInTheDocument();
  });

  test('find-my-location (crosshair) button resets view', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    const locateBtn = screen.getByLabelText('Find my location');
    expect(locateBtn).toBeInTheDocument();

    // First zoom in, then click locate to reset
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.click(locateBtn);

    // After reset, L1 should be active
    const l1Btn = screen.getByLabelText('Level L1');
    expect(l1Btn).toHaveAttribute('aria-pressed', 'true');
  });

  // --- highlight-amenity CustomEvent ---
  test('responds to highlight-amenity CustomEvent on window', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    // Dispatch a custom event to highlight "Restrooms"
    act(() => {
      window.dispatchEvent(
        new CustomEvent('highlight-amenity', {
          detail: { type: 'Restrooms' },
        })
      );
    });

    // After highlighting, the "Highlight Restrooms" legend button should
    // have the active style (bg-cyan-500/10)
    const restroomBtn = screen.getByLabelText('Highlight Restrooms');
    expect(restroomBtn.className).toContain('bg-cyan-500/10');
  });

  test('highlight-amenity event with null type clears highlight', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    // First highlight, then clear
    act(() => {
      window.dispatchEvent(
        new CustomEvent('highlight-amenity', {
          detail: { type: 'Restrooms' },
        })
      );
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('highlight-amenity', {
          detail: { type: null },
        })
      );
    });

    // All legend buttons should have transparent border (not active)
    const restroomBtn = screen.getByLabelText('Highlight Restrooms');
    expect(restroomBtn.className).not.toContain('bg-cyan-500/10');
  });

  // --- Legend amenity buttons ---
  test('renders all amenity legend buttons', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    const amenities = [
      'Restrooms',
      'Food & Drinks',
      'First Aid',
      'Info Desk',
      'Accessible',
      'Escalator',
    ];
    amenities.forEach((amenity) => {
      expect(screen.getByLabelText(`Highlight ${amenity}`)).toBeInTheDocument();
    });
  });

  test('clicking an amenity legend button toggles it active', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    render(<LiveMap />);

    const firstAidBtn = screen.getByLabelText('Highlight First Aid');
    fireEvent.click(firstAidBtn);
    expect(firstAidBtn.className).toContain('bg-cyan-500/10');

    // Click again to toggle off
    fireEvent.click(firstAidBtn);
    expect(firstAidBtn.className).not.toContain('bg-cyan-500/10');
  });

  // --- Active path rendering ---
  test('does not render route polyline when no activePath', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    const { container } = render(<LiveMap />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toBeNull();
  });

  test('renders route polyline when activePath has 2+ zones', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: MOCK_SENSORS,
      error: null,
      loading: false,
    });
    const { container } = render(
      <LiveMap activePath={['ZONE-GATE-3', 'ZONE-CONCOURSE-N']} />
    );
    const polyline = container.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    expect(polyline?.getAttribute('points')).toBeTruthy();
  });

  // --- No SVG when sensors is null ---
  test('does not render SVG when sensors are null', () => {
    mockUseSensorPolling.mockReturnValue({
      sensors: null,
      error: null,
      loading: true,
    });
    render(<LiveMap />);
    expect(
      screen.queryByRole('img', {
        name: 'Stadium block layout with congestion heatmap',
      })
    ).not.toBeInTheDocument();
  });
});
