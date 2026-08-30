// js/modules/chat.js
import { CONFIG } from '../config.js';

// Το state του bot είναι τοπικό (private) στο module
let codexAiState = 'idle'; 

export function toggleChat() { 
    const c = document.getElementById('chat-widget');
    if(c) c.classList.toggle('open'); 
    if(window.playClick) window.playClick();
}

// Βοηθητική συνάρτηση - Παραμένει "κρυφή" από το HTML γιατί δεν την κάνουμε export
function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function sendChat(inputElement) { 
    const text = inputElement.value.trim();
    if(!text) return;

    const chatMsgs = document.getElementById('chat-msgs');
    if(!chatMsgs) return;

    // Εμφάνιση μηνύματος χρήστη
    chatMsgs.innerHTML += `<div class="msg user">${text}</div>`; 
    inputElement.value = '';
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    // Fake καθυστέρηση για ρεαλισμό (600ms)
    setTimeout(() => {
        const lowerText = removeAccents(text.toLowerCase());
        let botResponse = "";

        if (codexAiState === 'waiting_admin_redirect') {
            if (lowerText === 'ναι' || lowerText.includes('ναι') || lowerText.includes('nai') || lowerText.includes('θελω')) {
                botResponse = "🚀 <b>Εκκίνηση σύνδεσης...</b><br>Σε μεταφέρω στο ασφαλές κανάλι του Admin.";
                setTimeout(() => window.open(`https://wa.me/${CONFIG.WHATSAPP_NUM}`, "_blank"), 1500); 
            } else {
                botResponse = "Λήψη ελήφθη. 🤖 Τι άλλο θα ήθελες να μάθεις;";
            }
            codexAiState = 'idle'; 
        } 
        else if (codexAiState === 'waiting_budget') {
            const budget = parseInt(lowerText.replace(/[^0-9]/g, '')); 
            if (budget > 0) {
                botResponse = `💰 Με budget <b>€${budget}</b>, τσέκαρε τα <b>STARTER PACKS</b> ή ρώτα τον Admin για Custom Build!<br><br><button class='btn-inspect' style='padding:5px; font-size:0.8rem;' onclick='window.open("https://wa.me/${CONFIG.WHATSAPP_NUM}", "_blank")'>CUSTOM BUILD</button>`;
            } else {
                botResponse = "Δεν κατάλαβα το ποσό. Πες μου απλά νούμερα, π.χ. '800'.";
            }
            codexAiState = 'idle'; 
        }
        else {
            botResponse = "Δεν το έπιασα αυτό, Agent. 🤖<br>Ρώτα με για <b>Αγορά</b>, <b>Μεταφορικά</b>, <b>Εγγύηση</b>, ή <b>Παιχνίδια</b>!";
            
            if (lowerText.includes('μεταφορικα') || lowerText.includes('αποστολη') || lowerText.includes('πολη') || lowerText.includes('ελλαδα')) {
                botResponse = "📦 <b>Αποστολές πανελλαδικά!</b><br>Τα μεταφορικά καθορίζονται κατά την παραγγελία.<br><br><b>Θέλεις να μιλήσεις με τον Admin για λεπτομέρειες; (Ναι/Όχι)</b>";
                codexAiState = 'waiting_admin_redirect'; 
            }
            else if (lowerText.includes('budget') || lowerText.includes('χρηματα') || lowerText.includes('ευρω') || lowerText.includes('λεφτα')) {
                botResponse = "💶 Πόσα χρήματα (budget) περίπου διαθέτεις για το νέο σου PC;";
                codexAiState = 'waiting_budget'; 
            }
            else if (lowerText.includes('εγγυηση') || lowerText.includes('χαλασε') || lowerText.includes('προβλημα') || lowerText.includes('support')) {
                botResponse = "🛡️ <b>MISSION PROTOCOL:</b><br>Όλα ελέγχονται εξονυχιστικά. Αν υπάρξει θέμα, κάνεις Initiate Return Protocol από το site!";
            }
            else if (lowerText.includes('αγορα') || lowerText.includes('τιμη') || lowerText.includes('παραγγελια') || lowerText.includes('εκπτωση')) {
                botResponse = "🛒 <b>ΔΙΑΔΙΚΑΣΙΑ ΑΓΟΡΑΣ:</b><br>Βάζεις το σύστημα στο Cart. Εναλλακτικά κλείνουμε το deal στο WhatsApp!<br><br><b>Να σε συνδέσω με τον Admin; (Ναι/Όχι)</b>";
                codexAiState = 'waiting_admin_redirect'; 
            }
            else if (lowerText.includes('fortnite') || lowerText.includes('valorant') || lowerText.includes('csgo') || lowerText.includes('lol') || lowerText.includes('παιχνιδια')) {
                botResponse = "🎮 <b>ESPORTS READY:</b><br>Πήγαινε στα <b>STARTER PACKS</b> και δες τη σειρά 'Gaming'!";
            }
            else if (lowerText.includes('gta') || lowerText.includes('warzone') || lowerText.includes('fivem') || lowerText.includes('cyberpunk') || lowerText.includes('βαρια')) {
                botResponse = "🔥 <b>HEAVY DUTY:</b><br>Χρειάζεσαι δυνατό GPU (16GB+ RAM). Ψάξε στα Drops για υψηλό Multitasking Score.";
            }
            else if (lowerText.includes('stream') || lowerText.includes('video') || lowerText.includes('edit') || lowerText.includes('coding')) {
                botResponse = "🎥 <b>CREATOR MODE:</b><br>Δες τις κατηγορίες 'Streaming' & 'Coding' στα Starter Packs!";
            }
        }

        chatMsgs.innerHTML += `<div class="msg bot">${botResponse}</div>`;
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
        if(window.playHover) window.playHover(); 

    }, 600); 
}

// Εξαγωγή στο global scope για το HTML
window.toggleChat = toggleChat;
window.sendChat = sendChat;