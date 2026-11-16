// js/modules/konami.js
//
// ↑ ↑ ↓ ↓ ← → ← → B A, anywhere on the site (not while typing in a field): the CHEAT CODE badge and its
// secret accent colour, which appears in the settings and in the terminal's `color` only from then on.
// The badge is client-reported like the other UI badges; the server grants the colour along with it
// (codex-backend lib/achievements.js), so a signed-in agent keeps it on every device. A visitor
// without an account keeps it in this browser, and it is reported once they sign in.
import { state } from '../state.js';

const SEQUENCE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const COLOR = { id: 'cheatCode', hex: '#ff0a54' };
let recent = [];

function isTyping(el) {
    return !!el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));
}

export function unlockCheatCode() {
    if (window.checkAchievement) window.checkAchievement('cheat_code');
    const already = (state.unlockedColors || []).includes(COLOR.id);
    if (!already) {
        state.unlockedColors = [...(state.unlockedColors || []), COLOR.id];
        try { localStorage.setItem('codex_unlocked_colors', JSON.stringify(state.unlockedColors)); } catch (e) {}
        if (window.refreshColorLocks) window.refreshColorLocks();
    }
    // Put it on straight away: the reward is seeing it
    if (window.setTheme) window.setTheme(COLOR.hex, COLOR.id);
    if (window.showToast && window.t) window.showToast(window.t('konamiFound'), 'achievement');
}

// The last ten keys, compared as a whole — so a stray extra ↑ at the start doesn't spoil the attempt
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) { recent = []; return; }
    recent.push(String(e.key || '').toLowerCase());
    if (recent.length > SEQUENCE.length) recent.shift();
    if (recent.length === SEQUENCE.length && recent.every((k, i) => k === SEQUENCE[i])) {
        recent = [];
        unlockCheatCode();
    }
});
