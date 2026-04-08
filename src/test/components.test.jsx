import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpxTabGroup } from '../../src/components/SpxTabGroup.jsx';

const MockPanel = () => <div data-testid="mock-panel">Mock Panel Content</div>;

const panels = {
  SURFACE: [{ label: 'UV Editor', component: MockPanel, defaultOpen: true }],
  RIG:     [{ label: 'Auto-Rig', component: MockPanel }],
  RENDER:  [{ label: 'Lighting', component: MockPanel }],
  FX:      [],
  WORLD:   [{ label: 'World Settings', component: MockPanel }],
  GEN:     [{ label: 'Generators', component: MockPanel }],
};

describe('SpxTabGroup', () => {
  it('renders all 6 tab buttons', () => {
    render(<SpxTabGroup panels={panels} />);
    ['SURFACE', 'RIG', 'RENDER', 'FX', 'WORLD', 'GEN'].forEach(tab => {
      expect(screen.getByText(tab)).toBeTruthy();
    });
  });

  it('shows default tab content on mount', () => {
    render(<SpxTabGroup panels={panels} defaultTab="SURFACE" />);
    expect(screen.getByText('UV Editor')).toBeTruthy();
  });

  it('first panel is open by default when defaultOpen=true', () => {
    render(<SpxTabGroup panels={panels} defaultTab="SURFACE" />);
    expect(screen.getByTestId('mock-panel')).toBeTruthy();
  });

  it('switches to RIG tab on click', async () => {
    const user = userEvent.setup();
    render(<SpxTabGroup panels={panels} defaultTab="SURFACE" />);
    await user.click(screen.getByText('RIG'));
    expect(screen.getByText('Auto-Rig')).toBeTruthy();
  });

  it('shows empty state for tab with no panels', async () => {
    const user = userEvent.setup();
    render(<SpxTabGroup panels={panels} defaultTab="SURFACE" />);
    await user.click(screen.getByText('FX'));
    expect(screen.getByText('No panels configured.')).toBeTruthy();
  });

  it('expands collapsed accordion section on click', async () => {
    const user = userEvent.setup();
    // Add a second panel to RIG that starts closed (not first, not defaultOpen)
    const panelsWithTwo = {
      ...panels,
      RIG: [
        { label: 'Auto-Rig', component: MockPanel },
        { label: 'Advanced Rig', component: () => <div data-testid="second-panel">Second</div> },
      ]
    };
    render(<SpxTabGroup panels={panelsWithTwo} defaultTab="RIG" />);
    // Second panel starts closed
    expect(screen.queryByTestId('second-panel')).toBeNull();
    await user.click(screen.getByText('Advanced Rig'));
    expect(screen.getByTestId('second-panel')).toBeTruthy();
  });

  it('collapses expanded accordion section on second click', async () => {
    const user = userEvent.setup();
    render(<SpxTabGroup panels={panels} defaultTab="SURFACE" />);
    // UV Editor starts open
    expect(screen.getByTestId('mock-panel')).toBeTruthy();
    await user.click(screen.getByText('UV Editor'));
    expect(screen.queryByTestId('mock-panel')).toBeNull();
  });

  it('accepts bare component (not label+component object)', () => {
    const barePanels = { SURFACE: [MockPanel], RIG: [], RENDER: [], FX: [], WORLD: [], GEN: [] };
    render(<SpxTabGroup panels={barePanels} defaultTab="SURFACE" />);
    // Should render with function name as label
    expect(screen.getByText('MockPanel')).toBeTruthy();
  });
});
