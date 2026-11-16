// js/modules/order-page.js
//
// "My order" (index.html #order-modal): where a placed order can be followed — its steps, what is in
// it, what it cost, where it goes — cancelled while it hasn't been packed, and, once delivered,
// returned (inside the return window) or reported (the 2-year guarantee). Opened from the private
// link in the order email (?order=…&t=…), from the confirmation after checkout, and from the profile's
// "My orders". The server decides everything (what can still be done, the dates); this only shows it.
import { state } from '../state.js';
import { CONFIG } from '../config.js';
import { api } from '../api.js';
import { t, getLang } from '../i18n.js';
import { esc, formatPrice } from '../utils.js';
import { hydrateProfile } from './auth.js';

const $ = (id) => document.getElementById(id);
const STEPS = ['new', 'paid', 'building', 'packed', 'shipped', 'delivered', 'completed'];

// What is open: the order as the server describes it, and the token that goes with it (null for a
// member's own order opened from the profile — their session is the proof)
let current = null;
let token = null;
let form = null; // 'return' | 'problem' | null — which request form is showing

const locale = () => (getLang() === 'el' ? 'el-GR' : 'en-GB');
const dateTime = (d) => (d ? new Date(d).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }) : '');
const dateOnly = (d) => (d ? new Date(d).toLocaleDateString(locale(), { dateStyle: 'long' }) : '');

// The orders opened by link, kept so the confirmation / this browser can open them again
function remember(number, tok) {
    if (!tok) return;
    try {
        const list = JSON.parse(localStorage.getItem('codex_orders') || '[]').filter(o => o.number !== number);
        list.unshift({ number, token: tok, at: new Date().toISOString() });
        localStorage.setItem('codex_orders', JSON.stringify(list.slice(0, 20)));
    } catch (e) { /* storage blocked */ }
}

// --- opening ---
export async function openOrderPage({ number, token: tok = null, order = null } = {}) {
    token = tok;
    form = null;
    if (order) {
        current = order;
    } else {
        const { res, data } = await api.getOrder(number, tok).catch(() => ({ res: null }));
        if (!res || !res.ok) {
            if (window.showToast) window.showToast(t(res && res.status === 404 ? 'ordNotFound' : 'coErrNetwork'), 'error');
            return false;
        }
        current = data;
        remember(number, tok);
    }
    render();
    if (window.openModal) window.openModal('order-modal');
    return true;
}

// --- drawing ---
function timeline(o) {
    const at = new Map((o.history || []).map(h => [h.status, h.at]));
    if (o.status === 'cancelled') {
        // The steps it got through, then where it stopped
        const reached = STEPS.filter(s => at.has(s));
        return `<ol class="op-steps">${reached.map(s => step(s, 'done', at.get(s))).join('')}${step('cancelled', 'cancelled', at.get('cancelled'))}</ol>`;
    }
    const now = STEPS.indexOf(o.status);
    return `<ol class="op-steps">${STEPS.map((s, i) => step(s, i < now ? 'done' : i === now ? 'now' : 'todo', at.get(s))).join('')}</ol>`;
}
const step = (s, state_, when) => `
    <li class="op-step ${state_}">
        <span class="op-dot" aria-hidden="true">${state_ === 'done' ? '<i class="ph-bold ph-check"></i>' : state_ === 'cancelled' ? '<i class="ph-bold ph-x"></i>' : ''}</span>
        <span class="op-step-text"><b>${esc(t(`ordSt_${s}`))}</b>${when ? `<small>${esc(dateTime(when))}</small>` : ''}</span>
    </li>`;

// The storage labels already start with "+" ("+ 1TB SSD"); the line adds its own
const extraLabel = (e) => e.key === 'storage' ? t(e.choice === 'hdd' ? 'storageOptHdd' : 'storageOptSsd').replace(/^\+\s*/, '')
    : e.key === 'proConfig' ? t('proConfigTitle')
    : `${t('paintTitle')}${(getLang() === 'el' ? (e.colorNameEl || e.colorName) : e.colorName) ? ` — ${getLang() === 'el' ? (e.colorNameEl || e.colorName) : e.colorName}` : ''}`;

function requestsHtml(o) {
    const list = o.requests || [];
    if (!list.length) return '';
    return `<div class="op-block"><div class="op-k">${esc(t('ordRequests'))}</div>${list.map(r => `
        <div class="op-request">
            <div class="op-request-top"><b>${esc(t(r.type === 'return' ? 'ordReturn' : 'ordProblem'))}</b>
                <span class="op-tag ${r.handled ? 'done' : 'open'}">${esc(t(r.handled ? 'ordReqDone' : 'ordReqOpen'))}</span></div>
            <div class="op-request-msg">${esc(r.message)}</div>
            <small>${esc(dateTime(r.createdAt))}</small>
        </div>`).join('')}</div>`;
}

function actionsHtml(o) {
    const parts = [];
    if (o.canCancel) {
        parts.push(`<div class="op-block"><div class="op-k">${esc(t('ordCancelHeading'))}</div>
            <p class="op-note">${esc(t('ordCancelNote'))}</p>
            <button type="button" class="info-btn op-danger" data-op="cancel">${esc(t('ordCancelBtn'))}</button></div>`);
    }
    if (o.canReturn || o.canReportProblem) {
        const blurb = [
            o.canReturn ? t('ordReturnNote', { date: dateOnly(o.returnDeadline) }) : '',
            o.canReportProblem ? t('ordProblemNote', { date: dateOnly(o.warrantyUntil) }) : ''
        ].filter(Boolean).join(' ');
        parts.push(`<div class="op-block"><div class="op-k">${esc(t('ordAfterHeading'))}</div>
            <p class="op-note">${esc(blurb)}</p>
            ${form ? `
            <div class="op-form">
                <label for="op-message">${esc(t(form === 'return' ? 'ordReturnLabel' : 'ordProblemLabel'))}</label>
                <textarea id="op-message" class="auth-input" rows="4" maxlength="1000" placeholder="${esc(t('ordMessagePlaceholder'))}"></textarea>
                <div class="co-error hidden" id="op-error" role="alert"></div>
                <div class="op-btns">
                    <button type="button" class="info-btn primary" data-op="send">${esc(t('ordSend'))}</button>
                    <button type="button" class="info-btn" data-op="close-form">${esc(t('ordBack'))}</button>
                </div>
            </div>` : `
            <div class="op-btns">
                ${o.canReturn ? `<button type="button" class="info-btn" data-op="open-return"><i class="ph-bold ph-arrow-u-up-left"></i> ${esc(t('ordReturn'))}</button>` : ''}
                ${o.canReportProblem ? `<button type="button" class="info-btn" data-op="open-problem"><i class="ph-bold ph-wrench"></i> ${esc(t('ordProblem'))}</button>` : ''}
            </div>`}</div>`);
    }
    return parts.join('');
}

function render() {
    const o = current;
    const d = o.delivery || {};
    const where = d.method === 'hand' ? d.area : d.method === 'courier' ? d.city : d.method === 'boxnow' ? d.locker : '';
    $('op-body').innerHTML = `
        ${o.demo ? `<div class="co-demo" role="note"><i class="ph-fill ph-flask" aria-hidden="true"></i><span>${esc(t('coDemoNotice'))}</span></div>` : ''}
        <div class="op-head">
            <div class="co-done-label">${esc(t('coDoneNumber'))}</div>
            <div class="op-number">${esc(o.number)}</div>
            <div class="op-date">${esc(dateTime(o.createdAt))}</div>
        </div>
        ${timeline(o)}
        ${d.trackingNumber ? `<div class="op-track"><i class="ph-bold ph-truck"></i> ${esc(t('ordTracking'))}: <b>${esc(d.trackingNumber)}</b></div>` : ''}
        <div class="op-block">
            <div class="op-k">${esc(t('ordItems'))}</div>
            ${(o.items || []).map(i => `
                <div class="co-line"><span class="co-line-name">${esc(i.name)}${(i.extras || []).map(e => `<small>+ ${esc(extraLabel(e))}</small>`).join('')}</span><b>${formatPrice(i.totalCents)}</b></div>`).join('')}
            ${o.discountCents ? `<div class="co-line co-line-discount"><span>${esc(t('cartCouponLine', { p: o.coupon?.percent }))}</span><b>-${formatPrice(o.discountCents)}</b></div>` : ''}
            <div class="co-line co-line-total"><span>${esc(t('coTotal'))}</span><b>${formatPrice(o.totalCents)}</b></div>
        </div>
        <div class="op-block">
            <div class="op-k">${esc(t('ordDelivery'))}</div>
            <div>${esc(t(`coMethod${d.method === 'boxnow' ? 'Boxnow' : d.method === 'hand' ? 'Hand' : 'Courier'}`))}${where ? ` — ${esc(where)}` : ''}</div>
        </div>
        ${requestsHtml(o)}
        ${actionsHtml(o)}
        <a class="info-btn op-wa" href="https://wa.me/${encodeURIComponent(CONFIG.WHATSAPP_NUM)}?text=${encodeURIComponent(t('ordWaMsg', { number: o.number }))}" target="_blank" rel="noopener">
            <i class="ph-bold ph-whatsapp-logo" aria-hidden="true"></i> <span>${esc(t('ordWaBtn'))}</span>
        </a>`;
}

// --- actions ---
const showError = (message) => {
    const el = $('op-error');
    if (el) { el.textContent = message; el.classList.toggle('hidden', !message); }
};

async function refreshStock() {
    try {
        const drops = await api.fetchDrops();
        if (!Array.isArray(drops)) return;
        const byId = new Map(drops.map(p => [String(p._id), p]));
        state.inventory.forEach(p => { const fresh = byId.get(String(p._id)); if (fresh) p.stock = fresh.stock; });
        if (window.renderCard) window.renderCard();
    } catch (e) { /* the next page load has it */ }
}

async function cancel(btn) {
    if (!confirm(t('ordCancelConfirm'))) return;
    btn.disabled = true;
    const { res, data } = await api.cancelOrder(current.number, token).catch(() => ({ res: null }));
    if (res && res.ok) {
        current = data.order;
        render();
        if (window.showToast) window.showToast(t('ordCancelled'), 'normal');
        refreshStock();                                  // the unit is back on sale
        if (state.isLoggedIn) hydrateProfile().catch(() => {}); // and a coupon is back in the account
        loadMyOrders();
        return;
    }
    btn.disabled = false;
    // It moved on while the page was open (packed, say): show it as it is now
    if (res && res.status === 409 && data?.code === 'NOT_CANCELLABLE') {
        const fresh = await api.getOrder(current.number, token).catch(() => null);
        if (fresh && fresh.res.ok) { current = fresh.data; render(); }
    }
    if (window.showToast) window.showToast(res && data?.code === 'NOT_CANCELLABLE' ? t('ordCancelTooLate') : t('coErrNetwork'), 'error');
}

async function send(btn) {
    const message = ($('op-message')?.value || '').trim();
    if (message.length < 5) return showError(t('ordMessageShort'));
    btn.disabled = true;
    showError('');
    const { res, data } = await api.orderRequest(current.number, token, form, message).catch(() => ({ res: null }));
    if (res && res.ok) {
        current = data.order;
        form = null;
        render();
        if (window.showToast) window.showToast(t('ordRequestSent'), 'achievement');
        return;
    }
    btn.disabled = false;
    if (res && data?.code === 'NOT_ALLOWED') showError(t('ordRequestNotAllowed'));
    else if (res && res.status === 429) showError(t('coErrRate'));
    else showError(t('coErrNetwork'));
}

// --- the profile's "My orders" ---
export async function loadMyOrders() {
    const box = $('dossier-orders');
    if (!box || !state.isLoggedIn || !state.emailVerified) return;
    const { res, data } = await api.myOrders().catch(() => ({ res: null }));
    if (!res || !res.ok || !Array.isArray(data) || !data.length) return;   // the empty state stays
    box.innerHTML = data.map(o => `
        <button type="button" class="dossier-order-row" data-order="${esc(o.number)}">
            <span class="dor-top"><b>${esc(o.number)}</b>${o.demo ? '<span class="op-tag demo">DEMO</span>' : ''}
                <span class="op-tag st-${esc(o.status)}">${esc(t(`ordSt_${o.status}`))}</span></span>
            <span class="dor-sub">${esc(dateOnly(o.createdAt))} · ${formatPrice(o.totalCents)}</span>
        </button>`).join('');
    box.dataset.orders = JSON.stringify(data);
    // The profile's "Orders" tab shows how many there are
    const count = document.getElementById('dtab-count-orders');
    if (count) count.textContent = String(data.length);
}

// --- wiring ---
document.addEventListener('DOMContentLoaded', () => {
    $('op-body')?.addEventListener('click', (ev) => {
        const el = ev.target.closest('[data-op]');
        if (!el) return;
        const a = el.dataset.op;
        if (a === 'cancel') cancel(el);
        if (a === 'open-return') { form = 'return'; render(); $('op-message')?.focus(); }
        if (a === 'open-problem') { form = 'problem'; render(); $('op-message')?.focus(); }
        if (a === 'close-form') { form = null; render(); }
        if (a === 'send') send(el);
    });
    $('dossier-orders')?.addEventListener('click', (ev) => {
        const row = ev.target.closest('[data-order]');
        if (!row) return;
        const order = JSON.parse($('dossier-orders').dataset.orders || '[]').find(o => o.number === row.dataset.order);
        if (order) openOrderPage({ number: order.number, order });
    });
});
// The text built here follows a language switch with the page open
document.addEventListener('codex:lang', () => {
    if ($('order-modal')?.classList.contains('active') && current) render();
});

window.openOrderPage = openOrderPage;
window.loadMyOrders = loadMyOrders;
