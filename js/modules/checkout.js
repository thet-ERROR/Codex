// js/modules/checkout.js
//
// The checkout window (index.html #checkout-modal): contact, delivery (courier / in person in
// Thessaloniki with a map of the zone / BOX NOW), receipt or invoice, the terms and the 18+ check,
// then POST /api/orders. The server prices the order itself from its own data and holds the stock;
// the totals shown here are the same arithmetic, for the customer's eyes only. While the shop is not
// open (state.orders.live false) every order is a DEMO and the window says so plainly.
import { state } from '../state.js';
import { CONFIG } from '../config.js';
import { api } from '../api.js';
import { t, getLang } from '../i18n.js';
import { esc, formatPrice } from '../utils.js';
import { updateCartUI, cartCouponDiscount } from './cart.js';
import { hydrateProfile } from './auth.js';

const $ = (id) => document.getElementById(id);

// --- the map (Leaflet + OpenStreetMap), fetched the first time "in person" is picked ---
const LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_JS_SRI = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';
const LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CSS_SRI = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
let leafletPromise = null;
let map = null;

function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!leafletPromise) {
        leafletPromise = new Promise((resolve, reject) => {
            const css = document.createElement('link');
            Object.assign(css, { rel: 'stylesheet', href: LEAFLET_CSS, integrity: LEAFLET_CSS_SRI, crossOrigin: 'anonymous' });
            document.head.appendChild(css);
            const s = document.createElement('script');
            Object.assign(s, { src: LEAFLET_JS, integrity: LEAFLET_JS_SRI, crossOrigin: 'anonymous' });
            s.onload = () => (window.L ? resolve(window.L) : reject(new Error('Leaflet missing')));
            s.onerror = () => reject(new Error('Leaflet failed to load'));
            document.head.appendChild(s);
        }).catch(err => { leafletPromise = null; throw err; }); // offline now ≠ offline next time
    }
    return leafletPromise;
}

async function showMap() {
    const box = $('co-map');
    const settings = state.orders;
    if (!box || !settings) return;
    if (map) { map.invalidateSize(); return; }
    try {
        const L = await loadLeaflet();
        const { lat, lng } = settings.handDeliveryCenter;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--neon-green').trim() || '#ccff00';
        map = L.map(box, { scrollWheelZoom: false, attributionControl: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 17, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }).addTo(map);
        const zone = L.circle([lat, lng], { radius: settings.handDeliveryRadiusKm * 1000, color: accent, weight: 2, fillColor: accent, fillOpacity: 0.14 }).addTo(map);
        map.fitBounds(zone.getBounds(), { padding: [8, 8] });
        box.classList.remove('is-failed');
    } catch (e) {
        box.classList.add('is-failed');
        box.textContent = t('coMapFail');
    }
}

// --- opening ---
function fillAreas() {
    const select = $('co-area');
    const chips = $('co-areas');
    const areas = state.orders?.handDeliveryAreas || [];
    if (select) select.innerHTML = `<option value="">${esc(t('coAreaPick'))}</option>` + areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
    if (chips) chips.innerHTML = areas.map(a => `<span class="co-area-chip">${esc(a)}</span>`).join('');
    // No settings (the status call failed): in-person delivery can't be offered
    const hand = document.querySelector('.co-method input[value="hand"]');
    if (hand) hand.closest('.co-method').classList.toggle('hidden', !areas.length);
}

function renderSummary() {
    const box = $('co-summary-lines');
    if (!box) return;
    const subtotal = state.cart.reduce((sum, i) => sum + i.priceCents, 0);
    const { discount, coupon } = cartCouponDiscount(subtotal);
    box.innerHTML = state.cart.map(item => `
        <div class="co-line">
            <span class="co-line-name">${esc(item.name)}${(item.options || []).map(o => `<small>+ ${esc(o.label)}</small>`).join('')}</span>
            <b>${formatPrice(item.priceCents)}</b>
        </div>`).join('') +
        (discount ? `<div class="co-line co-line-discount"><span>${esc(t('cartCouponLine', { p: coupon.percent }))}</span><b>-${formatPrice(discount)}</b></div>` : '') +
        `<div class="co-line co-line-total"><span>${esc(t('coTotal'))}</span><b>${formatPrice(subtotal - discount)}</b></div>`;
}

function setMethod(method) {
    document.querySelectorAll('.co-fields[data-method]').forEach(f => f.classList.toggle('hidden', f.dataset.method !== method));
    if (method === 'hand') showMap();
}

function setInvoice(type) {
    const box = $('co-invoice-fields');
    if (box) box.classList.toggle('hidden', type !== 'invoice');
}

export function openCheckout() {
    if (!state.cart.length) {
        if (window.showToast) window.showToast(t('alertCartEmpty'), 'error');
        return;
    }
    const dropdown = $('cart-dropdown');
    if (dropdown && dropdown.classList.contains('show') && window.toggleCartDropdown) window.toggleCartDropdown();

    const live = !!state.orders?.live;
    $('co-demo')?.classList.toggle('hidden', live);
    const submit = $('co-submit-text');
    if (submit) submit.textContent = t(live ? 'coSubmit' : 'coSubmitDemo');
    $('co-form')?.classList.remove('hidden');
    $('co-done')?.classList.add('hidden');
    showError('');
    fillAreas();
    renderSummary();
    const method = document.querySelector('input[name="co-method"]:checked')?.value || 'courier';
    if (window.openModal) window.openModal('checkout-modal');
    setMethod(method);
}

// --- errors ---
// The server says which field was wrong; the message the customer reads comes from here, in their
// language. Codes cover the cases that aren't one field.
const FIELD_INPUT = {
    name: 'co-first', phone: 'co-phone', email: 'co-email', postcode: 'co-postcode', city: 'co-city',
    area: 'co-area', locker: 'co-locker', vatNumber: 'co-vat', invoice: 'co-taxoffice', terms: 'co-terms', adult: 'co-adult'
};

function showError(message, field) {
    const el = $('co-error');
    if (el) { el.textContent = message; el.classList.toggle('hidden', !message); }
    document.querySelectorAll('#co-form .is-invalid').forEach(i => i.classList.remove('is-invalid'));
    let input = field && $(FIELD_INPUT[field]);
    if (field === 'address') {
        const method = document.querySelector('input[name="co-method"]:checked')?.value;
        input = $(method === 'hand' ? 'co-hand-address' : 'co-address');
    }
    if (input) {
        input.classList.add('is-invalid');
        input.focus({ preventScroll: true });
        input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (el && message) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

function errorMessage(res, body) {
    if (res === 'network') return t('coErrNetwork');
    if (res.status === 429) return t('coErrRate');
    const code = body?.code;
    if (code === 'SOLD_OUT') {
        const item = state.cart.find(i => i.pcId === body.pcId);
        return t('coErrSoldOut', { name: item ? item.name : '' });
    }
    if (code === 'NOT_ORDERABLE') return t('coErrNotOrderable');
    if (code === 'COUPON_NEEDS_ACCOUNT') return t('coErrCouponAccount');
    if (code === 'COUPON_USED') return t('coErrCouponUsed');
    if (body?.field) {
        const key = `coErr_${body.field}`;
        const msg = t(key);
        if (msg !== key) return msg;
    }
    return body?.error || t('coErrNetwork');
}

// --- placing the order ---
const val = (id) => ($(id)?.value || '').trim();

function collect() {
    const method = document.querySelector('input[name="co-method"]:checked')?.value || '';
    const delivery = { method };
    if (method === 'courier') Object.assign(delivery, { address: val('co-address'), postcode: val('co-postcode'), city: val('co-city') });
    if (method === 'hand') Object.assign(delivery, { area: val('co-area'), address: val('co-hand-address') });
    if (method === 'boxnow') delivery.locker = val('co-locker');
    const invoiceType = document.querySelector('input[name="co-invoice"]:checked')?.value === 'invoice' ? 'invoice' : 'receipt';
    return {
        customer: { firstName: val('co-first'), lastName: val('co-last'), phone: val('co-phone'), email: val('co-email') },
        delivery,
        invoice: invoiceType === 'invoice'
            ? { type: 'invoice', vatNumber: val('co-vat'), taxOffice: val('co-taxoffice'), companyName: val('co-company') }
            : { type: 'receipt' },
        // What was chosen, not what it costs — the server prices it
        items: state.cart.map(i => ({ pcId: i.pcId, ...(i.build || {}), paintAck: !!i.paintAck })),
        couponCode: state.selectedCoupon || '',
        notes: val('co-notes'),
        acceptTerms: !!$('co-terms')?.checked,
        adultOrGuardian: !!$('co-adult')?.checked,
        termsVersion: CONFIG.TERMS_VERSION,
        // The order's emails are written in the language the visitor is reading now
        lang: getLang()
    };
}

// Cart lines saved before the cart kept the chosen extras can't be priced by the server: those have
// to be added again (only lines that had extras — a standard build has nothing to lose)
function staleLine() {
    return state.cart.find(i => !i.pcId || (!i.build && ((i.options || []).length || i.option)));
}

function remember(number, token) {
    try {
        const list = JSON.parse(localStorage.getItem('codex_orders') || '[]');
        list.unshift({ number, token, at: new Date().toISOString() });
        localStorage.setItem('codex_orders', JSON.stringify(list.slice(0, 20)));
    } catch (e) { /* storage blocked: the confirmation still shows the number */ }
}

// The catalogue shows the stock the order just took, without reloading the page
async function refreshStock() {
    try {
        const drops = await api.fetchDrops();
        if (!Array.isArray(drops)) return;
        const byId = new Map(drops.map(p => [String(p._id), p]));
        state.inventory.forEach(p => { const fresh = byId.get(String(p._id)); if (fresh) p.stock = fresh.stock; });
        if (window.renderCard) window.renderCard();
    } catch (e) { /* the next page load has it */ }
}

function showDone(result) {
    const o = result.order;
    const demo = result.demo;
    $('co-form')?.classList.add('hidden');
    const done = $('co-done');
    if (!done) return;
    const waText = t('coWaMsg', { number: result.number, total: formatPrice(o.totalCents) });
    done.innerHTML = `
        <div class="co-done-ico" aria-hidden="true"><i class="ph-fill ph-check-circle"></i></div>
        ${demo ? `<span class="co-done-demo">DEMO</span>` : ''}
        <h3 class="co-done-title">${esc(t(demo ? 'coDoneDemoTitle' : 'coDoneTitle'))}</h3>
        <div class="co-done-label">${esc(t('coDoneNumber'))}</div>
        <div class="co-done-number">${esc(result.number)}</div>
        <div class="co-done-total">${esc(t('coTotal'))}: <b>${formatPrice(o.totalCents)}</b></div>
        <p class="co-done-text">${esc(t('coDoneText'))}</p>
        ${demo ? `<p class="co-done-text co-done-demo-text">${esc(t('coDoneDemoText'))}</p>` : ''}
        <a class="info-btn primary co-wa-btn" href="https://wa.me/${encodeURIComponent(CONFIG.WHATSAPP_NUM)}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">
            <i class="ph-bold ph-whatsapp-logo" aria-hidden="true"></i> <span>${esc(t('coWaBtn'))}</span>
        </a>
        <button type="button" class="info-btn co-done-close">${esc(t('coDoneClose'))}</button>`;
    done.querySelector('.co-done-close').addEventListener('click', () => window.closeModal && window.closeModal('checkout-modal'));
    done.classList.remove('hidden');
    done.scrollIntoView({ block: 'start' });
}

let sending = false;
async function submit(e) {
    e.preventDefault();
    if (sending) return;
    const stale = staleLine();
    if (stale) return showError(t('coErrStale', { name: stale.name || '' }), 'items');
    const body = collect();
    // The two boxes are checked here too, so the most common slip doesn't cost a round trip
    if (!body.acceptTerms) return showError(t('coErr_terms'), 'terms');
    if (!body.adultOrGuardian) return showError(t('coErr_adult'), 'adult');

    sending = true;
    const btn = $('co-submit');
    btn?.classList.add('is-loading');
    if (btn) btn.disabled = true;
    showError('');
    try {
        const { res, data } = await api.placeOrder(body);
        if (!res.ok || !data?.success) return showError(errorMessage(res, data), data?.field);

        remember(data.number, data.accessToken);
        state.cart = [];
        state.selectedCoupon = null;
        localStorage.setItem('codex_cart', '[]');
        updateCartUI();
        showDone(data);
        refreshStock();
        if (body.couponCode && state.isLoggedIn) hydrateProfile().catch(() => {});
        if (window.playClick) window.playClick();
    } catch (err) {
        showError(errorMessage('network'));
    } finally {
        sending = false;
        btn?.classList.remove('is-loading');
        if (btn) btn.disabled = false;
    }
}

// --- wiring ---
document.addEventListener('DOMContentLoaded', () => {
    $('co-form')?.addEventListener('submit', submit);
    document.querySelectorAll('input[name="co-method"]').forEach(r => r.addEventListener('change', () => setMethod(r.value)));
    document.querySelectorAll('input[name="co-invoice"]').forEach(r => r.addEventListener('change', () => setInvoice(r.value)));
    $('co-terms-link')?.addEventListener('click', () => window.openInfo && window.openInfo('terms'));
    // A corrected field stops being marked wrong
    $('co-form')?.addEventListener('input', (e) => e.target.classList?.remove('is-invalid'));
});
// A language switch with the window open: the texts built here follow, what was typed and picked stays
document.addEventListener('codex:lang', () => {
    if (!$('checkout-modal')?.classList.contains('active') || $('co-form')?.classList.contains('hidden')) return;
    const area = val('co-area');
    fillAreas();
    if ($('co-area')) $('co-area').value = area;
    renderSummary();
    const submitText = $('co-submit-text');
    if (submitText) submitText.textContent = t(state.orders?.live ? 'coSubmit' : 'coSubmitDemo');
});

window.openCheckout = openCheckout;
