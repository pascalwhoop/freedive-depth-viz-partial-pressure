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
type SamplePoint = {
  timeS: number;
  depthM: number;
  ambientPressureAta: number;
  o2RemainingUnits: number;
  po2EffectiveMmHg: number;
  riskState: Risk;
};

type Preset = { label: string; params: DiveParams };

const presets: Preset[] = [
  { label: 'Easy shallow dive', params: { maxDepthM: 10, descentRateMps: 1, bottomTimeS: 15, ascentRateMps: 1, po2SurfaceStartMmHg: 100, o2StartUnits: 1, o2ConsumptionPerSecond: 0.0035, warningThresholdMmHg: 50, blackoutThresholdMmHg: 30 } },
  { label: 'Deep dive, safe margin', params: { maxDepthM: 20, descentRateMps: 1, bottomTimeS: 25, ascentRateMps: 0.9, po2SurfaceStartMmHg: 100, o2StartUnits: 1, o2ConsumptionPerSecond: 0.0041, warningThresholdMmHg: 50, blackoutThresholdMmHg: 30 } },
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

const nearestPoint = (series: SamplePoint[], t: number) => series.reduce((a, b) => (Math.abs(b.timeS - t) < Math.abs(a.timeS - t) ? b : a), series[0]);

export default function App() {
  const [preset, setPreset] = useState(2);
  const [params, setParams] = useState<DiveParams>(presets[2].params);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  const series = useMemo(() => generateDiveSeries(params), [params]);
  const normalized = useMemo(
    () => series.map((s) => ({ ...s, depthScaled: (s.depthM / params.maxDepthM) * 100, pressureScaled: (s.ambientPressureAta / (1 + params.maxDepthM / 10)) * 100, o2Scaled: (s.o2RemainingUnits / params.o2StartUnits) * 100, po2Scaled: (s.po2EffectiveMmHg / Math.max(1, params.po2SurfaceStartMmHg * (1 + params.maxDepthM / 10))) * 100 })),
    [params.maxDepthM, params.o2StartUnits, params.po2SurfaceStartMmHg, series]
  );
  const total = series.length ? series[series.length - 1].timeS : 0;
  const current = nearestPoint(series, t);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setT((prev) => (prev + total / 130 >= total ? total : prev + total / 130)), 100);
    return () => clearInterval(timer);
  }, [playing, total]);

  useEffect(() => {
    if (current && current.riskState !== 'normal') setPlaying(false);
  }, [current]);

  const update = <K extends keyof DiveParams>(k: K, v: number) => setParams((s) => ({ ...s, [k]: v }));
  const reset = () => { setT(0); setPlaying(false); };

  const explain = current.riskState === 'critical'
    ? 'Blackout risk zone: usable oxygen pressure is too low to reliably support consciousness.'
    : current.riskState === 'warning'
      ? 'Warning zone: pressure support is dropping fast while oxygen stores continue to fall.'
      : current.depthM > 10
        ? 'At depth, higher water pressure helps oxygen move from your lungs into your blood.'
        : 'Near surface, pressure support falls sharply. The same oxygen amount becomes less usable.';

  return <div className='app'>
    <header className='top card'>
      <div>
        <h1>Freedive Ascent Risk Visualizer</h1>
        <p>See the whole story on one timeline: oxygen is being used over time, and pressure support drops hardest in the last 10 m.</p>
      </div>
      <div className='topActions'>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={reset}>Reset</button>
      </div>
    </header>

    <section className='card focusChart'>
      <h2>Unified timeline (all signals layered)</h2>
      <p className='muted'>All lines are normalized to a 0–100 scale so you can compare shape and timing directly.</p>
      <ResponsiveContainer width='100%' height={360}>
        <LineChart data={normalized}>
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='timeS' type='number' domain={[0, 'dataMax']} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
          <YAxis domain={[0, 100]} label={{ value: 'Relative level (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <ReferenceArea y1={0} y2={40} fill='#fee2e2' fillOpacity={0.25} />
          <ReferenceLine x={t} stroke='#1d4ed8' strokeWidth={2} />
          <Line dataKey='depthScaled' name='Depth (relative)' stroke='#0369a1' dot={false} />
          <Line dataKey='pressureScaled' name='Water pressure (relative)' stroke='#7c3aed' dot={false} />
          <Line dataKey='o2Scaled' name='Oxygen remaining (%)' stroke='#0f766e' dot={false} />
          <Line dataKey='po2Scaled' name='Usable oxygen pressure (relative)' stroke='#dc2626' strokeWidth={2.4} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <label className='scrubber'><span>Time scrubber: {t.toFixed(1)}s</span><input type='range' min={0} max={total} step='0.1' value={t} onChange={(e) => setT(Number(e.target.value))} /></label>
    </section>

    <main className='layout'>
      <section>
        <details className='card' open>
          <summary>Scenario presets</summary>
          <label><span>Preset scenario</span><select value={preset} onChange={(e) => { const i = Number(e.target.value); setPreset(i); setParams(presets[i].params); reset(); }} aria-label='Preset'>{presets.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}</select></label>
        </details>

        <details className='card'>
          <summary>Advanced sliders (expand to edit)</summary>
          <section className='controls'>
            {([['maxDepthM', 'Max depth (m)', 5, 40], ['descentRateMps', 'Descent rate (m/s)', 0.4, 2], ['bottomTimeS', 'Bottom time (s)', 0, 90], ['ascentRateMps', 'Ascent rate (m/s)', 0.4, 2], ['po2SurfaceStartMmHg', 'Start usable oxygen pressure', 70, 130], ['o2ConsumptionPerSecond', 'Oxygen consumption', 0.001, 0.01], ['warningThresholdMmHg', 'Warning line', 35, 70], ['blackoutThresholdMmHg', 'Blackout risk line', 20, 50]] as const).map(([k, label, min, max]) => (
              <label key={k}><span>{label}</span><input type='range' min={min} max={max} step='0.1' value={params[k]} onChange={(e) => update(k, Number(e.target.value))} /><small>{params[k].toFixed(k.includes('Rate') || k.includes('Consumption') ? 2 : 0)}</small></label>
            ))}
          </section>
        </details>

        <details className='card' open>
          <summary>Why usable oxygen pressure matters (science)</summary>
          <ul>
            <li><strong>Lung-to-blood transfer:</strong> Oxygen moves from alveoli into blood because oxygen pressure in lungs is higher than in venous blood.</li>
            <li><strong>Pressure gradient drives diffusion:</strong> When usable oxygen pressure falls, that gradient shrinks, so less oxygen enters blood each second.</li>
            <li><strong>Hemoglobin loading/unloading:</strong> Blood must keep enough oxygen pressure to load in lungs and unload into tissues, especially brain tissue.</li>
            <li><strong>Near-surface risk:</strong> During ascent, ambient pressure falls quickly (2 ATA at 10 m to 1 ATA at surface), so the same oxygen amount produces much lower usable oxygen pressure.</li>
          </ul>
          <p className='muted'>This simulator is simplified for teaching and is not a medical device.</p>
        </details>
      </section>

      <aside className='panel card'>
        <h2>Current state</h2>
        <ul>
          <li>Depth: {current.depthM.toFixed(1)} m</li><li>Water pressure: {current.ambientPressureAta.toFixed(2)} ATA</li><li>Oxygen remaining: {((current.o2RemainingUnits / params.o2StartUnits) * 100).toFixed(0)}%</li><li>Usable oxygen pressure: {current.po2EffectiveMmHg.toFixed(1)} mmHg</li>
        </ul>
        <p><strong>Risk status:</strong> {current.riskState}</p>
        <p>{explain}</p>
        <p><strong>Double punch:</strong> You used oxygen over time, and now pressure support is disappearing.</p>
      </aside>
    </main>
  </div>;
}
