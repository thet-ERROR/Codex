// js/modules/time.js
// Day / night look. By default it follows the clock (night from 19:00 to 07:00); the terminal's
// `theme night|day` pins it by hand, `theme auto` hands it back to the clock. The choice is saved.
const MODE_KEY = 'codex_daynight';

function isNightTime() {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7;
}

export function getDayNightMode() {
    try {
        const m = localStorage.getItem(MODE_KEY);
        return m === 'night' || m === 'day' ? m : 'auto';
    } catch (e) { return 'auto'; }
}

function applyDayNightMode() {
    const mode = getDayNightMode();
    document.body.classList.toggle('night-mode', mode === 'auto' ? isNightTime() : mode === 'night');
}

// mode: 'night' | 'day' | 'auto'
export function setDayNightMode(mode) {
    try {
        if (mode === 'night' || mode === 'day') localStorage.setItem(MODE_KEY, mode);
        else localStorage.removeItem(MODE_KEY);
    } catch (e) { /* private mode: it still applies for this visit */ }
    applyDayNightMode();
}

export function initDayNightCycle() {
    applyDayNightMode();
    setInterval(applyDayNightMode, 5 * 60 * 1000); // re-check every 5 min for open tabs
}

window.setDayNightMode = setDayNightMode;
window.getDayNightMode = getDayNightMode;
