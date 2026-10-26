// js/modules/chat.js
//
// The help assistant (bottom-left button). It used to be a menu of canned text answers dressed in
// decorative emoji — it told people things instead of doing them. Every choice here DOES something:
// takes you to the right starter pack, filters LIVE DROPS by your budget, opens the returns tab or
// the WhatsApp chat. Where an answer is needed first (how to buy), the answer comes with the button
// that acts on it. Two languages, rebuilt on a language switch.
import { CONFIG } from '../config.js';
import { getLang, t } from '../i18n.js';

const L = (pair) => pair[getLang() === 'el' ? 'el' : 'en'];

// Each node is a list of choices, an answer with actions, or a direct action
const MENU = [
    {
        id: 'need',
        label: { el: 'Τι PC χρειάζομαι;', en: 'Which PC do I need?' },
        hint: { el: 'Διάλεξε τι κάνεις και πάμε στο σωστό πακέτο', en: 'Pick what you do and we go to the right pack' },
        choices: [
            { label: { el: 'Gaming', en: 'Gaming' }, hint: { el: 'Esports και βαριά AAA παιχνίδια', en: 'Esports and heavy AAA games' }, go: { pack: 'gaming' } },
            { label: { el: 'Streaming', en: 'Streaming' }, hint: { el: 'Παίζεις και κάνεις stream μαζί', en: 'Play and stream at the same time' }, go: { pack: 'streaming' } },
            { label: { el: 'Coding', en: 'Coding' }, hint: { el: 'Development, πολλά παράθυρα, αθόρυβο', en: 'Development, many windows, quiet' }, go: { pack: 'coding' } }
        ]
    },
    {
        id: 'budget',
        label: { el: 'Ανάλογα με το budget', en: 'By budget' },
        hint: { el: 'Δείξε μου μόνο ό,τι χωράει στο ποσό μου', en: 'Show only what fits my budget' },
        choices: [
            { label: { el: 'Έως €400', en: 'Up to €400' }, go: { budget: [0, 400] } },
            { label: { el: '€400 – €700', en: '€400 – €700' }, go: { budget: [400, 700] } },
            { label: { el: 'Πάνω από €700', en: 'Over €700' }, go: { budget: [700, null] } }
        ]
    },
    {
        id: 'buy',
        label: { el: 'Πώς αγοράζω;', en: 'How do I buy?' },
        hint: { el: 'Βήματα, μεταφορικά, πληρωμή', en: 'Steps, shipping, payment' },
        answer: {
            el: '1. Διάλεξε σύστημα και βάλ’ το στο καλάθι.\n2. Στο καλάθι πάτα «Στείλε την παραγγελία στο WhatsApp».\n3. Εκεί συμφωνούμε πληρωμή και παράδοση — τα μεταφορικά καθορίζονται τότε, αποστολές σε όλη την Ελλάδα.',
            en: '1. Pick a system and add it to the cart.\n2. In the cart press “Send your order on WhatsApp”.\n3. We agree payment and delivery there — shipping is set at that point, we ship across Greece.'
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

let path = [];          // ids walked so far: [] = home, ['need'] = that node's choices

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
    if (cur.choices) {
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
    if (e.target.closest('[data-chat-back]')) { if (window.playClick) window.playClick(); path.pop(); renderChat(); return; }
    if (open) {
        if (window.playClick) window.playClick();
        const n = MENU.find(m => m.id === open.dataset.chatOpen);
        if (n.go) { run(n.go); return; }
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
