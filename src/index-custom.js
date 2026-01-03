import { WeekPlannerCard } from './card';
import { WeekPlannerCardEditor } from "./editor";
import { version } from '../package.json';

// Create a subclass that uses the custom editor name
class WeekPlannerCardCustom extends WeekPlannerCard {
    static getConfigElement() {
        return document.createElement("week-planner-card-custom-editor");
    }
}

customElements.define(
    'week-planner-card-custom',
    WeekPlannerCardCustom
);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'week-planner-card-custom',
    name: 'Week Planner Card (Custom)',
    description: 'Card to display events for a number of days from one or several calendars. (Custom build with day segments)'
});

customElements.define(
    'week-planner-card-custom-editor',
    WeekPlannerCardEditor
);

console.info(
    `%c WEEK-PLANNER-CARD-CUSTOM %c v${version} `,
    'color: white; background: black; font-weight: 700;',
    'color: black; background: white; font-weight: 700;',
);
