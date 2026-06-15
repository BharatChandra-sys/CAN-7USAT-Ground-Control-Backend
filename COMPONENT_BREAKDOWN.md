# Component Breakdown for Stitch/Designer

## Quick Reference Guide

---

## LAYOUT GRID

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TOP HEADER (50px)                                │
│  🚀 CanSat Ground Control          [TELEM] [PACKETS] [RATE] [UPTIME]   │
└─────────────────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────┬────────────────────┐
│          │                                          │                    │
│  LEFT    │           CENTER COLUMN                  │   RIGHT COLUMN     │
│ COLUMN   │                                          │                    │
│ 150px    │                                          │      250px         │
│          │                                          │                    │
│ ┌──────┐ │ ┌──────────────────────────────────────┐ │ ┌────────────────┐ │
│ │FLIGHT│ │ │    PRIMARY TELEMETRY (2x2)           │ │ │    VEHICLE     │ │
│ │STATE │ │ │  [ALT] [VEL] [MAX] [TIME]            │ │ │  ORIENTATION   │ │
│ │      │ │ └──────────────────────────────────────┘ │ │   [ROCKET]     │ │
│ └──────┘ │                                          │ │                │ │
│          │ ┌──────────────────────────────────────┐ │ └────────────────┘ │
│ ┌──────┐ │ │                                      │ │                    │
│ │VEHIC │ │ │     ALTITUDE PROFILE CHART           │ │ ┌────────────────┐ │
│ │STATUS│ │ │                                      │ │ │  QUATERNION    │ │
│ │ 2x2  │ │ └──────────────────────────────────────┘ │ │   W X Y Z      │ │
│ └──────┘ │                                          │ └────────────────┘ │
│          │ ┌──────────────────────────────────────┐ │                    │
│ ┌──────┐ │ │                                      │ │ ┌────────────────┐ │
│ │CMND &│ │ │     VELOCITY PROFILE CHART           │ │ │    SYSTEM      │ │
│ │CNTRL │ │ │                                      │ │ │  DIAGNOSTICS   │ │
│ │      │ │ └──────────────────────────────────────┘ │ │                │ │
│ └──────┘ │                                          │ └────────────────┘ │
│          │                                          │                    │
│ ┌──────┐ │                                          │                    │
│ │ GPS  │ │                                          │                    │
│ │POSIT │ │                                          │                    │
│ └──────┘ │                                          │                    │
└──────────┴──────────────────────────────────────────┴────────────────────┘
```

---

## COLOR SWATCHES

### Background Colors
```
Main Background:    ████  #c8c8c8
Panel Background:   ████  #e8e8e8
Panel Header:       ████  #c0c0c0
White:              ████  #ffffff
Black:              ████  #000000
```

### Status Colors
```
Connected:          ████  #d4edda (light green)
Disconnected:       ████  #f8d7da (light red)
Safe:               ████  #c8ffc8 (bright green)
Armed:              ████  #ffc8c8 (bright red)
```

### Rocket Colors
```
Nose (Blue):        ████  #4a90e2
Recovery (Red):     ████  #e74c3c
Payload (Gray):     ████  #a0a0a0
Avionics (Red):     ████  #e74c3c
Engine (Dark):      ████  #606060
```

---

## ROCKET DIAGRAM DETAILED

### Exact SVG Structure (120x280px viewBox)

```
     45  60  75  (x-coordinates)
      │   │   │
  30  ─   ▲   ─  ← Nose tip
      │  /│\  │
  40  │ / │ \ │
      │/  │  \│
  70  ├───┴───┤  ← Nose base / Body start
      │       │
  90  │  RED  │  ← Recovery section
      │       │
 125  ├───────┤
      │       │
 140  │ GRAY  │  ← Payload section
      │       │
 160  ├───────┤
      │       │
 175  │  RED  │  ← Avionics section
      │       │
 185  ├───────┤
      │ DARK  │
 200  │ GRAY  │  ← Engine section
      │       │
 210  ├───────┤
 222  ▌     ▐   ← Nozzles (2 red rectangles)
```

### Rocket Component Coordinates

**Nose Cone (Triangle)**:
- Points: (45,70), (75,70), (60,30)
- Fill: #4a90e2
- Stroke: #000, 2px

**Body (Rectangle)**:
- x: 45, y: 70
- Width: 30, Height: 130
- Fill: #a0a0a0
- Stroke: #000, 2px

**Recovery Section (Rectangle)**:
- x: 45, y: 90
- Width: 30, Height: 35
- Fill: #e74c3c
- Stroke: #000, 2px

**Payload Section (Rectangle)**:
- x: 45, y: 125
- Width: 30, Height: 35
- Fill: #a0a0a0
- Stroke: #000, 2px

**Avionics Section (Rectangle)**:
- x: 45, y: 160
- Width: 30, Height: 25
- Fill: #e74c3c
- Stroke: #000, 2px

**Engine Section (Rectangle)**:
- x: 47, y: 185
- Width: 26, Height: 25
- Fill: #606060
- Stroke: #000, 2px

**Left Fin (Triangle)**:
- Points: (35,170), (45,190), (45,170)
- Fill: #606060
- Stroke: #000, 2px

**Right Fin (Triangle)**:
- Points: (75,170), (75,190), (85,170)
- Fill: #606060
- Stroke: #000, 2px

**Center Fin (Diamond)**:
- Points: (50,165), (60,155), (70,165), (60,175)
- Fill: #606060
- Stroke: #000, 2px

**Left Nozzle (Rectangle)**:
- x: 50, y: 210
- Width: 7, Height: 12
- Fill: #e74c3c
- Stroke: #000, 1px

**Right Nozzle (Rectangle)**:
- x: 63, y: 210
- Width: 7, Height: 12
- Fill: #e74c3c
- Stroke: #000, 1px

**Compartment Lines (Dashed)**:
- Line 1: (46,110) to (74,110)
- Line 2: (46,145) to (74,145)
- Stroke: #000, 1px, dash-array: 2,2

**Labels (Text)**:
- "NOSE" at (85, 50), 9px, bold
- "RECOVERY" at (85, 105), 9px, bold
- "PAYLOAD" at (85, 140), 9px, bold
- "AVIONICS" at (85, 175), 9px, bold
- "ENGINE" at (85, 200), 9px, bold

**Orientation Indicator (Top Left)**:
- Circle: center (20, 50), radius 12
- Arrow: line from (20, 42) to (20, 38)
- Arrow head: triangle at (20, 35)
- Label "UP" at (20, 70), 8px

---

## PANEL SPECIFICATIONS

### Panel Template
```css
.panel {
  background: #e8e8e8;
  border: 3px solid #000;
  display: flex;
  flex-direction: column;
}

.panel-header {
  background: #c0c0c0;
  color: #000;
  padding: 0.4rem 0.6rem;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  border-bottom: 3px solid #000;
  letter-spacing: 1px;
}
```

---

## GRID LAYOUTS

### 2x2 Grid Template (Telemetry, Vehicle Status)
```css
.grid-2x2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  background: #000;
}

.grid-cell {
  background: #fff;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

### 4-Cell Grid Template (Quaternion)
```css
.grid-4cell {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  background: #000;
}

.grid-cell {
  background: #fff;
  padding: 0.4rem 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

---

## BUTTON STYLES

### Standard Button
```css
.cmd-btn {
  padding: 0.6rem;
  font-size: 0.6rem;
  font-weight: bold;
  text-transform: uppercase;
  border: none;
  background: #d0d0d0;
  color: #000;
  cursor: pointer;
}

.cmd-btn:hover {
  background: #b8b8b8;
}
```

### ARM Button (Red)
```css
.cmd-btn.arm {
  background: #ffb0b0;
}
```

### DISARM Button (Green)
```css
.cmd-btn.disarm {
  background: #b0ffb0;
}
```

---

## TEXT STYLES

### Header Text
```css
font-size: 0.7rem;
font-weight: bold;
text-transform: uppercase;
letter-spacing: 1px;
color: #000;
```

### Large Display Text (Flight State)
```css
font-size: 1.8rem;
font-weight: bold;
letter-spacing: 2px;
color: #d0d0d0;
text-align: center;
```

### Telemetry Value
```css
font-size: 1.4rem;
font-weight: bold;
font-family: 'Courier New', monospace;
color: #d0d0d0;
```

### Label Text
```css
font-size: 0.55rem;
font-weight: bold;
text-transform: uppercase;
color: #666;
```

### Status Value
```css
font-size: 0.7rem;
font-weight: bold;
font-family: 'Courier New', monospace;
color: #000;
```

---

## CHART SPECIFICATIONS

### uPlot Configuration
```javascript
{
  width: containerWidth,
  height: 200,
  scales: {
    x: { time: false },
    y: { auto: true }
  },
  series: [
    { label: 'Time (s)' },
    {
      label: 'Value',
      stroke: '#000',
      width: 2,
      fill: 'rgba(0,0,0,0.1)'
    }
  ],
  axes: [
    {
      stroke: '#000',
      grid: { stroke: '#ccc', width: 1 }
    },
    {
      stroke: '#000',
      grid: { stroke: '#ccc', width: 1 }
    }
  ]
}
```

---

## STATUS INDICATOR STATES

### Connected State
```
Background: #d4edda (light green)
Border: 2px solid #000
Text: "CONNECTED"
```

### Disconnected State
```
Background: #f8d7da (light red)
Border: 2px solid #000
Text: "DISCONNECTED"
```

### Safe State
```
Background: #c8ffc8 (bright green)
Text: "SAFE"
```

### Armed State
```
Background: #ffc8c8 (bright red)
Text: "ARMED"
```

---

## SPACING SYSTEM

```
Extra Small:  0.25rem (4px)
Small:        0.5rem  (8px)
Medium:       0.75rem (12px)
Large:        1rem    (16px)
Extra Large:  1.5rem  (24px)
```

---

## BORDER SYSTEM

```
Thin:    1px solid #000
Medium:  2px solid #000
Thick:   3px solid #000
Dashed:  1px dashed #000 (dash-array: 2,2)
```

---

## SHADOW SYSTEM

```
None:    none
Light:   0 1px 2px rgba(0,0,0,0.05)
Medium:  0 2px 4px rgba(0,0,0,0.1)
Heavy:   0 4px 8px rgba(0,0,0,0.15)
```

---

## ANIMATION/TRANSITION

```
Fast:    0.1s ease
Normal:  0.15s ease
Slow:    0.3s ease
```

---

## RESPONSIVE BREAKPOINTS

```
Minimum:     1024px x 768px
Recommended: 1920px x 1080px (Full HD)
Maximum:     No limit (scales up)
```

---

## Z-INDEX LAYERS

```
Base:        0
Panels:      1
Headers:     2
Overlays:    10
Modals:      100
```

---

## ACCESSIBILITY

### Minimum Touch Targets
```
Buttons:     44px x 44px (minimum)
Links:       44px x 44px (minimum)
```

### Contrast Ratios
```
Normal Text:  4.5:1 minimum
Large Text:   3:1 minimum
UI Elements:  3:1 minimum
```

---

## EXPORT ASSETS NEEDED

1. **Rocket SVG** - Complete vector file
2. **Logo/Icon** - 🚀 emoji or custom icon
3. **Font Files** - Arial (system), Courier New (system)
4. **Color Palette** - All hex codes
5. **Component Screenshots** - Each panel individually
6. **Full Layout Screenshot** - Complete interface

---

## IMPLEMENTATION CHECKLIST

- [ ] Set up React + TypeScript project
- [ ] Install dependencies (Zustand, uPlot)
- [ ] Create layout grid structure
- [ ] Build top header component
- [ ] Build left column panels
- [ ] Build center column panels
- [ ] Build right column panels
- [ ] Create rocket SVG component
- [ ] Implement WebSocket connection
- [ ] Add real-time data updates
- [ ] Style all components
- [ ] Test responsiveness
- [ ] Test data flow
- [ ] Optimize performance
- [ ] Cross-browser testing

---

**Quick Start Command**:
```bash
npm install
npm run dev
```

**Backend Start**:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

---

**Contact**: Development Team
**Version**: 1.0
**Date**: 2026-04-28
