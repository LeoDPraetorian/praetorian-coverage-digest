/**
 * Day 1: Integration Test Pattern
 *
 * Test WORKFLOWS, not components in isolation.
 * Render full tabs/sections, execute user flows end-to-end.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScanSettingsTab } from './ScanSettingsTab';

describe('ScanSettingsTab Integration', () => {
  it('should complete scan level change workflow', async () => {
    const user = userEvent.setup();

    // Render FULL TAB (not isolated card)
    render(<ScanSettingsTab />);

    // Execute COMPLETE USER WORKFLOW
    await user.click(screen.getByText('Edit Scan Level'));
    await user.click(screen.getByLabelText('Heavy Scan'));
    await user.click(screen.getByText('Save'));

    // Verify INTEGRATION (multiple components see change)
    expect(screen.getByText('Comprehensive Discovery')).toBeInTheDocument();
    expect(screen.getByText('Heavy scan enabled')).toBeInTheDocument();

    // Verify STATE PROPAGATION
    expect(screen.getByTestId('scan-level-indicator')).toHaveTextContent('H');

    // Verify CACHE INVALIDATION (other cards updated)
    expect(screen.getByText('Settings will apply to next scan')).toBeInTheDocument();
  });

  it('should handle scan level change error workflow', async () => {
    const user = userEvent.setup();

    render(<ScanSettingsTab />);

    // Simulate error scenario
    await user.click(screen.getByText('Edit Scan Level'));
    await user.click(screen.getByLabelText('Invalid Level'));
    await user.click(screen.getByText('Save'));

    // Verify ERROR HANDLING across components
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to update');
    expect(screen.getByText('Previous settings retained')).toBeInTheDocument();
  });
});

/**
 * What this catches that unit tests miss:
 * - Components don't integrate (ScanLevelCard + ScheduleCard)
 * - State doesn't propagate (level change → indicator update)
 * - Cache doesn't invalidate (stale data in other cards)
 * - Error boundaries don't work (error in one card breaks tab)
 */
