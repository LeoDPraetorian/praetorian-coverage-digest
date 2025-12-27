/**
 * Day 2: Unit Test Pattern (ONLY IF NEEDED)
 *
 * AFTER integration tests pass, test isolated component logic.
 * Only for complex components with intricate internal logic.
 */

import { render, screen } from '@testing-library/react';
import { ScanLevelCard } from './ScanLevelCard';

describe('ScanLevelCard Unit', () => {
  /**
   * Test SPECIFIC COMPONENT LOGIC (not integration)
   */
  it('should display correct scan level label', () => {
    render(<ScanLevelCard level="H" />);
    expect(screen.getByText('Comprehensive Discovery')).toBeInTheDocument();
  });

  it('should show disabled state with correct styling', () => {
    render(<ScanLevelCard level="L" disabled />);
    const card = screen.getByTestId('scan-level-card');
    expect(card).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  /**
   * Test EDGE CASES in component logic
   */
  it('should handle undefined level gracefully', () => {
    render(<ScanLevelCard level={undefined} />);
    expect(screen.getByText('No scan level set')).toBeInTheDocument();
  });
});

/**
 * When to write these:
 * - Integration tests ALREADY PASS (component works in real usage)
 * - Component has complex internal logic worth isolating
 * - Edge cases are easier to test in isolation
 *
 * When to SKIP these:
 * - Simple presentation components (integration already tested)
 * - Logic is straightforward (no edge cases)
 * - Component is just glue code (integration is the test)
 */
