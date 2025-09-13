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
        .barColor(r => TYPE_COLORS[r.type] || 'gray')
        .barLabel(r => `${r.name}${r.attendees ? ` (${r.attendees} attendees)` : ''}`);
    } else {
      g.pointLat('lat')
        .pointLng('lng')
        .pointColor(r => TYPE_COLORS[r.type] || 'gray')
        .pointLabel(r => `${r.name}${r.attendees ? ` (${r.attendees} attendees)` : ''}`);
    }
    // Configure heatmap accessors if available
    if (typeof g.heatmapsData === 'function') {
      g.heatmapPointLat('lat')
        .heatmapPointLng('lng')
        .heatmapPointWeight('attendees')
        .heatmapTopAltitude(0.65)
        .heatmapsTransitionDuration(1200);
    }

    // Auto-rotate when idle
    const controls = g.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6; // tweak speed
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

  // Update data when records change
  useEffect(() => {
    if (!globeRef.current) return;
    const g = globeRef.current;
    const scaleAltitude = r => Math.min(0.5, ((r.attendees || 1) / 300));
    const filtered = records.filter(r => typeof r.lat === 'number' && typeof r.lng === 'number');

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
  }, [records, view]);

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
            <div style={{ opacity: 0.9 }}>Aggregated density of hack clubbers at hackathons.</div>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [records, setRecords] = useState([]);
  useEffect(() => {
    const API_BASE = process.env.REACT_APP_API_BASE || ((window?.location?.protocol && window?.location?.hostname)
      ? `${window.location.protocol}//${window.location.hostname}:4000`
      : '');
    fetch(`${API_BASE}/api/records`)
      .then(res => res.json())
      .then(setRecords);
  }, []);
  return <GlobeMap records={records} />;
}

export default App;
