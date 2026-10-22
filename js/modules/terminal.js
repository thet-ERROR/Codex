// js/modules/terminal.js
import { state } from '../state.js';

export function toggleCLI() {
    const cli = document.getElementById('cli-overlay');
    const input = document.getElementById('cli-input');
    if(!cli) return;

    cli.classList.toggle('active');
    if (cli.classList.contains('active')) {
        const output = document.getElementById('cli-output');
        if (output) output.scrollTop = output.scrollHeight;
        // On a phone, focusing the field raises the keyboard over half the screen before anyone has
        // chosen to type. The command chips are right there; tapping the field still brings it up.
        if (input && !isPhone()) input.focus();
    }
}

export function toggleHackMode() {
    state.isHacked = !state.isHacked;
    state.matrixEnabled = state.isHacked;

    const canvas = document.getElementById('matrix-canvas');
    if (state.isHacked) {
        if (canvas) canvas.style.opacity = '0.3';
        // Αλλάζει το βασικό πράσινο σε έντονο "Matrix" πράσινο
        document.documentElement.style.setProperty('--neon-green', '#00ff00');
    } else {
        if (canvas) canvas.style.opacity = '0';
        // Επαναφέρει το χρώμα στο επιλεγμένο θέμα του χρήστη
        document.documentElement.style.setProperty('--neon-green', state.currentTheme);
    }
}

export function initMatrix() {
    const canvas = document.getElementById('matrix-canvas');
    if(!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ';
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
        if (!state.matrixEnabled) return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f0';
        ctx.font = fontSize + 'px monospace';

        drops.forEach((y, i) => {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, y * fontSize);
            if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        });
    };
    setInterval(draw, 33);
}

// --- COMMANDS ---------------------------------------------------------------------------------------
// Every command is also a tappable chip (buildChips), so on a phone nothing has to be typed — the
// keyboard stays down and the terminal keeps its room. Output is written in the site's language.
const T = (k, v) => (window.t ? window.t(k, v) : k);

// Accent colours by the short names you type; `id` is the unlock id of the reward colours (wheel.js)
const COLORS = {
    lime:   { hex: '#ccff00' },
    cyan:   { hex: '#00f0ff' },
    red:    { hex: '#ff3333' },
    purple: { hex: '#b026ff' },
    gold:   { hex: '#ffd700', id: 'cyberGold' },
    orange: { hex: '#ff5e00', id: 'toxicOrange' },
    pink:   { hex: '#ff2bd6', id: 'neonPink' },
    matrix: { hex: '#00ff41', id: 'matrixGreen' }
};
const colorUnlocked = (c) => !c.id || (state.unlockedColors || []).includes(c.id);

const CHIPS = ['help', 'theme', 'color', 'sound', 'lang', 'vote', 'cart', 'tour', 'clear'];
const HISTORY = [];
let histPos = 0;
let touched = false;    // has anything been run yet — until then the banner may follow a language switch

const isPhone = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
const outEl = () => document.getElementById('cli-output');

function banner() {
    return 'CODEX TERMINAL v1.0 [SECURE CONNECTION ESTABLISHED]\n' + T('termHint') + '\n';
}
function print(text) {
    const o = outEl();
    if (!o) return;
    o.appendChild(document.createTextNode(text));
    o.scrollTop = o.scrollHeight;
}
// A row of tappable buttons inside the output: [{ label, run, color?, locked? }]
function printChips(items) {
    const o = outEl();
    if (!o) return;
    const row = document.createElement('div');
    row.className = 'cli-chips cli-chips-inline';
    items.forEach(it => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cli-chip' + (it.locked ? ' locked' : '');
        b.textContent = it.label;
        if (it.color) b.style.setProperty('--chip', it.color);
        b.addEventListener('click', () => runCommand(it.run));
        row.appendChild(b);
    });
    o.appendChild(row);
    o.scrollTop = o.scrollHeight;
}

const COMMANDS = {
    help() {
        print(T('termHelpHead') + '\n');
        [['help', 'termH_help'], ['theme', 'termH_theme'], ['color', 'termH_color'], ['sound', 'termH_sound'], ['lang', 'termH_lang'],
         ['vote', 'termH_vote'], ['cart', 'termH_cart'], ['tour', 'termH_tour'], ['clear', 'termH_clear'], ['exit', 'termH_exit']]
            .forEach(([c, k]) => print('  ' + c.padEnd(8) + '- ' + T(k) + '\n'));
    },
    clear() {
        outEl().textContent = banner();
    },
    exit() {
        toggleCLI();
    },
    theme(arg) {
        const night = document.body.classList.contains('night-mode');
        // With no argument it flips what you're looking at, by hand
        const next = (arg === 'night' || arg === 'day' || arg === 'auto') ? arg : (arg ? null : (night ? 'day' : 'night'));
        if (!next) { print(T('termThemeUsage') + '\n'); return; }
        if (window.setDayNightMode) window.setDayNightMode(next);
        print('>> ' + T('termThemeSet', { mode: T('termMode_' + next) }) + '\n');
    },
    color(arg) {
        const names = Object.keys(COLORS);
        if (!arg) {
            print(T('termColorList') + '\n');
            printChips(names.map(n => ({ label: n + (colorUnlocked(COLORS[n]) ? '' : ' 🔒'), run: 'color ' + n, color: COLORS[n].hex, locked: !colorUnlocked(COLORS[n]) })));
            return;
        }
        const c = COLORS[arg];
        if (!c) { print(T('termColorUnknown', { list: names.join(', ') }) + '\n'); return; }
        if (!colorUnlocked(c)) { print('>> ' + T('toastColorLocked') + '\n'); return; }
        if (window.setTheme) window.setTheme(c.hex, c.id);
        print('>> ' + T('termColorSet', { name: arg }) + '\n');
    },
    sound(arg) {
        const want = arg === 'on' ? true : arg === 'off' ? false : (arg ? null : !state.audioEnabled);
        if (want === null) { print(T('termSoundUsage') + '\n'); return; }
        if (want !== state.audioEnabled && window.toggleAudio) window.toggleAudio();
        print('>> ' + T(want ? 'termSoundOn' : 'termSoundOff') + '\n');
    },
    lang(arg) {
        const cur = document.documentElement.lang === 'el' ? 'el' : 'en';
        const next = (arg === 'el' || arg === 'en') ? arg : (arg ? null : (cur === 'el' ? 'en' : 'el'));
        if (!next) { print(T('termLangUsage') + '\n'); return; }
        if (window.setLanguage) window.setLanguage(next);
        print('>> ' + T('termLangSet', { lang: next.toUpperCase() }) + '\n');
    },
    async vote() {
        // Fresh numbers first, but never wait long on a sleeping server
        if (window.refreshVoteEvent) await Promise.race([window.refreshVoteEvent(), new Promise(r => setTimeout(r, 2500))]);
        const v = window.voteSummary ? window.voteSummary() : null;
        if (!v) return;
        print('>> ' + T('voteStatus_' + v.phase) + (v.title ? ' — ' + v.title : '') + '\n');
        if (v.target > 0) print('   ' + T('termVoteCount', { votes: v.votes, target: v.target }) + '\n');
        if (v.timeLeft) print('   ' + T('termVoteTime', { time: v.timeLeft }) + '\n');
        if (v.hasVoted) print('   ' + T('termVoteVoted') + '\n');
    },
    cart() {
        if (!state.cart.length) { print('>> ' + T('termCartEmpty') + '\n'); return; }
        const fmt = window.formatPrice || (c => (c / 100).toFixed(2));
        let total = 0;
        state.cart.forEach((it, i) => {
            const cents = Number(it.priceCents) || 0;
            total += cents;
            print('  ' + (i + 1) + '. ' + it.name + '  ' + fmt(cents) + '\n');
        });
        print('>> ' + T('termCartTotal', { total: fmt(total) }) + '\n');
    },
    tour() {
        print('>> ' + T('termTour') + '\n');
        toggleCLI();
        if (window.replayTour) window.replayTour();
    },
    // The old easter eggs: still there, just not listed
    hack() {
        toggleHackMode();
        print(state.isHacked ? ">> SYSTEM COMPROMISED. ACCESS GRANTED.\n" : ">> SYSTEM RESTORED. PROTOCOLS NORMAL.\n");
    },
    loot() {
        // Same reasoning as the wheel: a literal code in client-side source is
        // public the moment anyone opens devtools.
        print(">> DECRYPTING VAULT...\n>> HIDDEN COMMUNIQUE FOUND:\n>> MENTION 'THE VAULT IS OPEN' ON WHATSAPP FOR A SURPRISE.\n");
    },
    codex() {
        print(">> ACCESSING MAINFRAME...\n>> WAKE UP, AGENT.\n>> THE MATRIX HAS YOU.\n");
    }
};

export async function runCommand(raw) {
    const line = String(raw || '').trim().toLowerCase();
    if (!line) return;
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    touched = true;
    if (HISTORY[HISTORY.length - 1] !== line) HISTORY.push(line);
    histPos = HISTORY.length;
    print('\nvisitor@codex:~$ ' + line + '\n');
    // Running something — anything — is the badge. Opening the terminal isn't enough:
    // the backtick key hits it by accident often enough to be meaningless.
    if (window.checkAchievement) window.checkAchievement('terminal_access');
    const fn = Object.prototype.hasOwnProperty.call(COMMANDS, cmd) ? COMMANDS[cmd] : null;
    if (fn) { await fn(arg); return; }
    const near = CHIPS.concat('exit').filter(c => c.startsWith(cmd));
    print(T('termUnknown', { cmd }) + (near.length ? ' ' + T('termDidYouMean', { cmd: near[0] }) : '') + '\n');
}

// The chip bar under the output: tap a command instead of typing it
function buildChips() {
    const bar = document.getElementById('cli-chips');
    if (!bar) return;
    bar.textContent = '';
    CHIPS.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cli-chip';
        b.textContent = c;
        b.addEventListener('click', () => runCommand(c));
        bar.appendChild(b);
    });
}

export function initTerminal() {
    // 1. Event Listener για το άνοιγμα/κλείσιμο με το πλήκτρο `
    document.addEventListener('keydown', (e) => {
        if (e.key === '`') {
            e.preventDefault();
            toggleCLI();
        }
    });

    // 2. Typing a command: Enter runs it, ↑ / ↓ walk through the ones already run
    const cliInput = document.getElementById('cli-input');
    if (cliInput) {
        cliInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const v = this.value;
                this.value = '';
                runCommand(v);
            } else if (e.key === 'ArrowUp' && HISTORY.length) {
                e.preventDefault();
                histPos = Math.max(0, histPos - 1);
                this.value = HISTORY[histPos] || '';
            } else if (e.key === 'ArrowDown' && HISTORY.length) {
                e.preventDefault();
                histPos = Math.min(HISTORY.length, histPos + 1);
                this.value = HISTORY[histPos] || '';
            }
        });
    }

    // 3. The banner follows the language until something has been run
    buildChips();
    const o = outEl();
    if (o) o.textContent = banner();
    document.addEventListener('codex:lang', () => { if (!touched && outEl()) outEl().textContent = banner(); });
}

// Εξαγωγή στο global scope (χρησιμοποιείται στο onclick="toggleCLI()")
window.toggleCLI = toggleCLI;
window.runTerminalCommand = runCommand;
