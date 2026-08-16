// js/modules/vote.js
import { state } from '../state.js';
import { CONFIG } from '../config.js';

export function renderVoteState() { 
    if(!state.activeEvent) return;
    
    const title = document.getElementById('v-title');
    if(title) title.innerText = state.activeEvent.title; 
    
    const priceDisp = document.getElementById('v-price-display');
    if(priceDisp) priceDisp.innerText = state.activeEvent.price ? "ESTIMATED PRICE: €" + state.activeEvent.price : "";
    
    const img = document.getElementById('v-img');
    if(img) img.src = state.activeEvent.image || ''; 
    
    const pct = (state.activeEvent.currentVotes / state.activeEvent.targetVotes) * 100; 
    const fill = document.getElementById('v-fill');
    if(fill) fill.style.width = Math.min(pct, 100) + '%';    
    
    const count = document.getElementById('v-count');
    if(count) count.innerText = `${state.activeEvent.currentVotes} / ${state.activeEvent.targetVotes} VOTES`; 
    
    if(state.activeEvent.currentVotes >= state.activeEvent.targetVotes) unlockVisuals(); 
}

export function formatTime(ms) { 
    const d = Math.floor(ms / (1000*60*60*24)); 
    const h = Math.floor((ms / (1000*60*60)) % 24); 
    const m = Math.floor((ms / 1000 / 60) % 60); 
    return `${d}d ${h}h ${m}m`; 
}

export function updateTimer() { 
    if(!state.activeEvent) return; 
    const now = new Date(); 
    const start = new Date(state.activeEvent.startDate); 
    const end = new Date(start.getTime() + (state.activeEvent.durationDays * 24 * 60 * 60 * 1000)); 
    const btn = document.getElementById('v-btn'); 
    const timer = document.getElementById('v-timer'); 
    
    if(!timer || !btn) return;

    if (now < start) { 
        timer.innerText = `VOTING OPENS IN: ${formatTime(start - now)}`; 
        btn.innerText = "LOCKED"; 
        btn.disabled = true; 
    } else if (now > end) { 
        timer.innerText = "EXPIRED"; 
        timer.style.color = "red"; 
        btn.innerText = "FAILED"; 
        btn.disabled = true; 
    } else { 
        timer.innerText = `TIME REMAINING: ${formatTime(end - now)}`; 
        if(state.activeEvent.currentVotes < state.activeEvent.targetVotes) { 
            btn.disabled = false; 
            btn.innerText = "AUTHORIZE DROP"; 
        } 
    } 
}

export async function castVote() { 
    try {
        const res = await fetch(`${CONFIG.API_URL}/cast-vote`, { method: 'POST' }); 
        const data = await res.json(); 
        if(data.votes) { 
            state.activeEvent.currentVotes = data.votes; 
            renderVoteState(); 
            if(window.showToast) window.showToast("VOTE REGISTERED", "normal"); 
            if(window.checkAchievement) window.checkAchievement('vote'); 
        } 
    } catch(e) { 
        console.error("Vote failed.", e); 
    }
}

export function unlockVisuals() { 
    const img = document.getElementById('v-img');
    const lock = document.getElementById('v-lock');
    const btn = document.getElementById('v-btn');
    const buyBtn = document.getElementById('v-buy-btn');

    if(img) img.classList.add('unlocked'); 
    if(lock) lock.style.opacity = '0'; 
    if(btn) {
        btn.innerText = "DROP SECURED"; 
        btn.style.background = "#333"; 
        btn.style.color = "#888"; 
        btn.disabled = true; 
    }
    if(buyBtn) buyBtn.classList.remove('hidden');
}

export function buyVotePC() {
    if(!state.activeEvent) return;
    const msg = `Hello! I want to secure the community drop:%0A%0A- *${state.activeEvent.title}*%0A- Estimated Price: €${state.activeEvent.price || 'TBD'}%0A%0AIs it available?`;
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUM}?text=${msg}`, '_blank');
}

// Εξαγωγή στο global scope για τα onclick του HTML
window.renderVoteState = renderVoteState;
window.updateTimer = updateTimer;
window.castVote = castVote;
window.unlockVisuals = unlockVisuals;
window.buyVotePC = buyVotePC;