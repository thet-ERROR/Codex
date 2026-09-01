// js/modules/reviews.js
import { state } from '../state.js';
import { api } from '../api.js';
import { CONFIG } from '../config.js';

export async function checkMissionCode() {
    const code = prompt("ENTER MISSION CODE (Found in Box):"); 
    if(!code) return; 
    
    try {
        // Κλήση μέσω του κεντρικού api.js
        const data = await api.checkMissionCode(code);
        
        if (!data.valid) { 
            alert("❌ " + data.msg); 
            return; 
        }
        if (data.expired) { 
            alert("⚠️ MISSION EXPIRED. 48 HOURS HAVE PASSED."); 
            return; 
        }
        
        // Αποθηκεύουμε τον κωδικό στο state
        state.currentTicketCode = code;
        
        const pcNameElement = document.getElementById('mission-pc-name');
        if (pcNameElement) pcNameElement.innerText = data.pcName;
        
        startMissionTimer(data.timeLeft);
        if (window.openModal) window.openModal('mission-modal');
    } catch (error) {
        console.error("⛔ CONNECTION ERROR:", error);
        alert("⚠️ ΣΦΑΛΜΑ ΣΥΝΔΕΣΗΣ!\nΟ Server δεν ανταποκρίνεται.");
    }
}

export function startMissionTimer(ms) {
    const timerEl = document.getElementById('mission-timer');
    let timeLeft = ms;
    const interval = setInterval(() => { 
        timeLeft -= 1000; 
        if (timeLeft <= 0) { 
            clearInterval(interval); 
            if(timerEl) timerEl.innerText = "EXPIRED"; 
        } else { 
            const h = Math.floor(timeLeft / (1000 * 60 * 60)); 
            const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)); 
            const s = Math.floor((timeLeft % (1000 * 60)) / 1000); 
            if(timerEl) timerEl.innerText = `${h}h ${m}m ${s}s`; 
        } 
    }, 1000);
}

export function openReviewForm() { 
    if(window.closeModal) window.closeModal('mission-modal'); 
    
    const codeEl = document.getElementById('rc-code');
    if (codeEl) { 
        codeEl.value = state.currentTicketCode; 
        codeEl.disabled = true; // Κλειδώνουμε το πεδίο για να μην το αλλάξει ο χρήστης
    }
    
    if(window.openModal) window.openModal('review-code-modal'); 
}

export async function submitReviewCode() {
    const code = document.getElementById('rc-code').value;
    const user = document.getElementById('rc-user').value.trim();
    const rating = document.getElementById('rc-rating').value;
    const text = document.getElementById('rc-text').value.trim();

    if(!code || !user || !text) {
        alert("SYSTEM ALERT: ALL FIELDS REQUIRED");
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_URL}/submit-review`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ code, user, rating, text })
        });
        const data = await res.json();
        
        if (data.success) {
            if(window.showToast) window.showToast("TRANSMISSION SUCCESSFUL", "achievement");
            if(window.closeModal) window.closeModal('review-code-modal');
        } else {
            alert(data.error || "TRANSMISSION FAILED");
        }
    } catch(e) {
        alert("SERVER ERROR");
    }
}

export function requestReturn() {
    const reasonSelect = document.getElementById('return-reason');
    const reasonValue = reasonSelect ? reasonSelect.value : "";
    
    const pcNameEl = document.getElementById('mission-pc-name');
    const pcName = pcNameEl ? pcNameEl.innerText : "Unknown";
    
    if (!reasonValue) { 
        alert("⚠️ SYSTEM ALERT: Please select a valid Error Protocol."); 
        return; 
    }
    
    let reasonText = "";
    switch(reasonValue) { 
        case "1": reasonText = "FPS / Performance Mismatch"; break; 
        case "2": reasonText = "Hardware Defect / DOA"; break; 
        case "3": reasonText = "Specification Mismatch"; break; 
        case "4": reasonText = "Other Critical Error"; break; 
    }
    
    const msg = `🚨 **RETURN SIGNAL** 🚨%0A%0A📦 **System:** ${pcName}%0A🎫 **Code:** ${state.currentTicketCode}%0A⚠️ **Reason:** ${reasonText}%0A%0AWaiting for authorization...`;
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUM}?text=${msg}`, '_blank');
}

export function renderGlobalReviews() {
    const rList = document.getElementById('review-list');
    if(!rList) return;
    
    let allReviews = [];
    // Συλλέγουμε όλα τα reviews από το inventory
    state.inventory.forEach(pc => { 
        if(pc.reviews) { 
            pc.reviews.forEach(r => { 
                allReviews.push({ ...r, pcName: pc.name }); 
            }); 
        } 
    });
    
    // Ταξινομούμε από το πιο πρόσφατο στο πιο παλιό
    allReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if(allReviews.length === 0) { 
        rList.innerHTML = '<div style="color:#666;text-align:center;margin-top:50px; font-size:0.8rem;">NO TRANSMISSIONS YET</div>'; 
    } else { 
        rList.innerHTML = allReviews.map(r => { 
            const date = r.date ? new Date(r.date).toLocaleDateString() : 'RECENT'; 
            return `<div class="review-card">
                        <span class="r-date">${date}</span>
                        <div class="r-user">${r.user} <span class="r-stars">★${r.rating}</span></div>
                        <div style="font-size:0.7rem; color:var(--neon-purple); margin-bottom:4px; font-weight:bold;">${window.t ? window.t('purchasedLabel') : 'PURCHASED'}: ${r.pcName}</div>
                        <div class="r-text">"${r.text}"</div>
                    </div>`; 
        }).join(''); 
    }
}

export async function submitNewsletter() {
    const emailEl = document.getElementById('nl-email');
    if(!emailEl) return;
    const email = emailEl.value.trim();
    
    if(!email || !email.includes('@')) { 
        if(window.showToast) window.showToast("SYNTAX ERROR: MISSING '@' SYMBOL", "error"); 
        return; 
    }
    
    try {        
        const res = await fetch(`${CONFIG.API_URL}/newsletter`, { 
            method: 'POST', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ email }) 
        });
        const d = await res.json();
        
        if(d.success) {
            if(window.showToast) window.showToast("DROP ALERTS ACTIVATED", "achievement");
            if(window.closeModal) window.closeModal('newsletter-modal');
        } else { 
            if(window.showToast) window.showToast("CONNECTION FAILED", "error"); 
        }
    } catch(e) { 
        if(window.showToast) window.showToast("SERVER ERROR", "error"); 
    }
}

// Εξαγωγή στο global scope για τα onclick του HTML
window.checkMissionCode = checkMissionCode;
window.startMissionTimer = startMissionTimer;
window.openReviewForm = openReviewForm;
window.submitReviewCode = submitReviewCode;
window.requestReturn = requestReturn;
window.renderGlobalReviews = renderGlobalReviews;
window.submitNewsletter = submitNewsletter;