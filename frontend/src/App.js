import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';

const TYPE_COLORS = {
  Scrapyard: 'green',
  Counterspell: 'purple',
  Daydream: 'blue'
};

function GlobeMap({ records }) {
  const globeRef = useRef(null);
  const [view, setView] = useState('bars'); // 'bars' | 'heatmap'
  const [useProjected, setUseProjected] = useState(false); // include Daydream projected data
  const [showDaydream, setShowDaydream] = useState(true); // toggle visibility of Daydream events

  // Initialize globe once
  useEffect(() => {
    const el = document.getElementById('globe');
    if (!el) return;
  const g = Globe()(el)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    // Try bar layer if available, otherwise fall back to points
    if (typeof g.barLat === 'function') {
      g.barLat('lat')
        .barLng('lng')
        .barColor(r => TYPE_COLORS[r.type] || 'gray');
    } else {
      g.pointLat('lat')
        .pointLng('lng')
        .pointColor(r => TYPE_COLORS[r.type] || 'gray');
    }
    // Configure heatmap accessors if available
    if (typeof g.heatmapsData === 'function') {
      g.heatmapPointLat('lat')
        .heatmapPointLng('lng')
        // Initial weight; will be overridden by toggle-aware logic below
        .heatmapPointWeight(r => (r.attendees || 1))
        .heatmapTopAltitude(0.65)
        .heatmapsTransitionDuration(1200);
    }

    // Auto-rotate when idle
    const controls = g.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4; // slower spin
    }

    // Pause rotation on hover over data items
    if (typeof g.onBarHover === 'function') {
      g.onBarHover(obj => {
        const c = g.controls();
        if (c) c.autoRotate = !obj; // pause when hovering a bar
      });
    } else if (typeof g.onPointHover === 'function') {
      g.onPointHover(obj => {
        const c = g.controls();
        if (c) c.autoRotate = !obj; // pause when hovering a point
      });
    }

    globeRef.current = g;
    return () => globeRef.current && globeRef.current.dispose && globeRef.current.dispose();
  }, []);

  // Read initial settings from URL params
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const initialView = params.get('view');
      const daydreamParam = params.get('showDaydream');
      const projectedParam = params.get('useProjected');
      if (initialView === 'bars' || initialView === 'heatmap') setView(initialView);
      if (daydreamParam != null) setShowDaydream(!(daydreamParam.toLowerCase() === 'false' || daydreamParam === '0'));
      if (projectedParam != null) setUseProjected(!(projectedParam.toLowerCase() === 'false' || projectedParam === '0'));
    } catch {}
  }, []);

  // Keep URL params in sync with UI state
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('view', view);
      params.set('showDaydream', String(showDaydream));
      params.set('useProjected', String(useProjected));
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ''}`;
      window.history.replaceState(null, '', newUrl);
    } catch {}
  }, [view, showDaydream, useProjected]);

  // Update data when records change
  useEffect(() => {
    if (!globeRef.current) return;
    const g = globeRef.current;
    // Sizing follows toggle:
    // - Daydream: 1 when toggle OFF; when ON use Airtable's attendees field.
    // - Scrapyard/Counterspell: always use real attendees.
    const getCount = r => {
      if (r.type === 'Daydream') {
        if (!useProjected) return 1;
        return (r.attendees || 1);
      }
      return r.attendees || 1;
    };
  const scaleAltitude = r => Math.min(0.5, (getCount(r) / 300));
    // Filter records by coordinates and Daydream visibility
    const filtered = records
      .filter(r => typeof r.lat === 'number' && typeof r.lng === 'number')
      .filter(r => showDaydream || r.type !== 'Daydream');

    // Update labels and heatmap weights when toggle changes
    const labelFn = r => {
      if (r.type === 'Daydream') {
        if (useProjected) {
          const count = (r.attendees || 1);
          return `${r.name} (${count} ${count === 1 ? 'attendee' : 'attendees'})`;
        }
        return `${r.name} (1 participant)`;
      }
      const count = r.attendees || 1;
      return `${r.name} (${count} ${count === 1 ? 'attendee' : 'attendees'})`;
    };
    if (typeof g.barLabel === 'function') g.barLabel(labelFn);
    if (typeof g.pointLabel === 'function') g.pointLabel(labelFn);
  if (typeof g.heatmapPointWeight === 'function') g.heatmapPointWeight(r => getCount(r));

    if (view === 'heatmap' && typeof g.heatmapsData === 'function') {
      // Clear bars/points and show heatmap
      if (typeof g.barsData === 'function') g.barsData([]);
      if (typeof g.pointsData === 'function') g.pointsData([]);
      g.heatmapsData([filtered]);
    } else {
      // Clear heatmap and show bars/points
      if (typeof g.heatmapsData === 'function') g.heatmapsData([]);
      if (typeof g.barAltitude === 'function' && typeof g.barsData === 'function') {
        g.barAltitude(scaleAltitude).barsData(filtered);
      } else {
        g.pointAltitude(scaleAltitude).pointsData(filtered);
      }
    }
  }, [records, view, useProjected, showDaydream]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div id="globe" style={{ width: '100%', height: '100%' }} />
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#fff',
          fontSize: 22,
          fontWeight: 700,
          textShadow: '0 1px 3px rgba(0,0,0,0.6)'
        }}
      >
        Hack Club Hackathons
      </div>
      {/* View Toggle */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          gap: 8
        }}
      >
        <button
          onClick={() => setView('bars')}
          style={{
            background: view === 'bars' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
            color: '#111',
            border: 'none',
            padding: '6px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >Bars</button>
        <button
          onClick={() => setView('heatmap')}
          style={{
            background: view === 'heatmap' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
            color: '#111',
            border: 'none',
            padding: '6px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >Heatmap</button>
        <label style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.6)',
          color: '#111',
          padding: '6px 10px',
          borderRadius: 6,
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          <input type="checkbox" checked={useProjected} onChange={e => setUseProjected(e.target.checked)} style={{ marginRight: 6 }} />
          Use Daydream attendees
        </label>
        <label style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.6)',
          color: '#111',
          padding: '6px 10px',
          borderRadius: 6,
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          <input type="checkbox" checked={showDaydream} onChange={e => setShowDaydream(e.target.checked)} style={{ marginRight: 6 }} />
          Show Daydream events
        </label>
      </div>
      {/* Legend / Callout */}
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: 12,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 14,
          lineHeight: 1.4,
          boxShadow: '0 2px 6px rgba(0,0,0,0.35)'
        }}
      >
        {view === 'bars' ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Bigger bar = more attendees.</div>
            <div style={{ opacity: 0.9, marginBottom: 6 }}>
              Heights use real counts for Scrapyard/Counterspell. Daydream uses Airtable’s attendee count when toggled on; otherwise it is shown as 1.
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, background: 'green', display: 'inline-block', borderRadius: 2 }} />
                Scrapyard
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, background: 'purple', display: 'inline-block', borderRadius: 2 }} />
                Counterspell
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, background: 'blue', display: 'inline-block', borderRadius: 2 }} />
                Daydream
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Heatmap: brighter = more attendees.</div>
            <div style={{ opacity: 0.9, marginBottom: 6 }}>
              Aggregated density; Daydream uses Airtable’s attendee count when toggled on, else 1.
            </div>
            <div style={{ opacity: 0.85 }}>Note: Some entries may lack counts; weights default to 1 when missing.</div>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const API_BASE = process.env.REACT_APP_API_BASE || ((window?.location?.protocol && window?.location?.hostname)
      ? `${window.location.protocol}//${window.location.hostname}:4000`
      : '');
    fetch(`${API_BASE}/api/records`)
      .then(res => res.json())
      .then(setRecords);
    fetch(`${API_BASE}/api/status`).then(r => r.json()).then(setStatus).catch(() => {});
  }, []);
  return (
    <>
      <GlobeMap records={records} />
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          color: '#ccc',
          fontSize: 12,
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {status?.lastUpdated ? (
            <>Last updated: {new Date(status.lastUpdated).toLocaleString()}</>
          ) : (
            <>Last updated: —</>
          )}
        </div>
        <div style={{ pointerEvents: 'auto', textAlign: 'right' }}>
          Built with <span style={{ color: '#ff6b6b' }}>&lt;3</span> by <a href="https://leowilkin.com" target="_blank" rel="noreferrer" style={{ color: '#fff' }}>Leo</a> @ Hack Club
          {' '}•{' '}
          <a href="https://github.com/leowilkin/hackathons-map" target="_blank" rel="noreferrer" style={{ color: '#fff' }}>Open source</a>
        </div>
      </div>
    </>
  );
}

export default App;
