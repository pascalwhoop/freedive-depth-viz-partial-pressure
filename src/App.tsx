import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
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
  const [compare, setCompare] = useState(false);

  const series = useMemo(() => generateDiveSeries(params), [params]);
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

  const depth10mPoint = series.find((p) => p.depthM <= 10 && p.timeS > params.maxDepthM / params.descentRateMps + params.bottomTimeS);
  const surfacePoint = series[series.length - 1];

  const compareSameO2 = useMemo(() => {
    if (!depth10mPoint) return null;
    const o2Ratio = depth10mPoint.o2RemainingUnits / params.o2StartUnits;
    return {
      at10m: params.po2SurfaceStartMmHg * 2 * o2Ratio,
      atSurface: params.po2SurfaceStartMmHg * 1 * o2Ratio,
      o2Pct: o2Ratio * 100
    };
  }, [depth10mPoint, params]);

  const explain = current.riskState === 'critical'
    ? 'Blackout risk zone: pressure support has dropped so much that your usable oxygen pressure is now critically low.'
    : current.riskState === 'warning'
      ? 'Warning zone: during ascent, water pressure is dropping quickly, especially in the last 10 m.'
      : current.depthM > 10
        ? 'At this depth, water pressure is helping oxygen stay available even while oxygen is being used.'
        : 'Near the surface, pressure support disappears rapidly. The same oxygen can suddenly become less usable.';

  return <div className='app'>
    <header className='top'>
      <h1>Freedive Ascent Risk Visualizer</h1>
      <p>This is an educational simulator, not a medical or dive safety tool. Always train with a qualified instructor and never freedive alone.</p>
    </header>

    <section className='controls'>
      <label><span>Preset scenario</span><select value={preset} onChange={(e) => { const i = Number(e.target.value); setPreset(i); setParams(presets[i].params); reset(); }} aria-label='Preset'>{presets.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}</select></label>
      {([['maxDepthM', 'Max depth (m)', 5, 40], ['descentRateMps', 'Descent rate (m/s)', 0.4, 2], ['bottomTimeS', 'Bottom time (s)', 0, 90], ['ascentRateMps', 'Ascent rate (m/s)', 0.4, 2], ['po2SurfaceStartMmHg', 'Start usable oxygen pressure', 70, 130], ['o2ConsumptionPerSecond', 'Oxygen consumption', 0.001, 0.01], ['warningThresholdMmHg', 'Warning threshold', 35, 70], ['blackoutThresholdMmHg', 'Blackout risk line', 20, 50]] as const).map(([k, label, min, max]) => (
        <label key={k}><span>{label}</span><input type='range' min={min} max={max} step='0.1' value={params[k]} onChange={(e) => update(k, Number(e.target.value))} /><small>{params[k].toFixed(k.includes('Rate') || k.includes('Consumption') ? 2 : 0)}</small></label>
      ))}
      <div className='buttonRow'>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={reset}>Reset</button>
        <button onClick={() => setCompare((v) => !v)} aria-pressed={compare}>{compare ? 'Hide compare' : 'Compare mode'}</button>
      </div>
    </section>

    <label className='scrubber'><span>Time scrubber: {t.toFixed(1)}s</span><input type='range' min={0} max={total} step='0.1' value={t} onChange={(e) => setT(Number(e.target.value))} /></label>

    <main className='layout'>
      <section className='grid'>
        <Chart title='Depth vs time' data={series} y='depthM' yLabel='Depth (m)' invert last10 playhead={t} />
        <Chart title='Water pressure vs time' data={series} y='ambientPressureAta' yLabel='Pressure (ATA)' playhead={t} />
        <Chart title='Oxygen remaining in body/lungs' data={series.map((s) => ({ ...s, o2Pct: (s.o2RemainingUnits / params.o2StartUnits) * 100 }))} y='o2Pct' yLabel='Oxygen remaining (%)' playhead={t} />
        <Po2Chart data={series} params={params} playhead={t} />
      </section>

      <aside className='panel'>
        <h2>Current state</h2>
        <ul>
          <li>Depth: {current.depthM.toFixed(1)} m</li><li>Water pressure: {current.ambientPressureAta.toFixed(2)} ATA</li><li>Oxygen remaining: {((current.o2RemainingUnits / params.o2StartUnits) * 100).toFixed(0)}%</li><li>Usable oxygen pressure: {current.po2EffectiveMmHg.toFixed(1)} mmHg</li>
        </ul>
        <p><strong>Risk status:</strong> {current.riskState}</p>
        <p>{explain}</p>
        <p><strong>Last 10 m:</strong> Pressure drops from 2 ATA to 1 ATA, so pressure support is cut in half.</p>
        <p><strong>Double punch:</strong> You used oxygen over time, and pressure support disappears on ascent.</p>
      </aside>
    </main>

    {compare && compareSameO2 && <section className='compare card'>
      <h3>Compare mode: same oxygen, different depth</h3>
      <p>With about {compareSameO2.o2Pct.toFixed(0)}% oxygen remaining, usable oxygen pressure is {compareSameO2.at10m.toFixed(1)} mmHg at 10 m but only {compareSameO2.atSurface.toFixed(1)} mmHg at the surface.</p>
      <p>This shows why you can feel fine at 10 m and then enter risk near the surface.</p>
    </section>}

    <section className='card'>
      <h3>Key story values (example target)</h3>
      <p>At ~30 m: 4 ATA, ~120 mmHg • 20 m: 3 ATA, ~90 mmHg • 10 m: 2 ATA, ~60 mmHg • 5 m: 1.5 ATA, ~45 mmHg • surface: 1 ATA, ~30 mmHg.</p>
      {depth10mPoint && surfacePoint && <p>Current run: at 10 m ≈ {depth10mPoint.po2EffectiveMmHg.toFixed(1)} mmHg, at surface ≈ {surfacePoint.po2EffectiveMmHg.toFixed(1)} mmHg.</p>}
    </section>
  </div>;
}

function Chart({ title, data, y, yLabel, playhead, invert, last10 }: { title: string; data: any[]; y: string; yLabel: string; playhead: number; invert?: boolean; last10?: boolean }) {
  return <div className='card'><h3>{title}</h3><ResponsiveContainer width='100%' height={230}><LineChart data={data}><CartesianGrid strokeDasharray='3 3' /><XAxis dataKey='timeS' domain={[0, 'dataMax']} type='number' /><YAxis reversed={invert} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} /><Tooltip />{last10 && <ReferenceArea y1={0} y2={10} fill='#dbeafe' fillOpacity={0.5}><Label position='insideTopRight' value='last 10 m' /></ReferenceArea>}<ReferenceLine x={playhead} stroke='#2563eb' /><Line type='monotone' dataKey={y} stroke='#0f766e' dot={false} /></LineChart></ResponsiveContainer></div>;
}

function Po2Chart({ data, params, playhead }: { data: SamplePoint[]; params: DiveParams; playhead: number }) {
  const firstWarning = data.find((d) => d.po2EffectiveMmHg <= params.warningThresholdMmHg);
  return <div className='card'><h3>Usable oxygen pressure (key chart)</h3><ResponsiveContainer width='100%' height={230}><LineChart data={data}><CartesianGrid strokeDasharray='3 3' /><XAxis dataKey='timeS' domain={[0, 'dataMax']} type='number' /><YAxis label={{ value: 'mmHg', angle: -90, position: 'insideLeft' }} /><Tooltip /><Legend /><ReferenceLine y={params.warningThresholdMmHg} stroke='#f59e0b' label='Warning line' /><ReferenceLine y={params.blackoutThresholdMmHg} stroke='#dc2626' label='Blackout risk line' /><ReferenceLine x={playhead} stroke='#2563eb' /><Line dataKey='po2EffectiveMmHg' stroke='#16a34a' dot={false} />{firstWarning && <ReferenceDot x={firstWarning.timeS} y={firstWarning.po2EffectiveMmHg} r={4} fill='#f59e0b' stroke='none' />}</LineChart></ResponsiveContainer></div>;
}
