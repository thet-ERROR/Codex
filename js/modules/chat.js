// js/modules/chat.js
//
// The "Quick answers" widget: a fixed menu of canned answers, not a live chat. Every label and answer
// is an {el, en} pair (same pattern as COPY in tutorial.js) and the menu is rebuilt on a language
// switch — it used to be Greek-only with an English "BACK".
import { CONFIG } from '../config.js';
import { getLang, t } from '../i18n.js';

const CHAT_CATEGORIES = [
    {
        id: 'buy', icon: '🛒', admin: true,
        label: { el: 'ΑΓΟΡΑ & ΠΑΡΑΓΓΕΛΙΑ', en: 'BUYING & ORDERING' },
        response: {
            el: `🛒 <b>ΠΩΣ ΑΓΟΡΑΖΩ:</b><br>Βάλε το σύστημα στο καλάθι και πάτα «Στείλε την παραγγελία στο WhatsApp». Εκεί την ολοκληρώνουμε μαζί σου.`,
            en: `🛒 <b>HOW TO BUY:</b><br>Add the system to your cart and press “Send your order on WhatsApp”. We complete the order with you there.`
        }
    },
    {
        id: 'shipping', icon: '📦', admin: true,
        label: { el: 'ΜΕΤΑΦΟΡΙΚΑ', en: 'SHIPPING' },
        response: {
            el: `📦 <b>Αποστολές πανελλαδικά!</b><br>Τα μεταφορικά καθορίζονται κατά την παραγγελία.`,
            en: `📦 <b>We ship across Greece!</b><br>Shipping costs are agreed when you order.`
        }
    },
    {
        id: 'warranty', icon: '🛡️',
        label: { el: 'ΕΓΓΥΗΣΗ & ΕΠΙΣΤΡΟΦΕΣ', en: 'WARRANTY & RETURNS' },
        response: {
            el: `🛡️ <b>2 ΧΡΟΝΙΑ ΕΓΓΥΗΣΗ:</b><br>Όλα ελέγχονται εξονυχιστικά πριν φύγουν. Αν υπάρξει θέμα, άνοιξε <b>Πληροφορίες → Εγγύηση & Επιστροφές</b> και πάτα «Επιστροφή» — θα σου ανοίξει έτοιμο email.`,
            en: `🛡️ <b>2-YEAR WARRANTY:</b><br>Every system is tested thoroughly before it ships. If something's wrong, open <b>Information → Warranty & Returns</b> and press “Return” — it opens a ready-made email.`
        },
        info: true
    },
    {
        id: 'games', icon: '🎮',
        label: { el: 'ΤΙ PC ΧΡΕΙΑΖΟΜΑΙ', en: 'WHICH PC DO I NEED' },
        sub: [
            { id: 'esports', icon: '⚡', label: { el: 'ESPORTS', en: 'ESPORTS' },
              response: { el: `🎮 <b>ESPORTS:</b><br>Πήγαινε στα <b>STARTER PACKS</b> και δες τη σειρά "Gaming"!`, en: `🎮 <b>ESPORTS:</b><br>Head to <b>STARTER PACKS</b> and open the "Gaming" series!` } },
            { id: 'aaa', icon: '🔥', label: { el: 'HEAVY AAA', en: 'HEAVY AAA' },
              response: { el: `🔥 <b>ΒΑΡΙΑ ΠΑΙΧΝΙΔΙΑ:</b><br>Χρειάζεσαι δυνατό GPU (16GB+ RAM). Ψάξε στα Live Drops για υψηλό Multitasking Score.`, en: `🔥 <b>HEAVY GAMES:</b><br>You need a strong GPU (16GB+ RAM). Look in Live Drops for a high Multitasking Score.` } },
            { id: 'creator', icon: '🎥', label: { el: 'CREATOR', en: 'CREATOR' },
              response: { el: `🎥 <b>CREATOR:</b><br>Δες τις κατηγορίες "Streaming" &amp; "Coding" στα Starter Packs!`, en: `🎥 <b>CREATOR:</b><br>Check the "Streaming" &amp; "Coding" categories in Starter Packs!` } }
        ]
    },
    {
        id: 'budget', icon: '💶',
        label: { el: 'ΠΡΟΥΠΟΛΟΓΙΣΜΟΣ', en: 'BUDGET ADVISOR' },
        sub: [
            { id: 'low', icon: '💸', label: { el: '< €400', en: '< €400' },
              response: { el: `💰 Με budget κάτω από €400, τσέκαρε τα <b>STARTER PACKS</b> για την καλύτερη σχέση τιμής/απόδοσης!`, en: `💰 With a budget under €400, check the <b>STARTER PACKS</b> for the best value!` } },
            { id: 'mid', icon: '💶', label: { el: '€400 – €700', en: '€400 – €700' }, admin: true,
              response: { el: `💰 Στα €400-700 έχεις αρκετές καλές επιλογές στα <b>LIVE DROPS</b>. Ρίξε μια ματιά!`, en: `💰 At €400–700 there are plenty of good options in <b>LIVE DROPS</b>. Have a look!` } },
            { id: 'high', icon: '💎', label: { el: '€700+', en: '€700+' }, admin: true,
              response: { el: `💰 Με budget €700+, ρώτα μας για <b>Custom Build</b> στα δικά σου specs!`, en: `💰 With €700+, ask us about a <b>Custom Build</b> to your own specs!` } }
        ]
    }
];

const L = (pair) => pair[getLang() === 'el' ? 'el' : 'en'];

export function toggleChat() {
    const c = document.getElementById('chat-widget');
    if (c) c.classList.toggle('open');
    if (window.playClick) window.playClick();
}

// Opens (never closes) — for the Support tab's "Quick answers" row, where a toggle could shut a chat
// that was already open
export function openChat() {
    const c = document.getElementById('chat-widget');
    if (c && !c.classList.contains('open')) toggleChat();
}

function adminButtonHTML() {
    return `<button class="chat-admin-btn" onclick="window.open('https://wa.me/${CONFIG.WHATSAPP_NUM}', '_blank')">${t('chatAdminBtn')}</button>`;
}

const backHTML = (onclick) => `<button type="button" class="chat-menu-back" onclick="${onclick}"><i class="ph-bold ph-caret-left"></i> ${t('chatBack')}</button>`;

// Answers about returns point at the Information window — a button there beats telling people where to look
function infoButtonHTML() {
    return `<button class="chat-admin-btn" onclick="toggleChat(); openInfo('returns')">${t('infoTabReturns')}</button>`;
}

export function renderChat() {
    const home = document.getElementById('chat-menu-home');
    if (!home) return;
    home.innerHTML = `<div class="chat-menu-grid">
        ${CHAT_CATEGORIES.map(cat => `
            <button class="chat-menu-item" onclick="openChatCategory('${cat.id}')">
                <span class="chat-menu-icon">${cat.icon}</span>
                <span class="chat-menu-label">${L(cat.label)}</span>
            </button>
        `).join('')}
    </div>`;
    // A language switch while a sub-screen is open: go back to the menu rather than leave it half-translated
    chatGoBack(true);
}

export function openChatCategory(id) {
    const cat = CHAT_CATEGORIES.find(c => c.id === id);
    const sub = document.getElementById('chat-menu-sub');
    if (!cat || !sub) return;
    if (window.playClick) window.playClick();

    if (cat.sub) {
        sub.innerHTML = `
            ${backHTML('chatGoBack()')}
            <div class="chat-menu-grid">
                ${cat.sub.map(s => `
                    <button class="chat-menu-item" onclick="openChatAnswer('${cat.id}','${s.id}')">
                        <span class="chat-menu-icon">${s.icon}</span>
                        <span class="chat-menu-label">${L(s.label)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    } else {
        sub.innerHTML = `
            ${backHTML('chatGoBack()')}
            <div class="chat-response">${L(cat.response)}</div>
            ${cat.admin ? adminButtonHTML() : ''}
            ${cat.info ? infoButtonHTML() : ''}
        `;
    }

    document.getElementById('chat-menu-home')?.classList.add('hidden-screen');
    sub.classList.add('active-screen');
}

export function openChatAnswer(catId, subId) {
    const cat = CHAT_CATEGORIES.find(c => c.id === catId);
    const item = cat?.sub?.find(s => s.id === subId);
    const sub = document.getElementById('chat-menu-sub');
    if (!item || !sub) return;
    if (window.playClick) window.playClick();

    sub.innerHTML = `
        ${backHTML(`openChatCategory('${catId}')`)}
        <div class="chat-response">${L(item.response)}</div>
        ${item.admin ? adminButtonHTML() : ''}
    `;
}

export function chatGoBack(silent = false) {
    if (silent !== true && window.playClick) window.playClick();
    document.getElementById('chat-menu-home')?.classList.remove('hidden-screen');
    document.getElementById('chat-menu-sub')?.classList.remove('active-screen');
}

// Εξαγωγή στο global scope για το HTML
window.toggleChat = toggleChat;
window.openChat = openChat;
window.renderChat = renderChat;
window.openChatCategory = openChatCategory;
window.openChatAnswer = openChatAnswer;
window.chatGoBack = chatGoBack;

renderChat();
