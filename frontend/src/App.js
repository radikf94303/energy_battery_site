import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// ─── Device Definitions ───────────────────────────────────────────────────────
const DEVICES = {
  megapackXL: {
    id: 'megapackXL',
    name: 'MegapackXL',
    width: 40,
    depth: 10,
    energyMWh: 4,
    cost: 120000,
    color: '#00f5d4',
    glowColor: '#00f5d480',
    type: 'battery',
    icon: '⚡',
    description: 'Flagship utility-scale battery with maximum energy density'
  },
  megapack2: {
    id: 'megapack2',
    name: 'Megapack 2',
    width: 30,
    depth: 10,
    energyMWh: 3,
    cost: 80000,
    color: '#3a86ff',
    glowColor: '#3a86ff80',
    type: 'battery',
    icon: '🔋',
    description: 'Next-gen high-capacity storage solution'
  },
  megapack: {
    id: 'megapack',
    name: 'Megapack',
    width: 30,
    depth: 10,
    energyMWh: 2,
    cost: 50000,
    color: '#8338ec',
    glowColor: '#8338ec80',
    type: 'battery',
    icon: '🔌',
    description: 'Standard industrial energy storage unit'
  },
  powerpack: {
    id: 'powerpack',
    name: 'PowerPack',
    width: 10,
    depth: 10,
    energyMWh: 1,
    cost: 10000,
    color: '#fb5607',
    glowColor: '#fb560780',
    type: 'battery',
    icon: '🔶',
    description: 'Compact modular battery for flexible deployment'
  },
  transformer: {
    id: 'transformer',
    name: 'Transformer',
    width: 10,
    depth: 10,
    energyMWh: -0.5,
    cost: 10000,
    color: '#ffbe0b',
    glowColor: '#ffbe0b80',
    type: 'transformer',
    icon: '⚙️',
    description: 'Grid interface transformer (auto-calculated: 1 per 2 batteries)'
  }
};

const MAX_SITE_WIDTH = 100; // ft
const API_BASE = 'http://0.0.0.0:3001/api';

// ─── Utility Functions ────────────────────────────────────────────────────────
function calcMetrics(counts) {
  let totalCost = 0;
  let totalEnergy = 0;
  let totalBatteries = 0;

  Object.entries(counts).forEach(([id, qty]) => {
    if (id === 'transformer') return;
    const dev = DEVICES[id];
    if (!dev || qty <= 0) return;
    totalCost += dev.cost * qty;
    totalEnergy += dev.energyMWh * qty;
    totalBatteries += qty;
  });

  const autoTransformers = Math.ceil(totalBatteries / 2);
  const transformerCost = autoTransformers * DEVICES.transformer.cost;
  const transformerEnergy = autoTransformers * DEVICES.transformer.energyMWh;

  totalCost += transformerCost;
  totalEnergy += transformerEnergy;

  return { totalCost, totalEnergy, totalBatteries, autoTransformers };
}

function generateLayout(counts) {
  const items = [];
  
  // Build list of all items to place
  Object.entries(counts).forEach(([id, qty]) => {
    if (id === 'transformer' || qty <= 0) return;
    for (let i = 0; i < qty; i++) {
      items.push({ ...DEVICES[id], instanceId: `${id}-${i}` });
    }
  });

  const { autoTransformers } = calcMetrics(counts);
  for (let i = 0; i < autoTransformers; i++) {
    items.push({ ...DEVICES.transformer, instanceId: `transformer-${i}` });
  }

  // Layout algorithm: pack rows left to right, max 100ft wide, 15ft margin
  const placed = [];
  let curX = 0;
  let curY = 0;
  let rowHeight = 0;
  const GAP = 2;

  items.forEach((item) => {
    if (curX + item.width > MAX_SITE_WIDTH) {
      curX = 0;
      curY += rowHeight + GAP;
      rowHeight = 0;
    }
    placed.push({ ...item, x: curX, y: curY });
    curX += item.width + GAP;
    rowHeight = Math.max(rowHeight, item.depth);
  });

  const totalHeight = curY + rowHeight;
  const totalWidth = Math.min(MAX_SITE_WIDTH, placed.reduce((max, p) => Math.max(max, p.x + p.width), 0));

  return { placed, totalWidth, totalHeight };
}

// ─── Components ───────────────────────────────────────────────────────────────

function DeviceCard({ device, count, onChange }) {
  return (
    <div className={`device-card ${device.type}`} style={{ '--accent': device.color, '--glow': device.glowColor }}>
      <div className="device-header">
        <div className="device-icon-wrap">
          <div className="device-pulse" />
          <span className="device-icon">{device.icon}</span>
        </div>
        <div className="device-info">
          <h3 className="device-name">{device.name}</h3>
          <p className="device-desc">{device.description}</p>
        </div>
      </div>
      <div className="device-specs">
        <div className="spec">
          <span className="spec-label">FOOTPRINT</span>
          <span className="spec-value">{device.width}ft × {device.depth}ft</span>
        </div>
        <div className="spec">
          <span className="spec-label">ENERGY</span>
          <span className="spec-value" style={{ color: device.energyMWh < 0 ? '#ff6b6b' : device.color }}>
            {device.energyMWh > 0 ? '+' : ''}{device.energyMWh} MWh
          </span>
        </div>
        <div className="spec">
          <span className="spec-label">UNIT COST</span>
          <span className="spec-value">${device.cost.toLocaleString()}</span>
        </div>
      </div>
      {device.type === 'transformer' ? (
        <div className="auto-note">⚙ Auto-calculated: 1 per every 2 batteries</div>
      ) : (
        <div className="quantity-control">
          <button onClick={() => onChange(Math.max(0, count - 1))} className="qty-btn minus">−</button>
          <input
            type="number"
            min="0"
            max="999"
            value={count}
            onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="qty-input"
          />
          <button onClick={() => onChange(count + 1)} className="qty-btn plus">+</button>
        </div>
      )}
    </div>
  );
}

function MetricsPanel({ metrics, layout }) {
  const { totalCost, totalEnergy, totalBatteries, autoTransformers } = metrics;
  const housesServed = Math.floor(totalEnergy * 1000 / 10.5); // avg US home ~10.5 MWh/month
  const storesServed = Math.floor(totalEnergy * 1000 / 22); // avg small store ~22 MWh/month

  return (
    <div className="metrics-panel">
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-label">TOTAL BUDGET</div>
          <div className="metric-value">${totalCost.toLocaleString()}</div>
        </div>
        <div className="metric-card energy">
          <div className="metric-label">NET ENERGY</div>
          <div className="metric-value">{totalEnergy.toFixed(1)} <span>MWh</span></div>
        </div>
        <div className="metric-card land">
          <div className="metric-label">SITE FOOTPRINT</div>
          <div className="metric-value">{layout.totalWidth}<span>ft</span> × {layout.totalHeight}<span>ft</span></div>
        </div>
        <div className="metric-card units">
          <div className="metric-label">TRANSFORMERS</div>
          <div className="metric-value">{autoTransformers} <span>units</span></div>
        </div>
        <div className="metric-card serve">
          <div className="metric-label">HOMES SERVED</div>
          <div className="metric-value">~{housesServed.toLocaleString()}</div>
        </div>
        <div className="metric-card serve">
          <div className="metric-label">STORES SERVED</div>
          <div className="metric-value">~{storesServed.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function SiteLayout({ layout, counts }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const SCALE = 5; // px per ft

  const canvasW = Math.max(MAX_SITE_WIDTH * SCALE + 60, 560);
  const canvasH = layout.totalHeight * SCALE + 60;

  function handleMouseMove(e) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left - 30) / SCALE;
    const my = (e.clientY - rect.top - 30) / SCALE;

    const hit = layout.placed.find(p =>
      mx >= p.x && mx <= p.x + p.width &&
      my >= p.y && my <= p.y + p.depth
    );
    if (hit) {
      setTooltip({
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 40,
        item: hit
      });
    } else {
      setTooltip(null);
    }
  }

  if (layout.placed.length === 0) {
    return (
      <div className="layout-empty">
        <div className="empty-icon">🏗</div>
        <p>Add devices above to generate your site layout</p>
      </div>
    );
  }

  return (
    <div className="layout-container" onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
      <svg
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="site-svg"
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width={10 * SCALE} height={10 * SCALE} patternUnits="userSpaceOnUse" x="30" y="30">
            <path d={`M ${10 * SCALE} 0 L 0 0 0 ${10 * SCALE}`} fill="none" stroke="#ffffff08" strokeWidth="1" />
          </pattern>
          {Object.values(DEVICES).map(dev => (
            <filter key={dev.id} id={`glow-${dev.id}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* Site boundary */}
        <rect x="30" y="30" width={MAX_SITE_WIDTH * SCALE} height={layout.totalHeight * SCALE}
          fill="url(#grid)" stroke="#ffffff20" strokeWidth="1" rx="2" />

        {/* 100ft width label */}
        <line x1="30" y1={layout.totalHeight * SCALE + 40} x2={MAX_SITE_WIDTH * SCALE + 30} y2={layout.totalHeight * SCALE + 40}
          stroke="#ffffff30" strokeWidth="1" />
        <text x={(MAX_SITE_WIDTH * SCALE / 2) + 30} y={layout.totalHeight * SCALE + 52}
          fill="#ffffff50" fontSize="9" textAnchor="middle" fontFamily="Share Tech Mono">
          100 FT MAX WIDTH
        </text>

        {/* Placed items */}
        {layout.placed.map((item) => {
          const x = 30 + item.x * SCALE;
          const y = 30 + item.y * SCALE;
          const w = item.width * SCALE;
          const h = item.depth * SCALE;
          return (
            <g key={item.instanceId} filter={`url(#glow-${item.id})`}>
              <rect x={x} y={y} width={w} height={h}
                fill={item.color + '22'} stroke={item.color}
                strokeWidth="1.5" rx="2" />
              {w > 20 && h > 12 && (
                <>
                  <text x={x + w / 2} y={y + h / 2 - 4}
                    fill={item.color} fontSize={Math.min(8, w / 6)}
                    textAnchor="middle" fontFamily="Share Tech Mono" fontWeight="bold">
                    {item.name}
                  </text>
                  <text x={x + w / 2} y={y + h / 2 + 8}
                    fill={item.color + 'bb'} fontSize={Math.min(7, w / 7)}
                    textAnchor="middle" fontFamily="Share Tech Mono">
                    {item.width}×{item.depth}ft
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Compass */}
        <text x={canvasW - 25} y="22" fill="#ffffff40" fontSize="10" textAnchor="middle" fontFamily="Orbitron">N</text>
        <line x1={canvasW - 25} y1="25" x2={canvasW - 25} y2="14" stroke="#ffffff40" strokeWidth="1" markerEnd="url(#arrow)" />
      </svg>

      {tooltip && (
        <div className="layout-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div style={{ color: tooltip.item.color, fontWeight: 700 }}>{tooltip.item.name}</div>
          <div>{tooltip.item.width}ft × {tooltip.item.depth}ft</div>
          <div>{tooltip.item.energyMWh > 0 ? '+' : ''}{tooltip.item.energyMWh} MWh</div>
          <div>${tooltip.item.cost.toLocaleString()}</div>
        </div>
      )}

      <div className="layout-legend">
        {Object.values(DEVICES).map(dev => (
          <div key={dev.id} className="legend-item">
            <div className="legend-dot" style={{ background: dev.color, boxShadow: `0 0 6px ${dev.color}` }} />
            <span>{dev.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionModal({ onSave, onClose, currentName }) {
  const [name, setName] = useState(currentName || '');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Save Session</h2>
        <input
          className="modal-input"
          placeholder="Session name (e.g. Site A Phase 1)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
          autoFocus
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => name.trim() && onSave(name.trim())} disabled={!name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionsPanel({ sessions, onLoad, onDelete, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sessions-modal" onClick={e => e.stopPropagation()}>
        <h2>Saved Sessions</h2>
        {sessions.length === 0 ? (
          <p className="no-sessions">No saved sessions yet</p>
        ) : (
          <div className="sessions-list">
            {sessions.map(s => (
              <div key={s.id} className="session-item">
                <div className="session-info">
                  <div className="session-name">{s.name}</div>
                  <div className="session-date">{new Date(s.savedAt).toLocaleString()}</div>
                </div>
                <div className="session-actions">
                  <button className="btn-primary small" onClick={() => onLoad(s)}>Load</button>
                  <button className="btn-danger small" onClick={() => onDelete(s.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [counts, setCounts] = useState({ megapackXL: 0, megapack2: 0, megapack: 0, powerpack: 0 });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentSessionName, setCurrentSessionName] = useState('');
  const [toast, setToast] = useState(null);

  const metrics = calcMetrics(counts);
  const layout = generateLayout(counts);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchSessions() {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      const data = await res.json();
      setSessions(data);
    } catch {
      showToast('Could not reach server', 'error');
    }
  }

  async function handleSave(name) {
    const body = { name, config: { counts } };
    try {
      if (currentSessionId) {
        await fetch(`${API_BASE}/sessions/${currentSessionId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        setCurrentSessionName(name);
        showToast('Session updated!');
      } else {
        const res = await fetch(`${API_BASE}/sessions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        setCurrentSessionId(data.id);
        setCurrentSessionName(name);
        showToast('Session saved!');
      }
    } catch {
      showToast('Failed to save session', 'error');
    }
    setShowSaveModal(false);
  }

  async function handleLoad(session) {
    setCounts(session.config.counts);
    setCurrentSessionId(session.id);
    setCurrentSessionName(session.name);
    setShowSessions(false);
    showToast(`Loaded: ${session.name}`);
  }

  async function handleDelete(id) {
    try {
      await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
      await fetchSessions();
      if (currentSessionId === id) { setCurrentSessionId(null); setCurrentSessionName(''); }
      showToast('Session deleted');
    } catch {
      showToast('Delete failed', 'error');
    }
  }

  function handleOpenSessions() {
    fetchSessions();
    setShowSessions(true);
  }

  function updateCount(id, val) {
    setCounts(prev => ({ ...prev, [id]: val }));
    setCurrentSessionId(null);
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <div>
              <div className="logo-title">TESLA</div>
              <div className="logo-sub">INDUSTRIAL BATTERY SITE PLANNER</div>
            </div>
          </div>
        </div>
        <div className="header-right">
          {currentSessionName && (
            <div className="session-badge">📁 {currentSessionName}</div>
          )}
          <button className="btn-header" onClick={handleOpenSessions}>📂 Sessions</button>
          <button className="btn-header accent" onClick={() => setShowSaveModal(true)}>
            💾 {currentSessionId ? 'Update' : 'Save'}
          </button>
        </div>
      </header>

      <main className="main">
        {/* Device Configuration */}
        <section className="section">
          <div className="section-title">
            <span className="section-num">01</span>
            <h2>DEVICE CONFIGURATION</h2>
          </div>
          <div className="devices-grid">
            {Object.values(DEVICES).filter(d => d.type === 'battery').map(dev => (
              <DeviceCard
                key={dev.id}
                device={dev}
                count={counts[dev.id] || 0}
                onChange={val => updateCount(dev.id, val)}
              />
            ))}
            <DeviceCard
              device={DEVICES.transformer}
              count={metrics.autoTransformers}
              onChange={() => {}}
            />
          </div>
        </section>

        {/* Metrics */}
        <section className="section">
          <div className="section-title">
            <span className="section-num">02</span>
            <h2>SITE METRICS</h2>
          </div>
          <MetricsPanel metrics={metrics} layout={layout} />
        </section>

        {/* Layout */}
        <section className="section">
          <div className="section-title">
            <span className="section-num">03</span>
            <h2>SITE LAYOUT</h2>
            <span className="section-note">Max 100ft width — hover devices for details</span>
          </div>
          <SiteLayout layout={layout} counts={counts} />
        </section>
      </main>

      {showSaveModal && (
        <SessionModal
          currentName={currentSessionName}
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {showSessions && (
        <SessionsPanel
          sessions={sessions}
          onLoad={handleLoad}
          onDelete={handleDelete}
          onClose={() => setShowSessions(false)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
