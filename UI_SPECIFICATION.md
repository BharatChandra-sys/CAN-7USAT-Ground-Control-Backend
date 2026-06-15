# CAN-7USAT Ground Control UI Specification

## Complete UI Component Documentation

---

## 1. OVERALL LAYOUT

### Grid Structure
```
┌─────────────────────────────────────────────────────────────┐
│                      TOP HEADER (50px)                       │
├──────────┬────────────────────────────────┬─────────────────┤
│          │                                │                 │
│  LEFT    │         CENTER COLUMN          │  RIGHT COLUMN   │
│ COLUMN   │                                │                 │
│ (150px)  │          (flexible)            │    (250px)      │
│          │                                │                 │
└──────────┴────────────────────────────────┴─────────────────┘
```

### Dimensions
- **Total Height**: 100vh (full viewport)
- **Total Width**: 100vw (full viewport)
- **Left Column**: 150px fixed width
- **Center Column**: Flexible (remaining space)
- **Right Column**: 250px fixed width
- **Gap between columns**: 2px black
- **Background**: #c8c8c8 (light gray)

---

## 2. TOP HEADER COMPONENT

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 🚀 CanSat Ground Control                    [STATUS BOXES]  │
│    CAN-7USAT Mission Control                                │
└─────────────────────────────────────────────────────────────┘
```

### Specifications
- **Height**: 50px
- **Background**: #e8e8e8
- **Border Bottom**: 3px solid black
- **Padding**: 0.5rem 1rem

### Elements

#### Mission Title (Left Side)
- **Logo**: 🚀 emoji (1.5rem)
- **Title**: "CanSat Ground Control" (1rem, bold, black)
- **Subtitle**: "CAN-7USAT Mission Control" (0.7rem, #666)

#### Status Indicators (Right Side)
4 status boxes in a row:

1. **TELEMETRY Box**
   - Label: "TELEMETRY" (0.6rem, bold, uppercase)
   - Value: "CONNECTED" or "DISCONNECTED" (0.75rem, bold)
   - Background: #d4edda (green) when connected, #f8d7da (red) when disconnected
   - Border: 2px solid black
   - Min-width: 75px

2. **PACKETS Box**
   - Label: "PACKETS"
   - Value: Number (e.g., "23347")
   - Background: white
   - Border: 2px solid black

3. **RATE Box**
   - Label: "RATE"
   - Value: "10.0 Hz"
   - Background: white
   - Border: 2px solid black

4. **UPTIME Box**
   - Label: "UPTIME"
   - Value: "MM:SS" format (e.g., "55:52")
   - Background: white
   - Border: 2px solid black

---

## 3. LEFT COLUMN COMPONENTS

### 3.1 FLIGHT STATE PANEL (200px height)

```
┌─────────────────────┐
│   FLIGHT STATE      │ ← Header
├─────────────────────┤
│                     │
│     LANDED          │ ← Current State (large)
│                     │
├─────────────────────┤
│ ● PRE_FLIGHT        │ ← State List
│ ● BOOST             │
│ ● COAST             │
│ ● APOGEE            │
│ ● DESCENT           │
│ ● LANDED            │
└─────────────────────┘
```

**Header**:
- Background: #c0c0c0
- Text: "FLIGHT STATE" (0.7rem, bold, uppercase)
- Border-bottom: 3px solid black

**Current State Box**:
- Font-size: 1.8rem
- Font-weight: bold
- Color: #d0d0d0 (light gray text)
- Background: white
- Border: 4px solid black
- Padding: 1.5rem 0.5rem
- Letter-spacing: 2px
- Text-align: center

**State List**:
- Each item has a bullet (●) and state name
- Active state: opacity 1, bold
- Inactive states: opacity 0.3
- Font-size: 0.65rem
- Bullet: 12px circle, black when active, #ccc when inactive

---

### 3.2 VEHICLE STATUS PANEL (110px height)

```
┌─────────────────────┐
│  VEHICLE STATUS     │
├──────────┬──────────┤
│ VEHICLE  │  POWER   │
│   ARM    │          │
│  SAFE    │ NOMINAL  │
├──────────┼──────────┤
│ DROGUE   │   MAIN   │
│          │          │
│  READY   │  READY   │
└──────────┴──────────┘
```

**2x2 Grid Layout**:
- Gap: 2px black
- Each cell background: white
- Cell padding: 0.5rem 0.25rem

**Cell Structure**:
- Label: 0.55rem, bold, uppercase
- Value: 0.7rem, bold

**Special Colors**:
- SAFE: background #c8ffc8 (light green)
- ARMED: background #ffc8c8 (light red)

---

### 3.3 COMMAND & CONTROL PANEL (150px height)

```
┌─────────────────────┐
│ COMMAND & CONTROL   │
├─────────────────────┤
│   ARM VEHICLE       │ ← Button (red when arming)
├─────────────────────┤
│  MANUAL DEPLOY      │ ← Button
├─────────────────────┤
│  ABORT MISSION      │ ← Button
├─────────────────────┤
│  RESET SYSTEM       │ ← Button
└─────────────────────┘
```

**Buttons**:
- Font-size: 0.6rem
- Font-weight: bold
- Text-transform: uppercase
- Padding: 0.6rem
- Gap: 2px black between buttons
- Default background: #d0d0d0
- ARM button: #ffb0b0 (light red)
- DISARM button: #b0ffb0 (light green)
- Hover: darken background

---

### 3.4 GPS POSITION PANEL (flexible height)

```
┌─────────────────────┐
│   GPS POSITION      │
├─────────────────────┤
│  LATITUDE           │
│  26.740000°N        │
├─────────────────────┤
│  LONGITUDE          │
│  83.912849°E        │
└─────────────────────┘
```

**Field Structure**:
- Border: 3px solid black
- Background: white
- Padding: 0.5rem
- Label: 0.6rem, bold, uppercase
- Value: 0.75rem, bold, Courier New font

---

## 4. CENTER COLUMN COMPONENTS

### 4.1 PRIMARY TELEMETRY PANEL (100px height)

```
┌──────────────────────────────────┐
│     PRIMARY TELEMETRY            │
├────────────────┬─────────────────┤
│   ALTITUDE     │    VELOCITY     │
│     0.0        │      0.0        │
│    meters      │      m/s        │
├────────────────┼─────────────────┤
│   MAX ALT      │   FLIGHT TIME   │
│     0.0        │     2562.8      │
│    meters      │    seconds      │
└────────────────┴─────────────────┘
```

**2x2 Grid Layout**:
- Gap: 2px black
- Each cell background: white
- Cell padding: 0.5rem

**Cell Structure**:
- Label: 0.55rem, bold, uppercase, #666
- Value: 1.4rem, bold, Courier New, #d0d0d0 (light gray)
- Unit: 0.55rem, #666

---

### 4.2 ALTITUDE PROFILE PANEL (240px height)

```
┌──────────────────────────────────┐
│     ALTITUDE PROFILE             │
├──────────────────────────────────┤
│                                  │
│     [CHART AREA]                 │
│                                  │
│                                  │
└──────────────────────────────────┘
```

**Chart Specifications**:
- Background: white
- Padding: 0.5rem
- Chart library: uPlot
- Line color: black
- Grid: #ccc
- Height: ~200px (inside panel)

---

### 4.3 VELOCITY PROFILE PANEL (240px height)

Same structure as Altitude Profile but for velocity data.

---

## 5. RIGHT COLUMN COMPONENTS

### 5.1 VEHICLE ORIENTATION PANEL (280px height)

```
┌──────────────────────────────────┐
│    VEHICLE ORIENTATION           │
├──────────────────────────────────┤
│                                  │
│         [ROCKET DIAGRAM]         │
│                                  │
│                                  │
└──────────────────────────────────┘
```

**Rocket Diagram SVG** (120x280px):

```
        ▲ (Blue Nose Cone)
       /│\
      / │ \
     /  │  \
    ────────  ← NOSE
    │      │
    │ RED  │  ← RECOVERY (Red section)
    │      │
    ────────
    │      │
    │ GRAY │  ← PAYLOAD (Gray section)
    │      │
    ────────
    │      │
    │ RED  │  ← AVIONICS (Red section)
    │      │
    ────────
    │ DARK │  ← ENGINE (Dark gray)
    │ GRAY │
    ────────
    ▌    ▐   ← ENGINE NOZZLES (Red)
```

**Colors**:
- Nose Cone: #4a90e2 (blue)
- Recovery Section: #e74c3c (red)
- Payload Section: #a0a0a0 (gray)
- Avionics Section: #e74c3c (red)
- Engine Section: #606060 (dark gray)
- Engine Nozzles: #e74c3c (red)
- Fins: #606060 (dark gray)
- All borders: 2px solid black

**Labels** (right side of rocket):
- Font-size: 9px
- Font-weight: bold
- Color: black
- Text: NOSE, RECOVERY, PAYLOAD, AVIONICS, ENGINE

**Orientation Indicator** (top left):
- Circle: 12px radius
- Arrow pointing up
- Label: "UP" (8px font)

**Attitude Display** (bottom):
- Shows angle in degrees (e.g., "45°")
- Font-size: 8px
- Calculated from quaternion data

---

### 5.2 QUATERNION PANEL (80px height)

```
┌──────────────────────────────────┐
│       QUATERNION                 │
├────────┬────────┬────────┬───────┤
│   W    │   X    │   Y    │   Z   │
│-0.9050 │ 0.0436 │ 0.0000 │-0.4232│
└────────┴────────┴────────┴───────┘
```

**4-Cell Grid**:
- Gap: 2px black
- Each cell background: white
- Cell padding: 0.4rem 0.2rem

**Cell Structure**:
- Label: 0.65rem, bold (W, X, Y, Z)
- Value: 0.7rem, bold, Courier New, 4 decimal places

---

### 5.3 SYSTEM DIAGNOSTICS PANEL (flexible height)

```
┌──────────────────────────────────┐
│    SYSTEM DIAGNOSTICS            │
├──────────────────────────────────┤
│ ● Telemetry Link      NOMINAL    │
├──────────────────────────────────┤
│ ● Packet Integrity    100%       │
├──────────────────────────────────┤
│ ● Data Rate           10.0 Hz    │
├──────────────────────────────────┤
│ ● Latency             <5ms       │
└──────────────────────────────────┘
```

**Row Structure**:
- Border: 2px solid black
- Background: white
- Padding: 0.4rem 0.5rem
- Gap: 0.5rem between rows

**Elements**:
- Bullet: 8px circle, black
- Name: 0.6rem, flex: 1
- Status: 0.6rem, bold, right-aligned

---

## 6. COLOR PALETTE

### Primary Colors
```
Background:        #c8c8c8  (light gray)
Panel Background:  #e8e8e8  (lighter gray)
Panel Header:      #c0c0c0  (medium gray)
White:             #ffffff
Black:             #000000
```

### Status Colors
```
Connected Green:   #d4edda
Disconnected Red:  #f8d7da
Safe Green:        #c8ffc8
Armed Red:         #ffc8c8
Button Arm:        #ffb0b0
Button Disarm:     #b0ffb0
```

### Rocket Colors
```
Nose Cone:         #4a90e2  (blue)
Recovery:          #e74c3c  (red)
Payload:           #a0a0a0  (gray)
Avionics:          #e74c3c  (red)
Engine:            #606060  (dark gray)
Nozzles:           #e74c3c  (red)
Fins:              #606060  (dark gray)
```

### Text Colors
```
Primary Text:      #000000  (black)
Secondary Text:    #666666  (dark gray)
Disabled Text:     #d0d0d0  (light gray)
```

---

## 7. TYPOGRAPHY

### Fonts
```
Primary Font:      Arial, sans-serif
Monospace Font:    'Courier New', monospace
```

### Font Sizes
```
Header Title:      1rem (16px)
Subtitle:          0.7rem (11.2px)
Panel Header:      0.7rem (11.2px)
Large State:       1.8rem (28.8px)
Telemetry Value:   1.4rem (22.4px)
Button Text:       0.6rem (9.6px)
Label Text:        0.55-0.65rem (8.8-10.4px)
Status Value:      0.7-0.75rem (11.2-12px)
```

### Font Weights
```
Normal:            400
Bold:              700
```

---

## 8. BORDERS AND SPACING

### Borders
```
Panel Border:      3px solid black
Header Border:     3px solid black (bottom only)
Cell Border:       2px solid black
Field Border:      2px-3px solid black
```

### Spacing
```
Column Gap:        2px
Panel Gap:         2px
Cell Gap:          2px
Padding Small:     0.25-0.5rem
Padding Medium:    0.5-0.75rem
Padding Large:     1-1.5rem
```

---

## 9. INTERACTIVE ELEMENTS

### Buttons
- **Default State**: #d0d0d0 background
- **Hover State**: Darken background (#b8b8b8)
- **Active State**: No transform
- **Disabled State**: 50% opacity, no cursor
- **Transition**: All 0.15s

### Status Indicators
- **Connected**: Green background (#d4edda)
- **Disconnected**: Red background (#f8d7da)
- **Real-time Update**: Values update every 100ms

---

## 10. DATA FLOW

### WebSocket Connection
```
URL: ws://localhost:8000/ws/telemetry
Rate: 10 Hz (10 packets per second)
Protocol: JSON over WebSocket
```

### Telemetry Packet Structure
```json
{
  "timestamp_ms": 2562800,
  "flight_state": 5,
  "flight_state_name": "LANDED",
  "altitude_m": 0.0,
  "velocity_ms": 0.0,
  "quat_w": -0.9050,
  "quat_x": 0.0436,
  "quat_y": 0.0000,
  "quat_z": -0.4232,
  "gps_lat": 26.740000,
  "gps_lon": 83.912849
}
```

### State Management
- **Store**: Zustand
- **Real-time Updates**: WebSocket subscription
- **History**: Last 500 data points for charts
- **Max Values**: Track maximum altitude and velocity

---

## 11. RESPONSIVE BEHAVIOR

### Fixed Dimensions
- Left Column: Always 150px
- Right Column: Always 250px
- Top Header: Always 50px

### Flexible Dimensions
- Center Column: Fills remaining space
- Panel Heights: Some fixed, some flexible
- Charts: Scale to container

### Minimum Requirements
- Minimum Width: 1024px
- Minimum Height: 768px
- Recommended: 1920x1080 (Full HD)

---

## 12. ACCESSIBILITY

### Contrast Ratios
- Text on white: 21:1 (black on white)
- Text on gray: Minimum 4.5:1
- Status colors: Clearly distinguishable

### Font Sizes
- Minimum: 0.55rem (8.8px)
- Body: 0.6-0.7rem (9.6-11.2px)
- Headers: 0.7-1rem (11.2-16px)

---

## 13. PERFORMANCE REQUIREMENTS

### Update Rates
- Telemetry: 10 Hz (100ms intervals)
- Charts: 60 FPS rendering
- UI Updates: Smooth, no lag

### Optimization
- Chart library: uPlot (high performance)
- State updates: Batched
- Rendering: React optimized

---

## 14. FILE STRUCTURE

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx          (Main component)
│   │   ├── Dashboard.css          (Styling)
│   │   ├── TelemetryChart.tsx     (Chart component)
│   │   └── RocketDiagram.tsx      (Rocket SVG)
│   ├── stores/
│   │   └── telemetryStore.ts      (Zustand store)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
└── vite.config.ts
```

---

## 15. DEPENDENCIES

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "zustand": "^5.0.2",
  "uplot": "^1.6.31"
}
```

---

## 16. BROWSER COMPATIBILITY

### Supported Browsers
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

### Required Features
- WebSocket support
- CSS Grid
- Flexbox
- SVG rendering

---

## NOTES FOR IMPLEMENTATION

1. **Exact Pixel Matching**: All dimensions should match the reference images exactly
2. **Color Accuracy**: Use the exact hex codes provided
3. **Font Consistency**: Arial for UI, Courier New for data values
4. **Border Thickness**: 2-3px solid black throughout
5. **Rocket Diagram**: Must match the Lafayette Systems reference exactly
6. **Real-time Updates**: Smooth 10 Hz telemetry updates
7. **Professional Appearance**: Clean, technical, mission-control aesthetic

---

**Document Version**: 1.0
**Last Updated**: 2026-04-28
**Project**: CAN-7USAT Ground Control Station
**Author**: Development Team
