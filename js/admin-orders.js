// js/admin-orders.js
//
// The admin panel's ORDERS tab (admin.html #panel-orders) and the order settings box. Started by
// admin-app.js after login with the API base, the session token and its "session expired" handler.
// Same rules as the rest of the panel: everything from the server goes through esc() before it
// reaches innerHTML, and every control is wired here with addEventListener (the page's CSP allows no
// inline handlers).
import { esc, formatPrice } from './utils.js';

const STATUS = {
    new: { label: 'ΝΕΑ', color: '#00f0ff' },
    paid: { label: 'ΠΛΗΡΩΘΗΚΕ', color: '#ccff00' },
    building: { label: 'ΣΕ ΚΑΤΑΣΚΕΥΗ', color: '#b026ff' },
    packed: { label: 'ΠΑΚΕΤΑΡΙΣΤΗΚΕ', color: '#d68cff' },
    shipped: { label: 'ΑΠΕΣΤΑΛΗ', color: '#ffc43d' },
    delivered: { label: 'ΠΑΡΑΔΟΘΗΚΕ', color: '#7dffb0' },
    completed: { label: 'ΟΛΟΚΛΗΡΩΘΗΚΕ', color: '#888888' },
    cancelled: { label: 'ΑΚΥΡΩΘΗΚΕ', color: '#ff3333' }
};
// The forward steps an admin can take, in order (completed is automatic, after the return window)
const FLOW = ['new', 'paid', 'building', 'packed', 'shipped', 'delivered'];
const NEXT_LABEL = { paid: 'ΠΛΗΡΩΘΗΚΕ', building: 'ΣΕ ΚΑΤΑΣΚΕΥΗ', packed: 'ΠΑΚΕΤΑΡΙΣΤΗΚΕ', shipped: 'ΑΠΕΣΤΑΛΗ', delivered: 'ΠΑΡΑΔΟΘΗΚΕ' };
const DELIVERY = { courier: 'Courier', hand: 'Χέρι με χέρι', boxnow: 'BOX NOW' };
const EXTRA = { hdd: '+1TB HDD', ssd: '+1TB SSD', proConfig: 'Pro Configuration', paint: 'Βαφή' };
const CODE_STATE = { pending: 'ΣΤΟ ΚΟΥΤΙ', active: 'ΤΟΝ ΕΒΑΛΕ', used: 'ΕΓΡΑΨΕ ΚΡΙΤΙΚΗ', void: 'ΑΚΥΡΟΣ' };
// Who made a step in the history
const BOX_CODE_NOTE = 'box code entered';
const byLabel = (h) => h.by === 'auto' ? 'αυτόματα (τέλος επιστροφών)'
    : h.by === 'customer' && h.note === BOX_CODE_NOTE ? 'πελάτης — έβαλε τον κωδικό του κουτιού'
    : h.by === 'customer' ? 'πελάτης' : h.by === 'admin' ? 'εσύ' : (h.by || '');

let API = '', getToken = () => null, onAuthError = () => false;
let current = null;          // the order open in the detail view
let refreshTimer = 0;

const $ = (id) => document.getElementById(id);
const when = (d) => (d ? new Date(d).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const badge = (status) => {
    const s = STATUS[status] || { label: status, color: '#aaa' };
    return `<span class="ord-status" style="--c:${s.color}">${esc(s.label)}</span>`;
};
const extraLabel = (e) => e.key === 'storage' ? (EXTRA[e.choice] || e.choice)
    : e.key === 'paint' ? `${EXTRA.paint}${e.colorNameEl || e.colorName ? ` — ${e.colorNameEl || e.colorName}` : ''}`
    : (EXTRA[e.key] || e.key);

async function call(method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${getToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    if (onAuthError(res)) return { res, data: null, expired: true };
    const data = await res.json().catch(() => ({}));
    return { res, data };
}

// --- the list ---
export async function loadOrders() {
    const box = $('orders-list');
    if (!box) return;
    const q = new URLSearchParams();
    if ($('orders-status-filter').value) q.set('status', $('orders-status-filter').value);
    if ($('orders-demo-filter').value) q.set('demo', $('orders-demo-filter').value);
    const { res, data, expired } = await call('GET', `/admin/orders${q.toString() ? `?${q}` : ''}`);
    if (expired) return;
    if (!res.ok || !Array.isArray(data)) { box.innerHTML = '<div class="ord-empty">Δεν φορτώθηκαν οι παραγγελίες.</div>'; return; }

    // The tab's badge counts the new ones (only meaningful on an unfiltered list)
    if (!q.toString()) {
        const fresh = data.filter(o => o.status === 'new').length + data.filter(o => o.openRequests).length;
        const b = $('orders-new-badge');
        if (b) { b.textContent = fresh; b.classList.toggle('hidden', !fresh); }
    }
    if (!data.length) { box.innerHTML = '<div class="ord-empty">Καμία παραγγελία εδώ.</div>'; return; }
    box.innerHTML = data.map(o => {
        const d = o.delivery || {};
        const where = d.method === 'hand' ? d.area : d.method === 'courier' ? d.city : d.method === 'boxnow' ? 'locker' : '';
        return `
        <button type="button" class="ord-row" data-action="open-order" data-number="${esc(o.number)}">
            <span class="ord-row-top">
                <b>${esc(o.number)}</b>
                ${o.demo ? '<span class="ord-flag demo">DEMO</span>' : ''}
                ${badge(o.status)}
                ${o.priorNoShows ? `<span class="ord-flag warn" title="Προηγούμενες μη εμφανίσεις">⚠ ${esc(o.priorNoShows)}</span>` : ''}
                ${o.openRequests ? `<span class="ord-flag req" title="Ανοιχτό αίτημα πελάτη">ΑΙΤΗΜΑ${o.openRequests > 1 ? ` ×${esc(o.openRequests)}` : ''}</span>` : ''}
                ${o.refundDue ? '<span class="ord-flag refund">ΕΠΙΣΤΡΟΦΗ ΧΡΗΜΑΤΩΝ</span>' : ''}
                <span class="ord-total">${formatPrice(o.totalCents)}</span>
            </span>
            <span class="ord-row-sub">
                ${esc(o.customer?.firstName)} ${esc(o.customer?.lastName)} · ${esc(o.customer?.phone)} · ${esc(DELIVERY[d.method] || '')}${where ? ` (${esc(where)})` : ''} · ${esc(when(o.createdAt))}
            </span>
        </button>`;
    }).join('');
}

// --- one order ---
async function openOrder(number) {
    const { res, data, expired } = await call('GET', `/admin/orders/${encodeURIComponent(number)}`);
    if (expired) return;
    if (!res.ok) { alert(data?.error || 'Η παραγγελία δεν βρέθηκε'); return; }
    current = data;
    renderDetail();
    $('orders-list-view').classList.add('hidden');
    $('order-detail').classList.remove('hidden');
    $('order-detail').scrollIntoView({ block: 'start' });
}

function closeDetail() {
    current = null;
    $('order-detail').classList.add('hidden');
    $('orders-list-view').classList.remove('hidden');
    loadOrders();
}

function renderDetail() {
    const o = current;
    const d = o.delivery || {};
    const inv = o.invoice || {};
    const step = FLOW.indexOf(o.status);
    // The steps still ahead (skipping is allowed; going back is not)
    const ahead = step >= 0 ? FLOW.slice(step + 1) : [];
    const cancellable = step >= 0 && step < FLOW.indexOf('delivered');
    const address = d.method === 'courier' ? `${d.address}, ${d.postcode} ${d.city}`
        : d.method === 'hand' ? `${d.area} — ${d.address}` : d.method === 'boxnow' ? `Locker: ${d.locker}` : '';

    $('order-detail').innerHTML = `
        <div class="ord-head">
            <button type="button" class="btn-sm edit-btn" data-action="back">← ΠΙΣΩ</button>
            <h3>${esc(o.number)} ${o.demo ? '<span class="ord-flag demo">DEMO</span>' : ''} ${badge(o.status)}</h3>
        </div>
        ${o.priorNoShows ? `<div class="ord-alert">⚠ ${esc(o.priorNoShows)} προηγούμενη/ες παραγγελία/ες από αυτό το τηλέφωνο ή email δεν παραλήφθηκε/αν. Ζήτα προκαταβολή.</div>` : ''}
        ${o.refundDue ? '<div class="ord-alert refund">Ακυρώθηκε αφού πληρώθηκε: χρειάζεται επιστροφή χρημάτων.</div>' : ''}
        ${o.noShow ? '<div class="ord-alert">Σημειώθηκε ως «δεν εμφανίστηκε».</div>' : ''}

        <div class="ord-grid">
            <div class="ord-card">
                <div class="ord-k">ΠΕΛΑΤΗΣ</div>
                <div>${esc(o.customer?.firstName)} ${esc(o.customer?.lastName)} <span class="ord-muted">(${o.userId ? 'μέλος' : 'επισκέπτης'})</span></div>
                <div><a href="tel:${esc(o.customer?.phone)}">${esc(o.customer?.phone)}</a></div>
                <div><a href="mailto:${esc(o.customer?.email)}">${esc(o.customer?.email)}</a></div>
            </div>
            <div class="ord-card">
                <div class="ord-k">ΠΑΡΑΔΟΣΗ</div>
                <div>${esc(DELIVERY[d.method] || d.method)}</div>
                <div>${esc(address)}</div>
                ${d.trackingNumber ? `<div>Αποστολή: <b>${esc(d.trackingNumber)}</b></div>` : ''}
                ${o.returnDeadline ? `<div class="ord-muted">Επιστροφή έως ${esc(when(o.returnDeadline))}</div>` : ''}
            </div>
            <div class="ord-card">
                <div class="ord-k">ΠΑΡΑΣΤΑΤΙΚΟ</div>
                ${inv.type === 'invoice'
                    ? `<div>Τιμολόγιο</div><div>${esc(inv.companyName)}</div><div>ΑΦΜ ${esc(inv.vatNumber)} · ΔΟΥ ${esc(inv.taxOffice)}</div>`
                    : '<div>Απόδειξη</div>'}
            </div>
            <div class="ord-card">
                <div class="ord-k">ΠΛΗΡΩΜΗ / ΣΥΝΑΙΝΕΣΗ</div>
                <div>${o.payment?.paidAt ? `Πληρώθηκε ${esc(when(o.payment.paidAt))}` : '<span style="color:#ffc43d">Δεν έχει πληρωθεί</span>'}</div>
                <div class="ord-muted">Όροι ${esc(o.consent?.termsVersion)} · ${esc(when(o.consent?.acceptedAt))}</div>
                <div class="ord-muted">${o.consent?.adultOrGuardian ? '18+ ή συγκατάθεση κηδεμόνα: ναι' : ''}</div>
            </div>
        </div>

        <div class="ord-card">
            <div class="ord-k">ΣΥΣΤΗΜΑΤΑ</div>
            ${(o.items || []).map(i => `
                <div class="ord-line"><span>${esc(i.name)}${i.paint ? ' <span class="ord-flag">ΒΑΦΗ</span>' : ''}</span><b>${formatPrice(i.totalCents)}</b></div>
                ${(i.extras || []).map(e => `<div class="ord-line sub"><span>${esc(extraLabel(e))}</span><span>+${formatPrice(e.priceCents)}</span></div>`).join('')}`).join('')}
            ${o.discountCents ? `<div class="ord-line sub"><span>Κουπόνι ${esc(o.coupon?.code)} (-${esc(o.coupon?.percent)}%)</span><span>-${formatPrice(o.discountCents)}</span></div>` : ''}
            <div class="ord-line total"><span>ΣΥΝΟΛΟ</span><b>${formatPrice(o.totalCents)}</b></div>
        </div>

        ${(o.reviewCodes || []).length ? `
        <div class="ord-card">
            <div class="ord-k">ΚΩΔΙΚΟΙ ΚΡΙΤΙΚΗΣ — ΓΙΑ ΤΟ ΚΟΥΤΙ</div>
            <div class="ord-muted">Τύπωσέ τους και βάλε τον καθένα στο κουτί του. Όταν ο πελάτης τον βάλει, η παραγγελία γίνεται «Παραδόθηκε» αν δεν το έχεις πατήσει, και έχει 14 μέρες για κριτική.</div>
            ${o.reviewCodes.map(c => `<div class="ord-line"><span><code class="ord-code">${esc(c.code)}</code> ${esc(c.pcName)}</span><span class="ord-flag">${esc(CODE_STATE[c.status] || c.status)}</span></div>`).join('')}
            <div class="ord-btns"><button type="button" class="btn-sm edit-btn" data-action="print-codes">🖨 ΕΚΤΥΠΩΣΗ</button></div>
        </div>` : ''}
        ${o.status === 'delivered' && o.returnDeadline ? `<div class="ord-muted ord-autonote">Κλείνει αυτόματα ως «Ολοκληρώθηκε» στις ${esc(when(o.returnDeadline))}, αν δεν υπάρχει ανοιχτό αίτημα επιστροφής.</div>` : ''}

        ${o.notes ? `<div class="ord-card"><div class="ord-k">ΣΗΜΕΙΩΣΕΙΣ ΠΕΛΑΤΗ</div><div class="ord-notes">${esc(o.notes)}</div></div>` : ''}

        ${(o.requests || []).length ? `
        <div class="ord-card">
            <div class="ord-k">ΑΙΤΗΜΑΤΑ ΠΕΛΑΤΗ</div>
            ${o.requests.map(r => `
                <div class="ord-request ${r.handledAt ? 'handled' : 'open'}">
                    <div class="ord-request-top">
                        <b>${esc(r.type === 'return' ? 'Επιστροφή' : 'Πρόβλημα (εγγύηση)')}</b>
                        <span class="ord-flag ${r.handledAt ? '' : 'req'}">${r.handledAt ? 'ΧΕΙΡΙΣΤΗΚΕ' : 'ΑΝΟΙΧΤΟ'}</span>
                        <span class="ord-muted">${esc(when(r.createdAt))}</span>
                    </div>
                    <div class="ord-notes">${esc(r.message)}</div>
                    ${r.handledAt
                        ? `<div class="ord-muted">${esc(when(r.handledAt))}${r.handledNote ? ` — ${esc(r.handledNote)}` : ''}</div>`
                        : `<div class="ord-request-act"><input type="text" maxlength="300" placeholder="Σημείωση (προαιρετικά)" data-request-note="${esc(r._id)}"><button type="button" class="btn-sm ord-next" style="--c:#ccff00" data-action="handle-request" data-id="${esc(r._id)}">ΤΟ ΧΕΙΡΙΣΤΗΚΑ</button></div>`}
                </div>`).join('')}
        </div>` : ''}

        ${ahead.length || cancellable ? `
        <div class="ord-card ord-actions">
            <div class="ord-k">ΕΝΕΡΓΕΙΕΣ</div>
            <label>Σημείωση (προαιρετικά, μπαίνει στο ιστορικό)</label>
            <input type="text" id="ord-note" maxlength="300">
            ${ahead.includes('shipped') ? '<label>Αριθμός αποστολής courier (για «Απεστάλη»)</label><input type="text" id="ord-tracking" maxlength="60">' : ''}
            <div class="ord-btns">
                ${ahead.map(s => `<button type="button" class="btn-sm ord-next" style="--c:${STATUS[s].color}" data-action="status" data-status="${s}">→ ${NEXT_LABEL[s]}</button>`).join('')}
            </div>
            ${cancellable ? `
            <div class="ord-btns">
                <button type="button" class="btn-sm del-btn" data-action="cancel">ΑΚΥΡΩΣΗ</button>
                <button type="button" class="btn-sm del-btn" data-action="no-show">ΔΕΝ ΕΜΦΑΝΙΣΤΗΚΕ</button>
            </div>` : ''}
        </div>` : ''}

        <div class="ord-card">
            <div class="ord-k">ΙΣΤΟΡΙΚΟ</div>
            ${(o.history || []).map(h => `<div class="ord-line sub"><span>${badge(h.status)} ${esc(byLabel(h))}${h.note && h.note !== BOX_CODE_NOTE ? ` — ${esc(h.note)}` : ''}</span><span>${esc(when(h.at))}</span></div>`).join('')}
        </div>`;
}

async function moveTo(status) {
    const note = ($('ord-note')?.value || '').trim();
    const trackingNumber = status === 'shipped' ? ($('ord-tracking')?.value || '').trim() : '';
    let r = await call('POST', `/admin/orders/${encodeURIComponent(current.number)}/status`, { status, note, trackingNumber });
    if (r.expired) return;
    // The guard against sending an order nobody has paid for: ask, then send it anyway if confirmed
    if (r.res.status === 409 && r.data?.code === 'NOT_PAID') {
        if (!confirm('Η παραγγελία ΔΕΝ έχει σημειωθεί ως πληρωμένη.\nΝα προχωρήσει παρ’ όλα αυτά;')) return;
        r = await call('POST', `/admin/orders/${encodeURIComponent(current.number)}/status`, { status, note, trackingNumber, force: true });
        if (r.expired) return;
    }
    if (!r.res.ok) { alert(r.data?.error || 'Η αλλαγή δεν έγινε'); return; }
    current = { ...r.data, priorNoShows: current.priorNoShows };
    renderDetail();
}

// A slip per code, for the box. Printed from this page: everything else is hidden while printing
// (admin-style.css, body.printing-slips).
function printCodes() {
    const slips = document.createElement('div');
    slips.id = 'print-slips';
    slips.innerHTML = (current.reviewCodes || []).filter(c => c.status !== 'void').map(c => `
        <div class="slip">
            <div class="slip-title">PHOENIX CODEX</div>
            <div>Πώς πάει το νέο σου PC; Γράψε κριτική · How's your new PC? Write a review</div>
            <div class="slip-pc">${esc(c.pcName)}</div>
            <div class="slip-code">${esc(c.code)}</div>
            <div>${esc(location.origin)} → «Γράψε κριτική» / "Write review"</div>
            <div class="slip-small">Ισχύει 14 ημέρες από την παράδοση, μία φορά · Valid for 14 days from delivery, once</div>
        </div>`).join('');
    document.body.appendChild(slips);
    document.body.classList.add('printing-slips');
    const done = () => { document.body.classList.remove('printing-slips'); slips.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
}

async function handleRequest(id) {
    const note = (document.querySelector(`[data-request-note="${CSS.escape(id)}"]`)?.value || '').trim();
    const r = await call('POST', `/admin/orders/${encodeURIComponent(current.number)}/requests/${encodeURIComponent(id)}/handle`, { note });
    if (r.expired) return;
    if (!r.res.ok) { alert(r.data?.error || 'Δεν έγινε'); return; }
    current = { ...r.data, priorNoShows: current.priorNoShows, reviewCodes: r.data.reviewCodes || current.reviewCodes };
    renderDetail();
}

async function cancel(noShow) {
    const question = noShow
        ? 'Ακύρωση ως «ΔΕΝ ΕΜΦΑΝΙΣΤΗΚΕ»;\nΤο PC ξαναγίνεται διαθέσιμο και ο πελάτης σημειώνεται για τις επόμενες παραγγελίες του.'
        : 'Ακύρωση της παραγγελίας;\nΤο PC ξαναγίνεται διαθέσιμο και ο πελάτης παίρνει email.';
    if (!confirm(question)) return;
    const note = ($('ord-note')?.value || '').trim();
    const r = await call('POST', `/admin/orders/${encodeURIComponent(current.number)}/cancel`, { reason: noShow ? 'no_show' : 'admin', note });
    if (r.expired) return;
    if (!r.res.ok) { alert(r.data?.error || 'Η ακύρωση δεν έγινε'); return; }
    // The server voided the unused codes with the order
    current = { ...r.data, priorNoShows: current.priorNoShows, reviewCodes: (current.reviewCodes || []).map(c => (c.status === 'used' ? c : { ...c, status: 'void' })) };
    renderDetail();
}

// --- settings ---
async function loadOrderSettings() {
    const { res, data, expired } = await call('GET', '/site-config');
    if (expired || !res.ok || !data) return;
    if (data.returnDays) $('os-return-days').value = data.returnDays;
    if (Array.isArray(data.handDeliveryAreas)) $('os-areas').value = data.handDeliveryAreas.join('\n');
    $('os-deliveries-on').checked = data.deliveriesBadgeOn !== false;
    $('os-deliveries-min').value = data.deliveriesBadgeMin || 10;
}

async function saveOrderSettings() {
    const out = $('os-result');
    const body = {
        returnDays: Number($('os-return-days').value),
        handDeliveryAreas: $('os-areas').value.split('\n').map(s => s.trim()).filter(Boolean),
        deliveriesBadgeOn: $('os-deliveries-on').checked,
        deliveriesBadgeMin: Number($('os-deliveries-min').value)
    };
    const { res, data, expired } = await call('POST', '/site-config', body);
    if (expired) return;
    out.style.color = res.ok ? '#ccff00' : '#ff3333';
    out.textContent = res.ok ? 'Αποθηκεύτηκε.' : (data?.error || 'Δεν αποθηκεύτηκε.');
    if (res.ok) { loadOrderSettings(); loadStats(); }
}

// --- the admin's own figures (never public) ---
async function loadStats() {
    const box = $('order-stats');
    if (!box) return;
    const { res, data, expired } = await call('GET', '/admin/order-stats');
    if (expired) return;
    if (!res.ok || !data?.live) { box.textContent = 'Δεν φορτώθηκαν.'; return; }
    const row = (label, all, d30) => `<div class="ord-line sub"><span>${esc(label)}</span><b>${esc(all)}${d30 !== undefined ? ` <span class="ord-muted">(30 ημ.: ${esc(d30)})</span>` : ''}</b></div>`;
    const block = (s) => [
        row('Παραδόσεις', s.delivered, s.delivered30),
        row('Ολοκληρώθηκαν', s.completed),
        row('Μέσα στο διάστημα επιστροφής', s.inReturnWindow),
        row('Αιτήματα επιστροφής', s.returns, s.returns30),
        row('Προβλήματα (εγγύηση)', s.problems, s.problems30),
        row('Ανοιχτά αιτήματα', s.openRequests)
    ].join('');
    box.innerHTML = `
        <div class="ord-k">ΠΡΑΓΜΑΤΙΚΕΣ</div>${block(data.live)}
        <div class="ord-muted ord-stats-note">Στη βιτρίνα μετράνε ${esc(data.live.publicCount)} (ολοκληρωμένες, χωρίς αίτημα επιστροφής) — φαίνονται μόνο από το όριο και πάνω. Τα προβλήματα δεν φαίνονται ποτέ δημόσια.</div>
        <div class="ord-k">DEMO</div>${block(data.demo)}`;
}

// --- tabs and wiring ---
function showTab(tab) {
    document.querySelectorAll('.center-tab').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.center-panel').forEach(p => p.classList.toggle('hidden', p.id !== `panel-${tab}`));
    if (tab === 'orders') loadOrders();
}

let wired = false;
export function initOrders(opts) {
    ({ API, getToken, onAuthError } = opts);
    if (!wired) {
        wired = true;
        document.querySelectorAll('.center-tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
        $('orders-status-filter')?.addEventListener('change', loadOrders);
        $('orders-demo-filter')?.addEventListener('change', loadOrders);
        $('orders-refresh-btn')?.addEventListener('click', loadOrders);
        $('orders-list')?.addEventListener('click', (ev) => {
            const row = ev.target.closest('[data-action="open-order"]');
            if (row) openOrder(row.dataset.number);
        });
        $('order-detail')?.addEventListener('click', (ev) => {
            const el = ev.target.closest('[data-action]');
            if (!el) return;
            if (el.dataset.action === 'back') closeDetail();
            if (el.dataset.action === 'status') moveTo(el.dataset.status);
            if (el.dataset.action === 'cancel') cancel(false);
            if (el.dataset.action === 'no-show') cancel(true);
            if (el.dataset.action === 'handle-request') handleRequest(el.dataset.id);
            if (el.dataset.action === 'print-codes') printCodes();
        });
        $('save-order-settings-btn')?.addEventListener('click', saveOrderSettings);
    }
    loadOrders();
    loadOrderSettings();
    loadStats();
    // New orders show up while the panel is open (the badge, and the list when nothing is open)
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => { if (!current) loadOrders(); }, 60 * 1000);
}
