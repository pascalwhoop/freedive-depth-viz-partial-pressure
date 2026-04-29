Spec: Web app to visualize why ascent becomes dangerous in the last 10 m of a freedive

1) Goal

Build a small educational web app that shows, over time, why a freediver can feel fine at depth and then become at risk near the surface.

The app should make one point clear:

The danger is not just “how much oxygen is left.”
It is that the remaining oxygen becomes less usable as pressure drops during ascent.

2) Audience

* New freedivers
* People without a STEM background
* Instructors who want a simple teaching aid

3) Core teaching outcome

The user should understand:

1. Oxygen is consumed over time during the dive.
2. Pressure increases with depth, which temporarily helps oxygen remain available.
3. During ascent, especially from 10 m to the surface, pressure drops sharply.
4. That pressure drop can push oxygen partial pressure below the level needed for consciousness.
5. So the final phase of ascent can be risky even if the diver seemed fine seconds earlier.

4) Non-goals

* Not a medical device
* Not a real dive planner
* Not a training recommendation engine
* Not trying to model every physiological detail accurately

Use a simple explanatory model, not a clinically exact one.

⸻

5) Primary user experience

Main flow

The user opens the app and sees:

* a dive profile over time
* a chart for oxygen remaining
* a chart for ambient pressure
* a chart for effective oxygen partial pressure
* a moving playhead / time scrubber
* a plain-language explanation panel that updates as the dive progresses

The user can:

* play the dive as an animation
* scrub back and forth in time
* adjust dive parameters
* switch between preset scenarios
* compare “stay at depth” vs “ascend now”

⸻

6) Main screen layout

A. Top area: scenario controls

Controls:

* Max depth (m)
* Descent rate (m/s)
* Bottom time (s)
* Ascent rate (m/s)
* Starting effective lung O2 pressure at surface (default ~100 mmHg)
* Oxygen consumption rate (simple normalized slider)
* Warning threshold (default 50 mmHg)
* Blackout threshold (default 30 mmHg)

Buttons:

* Play / pause
* Reset
* Presets dropdown
* Compare mode toggle

B. Center: synchronized charts

Chart 1: Depth vs time

* Y axis inverted: surface at top, deeper below
* Shows descent, bottom phase, ascent
* Shade the last 10 m during ascent

Chart 2: Ambient pressure vs time

* Formula: P_ambient_ATA = 1 + depth_m / 10
* Show pressure line in ATA

Chart 3: Oxygen reserve vs time

* Simple decreasing line
* Show as % or arbitrary units
* Label: “Oxygen remaining in body/lungs”

Chart 4: Effective oxygen partial pressure vs time

This is the key chart.

* Y axis in mmHg
* Show line for “available oxygen pressure”
* Draw horizontal lines for:
    * normal/safe band
    * warning threshold (~50 mmHg)
    * blackout threshold (~30 mmHg)
* Color the line:
    * green above warning
    * amber between warning and blackout
    * red below blackout

C. Right-side explanation panel

At the current time cursor, show:

* Current depth
* Current ambient pressure
* Oxygen remaining
* Effective O2 partial pressure
* Risk status

And a short plain-language explanation, e.g.:

* “At this depth, pressure is helping oxygen stay available.”
* “You are using oxygen, but pressure still keeps the effective oxygen pressure high enough.”
* “Now you are ascending. Pressure is dropping quickly.”
* “In the last 10 meters, pressure drops from 2 ATA to 1 ATA — a 50% drop.”
* “That means the same remaining oxygen becomes much less available.”
* “This is why blackout risk rises close to the surface.”

⸻

7) Required interaction modes

Mode 1: Animated single dive

Show one dive from start to finish.

Mode 2: Scrubber mode

User drags a timeline cursor and sees all values update instantly.

Mode 3: Compare mode

Two scenarios side-by-side:

Comparison A

* Same oxygen remaining
* Case 1: diver stays at 10 m
* Case 2: diver ascends to surface

Purpose: show that oxygen amount may be the same, but usable oxygen pressure drops during ascent.

Comparison B

* Two ascent speeds
* Slower ascent vs faster ascent

Comparison C

* Shallow safe dive
* Dive ending in blackout risk near surface

⸻

8) Suggested presets

Preset 1: Easy shallow dive

* 10 m
* short bottom time
* safe return

Preset 2: Deep dive, safe margin

* 20 m
* moderate bottom time

Preset 3: Near-surface blackout example

* 30 m
* long bottom time
* enough oxygen to look okay at depth
* falls below threshold near surface

Preset 4: “Why the last 10 m matter”

* specifically tuned so the effective O2 curve is fine at 10 m and critical at surface

⸻

9) Visual model / simplified physics

Use a simplified educational model.

9.1 Ambient pressure

P_ambient_ATA(t) = 1 + depth_m(t) / 10

Examples:

* 0 m -> 1 ATA
* 10 m -> 2 ATA
* 20 m -> 3 ATA
* 30 m -> 4 ATA

9.2 Oxygen reserve over time

Simplest version:

O2_remaining(t) = max(0, O2_start - consumption_rate * t)

Where:

* O2_start is normalized, e.g. 1.0
* consumption_rate is a configurable constant

Alternative:

* use % remaining instead of physical units

9.3 Effective oxygen partial pressure

Use a pedagogical formula:

PO2_effective(t) = PO2_surface_start * P_ambient_ATA(t) * (O2_remaining(t) / O2_start)

Where:

* PO2_surface_start default = 100 mmHg

This is not meant to be physiologically perfect. It is meant to show the core idea:

* more depth -> higher pressure -> higher effective PO2
* more time -> less oxygen remaining -> lower effective PO2
* ascent -> pressure drops -> effective PO2 drops fast

9.4 Risk bands

Default thresholds:

* Normal: > 50 mmHg
* Warning: 30–50 mmHg
* Critical / blackout risk: < 30 mmHg

These should be editable in advanced settings.

⸻

10) Key visual story the app must tell

At some point in the preset scenario, the values should look like this:

Depth	Ambient pressure	Effective PO2
30 m	4 ATA	120 mmHg
20 m	3 ATA	90 mmHg
10 m	2 ATA	60 mmHg
5 m	1.5 ATA	45 mmHg
Surface	1 ATA	30 mmHg

That table is the heart of the explanation.

The app should visually show:

* the diver is okay at depth
* then enters warning range near 5–10 m
* then may hit blackout threshold near the surface

⸻

11) Copy / plain-language text requirements

All labels should be non-technical by default.

Use these labels

Instead of:

* “alveolar oxygen tension”
    Use:
* “usable oxygen pressure”

Instead of:

* “ambient hydrostatic pressure”
    Use:
* “water pressure”

Instead of:

* “hypoxic blackout threshold”
    Use:
* “blackout risk line”

Tooltip examples

On oxygen remaining

“This is how much oxygen you still have left.”

On pressure

“Deeper water increases pressure. Higher pressure helps oxygen remain available.”

On effective oxygen partial pressure

“This is the key number. It represents how strongly oxygen can still reach your blood and brain.”

On final 10 meters

“From 10 m to the surface, pressure drops from 2 ATA to 1 ATA. That cuts the pressure support in half.”

⸻

12) UX details

Animation

* Default animation length: 10–15 seconds
* Smooth playhead across all charts
* Pause automatically when entering warning or blackout zone

Highlight events

Show callouts when:

* bottom phase starts
* ascent starts
* diver enters last 10 m
* effective PO2 crosses warning threshold
* effective PO2 crosses blackout threshold

Explain the “double punch”

Add a pinned annotation:

* “You used oxygen over time”
* “Now the pressure supporting that oxygen is disappearing”

⸻

13) Advanced mode (optional)

If enabled, expose:

* actual units for oxygen reserve
* customizable thresholds
* configurable resting vs high-effort oxygen consumption
* separate lines for:
    * oxygen remaining
    * pressure effect
    * resulting effective PO2

This mode is optional. Default experience should stay simple.

⸻

14) Accessibility requirements

* Keyboard accessible controls
* Screen-reader friendly labels
* Don’t rely on color alone; use icons / patterns
* Mobile responsive
* Tooltips available on tap for mobile

⸻

15) Technical spec

Frontend

* React
* TypeScript
* Charting: D3, Recharts, or Plotly
* State: Zustand or React state

Data model

type DiveParams = {
  maxDepthM: number
  descentRateMps: number
  bottomTimeS: number
  ascentRateMps: number
  po2SurfaceStartMmHg: number
  o2StartUnits: number
  o2ConsumptionPerSecond: number
  warningThresholdMmHg: number
  blackoutThresholdMmHg: number
}
type SamplePoint = {
  timeS: number
  depthM: number
  ambientPressureAta: number
  o2RemainingUnits: number
  po2EffectiveMmHg: number
  riskState: "normal" | "warning" | "critical"
}

Core functions

function depthAtTime(t: number, params: DiveParams): number
function ambientPressureAta(depthM: number): number
function o2RemainingAtTime(t: number, params: DiveParams): number
function po2EffectiveAtTime(t: number, params: DiveParams): number
function riskState(po2MmHg: number, params: DiveParams): "normal" | "warning" | "critical"
function generateDiveSeries(params: DiveParams, stepMs = 100): SamplePoint[]

Performance

* Precompute samples for the selected scenario
* Recompute on parameter change
* Target 60 fps animation

⸻

16) MVP scope

Must have

* Single dive simulation
* 4 charts
* timeline play/scrub
* editable dive parameters
* warning and blackout thresholds
* explanation panel
* at least 3 presets

Nice to have

* compare mode
* annotations / guided walkthrough
* shareable URL with encoded parameters
* export chart as PNG
* mobile-optimized storytelling mode

⸻

17) Success criteria

A user should be able to answer “yes” to these after using it:

1. “I understand that oxygen is being used up over time.”
2. “I understand that depth pressure temporarily helps oxygen remain available.”
3. “I understand that the last 10 m are risky because pressure drops the most there in relative terms.”
4. “I understand that the same remaining oxygen can be enough at depth but not enough near the surface.”

⸻

18) Suggested one-line disclaimer

This is an educational simulator, not a medical or dive safety tool. Always train with a qualified instructor and never freedive alone.
