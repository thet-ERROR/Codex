// js/modules/reviews.js
import { state } from '../state.js';
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { esc } from '../utils.js';

// The reviewer's rank badge, when the review was written from a signed-in account (the server stores
// the rank on it). Only known ranks — the value comes from the database, so it's checked, not trusted.
function rankBadge(rank) {
    const icon = CONFIG.RANK_ICONS[rank];
    if (!icon) return '';
    const name = window.rankName ? window.rankName(rank) : rank;
    return ` <i class="ph-fill ${icon} r-rank${rank === 'phantom' ? ' r-rank-top' : ''}" title="${esc(name)}" aria-label="${esc(name)}" role="img"></i>`;
}

// A red toast instead of the browser's alert box, which on a phone blocks the page and looks broken
function notify(msg) {
    if (window.showToast) window.showToast(msg, 'error'); else alert(msg);
}

// Opens the "code on the box" window (it used to be the browser's prompt() box)
export function checkMissionCode() {
    const input = document.getElementById('mc-code');
    const err = document.getElementById('mc-error');
    if (input) input.value = '';
    if (err) { err.hidden = true; err.textContent = ''; }
    if (window.openModal) window.openModal('mission-code-modal');
    // Focus only with a mouse: on a phone the keyboard would jump up over the window as it opens
    if (input && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setTimeout(() => input.focus(), 50);
}

export async function submitMissionCode() {
    const t = window.t || (k => k);
    const input = document.getElementById('mc-code');
    const err = document.getElementById('mc-error');
    const btn = document.getElementById('mc-submit');
    const code = input ? input.value.trim() : '';
    const showError = (msg) => { if (err) { err.textContent = msg; err.hidden = false; } else notify(msg); };
    if (!code) { showError(t('missionCodeEmpty')); return; }
    if (err) err.hidden = true;
    if (btn) btn.disabled = true;

    try {
        // Κλήση μέσω του κεντρικού api.js — read-only, δεν ξεκινάει ακόμα το 48ωρο
        let data = await api.checkMissionCode(code);

        if (!data.valid) {
            // data.msg already starts with its own ❌ (server.js) — adding another showed two
            showError(data.msg || t('missionCodeInvalid'));
            return;
        }

        // Πρώτη φορά που μπαίνει αυτός ο κωδικός: αυτό το τσεκάρισμα (ρητή ενέργεια του χρήστη,
        // όχι κάποιο αυτόματο GET) είναι που ξεκινάει επίσημα το 48ωρο παράθυρο επικύρωσης.
        if (!data.activated) {
            data = await api.activateMissionCode(code);
            if (!data.valid) { showError("❌ " + (data.msg || t('connectionErrorAlert'))); return; }
        }

        if (window.closeModal) window.closeModal('mission-code-modal');

        if (data.expired) {
            // The code only covers the review window now (2 days). Returns have their own route, so
            // instead of a dead-end alert the visitor lands on it.
            if (window.showToast) window.showToast(t('missionExpiredAlert'), 'error');
            if (window.openInfo) window.openInfo('returns');
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
        showError(t('connectionErrorAlert'));
    } finally {
        if (btn) btn.disabled = false;
    }
}

export function startMissionTimer(ms) {
    const timerEl = document.getElementById('mission-timer');
    let timeLeft = ms;
    const interval = setInterval(() => { 
        timeLeft -= 1000; 
        if (timeLeft <= 0) { 
            clearInterval(interval); 
            if(timerEl) timerEl.innerText = window.t('missionExpired'); 
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
        notify(window.t ? window.t('alertAllFieldsReview') : "SYSTEM ALERT: ALL FIELDS REQUIRED");
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
            if(window.showToast) window.showToast(window.t('toastReviewSent'), "achievement");
            if(window.closeModal) window.closeModal('review-code-modal');
        } else {
            notify(data.error || (window.t ? window.t('alertTransmissionFailed') : "TRANSMISSION FAILED"));
        }
    } catch(e) {
        notify(window.t ? window.t('alertServerError') : "SERVER ERROR");
    }
}

export function requestReturn() {
    const reasonSelect = document.getElementById('return-reason');
    const reasonValue = reasonSelect ? reasonSelect.value : "";
    
    const pcNameEl = document.getElementById('mission-pc-name');
    const pcName = pcNameEl ? pcNameEl.innerText : "Unknown";
    
    if (!reasonValue) {
        notify(window.t ? window.t('alertSelectErrorProtocol') : "⚠️ SYSTEM ALERT: Please select a valid Error Protocol.");
        return; 
    }
    
    // The reason as the visitor read it in the dropdown, so the email says what they chose
    const t = window.t || (k => k);
    const reasonText = t('missionReason' + reasonValue);

    // Returns go by email now (same route as the Return button in Information), with the system,
    // box code and reason already filled in. Built as plain text and encoded once, so an "&" or "#"
    // in a build's name can't cut the message off at that character.
    const subject = t('returnMailSubject');
    const body = t('returnMailBodyCode', { pc: pcName, code: state.currentTicketCode || '—', reason: reasonText });
    window.location.href = `mailto:${CONFIG.SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
        // r.user and r.text come from whoever redeemed a mission code — the one place on the
        // site where a stranger's text reaches every visitor's DOM. Never interpolate them raw.
        rList.innerHTML = allReviews.map(r => {
            const date = r.date ? new Date(r.date).toLocaleDateString() : 'RECENT';
            const rating = Number(r.rating) || 0;
            return `<div class="review-card">
                        <span class="r-date">${esc(date)}</span>
                        <div class="r-user">${esc(r.user)}${rankBadge(r.rank)} <span class="r-stars">★${rating}</span></div>
                        <div style="font-size:0.7rem; color:var(--neon-purple); margin-bottom:4px; font-weight:bold;">${esc(window.t ? window.t('purchasedLabel') : 'PURCHASED')}: ${esc(r.pcName)}</div>
                        <div class="r-text">"${esc(r.text)}"</div>
                    </div>`;
        }).join('');
    }
}

export async function submitNewsletter() {
    const emailEl = document.getElementById('nl-email');
    if(!emailEl) return;
    const email = emailEl.value.trim();
    
    if(!email || !email.includes('@')) { 
        if(window.showToast) window.showToast(window.t('toastEmailNoAt'), "error"); 
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
            if(window.showToast) window.showToast(window.t('toastAlertsOn'), "achievement");
            if(window.closeModal) window.closeModal('newsletter-modal');
        } else { 
            if(window.showToast) window.showToast(window.t('toastConnFailed'), "error"); 
        }
    } catch(e) { 
        if(window.showToast) window.showToast(window.t('toastServerError'), "error"); 
    }
}

// Εξαγωγή στο global scope για τα onclick του HTML
window.checkMissionCode = checkMissionCode;
window.submitMissionCode = submitMissionCode;
window.startMissionTimer = startMissionTimer;
window.openReviewForm = openReviewForm;
window.submitReviewCode = submitReviewCode;
window.requestReturn = requestReturn;
window.renderGlobalReviews = renderGlobalReviews;
window.submitNewsletter = submitNewsletter;