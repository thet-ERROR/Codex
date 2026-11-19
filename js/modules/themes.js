// js/modules/themes.js
//
// The five themes (css/base/themes.css): which one is on, which ones this visitor can wear, and how a locked
// one tells you where to win it. The server decides who has what (codex-backend src/lib/themes.js) and sends
// the list as `unlockedThemes` with /me, /wheel, the spin and the profile; this file only keeps it, in the
// browser too so a visitor without an account (the Konami code) keeps what they found.
//
// Before the themes the site had thirteen accent colours (codex_theme held a hex, codex_unlocked_colors the
// won ones). They are read here once and turned into themes, so nobody loses a win or the look they chose.
import { state } from '../state.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n.js';

const KEY_THEME = 'codex_theme_id';
const KEY_UNLOCKED = 'codex_unlocked_themes';

const safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

export const themeIds = () => Object.keys(CONFIG.THEMES);
export const isFree = (id) => !!CONFIG.THEMES[id] && CONFIG.THEMES[id].source === 'free';
export const themeUnlocked = (id) => !!CONFIG.THEMES[id] && (isFree(id) || (state.unlockedThemes || []).includes(id));

// Old colour names (and the old hex of a free colour) to the theme they became — the same table as the server's
function legacyTheme(c) { return CONFIG.LEGACY_COLOR_THEME[c] || null; }

// What the browser already holds from before the themes, as theme ids
export function migrateLegacy() {
    const found = new Set();
    try {
        (JSON.parse(safeGet('codex_unlocked_colors')) || []).forEach(c => { const th = legacyTheme(c); if (th) found.add(th); });
    } catch (e) {}
    try {
        (JSON.parse(safeGet(KEY_UNLOCKED)) || []).forEach(th => { if (CONFIG.THEMES[th]) found.add(th); });
    } catch (e) {}
    return [...found].filter(th => !isFree(th));
}

// The theme to start with: the saved id, else the look the visitor had chosen before the themes
function startingTheme() {
    const saved = safeGet(KEY_THEME);
    if (saved && CONFIG.THEMES[saved]) return saved;
    const oldHex = (safeGet('codex_theme') || '').toLowerCase();
    return CONFIG.LEGACY_COLOR_THEME[oldHex] || CONFIG.DEFAULT_THEME;
}

function paint(id) {
    document.documentElement.dataset.theme = id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', CONFIG.THEMES[id].colors[1]);
    // The hack mode (the terminal's `hack`) paints the accent matrix green by hand; a theme change ends it cleanly
    clearAccentOverride();
}

// The matrix/hack look wins over any theme while it is on
export function setAccentOverride(rgbTriple) {
    document.documentElement.style.setProperty('--a-rgb', rgbTriple);
}
export function clearAccentOverride() {
    if (!state.isHacked) document.documentElement.style.removeProperty('--a-rgb');
}

export function refreshThemeLocks() {
    document.querySelectorAll('.theme-card[data-theme-id]').forEach(btn => {
        const id = btn.dataset.themeId;
        const open = themeUnlocked(id);
        btn.classList.toggle('locked', !open);
        // A secret theme isn't shown locked — it isn't shown at all until it's yours
        if (btn.hasAttribute('data-secret')) btn.hidden = !open;
    });
    syncThemeCards();
}

export function syncThemeCards() {
    document.querySelectorAll('.theme-card[data-theme-id]').forEach(btn => {
        const on = btn.dataset.themeId === state.theme;
        btn.classList.toggle('current', on);
        btn.setAttribute('aria-pressed', String(on));
    });
}

// Why a theme is locked: the wheel gives one, a rank gives one (the server's ladder says which, shown by
// name once the profile has loaded it)
export function themeLockMessage(id) {
    const th = CONFIG.THEMES[id];
    if (!th) return t('toastThemeLocked');
    if (th.source === 'wheel') return t('toastThemeWheel', { name: th.name });
    if (th.source === 'rank') {
        const rank = (state.ranks || []).find(r => r.rewards && r.rewards.theme === id);
        return rank && window.rankName ? t('toastThemeRank', { name: th.name, rank: window.rankName(rank.id) }) : t('toastThemeRankAny', { name: th.name });
    }
    return t('toastThemeLocked');
}

export function setTheme(id, { quiet = false } = {}) {
    if (!CONFIG.THEMES[id]) return false;
    if (!themeUnlocked(id)) {
        if (!quiet && window.showToast) window.showToast(themeLockMessage(id), 'error');
        return false;
    }
    state.theme = id;
    safeSet(KEY_THEME, id);
    paint(id);
    syncThemeCards();
    if (window.syncSettingsUI) window.syncSettingsUI();
    return true;
}

// Themes the server (or a win in this browser) says are open. Merged, never replaced: a theme found in this
// browser before signing in stays until the server has it too.
export function applyThemeData(list) {
    if (!Array.isArray(list)) return;
    const merged = [...new Set([...(state.unlockedThemes || []), ...list.filter(id => CONFIG.THEMES[id] && !isFree(id))])];
    state.unlockedThemes = merged;
    safeSet(KEY_UNLOCKED, JSON.stringify(merged));
    refreshThemeLocks();
}

// A win that happened here (the Konami code): kept in this browser and put on at once
export function unlockTheme(id) {
    if (!CONFIG.THEMES[id] || isFree(id)) return false;
    const had = themeUnlocked(id);
    applyThemeData([id]);
    return !had;
}

// Called once at boot, before the first paint of the settings
export function initThemes() {
    state.unlockedThemes = migrateLegacy();
    safeSet(KEY_UNLOCKED, JSON.stringify(state.unlockedThemes));
    let id = startingTheme();
    // A saved theme that is not (or no longer) open falls back to the default
    if (!themeUnlocked(id)) id = CONFIG.DEFAULT_THEME;
    state.theme = id;
    paint(id);
    refreshThemeLocks();
}

window.setTheme = setTheme;
window.themeUnlocked = themeUnlocked;
window.themeLockMessage = themeLockMessage;
window.applyThemeData = applyThemeData;
window.unlockTheme = unlockTheme;
window.refreshThemeLocks = refreshThemeLocks;
