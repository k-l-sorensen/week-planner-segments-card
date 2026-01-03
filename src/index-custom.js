import { WeekPlannerCard } from './card';
import { WeekPlannerCardEditor } from "./editor";
import { version } from '../package.json';

// Create a subclass that uses the segments card editor name
class WeekPlannerSegmentsCard extends WeekPlannerCard {
    static getConfigElement() {
        return document.createElement("week-planner-segments-card-editor");
    }
}

customElements.define(
    'week-planner-segments-card',
    WeekPlannerSegmentsCard
);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'week-planner-segments-card',
    name: 'Week Planner Segments Card',
    description: 'Card to display events from calendars with configurable day segments (morning, afternoon, evening, etc.).'
});

customElements.define(
    'week-planner-segments-card-editor',
    WeekPlannerCardEditor
);

console.info(
    `%c WEEK-PLANNER-SEGMENTS-CARD %c v${version} `,
    'color: white; background: black; font-weight: 700;',
    'color: black; background: white; font-weight: 700;',
);
