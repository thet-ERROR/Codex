// js/admin-security.js
//
// The admin panel's two-factor sign-in box (admin.html #security-box): turn it on with Google
// Authenticator (scan a QR code, confirm with a code, keep the recovery codes), make new recovery
// codes, turn it off. Started by admin-app.js after login. Turning it on or off ends every admin
// session on the server; the answer carries a new token for this one (setToken).
//
// The QR code is drawn by qrcode-generator 1.4.4, kept in js/vendor (the panel's CSP allows scripts
// from this site only — no CDN). It is the same file, byte for byte, as the storefront loads from
// jsDelivr under its SRI hash.
import { esc } from './utils.js';

let API = '', getToken = () => null, setToken = () => {}, onAuthError = () => false;
const box = () => document.getElementById('security-box');
const when = (d) => (d ? new Date(d).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' }) : '');

async function call(method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${getToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    if (onAuthError(res)) return { res, data: null, expired: true };
    return { res, data: await res.json().catch(() => ({})) };
}

let qrPromise = null;
function loadQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    qrPromise = qrPromise || new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/qrcode.js';
        s.onload = () => (window.qrcode ? resolve(window.qrcode) : reject(new Error('qrcode missing')));
        s.onerror = () => { qrPromise = null; reject(new Error('qrcode failed to load')); };
        document.head.appendChild(s);
    });
    return qrPromise;
}

const msg = (text, ok) => `<p class="sec-msg" style="color:${ok ? '#ccff00' : '#ff3333'}">${esc(text)}</p>`;

// --- states ---
async function render(note = '') {
    const { res, data, expired } = await call('GET', '/admin/2fa');
    if (expired) return;
    if (!res.ok) { box().innerHTML = msg('Δεν φορτώθηκε η κατάσταση.', false); return; }
    if (!data.keyConfigured && !data.enabled) {
        box().innerHTML = `<p class="sec-text">Για να ενεργοποιηθεί χρειάζεται η ρύθμιση <b>ADMIN_2FA_KEY</b> στο Render (Environment). Δες το .env.example του backend.</p>`;
        return;
    }
    if (!data.enabled) {
        box().innerHTML = `
            <p class="sec-text"><span class="sec-state off">ΑΝΕΝΕΡΓΟ</span> Η είσοδος θέλει μόνο τον κωδικό πρόσβασης.</p>
            <p class="sec-text">Με το 2FA θα ζητείται και ένας 6ψήφιος κωδικός από το Google Authenticator στο κινητό σου.</p>
            ${note}
            <button class="btn btn-green" data-sec="setup">ΕΝΕΡΓΟΠΟΙΗΣΗ</button>`;
        return;
    }
    box().innerHTML = `
        <p class="sec-text"><span class="sec-state on">ΕΝΕΡΓΟ</span> από ${esc(when(data.enabledAt))}</p>
        <p class="sec-text">Κωδικοί ανάκτησης που μένουν: <b>${esc(data.recoveryCodesLeft)}</b>${data.recoveryCodesLeft <= 3 ? ' — <span style="color:#ffc43d">βγάλε νέους</span>' : ''}</p>
        ${note}
        <label>Κωδικός από την εφαρμογή</label>
        <input type="text" id="sec-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
        <button class="btn" data-sec="new-codes">ΝΕΟΙ ΚΩΔΙΚΟΙ ΑΝΑΚΤΗΣΗΣ</button>
        <details class="sec-off">
            <summary>Απενεργοποίηση</summary>
            <label>Κωδικός πρόσβασης admin</label>
            <input type="password" id="sec-pass" autocomplete="current-password">
            <p class="sec-text">…και ο κωδικός της εφαρμογής από πάνω (ή ένας κωδικός ανάκτησης):</p>
            <input type="text" id="sec-recovery" maxlength="12" placeholder="XXXX-XXXX (αν δεν έχεις το κινητό)">
            <button class="btn btn-red" data-sec="disable">ΑΠΕΝΕΡΓΟΠΟΙΗΣΗ</button>
        </details>`;
}

async function setup() {
    const { res, data, expired } = await call('POST', '/admin/2fa/setup');
    if (expired) return;
    if (!res.ok) { box().insertAdjacentHTML('beforeend', msg(data?.error || 'Δεν ξεκίνησε η ρύθμιση.', false)); return; }
    box().innerHTML = `
        <ol class="sec-steps">
            <li>Άνοιξε το <b>Google Authenticator</b> → <b>+</b> → <b>Σάρωση κωδικού QR</b>.</li>
            <li>Σκάναρε τον κωδικό. Δεν σκανάρεται; Διάλεξε «Εισαγωγή κλειδιού» και γράψε το κλειδί από κάτω.</li>
            <li>Γράψε εδώ τον 6ψήφιο κωδικό που δείχνει η εφαρμογή.</li>
        </ol>
        <div class="sec-qr" id="sec-qr">…</div>
        <div class="sec-key">${esc(data.secret.replace(/(.{4})/g, '$1 ').trim())}</div>
        <label>Κωδικός από την εφαρμογή</label>
        <input type="text" id="sec-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
        <button class="btn btn-green" data-sec="enable">ΕΠΙΒΕΒΑΙΩΣΗ</button>
        <button class="btn btn-cancel" data-sec="cancel">ΑΚΥΡΟ</button>`;
    try {
        const qrcode = await loadQr();
        const qr = qrcode(0, 'M');
        qr.addData(data.otpauthUrl);
        qr.make();
        document.getElementById('sec-qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch (e) {
        document.getElementById('sec-qr').textContent = 'Ο κωδικός QR δεν φορτώθηκε — γράψε το κλειδί στην εφαρμογή.';
    }
}

// The recovery codes, shown this once
function showRecovery(codes, title) {
    const text = `PHOENIX CODEX — κωδικοί ανάκτησης admin (${new Date().toLocaleDateString('el-GR')})\nΚαθένας δουλεύει μία φορά.\n\n${codes.join('\n')}\n`;
    box().innerHTML = `
        <p class="sec-text"><b>${esc(title)}</b></p>
        <p class="sec-text" style="color:#ffc43d">Φύλαξέ τους κάπου εκτός κινητού (χαρτί, password manager). Δεν θα ξαναφανούν. Ο καθένας δουλεύει μία φορά, αν χάσεις το κινητό.</p>
        <div class="sec-codes">${codes.map(c => `<code>${esc(c)}</code>`).join('')}</div>
        <div style="display:flex; gap:8px;">
            <button class="btn" data-sec="copy" style="flex:1;">ΑΝΤΙΓΡΑΦΗ</button>
            <button class="btn" data-sec="download" style="flex:1;">ΛΗΨΗ .TXT</button>
        </div>
        <button class="btn btn-green" data-sec="done">ΤΟΥΣ ΦΥΛΑΞΑ</button>`;
    box().dataset.codes = text;
}

async function enable() {
    const code = (document.getElementById('sec-code')?.value || '').replace(/\s/g, '');
    const { res, data, expired } = await call('POST', '/admin/2fa/enable', { code });
    if (expired) return;
    if (!res.ok) { box().insertAdjacentHTML('beforeend', msg(data?.error || 'Λάθος κωδικός.', false)); return; }
    setToken(data.token);
    showRecovery(data.recoveryCodes, 'Το 2FA ενεργοποιήθηκε. Από την επόμενη είσοδο θα σου ζητείται ο κωδικός της εφαρμογής.');
}

async function newCodes() {
    const code = (document.getElementById('sec-code')?.value || '').replace(/\s/g, '');
    const { res, data, expired } = await call('POST', '/admin/2fa/recovery-codes', { code });
    if (expired) return;
    if (!res.ok) { box().insertAdjacentHTML('beforeend', msg(data?.error || 'Λάθος κωδικός.', false)); return; }
    showRecovery(data.recoveryCodes, 'Νέοι κωδικοί ανάκτησης. Οι παλιοί δεν ισχύουν πια.');
}

async function disable() {
    if (!confirm('Απενεργοποίηση του 2FA; Η είσοδος θα θέλει πάλι μόνο τον κωδικό πρόσβασης.')) return;
    const body = {
        password: document.getElementById('sec-pass')?.value || '',
        code: (document.getElementById('sec-code')?.value || '').replace(/\s/g, ''),
        recoveryCode: document.getElementById('sec-recovery')?.value || ''
    };
    const { res, data, expired } = await call('POST', '/admin/2fa/disable', body);
    if (expired) return;
    if (!res.ok) { box().insertAdjacentHTML('beforeend', msg(data?.error || 'Δεν απενεργοποιήθηκε.', false)); return; }
    setToken(data.token);
    render(msg('Το 2FA απενεργοποιήθηκε.', true));
}

async function act(action) {
    if (action === 'setup') return setup();
    if (action === 'enable') return enable();
    if (action === 'cancel' || action === 'done') return render();
    if (action === 'new-codes') return newCodes();
    if (action === 'disable') return disable();
    if (action === 'copy') {
        try { await navigator.clipboard.writeText(box().dataset.codes); alert('Αντιγράφηκαν.'); }
        catch (e) { alert('Η αντιγραφή δεν έγινε — κατέβασέ τους ως .txt'); }
    }
    if (action === 'download') {
        const url = URL.createObjectURL(new Blob([box().dataset.codes], { type: 'text/plain;charset=utf-8' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: 'phoenix-codex-recovery-codes.txt' });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

let wired = false;
export function initSecurity(opts) {
    ({ API, getToken, setToken, onAuthError } = opts);
    if (!wired) {
        wired = true;
        box()?.addEventListener('click', (ev) => {
            const el = ev.target.closest('[data-sec]');
            if (el) act(el.dataset.sec);
        });
    }
    render();
}
