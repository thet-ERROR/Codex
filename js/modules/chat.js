// js/modules/chat.js
//
// The help assistant (bottom-left button). It used to be a menu of canned text answers dressed in
// decorative emoji — it told people things instead of doing them. Every choice here DOES something:
// finds the PCs that fit your budget and says what each one gives you, opens the returns tab or
// the WhatsApp chat. Where an answer is needed first (how to buy), the answer comes with the button
// that acts on it. Two languages, rebuilt on a language switch.
import { CONFIG } from '../config.js';
import { getLang, t } from '../i18n.js';
import { state } from '../state.js';
import { escUrl, formatPrice, priceCentsOf } from '../utils.js';

const L = (pair) => pair[getLang() === 'el' ? 'el' : 'en'];

// Each node is a list of choices, an answer with actions, or a direct action
const MENU = [
    {
        // Built from the shop's own data each time it opens (finder() below): no fixed budgets
        id: 'find',
        label: { el: 'Βρες μου PC', en: 'Find me a PC' },
        hint: { el: 'Πες μου μέχρι πόσα, σου δείχνω τι κερδίζεις', en: 'Tell me your budget, I show you what you get' },
        finder: true
    },
    {
        id: 'buy',
        label: { el: 'Πώς αγοράζω;', en: 'How do I buy?' },
        hint: { el: 'Βήματα, μεταφορικά, πληρωμή', en: 'Steps, shipping, payment' },
        answer: {
            el: '1. Διάλεξε σύστημα και βάλ’ το στο καλάθι.\n2. Στο καλάθι πάτα «Ολοκλήρωση παραγγελίας» και συμπλήρωσε τα στοιχεία σου — παίρνεις αριθμό παραγγελίας.\n3. Με το κουμπί WhatsApp της επιβεβαίωσης συμφωνούμε πληρωμή και μεταφορικά — courier σε όλη την Ελλάδα, BOX NOW, ή χέρι με χέρι στη Θεσσαλονίκη.',
            en: '1. Pick a system and add it to the cart.\n2. In the cart press “Checkout” and fill in your details — you get an order number.\n3. With the WhatsApp button on the confirmation we agree payment and shipping — courier across Greece, BOX NOW, or in person in Thessaloniki.'
        },
        actions: [{ label: { el: 'Δες τα συστήματα', en: 'See the systems' }, go: { live: true } }]
    },
    {
        id: 'returns',
        label: { el: 'Εγγύηση & επιστροφή', en: 'Warranty & returns' },
        hint: { el: '2 χρόνια εγγύηση · 14 μέρες επιστροφή', en: '2-year warranty · 14-day returns' },
        go: { info: 'returns' }
    },
    {
        id: 'admin',
        label: { el: 'Μίλα με τον admin', en: 'Talk to the admin' },
        hint: { el: 'Άνοιγμα συζήτησης στο WhatsApp', en: 'Opens a WhatsApp chat' },
        go: { whatsapp: true }
    }
];

let path = [];          // ids walked so far: [] = home, ['find'] = that node's screen

// --- "Find me a PC" ---
// One question (up to how much), then the PCs that fit, each with the strong points the admin wrote for it
// (what a buyer gains, in plain words: never anything worked out from the specs, which could be wrong) and a
// button that puts it on the stage. Only what can be bought now: in stock and not "coming soon".
const FIRST_SHOWN = 3;
let finder = { max: null, chosen: false, all: false };
const euros = (pc) => priceCentsOf(pc) / 100;
const buyable = () => (state.inventory || []).filter(p => p.status !== 'coming' && (Number(p.stock) || 0) > 0);
// Budgets from the real prices: "up to" the price a third and two thirds of the way along, rounded up to
// 10 €, then everything. Each counts what it holds, and one that holds no more than the one before is dropped.
function budgets(pool) {
    const prices = pool.map(euros).sort((x, y) => x - y), n = prices.length;
    const out = [];
    for (const k of [Math.ceil(n / 3) - 1, Math.ceil(2 * n / 3) - 1]) {
        const max = Math.ceil(prices[k] / 10) * 10, count = prices.filter(p => p <= max).length;
        if (count < n && (!out.length || count > out[out.length - 1].count)) out.push({ max, count });
    }
    out.push({ max: null, count: n });
    return out;
}
function finderHtml() {
    const pool = buyable(), el = getLang() === 'el';
    if (!pool.length) {
        return `<div class="chat-response">${esc(t('findNone'))}</div><button type="button" class="chat-action" data-chat-act-go="live">${esc(t('findSeeAll'))}</button>`;
    }
    // A handful to choose from needs no question
    if (!finder.chosen && pool.length > 2) {
        return `<p class="fr-ask">${esc(t('findAsk'))}</p>` + budgets(pool).map(b => row(
            esc(b.max ? t('findUpTo', { max: b.max }) : t('findAny')),
            esc(t(b.count === 1 ? 'findCountOne' : 'findCount', { n: b.count })),
            `data-find-max="${b.max ?? ''}"`)).join('');
    }
    const fits = pool.filter(p => !finder.max || euros(p) <= finder.max).sort((x, y) => euros(y) - euros(x));
    const shown = finder.all ? fits : fits.slice(0, FIRST_SHOWN);
    const cards = shown.map(pc => {
        const id = String(pc._id || pc.id), points = ((pc.highlights || {})[el ? 'el' : 'en'] || []);
        return `<div class="fr-pc">
            <img class="fr-img" src="${escUrl(pc.images && pc.images[0]) || 'assets/images/bg.jpg'}" alt="" loading="lazy">
            <div class="fr-body">
                <div class="fr-top"><strong class="fr-name">${esc(pc.name)}</strong><span class="fr-price">${formatPrice(priceCentsOf(pc))}</span></div>
                ${points.length ? `<ul class="fr-points">${points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
                <button type="button" class="fr-see" data-find-see="${esc(id)}">${esc(t('findSee'))} <i class="ph-bold ph-arrow-right"></i></button>
            </div>
        </div>`;
    }).join('');
    const more = fits.length > shown.length ? `<button type="button" class="fr-more" data-find-more>${esc(t('findMore', { n: fits.length - shown.length }))}</button>` : '';
    return `<p class="fr-ask">${esc(t(fits.length === 1 ? 'findFitsOne' : 'findFits', { n: fits.length }))}</p>${cards}${more}`;
}

export function toggleChat() {
    const c = document.getElementById('chat-widget');
    if (c) c.classList.toggle('open');
    if (window.playClick) window.playClick();
    // The admin choice plays the phoenix's flight (mascot.js) — have its image ready by then
    if (c && c.classList.contains('open') && window.preloadMascot) window.preloadMascot();
}

// Opens (never closes) — used by the Support tab's entry, where a toggle could shut a widget that
// was already open
export function openChat() {
    const c = document.getElementById('chat-widget');
    if (c && !c.classList.contains('open')) toggleChat();
}

function closeChat() {
    const c = document.getElementById('chat-widget');
    if (c) c.classList.remove('open');
}

const row = (label, hint, attrs, caret = true) => `
    <button type="button" class="chat-row" ${attrs}>
        <span class="chat-row-text"><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ''}</span>
        ${caret ? '<i class="ph-bold ph-caret-right"></i>' : ''}
    </button>`;

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function node() {
    let list = MENU, cur = null;
    for (const id of path) {
        cur = (list || []).find(n => n.id === id) || null;
        list = cur && cur.choices;
    }
    return cur;
}

export function renderChat() {
    const home = document.getElementById('chat-menu-home');
    const sub = document.getElementById('chat-menu-sub');
    if (!home || !sub) return;

    home.innerHTML = MENU.map(n => row(esc(L(n.label)), n.hint ? esc(L(n.hint)) : '', `data-chat-open="${n.id}"`)).join('');

    const cur = node();
    if (!cur) { showScreen(false); return; }
    let html = `<button type="button" class="chat-menu-back" data-chat-back><i class="ph-bold ph-caret-left"></i> ${esc(t('chatBack'))}</button>
        <div class="chat-sub-title">${esc(L(cur.label))}</div>`;
    if (cur.finder) {
        html += finderHtml();
    } else if (cur.choices) {
        html += cur.choices.map((c, i) => row(esc(L(c.label)), c.hint ? esc(L(c.hint)) : '', `data-chat-pick="${i}"`)).join('');
    } else if (cur.answer) {
        html += `<div class="chat-response">${esc(L(cur.answer)).replace(/\n/g, '<br>')}</div>`;
        (cur.actions || []).forEach((a, i) => { html += `<button type="button" class="chat-action" data-chat-act="${i}">${esc(L(a.label))}</button>`; });
    }
    sub.innerHTML = html;
    showScreen(true);
}

function showScreen(sub) {
    document.getElementById('chat-menu-home')?.classList.toggle('hidden-screen', sub);
    document.getElementById('chat-menu-sub')?.classList.toggle('active-screen', sub);
}

// Does what the choice says, then gets out of the way so the result is what's on screen
function run(go) {
    if (!go) return;
    closeChat();
    path = [];
    renderChat();
    if (go.pack) { if (window.clearPriceFilter) window.clearPriceFilter(); window.switchTab('starter'); window.selectPack(go.pack); }
    else if (go.budget) window.setPriceFilter(go.budget[0], go.budget[1]);
    else if (go.live) { window.clearPriceFilter(); window.switchTab('live'); }
    else if (go.info) window.openInfo(go.info);
    // The phoenix carries the message off and hands over the WhatsApp link in its bubble (mascot.js)
    else if (go.whatsapp) {
        if (window.mascotToAdmin) window.mascotToAdmin();
        else window.open(`https://wa.me/${CONFIG.WHATSAPP_NUM}`, '_blank');
    }
}

document.addEventListener('click', (e) => {
    const widget = e.target.closest('#chat-widget');
    if (!widget) return;
    const open = e.target.closest('[data-chat-open]');
    const pick = e.target.closest('[data-chat-pick]');
    const act = e.target.closest('[data-chat-act]');
    if (e.target.closest('[data-chat-back]')) {
        if (window.playClick) window.playClick();
        if (path[0] === 'find' && finder.chosen && buyable().length > 2) finder = { max: null, chosen: false, all: false };
        else path.pop();
        renderChat(); return;
    }
    const max = e.target.closest('[data-find-max]');
    if (max) { if (window.playClick) window.playClick(); finder = { max: Number(max.dataset.findMax) || null, chosen: true, all: false }; renderChat(); widget.querySelector('#chat-menu-sub').scrollTop = 0; return; }
    if (e.target.closest('[data-find-more]')) { if (window.playClick) window.playClick(); finder.all = true; renderChat(); return; }
    const see = e.target.closest('[data-find-see]');
    if (see) { if (window.playClick) window.playClick(); const id = see.dataset.findSee; closeChat(); path = []; finder = { max: null, chosen: false, all: false }; renderChat(); window.showPcById(id); return; }
    if (e.target.closest('[data-chat-act-go="live"]')) { if (window.playClick) window.playClick(); run({ live: true }); return; }
    if (open) {
        if (window.playClick) window.playClick();
        const n = MENU.find(m => m.id === open.dataset.chatOpen);
        if (n.go) { run(n.go); return; }
        if (n.finder) finder = { max: null, chosen: false, all: false };
        path = [n.id];
        renderChat();
    } else if (pick) {
        if (window.playClick) window.playClick();
        run(node().choices[Number(pick.dataset.chatPick)].go);
    } else if (act) {
        if (window.playClick) window.playClick();
        run(node().actions[Number(act.dataset.chatAct)].go);
    }
});

window.toggleChat = toggleChat;
window.openChat = openChat;
window.renderChat = renderChat;

renderChat();
