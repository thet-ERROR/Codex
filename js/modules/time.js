// js/modules/time.js
function isNightTime() {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7;
}

function applyDayNightMode() {
    document.body.classList.toggle('night-mode', isNightTime());
}

export function initDayNightCycle() {
    applyDayNightMode();
    setInterval(applyDayNightMode, 5 * 60 * 1000); // re-check every 5 min for open tabs
}
