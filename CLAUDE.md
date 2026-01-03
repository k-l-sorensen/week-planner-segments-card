# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

- **Fork**: <https://github.com/k-l-sorensen/week-planner-segments-card>
- **Upstream**: <https://github.com/FamousWolf/week-planner-card>

## TODO

- [ ] **Rename card to `week-planner-segments-card`** - Update package.json name, custom element registration in index.js/index-custom.js, and build output filenames

## Project Overview

Week Planner Card is a custom Home Assistant Lovelace card that displays a responsive overview of multiple days with events from one or multiple calendars. It's built using Lit (Web Components) and Luxon (date/time handling). This fork adds day segments functionality.

## Build Commands

```bash
npm install          # Install dependencies
npm run build        # Build the card (outputs to dist/week-planner-card.js)
npm run watch        # Watch mode for development
npm run build:custom # Build custom variant (outputs to dist/, then rename)
```

The build uses Parcel bundler. Output is a single JavaScript file that Home Assistant loads.

## Architecture

### Source Files (`src/`)

| File | Purpose |
|------|---------|
| `index.js` | Entry point - registers custom elements `week-planner-card` and `week-planner-card-editor` |
| `card.js` | Main card component (`WeekPlannerCard` class) - config parsing, event fetching, rendering |
| `card.styles.js` | CSS styles for the card (exported as Lit `css` template) |
| `editor.js` | Visual config editor component (`WeekPlannerCardEditor` class) |
| `editor.styles.js` | CSS styles for the editor |
| `icons/` | Weather condition icons (PNG/SVG) |

### Card Component Flow (`card.js`)

1. **Configuration** (`setConfig()`) - Parses YAML config, sets defaults, validates calendars
2. **Data Fetching** (`_fetchCalendarEvents()`) - Calls Home Assistant calendar API for each calendar entity
3. **Event Processing** (`_addEvent()`, `_updateCard()`) - Normalizes events, handles multi-day events, sorts by time
4. **Rendering** (`render()`, `_renderDays()`, `_renderEvents()`) - Lit HTML templates

### Key Data Structures

- `_calendarEvents`: Object keyed by `${start}-${end}-${title}` containing event data
- `_events`: Object keyed by ISO date containing arrays of event keys
- `_days`: Array of day objects with `{date, events, weather, class}`

### CSS Architecture

- Uses CSS custom properties (variables) extensively for theming
- Container queries (`@container weekplanner`) for responsive column counts
- Compact mode reduces spacing/font sizes via variable overrides

## Testing

No automated tests. Testing requires installing the built JS file in Home Assistant:
1. Copy `dist/week-planner-card.js` to Home Assistant's `config/www/` folder
2. Add as a resource in Home Assistant dashboard settings
3. Add the card to a dashboard with `type: custom:week-planner-card`

## Key Patterns

### Configuration Parsing
Config options use nullish coalescing for defaults: `config.option ?? defaultValue`
Complex configs (weather, calendars) use helper methods like `_getWeatherConfig()`

### Event Filtering
- `filter` config: Regex matched against event title - removes matching events
- `filterText` config: Regex replaced in event title text
- Applied at both global and per-calendar levels

### Responsive Layout
Days use calculated widths: `calc((100% - gaps) / columns)`
Column count changes via CSS container queries at 1920px, 1280px, 1024px, 640px breakpoints

---

## Day Segments Feature

Divides each day into configurable time-based segments (e.g., Morning, Afternoon, Evening). Events are grouped by their start time into segments with a side legend for labels.

### Configuration

```yaml
type: custom:week-planner-card-custom
daySegments:
  - name: "Morning"
    start: "06:00"
    end: "12:00"
  - name: "Early Afternoon"
    start: "12:00"
    end: "15:00"
  - name: "Late Afternoon"
    start: "15:00"
    end: "18:00"
  - name: "Evening"
    start: "18:00"
    end: "24:00"
calendars:
  - entity: calendar.work
```

### Key Behaviors

- **Full-day events** → Dedicated "All Day" segment at the top
- **Segment sizing** → Equal height across all days (determined by segment with most events)
- **Spanning events** → Placed in starting segment only
- **Events outside segments** → Placed in first segment
- **Mobile (<640px)** → Legend hidden, segments flow naturally

### Implementation

Uses CSS Grid for proper legend-to-segment alignment. Grid ensures items in the same row share height automatically.

**Key methods in `card.js`:**
- `_getDaySegmentsConfig()` - Parses and validates config
- `_getEventSegmentIndex()` - Determines segment for an event
- `_groupEventsBySegment()` - Groups events by segment
- `_renderDaysWithGrid()` - Renders the CSS Grid layout
- `_renderDayHeader()` - Renders date + weather header
- `_calculateSegmentMaxEvents()` - Calculates max events per segment

**CSS Variables:**
```css
--segment-event-height: 50px;   /* Height per event slot */
--segment-legend-width: 80px;   /* Width of side legend */
--segment-border-color: var(--divider-color);
```

### Build

```bash
npm run build:custom  # Outputs dist/week-planner-card-custom.js
```
