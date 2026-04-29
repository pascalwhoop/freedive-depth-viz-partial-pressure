import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type DiveParams = {
  maxDepthM: number;
  descentRateMps: number;
  bottomTimeS: number;
  ascentRateMps: number;
  po2SurfaceStartMmHg: number;
  o2StartUnits: number;
  o2ConsumptionPerSecond: number;
  warningThresholdMmHg: number;
  blackoutThresholdMmHg: number;
};

type Risk = 'normal' | 'warning' | 'critical';
type SamplePoint = { timeS: number; depthM: number; ambientPressureAta: number; o2RemainingUnits: number; po2EffectiveMmHg: number; riskState: Risk };

type Preset = { label: string; params: DiveParams };

const presets: Preset[] = [
  { label: 'Easy shallow dive', params: { maxDepthM: 10, descentRateMps: 1, bottomTimeS: 15, ascentRateMps: 1, po2SurfaceStartMmHg: 100, o2StartUnits: 1, o2ConsumptionPerSecond: 0.0035, warningThresholdMmHg: 50, blackoutThresholdMmHg: 30 } },
  { label: 'Deep dive, safe margin', params: { maxDepthM: 20, descentRateMps: 1, bottomTimeS: 25, ascentRateMps: 0.9, po2SurfaceStartMmHg: 100, o2StartUnits: 1, o2ConsumptionPerSecond: 0.0042, warningThresholdMmHg: 50, blackoutThresholdMmHg: 30 } },
  { label: 'Near-surface blackout example', params: { maxDepthM: 30, descentRateMps: 0.9, bottomTimeS: 30, ascentRateMps: 0.9, po2SurfaceStartMmHg: 100, o2StartUnits: 1, o2ConsumptionPerSecond: 0.0044, warningThresholdMmHg: 50, blackoutThresholdMmHg: 30 } },
  { label: 'Why the last 10 m matter', params: { maxDepthM: 30, descentRateMps: 1, bottomTimeS: 20, ascentRateMps: 1, po2SurfaceStartMmHg: 100, o2StartUnits: 1, o2ConsumptionPerSecond: 0.00417, warningThresholdMmHg: 50, blackoutThresholdMmHg: 30 } }
];

const ambientPressureAta = (depthM: number) => 1 + depthM / 10;
const riskState = (po2: number, p: DiveParams): Risk => (po2 < p.blackoutThresholdMmHg ? 'critical' : po2 < p.warningThresholdMmHg ? 'warning' : 'normal');

const generateDiveSeries = (params: DiveParams, step = 0.2): SamplePoint[] => {
  const descent = params.maxDepthM / params.descentRateMps;
  const ascent = params.maxDepthM / params.ascentRateMps;
  const total = descent + params.bottomTimeS + ascent;
  const points: SamplePoint[] = [];
  for (let t = 0; t <= total; t += step) {
    const depth = t <= descent ? params.maxDepthM * (t / descent) : t <= descent + params.bottomTimeS ? params.maxDepthM : params.maxDepthM * (1 - (t - descent - params.bottomTimeS) / ascent);
    const o2 = Math.max(0, params.o2StartUnits - params.o2ConsumptionPerSecond * t);
    const po2 = params.po2SurfaceStartMmHg * ambientPressureAta(depth) * (o2 / params.o2StartUnits);
    points.push({ timeS: t, depthM: depth, ambientPressureAta: ambientPressureAta(depth), o2RemainingUnits: o2, po2EffectiveMmHg: po2, riskState: riskState(po2, params) });
  }
  return points;
};

export default function App() {
  const [preset, setPreset] = useState(2);
  const [params, setParams] = useState<DiveParams>(presets[2].params);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  const series = useMemo(() => generateDiveSeries(params), [params]);
  const total = series.length ? series[series.length - 1].timeS : 0;
  const current = series.reduce((a, b) => (Math.abs(b.timeS - t) < Math.abs(a.timeS - t) ? b : a), series[0]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setT((prev) => (prev + total / 120 >= total ? total : prev + total / 120)), 100);
    return () => clearInterval(timer);
  }, [playing, total]);

  useEffect(() => {
    if (current && current.riskState !== 'normal') setPlaying(false);
  }, [current]);

  const update = <K extends keyof DiveParams>(k: K, v: number) => setParams((s) => ({ ...s, [k]: v }));
  const reset = () => { setT(0); setPlaying(false); };

  const explain = current.riskState === 'critical' ? 'Critical zone: remaining oxygen is now below blackout risk line near the surface.' : current.riskState === 'warning' ? 'Warning zone: as you ascend, water pressure support is dropping quickly in the last 10 m.' : current.depthM > 10 ? 'At this depth, water pressure is helping oxygen stay available.' : 'Near the surface, pressure support is disappearing fast.';

  return <div className='app'>
    <h1>Freedive Ascent Risk Visualizer</h1>
    <p>Educational simulator only — not a dive safety tool.</p>
    <div className='controls'>
      <select value={preset} onChange={(e) => { const i = Number(e.target.value); setPreset(i); setParams(presets[i].params); reset(); }} aria-label='Preset'>{presets.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}</select>
      {([['maxDepthM', 'Max depth', 5, 40], ['descentRateMps', 'Descent rate', 0.4, 2], ['bottomTimeS', 'Bottom time', 0, 90], ['ascentRateMps', 'Ascent rate', 0.4, 2], ['po2SurfaceStartMmHg', 'Start usable oxygen pressure', 70, 130], ['o2ConsumptionPerSecond', 'O2 consumption', 0.001, 0.01], ['warningThresholdMmHg', 'Warning', 35, 70], ['blackoutThresholdMmHg', 'Blackout risk line', 20, 50]] as const).map(([k, label, min, max]) => <label key={k}>{label}<input type='range' min={min} max={max} step='0.1' value={params[k]} onChange={(e) => update(k, Number(e.target.value))} /><span>{params[k].toFixed(k.includes('Rate') || k.includes('Consumption') ? 2 : 0)}</span></label>)}
      <button onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button><button onClick={reset}>Reset</button>
    </div>

    <label>Time scrubber <input type='range' min={0} max={total} step='0.1' value={t} onChange={(e) => setT(Number(e.target.value))} /></label>

    <div className='grid'>
      <Chart title='Depth vs time' data={series} y='depthM' yLabel='Depth (m)' invert last10 playhead={t} />
      <Chart title='Water pressure vs time' data={series} y='ambientPressureAta' yLabel='Pressure (ATA)' playhead={t} />
      <Chart title='Oxygen remaining' data={series.map((s) => ({ ...s, o2Pct: (s.o2RemainingUnits / params.o2StartUnits) * 100 }))} y='o2Pct' yLabel='O2 remaining (%)' playhead={t} />
      <Po2Chart data={series} params={params} playhead={t} />
    </div>
    <aside className='panel'>
      <h2>Current state</h2>
      <ul>
        <li>Depth: {current.depthM.toFixed(1)} m</li><li>Water pressure: {current.ambientPressureAta.toFixed(2)} ATA</li><li>Oxygen remaining: {((current.o2RemainingUnits / params.o2StartUnits) * 100).toFixed(0)}%</li><li>Usable oxygen pressure: {current.po2EffectiveMmHg.toFixed(1)} mmHg</li>
      </ul>
      <p><strong>Risk:</strong> {current.riskState}</p>
      <p>{explain}</p>
      <p><strong>Double punch</strong>: You used oxygen over time + pressure support disappears on ascent.</p>
    </aside>
  </div>;
}

function Chart({ title, data, y, yLabel, playhead, invert, last10 }: { title: string; data: any[]; y: string; yLabel: string; playhead: number; invert?: boolean; last10?: boolean }) {
  return <div className='card'><h3>{title}</h3><ResponsiveContainer width='100%' height={220}><LineChart data={data}><CartesianGrid strokeDasharray='3 3' /><XAxis dataKey='timeS' domain={[0, 'dataMax']} type='number' /><YAxis reversed={invert} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} /><Tooltip />{last10 && <ReferenceArea y1={0} y2={10} fill='#dbeafe' fillOpacity={0.5} />}<ReferenceLine x={playhead} stroke='#2563eb' /><Line type='monotone' dataKey={y} stroke='#0f766e' dot={false} /></LineChart></ResponsiveContainer></div>;
}

function Po2Chart({ data, params, playhead }: { data: SamplePoint[]; params: DiveParams; playhead: number }) {
  return <div className='card'><h3>Effective usable oxygen pressure</h3><ResponsiveContainer width='100%' height={220}><LineChart data={data}><CartesianGrid strokeDasharray='3 3' /><XAxis dataKey='timeS' domain={[0, 'dataMax']} type='number' /><YAxis label={{ value: 'mmHg', angle: -90, position: 'insideLeft' }} /><Tooltip /><Legend /><ReferenceLine y={params.warningThresholdMmHg} stroke='#f59e0b' label='Warning line' /><ReferenceLine y={params.blackoutThresholdMmHg} stroke='#dc2626' label='Blackout risk line' /><ReferenceLine x={playhead} stroke='#2563eb' /><Line dataKey='po2EffectiveMmHg' stroke='#16a34a' dot={false} /></LineChart></ResponsiveContainer></div>;
}
