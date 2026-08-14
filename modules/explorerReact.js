import React from 'react';
import { createRoot } from 'react-dom/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { XYPlot, XAxis as RVXAxis, YAxis as RVYAxis, HorizontalGridLines, LineSeries } from 'react-vis';
import 'react-vis/dist/style.css';

/**
 * Simple React-based explorer that shows:
 * - Recharts line chart of average implied probability over sorted markets
 * - react-vis line chart of cumulative volume over the same index
 */
function buildSeries(markets) {
  if (!Array.isArray(markets) || markets.length === 0) return [];
  const sorted = [...markets]
    .filter(m => m && (m.currentProbability != null || m.finalProbability != null))
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });

  let cumVolume = 0;
  return sorted.map((m, idx) => {
    const p = m.currentProbability ?? m.finalProbability ?? 0.5;
    const v = Number(m.volume || 0);
    cumVolume += v;
    return {
      index: idx,
      probability: Number(p),
      cumulativeVolume: cumVolume,
      label: m.title || 'Untitled',
    };
  });
}

function MarketsRechartsView({ markets }) {
  const data = buildSeries(markets);
  if (!data.length) return <div style={{ fontSize: 12 }}>No market data for Recharts view.</div>;

  return (
    <div style={{ height: 260 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>Average implied probability across markets (Recharts)</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <XAxis dataKey="index" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fontSize: 10 }} />
          <Tooltip formatter={v => `${(Number(v) * 100).toFixed(1)}%`} labelFormatter={idx => `Market #${idx}`} />
          <Line type="monotone" dataKey="probability" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketsReactVisView({ markets }) {
  const series = buildSeries(markets);
  if (!series.length) return <div style={{ fontSize: 12 }}>No market data for react-vis view.</div>;

  const points = series.map(d => ({ x: d.index, y: d.cumulativeVolume }));

  return (
    <div style={{ height: 260, marginTop: 16 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>Cumulative volume by market index (react-vis)</div>
      <XYPlot width={500} height={220}>
        <HorizontalGridLines />
        <RVXAxis title="Market index" />
        <RVYAxis title="Cumulative volume" tickFormat={v => `${Math.round(v / 1000)}k`} />
        <LineSeries data={points} color="#16a34a" />
      </XYPlot>
    </div>
  );
}

export function mountExplorerReact(container, markets) {
  if (!container) return;
  const root = createRoot(container);
  root.render(
    <div style={{ padding: '8px 0' }}>
      <MarketsRechartsView markets={markets} />
      <MarketsReactVisView markets={markets} />
    </div>
  );
  return root;
}

