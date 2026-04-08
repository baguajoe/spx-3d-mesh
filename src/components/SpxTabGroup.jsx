import React, { useState, useCallback } from 'react';

/**
 * SpxTabGroup — 6-tab system with collapsible accordion panels
 * 
 * panels prop shape:
 * {
 *   SURFACE: [
 *     { label: 'UV Editor', component: UVEditorPanel },
 *     { label: 'Materials', component: MaterialEditorPanel },
 *     ...
 *   ],
 *   RIG: [...],
 *   ...
 * }
 */

export const TAB_IDS = ['SURFACE', 'RIG', 'RENDER', 'FX', 'WORLD', 'GEN'];

function AccordionSection({ label, component: Panel, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="accordion-section">
      <button
        className={`accordion-header ${open ? 'open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className="accordion-arrow">{open ? '▾' : '▸'}</span>
        <span className="accordion-label">{label}</span>
      </button>
      {open && (
        <div className="accordion-body">
          <Panel />
        </div>
      )}
    </div>
  );
}

export function SpxTabGroup({ panels = {}, defaultTab = 'SURFACE', className = '' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabPanels = panels[activeTab] ?? [];

  return (
    <div className={`spx-tab-group ${className}`}>
      <div className="spx-tab-bar">
        {TAB_IDS.map(tab => (
          <button
            key={tab}
            className={`spx-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            title={tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="spx-tab-content">
        {tabPanels.length === 0 && (
          <div className="spx-tab-empty">
            <span>{activeTab}</span>
            <p>No panels configured.</p>
          </div>
        )}
        {tabPanels.map((entry, i) => {
          // Support both { label, component } objects and bare component functions
          const isObj = entry && typeof entry === 'object' && entry.component;
          const Panel = isObj ? entry.component : entry;
          const label = isObj ? entry.label : (Panel?.displayName || Panel?.name || `Panel ${i + 1}`);
          const defaultOpen = isObj ? (entry.defaultOpen ?? i === 0) : i === 0;

          if (!Panel) return null;

          return (
            <AccordionSection
              key={`${activeTab}-${i}`}
              label={label}
              component={Panel}
              defaultOpen={defaultOpen}
            />
          );
        })}
      </div>
    </div>
  );
}

export default SpxTabGroup;
