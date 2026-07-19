import { renderHook } from '@testing-library/react';

// Mock the Zustand store before importing the hook
const mockStartPolling = jest.fn();
const mockCleanup = jest.fn();

jest.mock('../src/store/sensorStore', () => {
  // Keep a simple mock state that the hook can select from
  const mockState = {
    sensors: [
      {
        timestamp: '2026-07-19T14:00:00Z',
        zone_id: 'ZONE-GATE-3',
        current_occupancy_count: 50,
        max_safe_capacity: 100,
        average_wait_seconds: 120,
        occupancy_ratio: 0.5,
        congestion_band: 'amber' as const,
      },
    ],
    error: null,
    loading: false,
    startPolling: mockStartPolling,
    fetchSensors: jest.fn(),
  };

  return {
    useSensorStore: (selector: (state: typeof mockState) => unknown) =>
      selector(mockState),
  };
});

import { useSensorPolling } from '../src/hooks/useSensorPolling';

describe('useSensorPolling hook', () => {
  beforeEach(() => {
    mockStartPolling.mockReset();
    mockCleanup.mockReset();
    mockStartPolling.mockReturnValue(mockCleanup);
  });

  test('returns sensors, error, and loading from the store', () => {
    const { result } = renderHook(() => useSensorPolling());

    expect(result.current.sensors).toEqual([
      expect.objectContaining({
        zone_id: 'ZONE-GATE-3',
        congestion_band: 'amber',
      }),
    ]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test('calls startPolling on mount', () => {
    renderHook(() => useSensorPolling());
    expect(mockStartPolling).toHaveBeenCalledTimes(1);
  });

  test('calls cleanup (stop) function on unmount', () => {
    const { unmount } = renderHook(() => useSensorPolling());

    expect(mockCleanup).not.toHaveBeenCalled();
    unmount();
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  test('startPolling return value is used as cleanup', () => {
    const customCleanup = jest.fn();
    mockStartPolling.mockReturnValue(customCleanup);

    const { unmount } = renderHook(() => useSensorPolling());
    unmount();

    expect(customCleanup).toHaveBeenCalledTimes(1);
  });

  test('hook returns object with exactly three keys', () => {
    const { result } = renderHook(() => useSensorPolling());
    const keys = Object.keys(result.current);
    expect(keys).toEqual(
      expect.arrayContaining(['sensors', 'error', 'loading'])
    );
    expect(keys).toHaveLength(3);
  });
});
