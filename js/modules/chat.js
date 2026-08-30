// js/modules/chat.js
import { CONFIG } from '../config.js';

const CHAT_CATEGORIES = [
    {
        id: 'buy', icon: '🛒', label: 'ΑΓΟΡΑ & ΠΑΡΑΓΓΕΛΙΑ', admin: true,
        response: `🛒 <b>ΔΙΑΔΙΚΑΣΙΑ ΑΓΟΡΑΣ:</b><br>Βάζεις το σύστημα στο Cart. Εναλλακτικά κλείνουμε το deal στο WhatsApp!`
    },
    {
        id: 'shipping', icon: '📦', label: 'ΜΕΤΑΦΟΡΙΚΑ', admin: true,
        response: `📦 <b>Αποστολές πανελλαδικά!</b><br>Τα μεταφορικά καθορίζονται κατά την παραγγελία.`
    },
    {
        id: 'warranty', icon: '🛡️', label: 'ΕΓΓΥΗΣΗ & SUPPORT',
        response: `🛡️ <b>MISSION PROTOCOL:</b><br>Όλα ελέγχονται εξονυχιστικά. Αν υπάρξει θέμα, κάνεις Initiate Return Protocol από το site!`
    },
    {
        id: 'games', icon: '🎮', label: 'ΤΙ PC ΧΡΕΙΑΖΟΜΑΙ',
        sub: [
            { id: 'esports', icon: '⚡', label: 'ESPORTS', response: `🎮 <b>ESPORTS READY:</b><br>Πήγαινε στα <b>STARTER PACKS</b> και δες τη σειρά "Gaming"!` },
            { id: 'aaa', icon: '🔥', label: 'HEAVY AAA', response: `🔥 <b>HEAVY DUTY:</b><br>Χρειάζεσαι δυνατό GPU (16GB+ RAM). Ψάξε στα Drops για υψηλό Multitasking Score.` },
            { id: 'creator', icon: '🎥', label: 'CREATOR', response: `🎥 <b>CREATOR MODE:</b><br>Δες τις κατηγορίες "Streaming" &amp; "Coding" στα Starter Packs!` }
        ]
    },
    {
        id: 'budget', icon: '💶', label: 'BUDGET ADVISOR',
        sub: [
            { id: 'low', icon: '💸', label: '< €400', response: `💰 Με budget κάτω από €400, τσέκαρε τα <b>STARTER PACKS</b> για την καλύτερη σχέση τιμής/απόδοσης!` },
            { id: 'mid', icon: '💶', label: '€400 – €700', admin: true, response: `💰 Στα €400-700 έχεις αρκετές καλές επιλογές στα <b>LIVE DROPS</b>. Ρίξε μια ματιά!` },
            { id: 'high', icon: '💎', label: '€700+', admin: true, response: `💰 Με budget €700+, ρώτα τον Admin για <b>Custom Build</b> στα δικά σου specs!` }
        ]
    }
];

export function toggleChat() {
    const c = document.getElementById('chat-widget');
    if (c) c.classList.toggle('open');
    if (window.playClick) window.playClick();
}

function adminButtonHTML() {
    return `<button class="chat-admin-btn" onclick="window.open('https://wa.me/${CONFIG.WHATSAPP_NUM}', '_blank')">💬 ΜΙΛΑ ΜΕ ΤΟΝ ADMIN</button>`;
}

function renderHome() {
    const home = document.getElementById('chat-menu-home');
    if (!home) return;
    home.innerHTML = `<div class="chat-menu-grid">
        ${CHAT_CATEGORIES.map(cat => `
            <button class="chat-menu-item" onclick="openChatCategory('${cat.id}')">
                <span class="chat-menu-icon">${cat.icon}</span>
                <span class="chat-menu-label">${cat.label}</span>
            </button>
        `).join('')}
    </div>`;
}

export function openChatCategory(id) {
    const cat = CHAT_CATEGORIES.find(c => c.id === id);
    const sub = document.getElementById('chat-menu-sub');
    if (!cat || !sub) return;
    if (window.playClick) window.playClick();

    if (cat.sub) {
        sub.innerHTML = `
            <div class="chat-menu-back" onclick="chatGoBack()"><i class="ph-bold ph-caret-left"></i> BACK</div>
            <div class="chat-menu-grid">
                ${cat.sub.map(s => `
                    <button class="chat-menu-item" onclick="openChatAnswer('${cat.id}','${s.id}')">
                        <span class="chat-menu-icon">${s.icon}</span>
                        <span class="chat-menu-label">${s.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    } else {
        sub.innerHTML = `
            <div class="chat-menu-back" onclick="chatGoBack()"><i class="ph-bold ph-caret-left"></i> BACK</div>
            <div class="chat-response">${cat.response}</div>
            ${cat.admin ? adminButtonHTML() : ''}
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
        <div class="chat-menu-back" onclick="openChatCategory('${catId}')"><i class="ph-bold ph-caret-left"></i> BACK</div>
        <div class="chat-response">${item.response}</div>
        ${item.admin ? adminButtonHTML() : ''}
    `;
}

export function chatGoBack() {
    if (window.playClick) window.playClick();
    document.getElementById('chat-menu-home')?.classList.remove('hidden-screen');
    document.getElementById('chat-menu-sub')?.classList.remove('active-screen');
}

// Εξαγωγή στο global scope για το HTML
window.toggleChat = toggleChat;
window.openChatCategory = openChatCategory;
window.openChatAnswer = openChatAnswer;
window.chatGoBack = chatGoBack;

renderHome();
