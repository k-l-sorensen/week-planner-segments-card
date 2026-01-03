import { html, LitElement } from 'lit';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { DateTime, Settings as LuxonSettings, Info as LuxonInfo } from 'luxon';
import styles from './card.styles';
import clear_night from 'data-url:./icons/clear_night.png';
import cloudy from 'data-url:./icons/cloudy.png';
import fog from 'data-url:./icons/fog.png';
import lightning from 'data-url:./icons/lightning.png';
import storm from 'data-url:./icons/storm.png';
import storm_night from 'data-url:./icons/storm_night.png';
import mostly_cloudy from 'data-url:./icons/mostly_cloudy.png';
import mostly_cloudy_night from 'data-url:./icons/mostly_cloudy_night.png';
import heavy_rain from 'data-url:./icons/heavy_rain.png';
import rainy from 'data-url:./icons/rainy.png';
import snowy from 'data-url:./icons/snowy.png';
import mixed_rain from 'data-url:./icons/mixed_rain.png';
import sunny from 'data-url:./icons/sunny.png';
import windy from 'data-url:./icons/windy.svg';

const ICONS = {
  'clear-day': sunny,
  'clear-night': clear_night,
  cloudy,
  overcast: cloudy,
  fog,
  hail: mixed_rain,
  lightning,
  'lightning-rainy': storm,
  'partly-cloudy-day': mostly_cloudy,
  'partly-cloudy-night': mostly_cloudy_night,
  partlycloudy: mostly_cloudy,
  pouring: heavy_rain,
  rain: rainy,
  rainy,
  sleet: mixed_rain,
  snow: snowy,
  snowy,
  'snowy-rainy': mixed_rain,
  sunny,
  wind: windy,
  windy,
  'windy-variant': windy
};

const ICONS_NIGHT = {
  ...ICONS,
  sunny: clear_night,
  partlycloudy: mostly_cloudy_night,
  'lightning-rainy': storm_night
};

export class WeekPlannerCard extends LitElement {
    static styles = styles;

    _initialized = false;
    _loading = 0;
    _events = {};
    _calendarEvents = {};
    _calendars;
    _numberOfDays;
    _numberOfDaysIsMonth;
    _updateInterval;
    _noCardBackground;
    _eventBackground;
    _compact;
    _language;
    _weather;
    _dateFormat;
    _timeFormat;
    _locationLink;
    _startDate;
    _hideWeekend;
    _startingDay;
    _startingDayOffset;
    _weatherForecast = null;
    _showLocation;
    _hidePastEvents;
    _hideDaysWithoutEvents;
    _hideTodayWithoutEvents;
    _filter;
    _filterText;
    _replaceTitleText;
    _combineSimilarEvents;
    _showLegend;
    _legendToggle;
    _actions;
    _columns;
    _loader;
    _showNavigation;
    _navigationOffset = 0;
    _updateEventsTimeouts = [];

    /**
     * Get config element
     *
     * @returns {HTMLElement}
     */
    static getConfigElement() {
        // Create and return an editor element
        return document.createElement("week-planner-card-editor");
    }

    /**
     * Get stub config
     *
     * @returns {}
     */
    static getStubConfig() {
        return {
            calendars: [],
            days: 7,
            startingDay: 'today',
            startingDayOffset: 0,
            hideWeekend: false,
            noCardBackground: false,
            compact: false,
            weather: {
                showCondition: true,
                showTemperature: false,
                showLowTemperature: false,
                useTwiceDaily: false,
            },
            locale: 'en',
            showLocation: false,
            hidePastEvents: false,
            hideDaysWithoutEvents: false,
            hideTodayWithoutEvents: false,
            combineSimilarEvents: false,
            showLegend: false,
            daySegments: []
        };
    }

    /**
     * Get properties
     *
     * @return {Object}
     */
    static get properties() {
        return {
            _days: { type: Array },
            _config: { type: Object },
            _error: { type: String },
            _currentEventDetails: { type: Object },
            _hideCalendars: { type: Array },
            _segmentMaxEvents: { type: Object }
        }
    }

    /**
     * Set configuration
     *
     * @param {Object} config
     */
    setConfig(config) {
        this._config = config;

        if (!config.calendars) {
            throw new Error('No calendars are configured');
        }

        this._numberOfDaysIsMonth = this._isNumberOfDaysMonth(config.days ?? 7);
        this._title = config.title ?? null;
        this._calendars = config.calendars;
        this._weather = this._getWeatherConfig(config.weather);
        this._numberOfDays = this._getNumberOfDays(config.days ?? 7);
        this._hideWeekend = config.hideWeekend ?? false;
        this._showNavigation = config.showNavigation ?? false;
        this._startingDay = config.startingDay ?? 'today';
        this._startingDayOffset = config.startingDayOffset ?? 0;
        this._startDate = this._getStartDate();
        this._updateInterval = config.updateInterval ?? 60;
        this._noCardBackground = config.noCardBackground ?? false;
        this._eventBackground = config.eventBackground ?? 'var(--card-background-color, inherit)';
        this._compact = config.compact ?? false;
        this._dayFormat = config.dayFormat ?? null;
        this._dateFormat = config.dateFormat ?? 'cccc d LLLL yyyy';
        this._timeFormat = config.timeFormat ?? 'HH:mm';
        this._locationLink = config.locationLink ?? 'https://www.google.com/maps/search/?api=1&query=';
        this._showTitle = config.showTitle ?? true;
        this._showDescription = config.showDescription ?? false;
        this._showLocation = config.showLocation ?? false;
        this._hidePastEvents = config.hidePastEvents ?? false;
        this._hideDaysWithoutEvents = config.hideDaysWithoutEvents ?? false;
        this._hideTodayWithoutEvents = config.hideTodayWithoutEvents ?? false;
        this._filter = config.filter ?? false;
        this._filterText = config.filterText ?? false;
        this._replaceTitleText = config.replaceTitleText ?? false;
        this._combineSimilarEvents = config.combineSimilarEvents ?? false;
        this._showLegend = config.showLegend ?? false;
        this._legendToggle = config.legendToggle ?? false;
        this._actions = config.actions ?? false;
        this._columns = config.columns ?? {};
        this._maxEvents = config.maxEvents ?? false;
        this._maxDayEvents = config.maxDayEvents ?? false;
        this._daySegments = this._getDaySegmentsConfig(config.daySegments);
        this._segmentMaxEvents = { [-1]: 1 };  // Initialize with default values
        this._daySegments.forEach((_, index) => {
            this._segmentMaxEvents[index] = 1;
        });
        this._hideCalendars = [];
        if (config.locale) {
            LuxonSettings.defaultLocale = config.locale;
        }
        this._language = Object.assign(
            {},
            {
                fullDay: 'Entire day',
                noEvents: 'No events',
                moreEvents: 'More events',
                today: 'Today',
                tomorrow: 'Tomorrow',
                yesterday: 'Yesterday',
                sunday: LuxonInfo.weekdays('long')[6],
                monday: LuxonInfo.weekdays('long')[0],
                tuesday: LuxonInfo.weekdays('long')[1],
                wednesday: LuxonInfo.weekdays('long')[2],
                thursday: LuxonInfo.weekdays('long')[3],
                friday: LuxonInfo.weekdays('long')[4],
                saturday: LuxonInfo.weekdays('long')[5]
            },
            config.texts ?? {}
        );
    }

    _isNumberOfDaysMonth(numberOfDays) {
        return numberOfDays === 'month';
    }

    _getWeatherConfig(weatherConfiguration) {
        if (
            !weatherConfiguration
            || typeof weatherConfiguration !== 'string'
            && typeof weatherConfiguration !== 'object'
        ) {
            return null;
        }

        let configuration = {
            entity: null,
            showCondition: true,
            showTemperature: false,
            showLowTemperature: false
        };
        if (typeof weatherConfiguration === 'string') {
            configuration.entity = weatherConfiguration;
        } else {
            Object.assign(configuration, weatherConfiguration);
        }

        if (!configuration.hasOwnProperty('entity') || configuration.entity === null) {
            return null;
        }

        return configuration;
    }

    /**
     * Parse and validate daySegments configuration
     *
     * @param {Array} daySegmentsConfiguration
     * @returns {Array}
     */
    _getDaySegmentsConfig(daySegmentsConfiguration) {
        if (!Array.isArray(daySegmentsConfiguration) || daySegmentsConfiguration.length === 0) {
            return [];
        }

        return daySegmentsConfiguration.map((segment, index) => {
            if (!segment.name || !segment.start || !segment.end) {
                console.warn('Week Planner Card: Invalid day segment configuration at index ' + index + ', missing required fields (name, start, end)', segment);
                return null;
            }

            // Parse time strings to minutes from midnight for comparison
            const startMinutes = this._parseTimeToMinutes(segment.start);
            const endMinutes = this._parseTimeToMinutes(segment.end);

            if (startMinutes === null || endMinutes === null) {
                console.warn('Week Planner Card: Invalid time format in day segment at index ' + index + ', expected HH:mm format', segment);
                return null;
            }

            return {
                name: segment.name,
                start: segment.start,
                end: segment.end,
                startMinutes: startMinutes,
                endMinutes: endMinutes
            };
        }).filter(Boolean);
    }

    /**
     * Parse time string (HH:mm) to minutes from midnight
     *
     * @param {string} timeString
     * @returns {number|null}
     */
    _parseTimeToMinutes(timeString) {
        if (typeof timeString !== 'string') {
            return null;
        }
        const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) {
            return null;
        }
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
            return null;
        }
        return hours * 60 + minutes;
    }

    /**
     * Get the segment index for an event based on its start time
     * Returns -1 for full-day events (All Day segment)
     * Returns 0 for events outside all segments (placed in first segment)
     *
     * @param {Object} event
     * @returns {number}
     */
    _getEventSegmentIndex(event) {
        // Full-day events go to the "All Day" segment (index -1)
        if (event.fullDay) {
            return -1;
        }

        // Get event start time in minutes from midnight
        const eventHour = parseInt(event.start.toFormat('H'), 10);
        const eventMinute = parseInt(event.start.toFormat('mm'), 10);
        const eventMinutes = eventHour * 60 + eventMinute;

        // Find matching segment
        for (let i = 0; i < this._daySegments.length; i++) {
            const segment = this._daySegments[i];
            if (eventMinutes >= segment.startMinutes && eventMinutes < segment.endMinutes) {
                return i;
            }
        }

        // Event outside all segments - place in first segment
        return 0;
    }

    /**
     * Group events by segment index
     *
     * @param {Array} events
     * @returns {Object} Object with segment index as key and array of events as value
     */
    _groupEventsBySegment(events) {
        const grouped = {
            [-1]: [] // All Day segment
        };

        // Initialize empty arrays for each segment
        this._daySegments.forEach((segment, index) => {
            grouped[index] = [];
        });

        // Group events
        events.forEach(event => {
            const segmentIndex = this._getEventSegmentIndex(event);
            if (grouped[segmentIndex]) {
                grouped[segmentIndex].push(event);
            } else {
                // Fallback to first segment if something goes wrong
                grouped[0].push(event);
            }
        });

        return grouped;
    }

    /**
     * Render
     *
     * @return {Object}
     */
    render() {
        if (!this._loader) {
            this._loader = this._getLoader();
        }

        if (!this._initialized) {
            this._initialized = true;
            this._waitForHassAndConfig();
        }

        let cardClasses = [];
        if (this._noCardBackground) {
            cardClasses.push('nobackground');
        }
        if (this._compact) {
            cardClasses.push('compact');
        }

        const cardStyles = [
            '--event-background-color: ' + this._eventBackground + ';'
        ];
        if (this._columns.extraLarge) {
            cardStyles.push('--days-columns: ' + this._columns.extraLarge + ';');
        }
        if (this._columns.large) {
            cardStyles.push('--days-columns-lg: ' + this._columns.large + ';');
        }
        if (this._columns.medium) {
            cardStyles.push('--days-columns-md: ' + this._columns.medium + ';');
        }
        if (this._columns.small) {
            cardStyles.push('--days-columns-sm: ' + this._columns.small + ';');
        }
        if (this._columns.extraSmall) {
            cardStyles.push('--days-columns-xs: ' + this._columns.extraSmall + ';');
        }

        return html`
            <ha-card class="${cardClasses.join(' ')}" style="${cardStyles.join(' ')}">
                <div class="card-content">
                    ${this._error ?
                        html`<ha-alert alert-type="error">${this._error}</ha-alert>` :
                        ''
                    }
                    ${this._title ?
                        html`<h1 class="card-title">${this._title}</h1>` :
                        ''
                    }
                    <div class="container${this._actions ? ' hasActions' : ''}" @click="${this._handleContainerClick}">
                        ${this._renderHeader()}
                        ${this._renderDays()}
                    </div>
                    ${this._renderEventDetailsDialog()}
                    ${this._loader}
                </div>
            </ha-card>
        `;
    }

    _renderHeader() {
        if (!this._showLegend && !this._showNavigation) {
            return html``;
        }

        return html`
            <div class="header">
                ${this._renderNavigation()}
                ${this._renderLegend()}
            </div>
        `;
    }

    _renderLegend() {
        if (!this._showLegend) {
            return html``;
        }

        return html`
            <div class="legend">
                <ul>
                    ${this._calendars.map((calendar) => {
                        if (!calendar.hideInLegend) {
                            return html`
                                <li class="${calendar.icon ? 'icon' : 'noIcon'}${this._legendToggle ? ' hasToggle' : ''}${this._hideCalendars.indexOf(calendar.entity) === -1 ? '' : ' hidden'}" style="--legend-calendar-color: ${calendar.color ?? 'inherit'}" @click="${() => {
                                    this._handleLegendClick(calendar)
                                }}">
                                    ${calendar.icon ?
                                        html`<ha-icon icon="${calendar.icon}"></ha-icon>` :
                                        ''
                                    }
                                    ${calendar.name ?? calendar.entity}
                                </li>
                            `;
                        }
                    })}
                </ul>
            </div>
        `;
    }

    _renderNavigation() {
        if (!this._showNavigation) {
            return html``;
        }

        return html`
            <div class="navigation">
                <ul>
                    <li @click="${this._handleNavigationPreviousClick}"><ha-icon icon="mdi:arrow-left"></ha-icon></li>
                    <li @click="${this._handleNavigationOriginalClick}"><ha-icon icon="mdi:circle-medium"></ha-icon></li>
                    <li @click="${this._handleNavigationNextClick}"><ha-icon icon="mdi:arrow-right"></ha-icon></li>
                </ul>
                <div class="month">${this._startDate.toFormat('MMMM')}</div>
            </div>
        `;
    }

    _renderDays() {
        if (!this._days) {
            return html``;
        }

        // If segments are configured, use grid-based layout for alignment
        if (this._daySegments.length > 0) {
            return this._renderDaysWithGrid();
        }

        return this._renderDayColumns();
    }

    /**
     * Render days with CSS Grid layout for proper segment alignment
     * Grid ensures legend labels align perfectly with day segment rows
     *
     * @returns {Object}
     */
    _renderDaysWithGrid() {
        // Filter visible days
        const visibleDays = this._days.filter(day =>
            !(this._hideDaysWithoutEvents && day.events.length === 0 &&
              (this._hideTodayWithoutEvents || !this._isToday(day.date)))
        );

        if (visibleDays.length === 0) {
            return html``;
        }

        // Pre-compute grouped events for all visible days (performance optimization)
        const groupedEventsByDay = visibleDays.map(day => {
            const dayEvents = this._getDayEvents(day);
            return this._groupEventsBySegment(dayEvents);
        });

        // Total rows: 1 header + 1 allday + N segments
        const totalRows = 2 + this._daySegments.length;

        return html`
            <div class="days-grid-container" style="--day-count: ${visibleDays.length}; --segment-count: ${totalRows}">
                <!-- Row 1: Headers (empty legend cell + day headers) -->
                <div class="grid-cell legend-header" style="grid-row: 1; grid-column: 1"></div>
                ${visibleDays.map((day, index) => this._renderDayHeader(day, index + 2))}

                <!-- Row 2: All Day segment -->
                <div class="grid-cell segment-label allday" style="grid-row: 2; grid-column: 1; --segment-height: ${this._segmentMaxEvents[-1] || 1}">
                    ${this._language.fullDay ?? 'All Day'}
                </div>
                ${visibleDays.map((day, index) => html`
                    <div class="grid-cell segment allday"
                         style="grid-row: 2; grid-column: ${index + 2}; --segment-height: ${this._segmentMaxEvents[-1] || 1}">
                        ${groupedEventsByDay[index][-1]?.map(event => this._renderEvent(event)) || ''}
                    </div>
                `)}

                <!-- Rows 3+: Named segments -->
                ${this._daySegments.map((segment, segmentIndex) => html`
                    <div class="grid-cell segment-label"
                         style="grid-row: ${segmentIndex + 3}; grid-column: 1; --segment-height: ${this._segmentMaxEvents[segmentIndex] || 1}">
                        ${segment.name}
                    </div>
                    ${visibleDays.map((day, dayIndex) => html`
                        <div class="grid-cell segment"
                             data-segment="${segmentIndex}"
                             style="grid-row: ${segmentIndex + 3}; grid-column: ${dayIndex + 2}; --segment-height: ${this._segmentMaxEvents[segmentIndex] || 1}">
                            ${groupedEventsByDay[dayIndex][segmentIndex]?.map(event => this._renderEvent(event)) || ''}
                        </div>
                    `)}
                `)}
            </div>
        `;
    }

    /**
     * Render day header (date + weather) for grid layout
     *
     * @param {Object} day
     * @param {number} columnIndex - Grid column number (starting from 2)
     * @returns {Object}
     */
    _renderDayHeader(day, columnIndex) {
        return html`
            <div class="grid-cell day-header ${day.class}"
                 data-date="${day.date.day}"
                 data-weekday="${day.date.weekday}"
                 data-month="${day.date.month}"
                 data-year="${day.date.year}"
                 data-week="${day.date.weekNumber}"
                 style="grid-row: 1; grid-column: ${columnIndex}">
                <div class="date">
                    ${this._dayFormat ?
                        unsafeHTML(day.date.toFormat(this._dayFormat)) :
                        html`
                            <span class="number">${day.date.day}</span>
                            <span class="text">${this._getWeekDayText(day.date)}</span>
                        `
                    }
                </div>
                ${day.weather ?
                    html`
                        <div class="weather" @click="${this._handleWeatherClick}">
                            ${this._weather?.showTemperature || this._weather?.showLowTemperature ?
                                html`
                                    <div class="temperature">
                                        ${this._weather?.showTemperature ?
                                            html`<span class="high">${day.weather.temperature}</span>` :
                                            ''
                                        }
                                        ${this._weather?.showLowTemperature ?
                                            html`<span class="low">${day.weather.templow}</span>` :
                                            ''
                                        }
                                    </div>
                                ` :
                                ''
                            }
                            ${this._weather?.showCondition ?
                                html`
                                    <div class="icon">
                                        <img src="${day.weather.icon}" alt="${day.weather.condition}">
                                    </div>
                                ` :
                                ''
                            }
                        </div>
                    ` :
                    ''
                }
            </div>
        `;
    }

    /**
     * Render day columns (extracted for reuse with/without segment legend)
     *
     * @returns {Object}
     */
    _renderDayColumns() {
        return html`
            ${this._days.map((day) => {
                if (this._hideDaysWithoutEvents && day.events.length === 0 && (this._hideTodayWithoutEvents || !this._isToday(day.date))) {
                    return html``;
                }
                return html`
                    <div class="day ${day.class}" data-date="${day.date.day}" data-weekday="${day.date.weekday}" data-month="${day.date.month}" data-year="${day.date.year}" data-week="${day.date.weekNumber}">
                        <div class="date">
                            ${this._dayFormat ?
                                unsafeHTML(day.date.toFormat(this._dayFormat)) :
                                html`
                                    <span class="number">${day.date.day}</span>
                                    <span class="text">${this._getWeekDayText(day.date)}</span>
                                `
                            }
                        </div>
                        ${day.weather ?
                            html`
                                <div class="weather" @click="${this._handleWeatherClick}">
                                    ${this._weather?.showTemperature || this._weather?.showLowTemperature ?
                                        html`
                                            <div class="temperature">
                                                ${this._weather?.showTemperature ?
                                                    html`
                                                        <span class="high">${day.weather.temperature}</span>
                                                    ` :
                                                    ''
                                                }
                                                ${this._weather?.showLowTemperature ?
                                                    html`
                                                            <span class="low">${day.weather.templow}</span>
                                                    ` :
                                                    ''
                                                }
                                            </div>
                                        ` :
                                        ''
                                    }
                                    ${this._weather?.showCondition ?
                                        html`
                                            <div class="icon">
                                                <img src="${day.weather.icon}" alt="${day.weather.condition}">
                                            </div>
                                        ` :
                                        ''
                                    }
                                </div>
                            ` :
                            ''
                        }
                        <div class="events">
                            ${this._renderEvents(day)}
                        </div>
                    </div>
                `
            })}
        `;
    }

    _renderEvents(day) {
        const dayEvents = this._getDayEvents(day);

        if (dayEvents.length === 0) {
            // When using segments, show empty segments rather than "no events"
            if (this._daySegments.length > 0) {
                return this._renderEventsWithSegments([]);
            }
            return this._renderNoEvents();
        }

        let moreEvents = false;
        if (this._maxDayEvents > 0 && dayEvents.length > this._maxDayEvents) {
            dayEvents.splice(this._maxDayEvents);
            moreEvents = true;
        }

        // Use segment-based rendering if daySegments is configured
        if (this._daySegments.length > 0) {
            return this._renderEventsWithSegments(dayEvents);
        }

        // Original flat list rendering
        return html`
            ${dayEvents.map((event) => this._renderEvent(event))}
            ${moreEvents ?
                html`
                    <div class="more">
                        ${this._language.moreEvents}
                    </div>
                ` :
                ''
            }
        `;
    }

    /**
     * Get filtered events for a day
     *
     * @param {Object} day
     * @returns {Array}
     */
    _getDayEvents(day) {
        const dayEvents = [];
        day.events.map((eventKey) => {
            if (!this._calendarEvents[eventKey]) {
                return;
            }

            const event = Object.assign({}, this._calendarEvents[eventKey]);

            // Remove events and colors for calendars that are hidden
            const eventCalendars = [...event.calendars];
            const colors = [...event.colors];
            let i = 0;
            while (i < eventCalendars.length) {
                if (this._hideCalendars.indexOf(eventCalendars[i]) > -1) {
                    eventCalendars.splice(i, 1);
                    colors.splice(i, 1);
                } else {
                    i++;
                }
            }

            if (eventCalendars.length === 0) {
                return;
            }

            event.calendars = eventCalendars;
            event.colors = colors;

            dayEvents.push(event);
        });
        return dayEvents;
    }

    /**
     * Render events grouped by segments
     *
     * @param {Array} dayEvents
     * @returns {Object}
     */
    _renderEventsWithSegments(dayEvents) {
        const groupedEvents = this._groupEventsBySegment(dayEvents);

        return html`
            <div class="segment allday" style="--segment-height: ${this._segmentMaxEvents[-1] || 1}">
                ${groupedEvents[-1].length > 0 ?
                    groupedEvents[-1].map((event) => this._renderEvent(event)) :
                    ''
                }
            </div>
            ${this._daySegments.map((segment, index) => html`
                <div class="segment" data-segment="${index}" style="--segment-height: ${this._segmentMaxEvents[index] || 1}">
                    ${groupedEvents[index].length > 0 ?
                        groupedEvents[index].map((event) => this._renderEvent(event)) :
                        ''
                    }
                </div>
            `)}
        `;
    }

    /**
     * Render a single event
     *
     * @param {Object} event
     * @returns {Object}
     */
    _renderEvent(event) {
        const doneColors = [event.colors[0]];
        return html`
            <div
                class="event ${event.class}"
                data-entity="${event.calendars[0]}"
                data-additional-entities="${event.calendars.join(',')}"
                data-summary="${event.summary}"
                data-location="${event.location ?? ''}"
                data-start-hour="${event.start.toFormat('H')}"
                data-start-minute="${event.start.toFormat('mm')}"
                data-end-hour="${event.end.toFormat('H')}"
                data-end-minute="${event.end.toFormat('mm')}"
                style="--border-color: ${event.colors[0]}"
                @click="${() => {
                    this._handleEventClick(event)
                }}"
            >
                ${event.colors.map((color) => {
                    if (doneColors.indexOf(color) > -1) {
                        return '';
                    }
                    doneColors.push(color);
                    return html`
                        <div
                            class="additionalColor"
                            style="--event-additional-color: ${color}"
                        ></div>
                    `
                })}
                <div class="inner">
                    <div class="time">
                        ${event.fullDay ?
                            html`${this._language.fullDay}` :
                            html`
                                ${event.start.toFormat(this._timeFormat)}
                                ${event.end ? ' - ' + event.end.toFormat(this._timeFormat) : ''}
                            `
                        }
                    </div>
                    ${this._showTitle ?
                            html`
                                <div class="title">
                                    ${event.summary}
                                </div>
                            ` :
                            ''
                    }
                    ${this._showDescription ?
                        html`
                            <div class="description">
                                ${unsafeHTML(event.description)}
                            </div>
                        ` :
                        ''
                    }
                    ${this._showLocation && event.location ?
                        html`
                            <div class="location">
                                <ha-icon icon="mdi:map-marker"></ha-icon>
                                ${event.location}
                            </div>
                        ` :
                        ''
                    }
                </div>
                ${event.icon ?
                    html`
                        <div class="icon">
                            <ha-icon icon="${event.icon}"></ha-icon>
                        </div>
                    ` :
                    ''
                }
            </div>
        `;
    }

    _renderNoEvents() {
        return html`
            <div class="none">
                ${this._language.noEvents}
            </div>
        `;
    }

    _renderEventDetailsDialog() {
        if (!this._currentEventDetails) {
            return html``;
        }

        return html`
            <ha-dialog
                open
                @closed="${this._closeDialog}"
                .heading="${this._renderEventDetailsDialogHeading()}"
            >
                <div class="content">
                    <div class="calendar">
                        <ha-icon icon="mdi:calendar-account"></ha-icon>
                        <div class="info">
                            ${this._currentEventDetails.calendarNames.join(', ')}
                        </div>
                    </div>
                    <div class="datetime">
                        <ha-icon icon="mdi:calendar-clock"></ha-icon>
                        <div class="info">
                            ${this._renderEventDetailsDate()}
                        </div>
                    </div>
                    ${this._currentEventDetails.location ?
                        html`
                            <div class="location">
                                <ha-icon icon="mdi:map-marker"></ha-icon>
                                <div class="info">
                                    <a href="${this._locationLink}${encodeURI(this._currentEventDetails.location)}" target="_blank">${this._currentEventDetails.location}</a>
                                </div>
                            </div>
                        ` :
                        ''
                    }
                    ${this._currentEventDetails.description ?
                        html`
                            <div class="description">
                                ${unsafeHTML(this._currentEventDetails.description)}
                            </div>
                        ` :
                        ''
                    }
                </div>
            </ha-dialog>
        `;
    }

    _renderEventDetailsDialogHeading() {
        return html`
            <div class="header_title">
                <span>${this._currentEventDetails.summary}</span>
                <ha-icon-button
                    .label="${this.hass?.localize('ui.dialogs.generic.close') ?? 'Close'}"
                    dialogAction="close"
                    class="header_button"
                ><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
            </div>
        `;
    }

    _renderEventDetailsDate() {
        const start = this._currentEventDetails.originalStart;
        const end = this._currentEventDetails.originalEnd ?? null;

        if (end === null) {
            return html`
                ${start.toFormat(this._dateFormat + ' ' + this._timeFormat)}
            `;
        } else if (this._isFullDay(start, end, true)) {
            if (Math.abs(start.diff(end, 'hours').toObject().hours) <= 24) {
                return html`
                    ${start.toFormat(this._dateFormat)}
                `;
            } else {
                // End is midnight on the next day, so remove 1 second to get the correct end date
                const endMinusOneSecond = end.minus({ seconds: 1 });
                return html`
                    ${start.toFormat(this._dateFormat)} - ${endMinusOneSecond.toFormat(this._dateFormat)}
                `;
            }
        } else if (this._isSameDay(start, end)) {
            return html`
                ${start.toFormat(this._dateFormat + ' ' + this._timeFormat) + ' - ' + end.toFormat(this._timeFormat)}
            `;
        }

        return html`
            ${start.toFormat(this._dateFormat + ' ' + this._timeFormat)} - ${end.toFormat(this._dateFormat + ' ' + this._timeFormat)}
        `;
    }

    _getLoader() {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.style.display = 'none';
        return loader;
    }

    _updateLoader() {
        if (this._loading > 0) {
            this._loader.style.display = 'inherit';
        } else {
            this._loader.style.display = 'none';
        }
    }

    _getWeatherIcon(weatherState) {
        const condition = weatherState?.condition;
        if (!condition) {
            return null;
        }

        const state = condition.toLowerCase();
        return ICONS[state];
    }

    _waitForHassAndConfig() {
        if (!this.hass || !this._calendars) {
            window.setTimeout(() => {
                this._waitForHassAndConfig();
            }, 50)
            return;
        }

        this._updateEvents();
    }

    _subscribeToWeatherForecast() {
        this._loading++;
        this._updateLoader();
        let loadingWeather = true;
        this.hass.connection.subscribeMessage((event) => {
            this._weatherForecast = event.forecast ?? [];
            if (loadingWeather) {
                this._loading--;
                loadingWeather = false;
            }
        }, {
            type: 'weather/subscribe_forecast',
            forecast_type: this._weather.useTwiceDaily ? 'twice_daily' : 'daily',
            entity_id: this._weather.entity
        });
    }

    _updateEvents() {
        if (this._loading > 0) {
            return;
        }

        this._loading++;
        this._updateLoader();

        this._clearUpdateEventsTimeouts();

        this._error = '';
        this._events = {};
        this._calendarEvents = {};

        this._startDate = this._getStartDate();
        let startDate = this._startDate;
        let endDate = this._startDate.plus({ days: this._numberOfDays });
        let now = DateTime.now();
        let runStartdate = this._startDate.toISO();

        if (this._weather && this._weatherForecast === null) {
            this._subscribeToWeatherForecast();
        }

        let calendarNumber = 0;
        this._calendars.forEach(calendar => {
            if (!calendar.entity || !this.hass.states[calendar.entity]) {
                return;
            }

            if (!calendar.name) {
                calendar = {
                    ...calendar,
                    name: this.hass.formatEntityAttributeValue(this.hass.states[calendar.entity], 'friendly_name')
                }
            }
            let calendarSorting = calendarNumber;
            this._loading++;
            this.hass.callApi(
                'get',
                'calendars/' + calendar.entity + '?start=' + encodeURIComponent(startDate.toISO()) + '&end=' + encodeURIComponent(endDate.toISO())
            ).then(response => {
                if (this._startDate.toISO() !== runStartdate) {
                    this._loading--;
                    return;
                }

                response.forEach(event => {
                    if (this._isFilterEvent(event, calendar.filter ?? '')) {
                        return;
                    }

                    let startDate = this._convertApiDate(event.start);
                    let endDate = this._convertApiDate(event.end);
                    if (this._hidePastEvents && endDate < now) {
                        return;
                    }
                    let fullDay = this._isFullDay(startDate, endDate);

                    if (!fullDay && !this._isSameDay(startDate, endDate)) {
                        this._handleMultiDayEvent(event, startDate, endDate, calendar, calendarSorting);
                    } else {
                        this._addEvent(event, startDate, endDate, fullDay, calendar, calendarSorting);
                    }
                });

                this._loading--;
            }).catch(error => {
                if (!error.error) {
                    console.log(error);
                }
                this._error = 'Error while fetching calendar: ' + error.error;
                this._loading = 0;
                throw new Error(this._error);
            });
            calendarNumber++;
        });

        let checkLoading = window.setInterval(() => {
            if (this._loading === 0) {
                clearInterval(checkLoading);
                if (!this._error) {
                    this._updateCard();
                }
                this._updateLoader();

                this._updateEventsTimeouts.push(
                    window.setTimeout(() => {
                        this._updateEvents();
                    }, this._updateInterval * 1000)
                );
            }
        }, 50);

        this._loading--;
    }

    _clearUpdateEventsTimeouts() {
        this._updateEventsTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });
    }

    _isFilterEvent(event, calendarFilter) {
        return this._filter && event.summary.match(this._filter)
            || calendarFilter && event.summary.match(calendarFilter);
    }

    _addEvent(event, startDate, endDate, fullDay, calendar, calendarSorting) {
        if (this._hideWeekend && startDate.weekday >= 6) {
            return;
        }

        const dateKey = startDate.toISODate();
        if (!this._events.hasOwnProperty(dateKey)) {
            this._events[dateKey] = [];
        }

        const title = this._filterEventSummary(event, calendar);

        let eventKey = startDate.toISO() + '-' + endDate.toISO() + '-' + title;
        if (!this._combineSimilarEvents) {
            eventKey = startDate.toISO() + '-' + endDate.toISO() + '-' + title + '-' + calendar.entity;
        }

        if (this._calendarEvents.hasOwnProperty(eventKey)) {
            this._calendarEvents[eventKey].calendars.push(calendar.entity);
            this._calendarEvents[eventKey].colors.push(calendar.color ?? 'inherit')
            if (calendar.name && this._calendarEvents[eventKey].calendarNames.indexOf(calendar.name) === -1) {
                this._calendarEvents[eventKey].calendarNames.push(calendar.name);
            }
            if (calendarSorting < this._calendarEvents[eventKey].calendarSorting) {
                this._calendarEvents[eventKey].calendarSorting = calendarSorting;
            }
        } else {
            this._calendarEvents[eventKey] = {
                summary: title,
                description: event.description ?? null,
                location: event.location ?? null,
                start: startDate,
                originalStart: this._convertApiDate(event.start),
                end: endDate,
                originalEnd: this._convertApiDate(event.end),
                fullDay: fullDay,
                colors: [calendar.color ?? 'inherit'],
                icon: calendar.icon ?? null,
                calendars: [calendar.entity],
                calendarSorting: calendarSorting,
                priority: calendar.priority ?? 0,
                calendarNames: [calendar.name],
                class: this._getEventClass(startDate, endDate, fullDay)
            }
            this._events[dateKey].push(eventKey);
        }
    }

    _filterEventSummary(event, calendar) {
        let summary = calendar.eventTitleField ? event[calendar.eventTitleField] : event.summary;

        if (!summary) {
            return '';
        }

        if (calendar.filterText) {
            summary = summary.replace(new RegExp(calendar.filterText), '');
        }

        if (this._filterText) {
            summary = summary.replace(new RegExp(this._filterText), '');
        }

        if (calendar.replaceTitleText) {
            for (const search in calendar.replaceTitleText) {
                const replace = calendar.replaceTitleText[search];
                summary = summary.replace(search, replace);
            }
        }

        if (this._replaceTitleText) {
            for (const search in this._replaceTitleText) {
                const replace = this._replaceTitleText[search];
                summary = summary.replace(search, replace);
            }
        }

        return summary;
    }

    _getEventClass(startDate, endDate, fullDay) {
        let classes = [];
        let now = DateTime.now();
        if (fullDay) {
            classes.push('fullday');
        }
        if (endDate < now) {
            classes.push('past');
        } else if (startDate <= now && endDate > now) {
            classes.push('ongoing');
        } else {
            classes.push('future');
        }
        return classes.join(' ');
    }

    _getDayClass(startDate) {
        let classes = [];
        if (this._isToday(startDate)) {
            classes.push('today');
        } else if (this._isTomorrow(startDate)) {
            classes.push('tomorrow');
            classes.push('future');
        } else if (this._isYesterday(startDate)) {
            classes.push('yesterday');
            classes.push('past');
        } else {
            let now = DateTime.now();
            if (startDate > now) {
                classes.push('future');
            } else {
                classes.push('past');
            }
        }
        classes.push([
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
        ][startDate.weekday]);
        return classes.join(' ');
    }

    _handleMultiDayEvent(event, startDate, endDate, calendar, calendarSorting) {
        while (startDate < endDate) {
            let eventStartDate = startDate;
            startDate = startDate.plus({ days: 1 }).startOf('day');
            let eventEndDate = startDate < endDate ? startDate : endDate;

            this._addEvent(event, eventStartDate, eventEndDate, this._isFullDay(eventStartDate, eventEndDate), calendar, calendarSorting);
        }
    }

    _updateCard() {
        let days = [];

        const weatherState = this._weather ? this.hass.states[this._weather.entity] : null;
        let weatherForecast = {};
        this._weatherForecast?.forEach((forecast) => {
            // Only use day time forecasts
            if (forecast.hasOwnProperty('is_daytime') && forecast.is_daytime === false) {
                return;
            }

            const dateKey = DateTime.fromISO(forecast.datetime).toISODate();
            weatherForecast[dateKey] = {
                icon: this._getWeatherIcon(forecast),
                condition: this.hass.formatEntityState(weatherState, forecast.condition),
                temperature: this.hass.formatEntityAttributeValue(weatherState, 'temperature', forecast.temperature),
                templow: this.hass.formatEntityAttributeValue(weatherState, 'templow', forecast.templow)
            };
        });

        let startDate = this._startDate;
        let endDate = this._startDate.plus({ days: this._numberOfDays });

        let numberOfEvents = 0;
        while (startDate < endDate) {
            if (!this._hideWeekend || startDate.weekday < 6) {
                let events = [];

                const dateKey = startDate.toISODate();
                if (this._events.hasOwnProperty(dateKey)) {
                    events = this._events[dateKey].sort((event1, event2) => {
                        const e1 = this._calendarEvents[event1];
                        const e2 = this._calendarEvents[event2];

                        // Both events are all-day
                        if (e1.fullDay && e2.fullDay) {
                            const p1 = e1.priority ?? e1.calendarSorting ?? 0;
                            const p2 = e2.priority ?? e2.calendarSorting ?? 0;
                            // Sort descending by priority
                            if (p1 !== p2) return p2 - p1;
                            return e1.calendarSorting - e2.calendarSorting;
                        }

                        // One all-day, one timed: keep all-day first
                        if (e1.fullDay && !e2.fullDay) return -1;
                        if (!e1.fullDay && e2.fullDay) return 1;

                        // Both timed events: sort by start time
                        const date1 = new Date(e1.start);
                        const date2 = new Date(e2.start);
                        if (date1.getTime() === date2.getTime()) {
                            return e1.calendarSorting - e2.calendarSorting;
                        }
                        return date1.getTime() - date2.getTime();
                    });

                    const previousNumberOfEvents = numberOfEvents;
                    numberOfEvents += events.length;

                    if (this._maxEvents > 0 && numberOfEvents > this._maxEvents) {
                        events.splice(this._maxEvents - numberOfEvents);
                    }
                }

                days.push({
                    date: startDate,
                    events: events,
                    weather: weatherForecast[dateKey] ?? null,
                    class: this._getDayClass(startDate)
                });

                if (this._maxEvents > 0 && numberOfEvents >= this._maxEvents) {
                    break;
                }
            }

            startDate = startDate.plus({ days: 1 });
        }

        this._days = days;

        // Calculate max events per segment for equal heights
        if (this._daySegments.length > 0) {
            this._segmentMaxEvents = this._calculateSegmentMaxEvents();
            // Force re-render to apply new segment heights
            this.requestUpdate();
        }
    }

    /**
     * Calculate the maximum number of events in each segment across all days
     * This is used to ensure equal segment heights across the week
     *
     * @returns {Object}
     */
    _calculateSegmentMaxEvents() {
        const maxEvents = {
            [-1]: 1 // All Day segment - minimum 1 for consistent height
        };

        // Initialize for each segment with minimum of 1
        this._daySegments.forEach((segment, index) => {
            maxEvents[index] = 1;
        });

        // Count events per segment for each day
        this._days.forEach(day => {
            const dayEvents = this._getDayEvents(day);
            const groupedEvents = this._groupEventsBySegment(dayEvents);

            // Update max for each segment
            Object.keys(groupedEvents).forEach(segmentIndex => {
                const count = groupedEvents[segmentIndex].length;
                const idx = parseInt(segmentIndex, 10);
                if (count > maxEvents[idx]) {
                    maxEvents[idx] = count;
                }
            });
        });

        console.log('Week Planner Card - Segment max events:', maxEvents);
        return maxEvents;
    }

    _getWeekDayText(date) {
        if (this._language.today && this._isToday(date)) {
            return this._language.today;
        } else if (this._language.tomorrow && this._isTomorrow(date)) {
            return this._language.tomorrow;
        } else if (this._language.yesterday && this._isYesterday(date)) {
            return this._language.yesterday;
        } else {
            const weekDays = [
                this._language.sunday,
                this._language.monday,
                this._language.tuesday,
                this._language.wednesday,
                this._language.thursday,
                this._language.friday,
                this._language.saturday,
                this._language.sunday,
            ];
            const weekDay = date.weekday;
            return weekDays[weekDay];
        }
    }

    _handleContainerClick(e) {
        if (!this._actions) {
            return;
        }

        const event = new Event(
            'hass-action', {
                bubbles: true,
                composed: true,
            }
        );
        event.detail = {
            config: this._actions,
            action: 'tap',
        }
        this.dispatchEvent(event);

        e.stopImmediatePropagation();
    }

    _handleEventClick(event) {
        if (this._actions) {
            return;
        }
        this._currentEventDetails = event;
    }

    _closeDialog() {
        this._currentEventDetails = null;
    }

    _handleLegendClick(calendar) {
        if (!this._legendToggle) {
            return;
        }

        const hideIndex = this._hideCalendars.indexOf(calendar.entity);
        const hideCalendars = [...this._hideCalendars];
        if (hideIndex > -1) {
            hideCalendars.splice(hideIndex, 1);
        } else {
            hideCalendars.push(calendar.entity);
        }
        this._hideCalendars = hideCalendars;
    }

    _handleNavigationOriginalClick() {
        this._navigationOffset = 0;
        this._updateEvents();
    }

    _handleNavigationNextClick(event) {
        this._navigationOffset++;
        this._updateEvents();
    }

    _handleNavigationPreviousClick(event) {
        this._navigationOffset--;
        this._updateEvents();
    }

    _handleWeatherClick(e) {
        const event = new Event(
            'hass-more-info', {
                bubbles: true,
                composed: true,
            }
        );
        event.detail = {
            entityId: this._weather.entity
        }
        this.dispatchEvent(event);

        e.stopImmediatePropagation();
    }

    _getNumberOfDays(numberOfDays) {
        if (this._numberOfDaysIsMonth) {
            numberOfDays = DateTime.now().daysInMonth;
        }

        return numberOfDays;
    }

    _getStartDate(alternativeStartingDay) {
        let startDate = DateTime.now();

        if (this._navigationOffset !== 0) {
            if (this._numberOfDaysIsMonth) {
                startDate = startDate.plus({ months: this._navigationOffset })
            } else {
                startDate = startDate.plus({ days: this._numberOfDays * this._navigationOffset })
            }
        }

        switch (alternativeStartingDay ?? this._startingDay) {
            case 'yesterday':
                startDate = startDate.minus({ days: 1 })
                break;
            case 'tomorrow':
                startDate = startDate.plus({ days: 1 })
                break;
            case 'sunday':
                startDate = this._getWeekDayDate(startDate, 7);
                break;
            case 'monday':
                startDate = this._getWeekDayDate(startDate, 1);
                break;
            case 'tuesday':
                startDate = this._getWeekDayDate(startDate, 2);
                break;
            case 'wednesday':
                startDate = this._getWeekDayDate(startDate, 3);
                break;
            case 'thursday':
                startDate = this._getWeekDayDate(startDate, 4);
                break;
            case 'friday':
                startDate = this._getWeekDayDate(startDate, 5);
                break;
            case 'saturday':
                startDate = this._getWeekDayDate(startDate, 6);
                break;
            case 'month':
                startDate = startDate.startOf('month');
                break;
        }

        if (this._startingDayOffset !== 0) {
            startDate = startDate.plus({ days: this._startingDayOffset });
        }

        if (this._hideWeekend && startDate.weekday >= 6) {
            startDate = this._getStartDate('monday');
        }

        return startDate.startOf('day');
    }

    _getWeekDayDate(currentDate, weekday) {
        const currentWeekDay = currentDate.weekday;
        if (currentWeekDay > weekday) {
            return currentDate.minus({ days: currentWeekDay - weekday })
        }
        if (currentWeekDay < weekday) {
            return currentDate.minus({ days: 7 - weekday + currentWeekDay })
        }

        return currentDate;
    }

    _convertApiDate(apiDate) {
        let date = null;

        if (apiDate) {
            if (apiDate.dateTime) {
                date = DateTime.fromISO(apiDate.dateTime);
            } else if (apiDate.date) {
                date = DateTime.fromISO(apiDate.date);
            }
        }

        return date;
    }

    _isFullDay(startDate, endDate, multiDay) {
        if (
            startDate === null
            || endDate === null
            || startDate.hour > 0
            || startDate.minute > 0
            || startDate.second > 0
            || endDate.hour > 0
            || endDate.minute > 0
            || endDate.second > 0
        ) {
            return false;
        }

        return multiDay || Math.abs(startDate.diff(endDate, 'days').toObject().days) === 1;
    }

    _isSameDay(date1, date2) {
        if (date1 === null && date2 === null) {
            return true;
        }

        if (date1 === null || date2 === null) {
            return false;
        }

        return date1.day === date2.day
            && date1.month === date2.month
            && date1.year === date2.year
    }

    _isToday(date) {
        const today = DateTime.now().startOf('day');
        return this._isSameDay(date, today);
    }

    _isTomorrow(date) {
        const tomorrow = DateTime.now().startOf('day').plus({ days: 1 });
        return this._isSameDay(date, tomorrow);
    }

    _isYesterday(date) {
        const yesterday = DateTime.now().startOf('day').minus({ days: 1 });
        return this._isSameDay(date, yesterday);
    }
}
