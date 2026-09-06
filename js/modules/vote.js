// js/modules/vote.js
import { state } from '../state.js';
import { CONFIG } from '../config.js';

let notifiedAlmostThere = false;
let lastEventTitle = null;

export function renderVoteState() {
    if(!state.activeEvent) return;

    if (state.activeEvent.title !== lastEventTitle) {
        lastEventTitle = state.activeEvent.title;
        notifiedAlmostThere = false;
    }

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

    const t = window.t || (k => k);
    const remaining = Math.max(state.activeEvent.targetVotes - state.activeEvent.currentVotes, 0);
    const remainingChip = document.getElementById('v-remaining-chip');
    if (remainingChip) {
        if (remaining > 0) {
            remainingChip.textContent = `${remaining} ${t('voteRemaining')}`;
            remainingChip.classList.remove('hidden');
        } else {
            remainingChip.classList.add('hidden');
        }
    }

    if (pct >= 80 && pct < 100 && !notifiedAlmostThere) {
        notifiedAlmostThere = true;
        if (window.showToast) window.showToast(`🔥 ${t('voteAlmostThere')} — ${remaining} ${t('voteRemaining')}`, 'achievement');
    }

    if(state.activeEvent.currentVotes >= state.activeEvent.targetVotes) unlockVisuals();
    updateTimer(); // keeps the button in step with hasVoted right after a vote lands
}

// The vote drop opens in the same inspect card as every other build, so it gets flip-to-specs,
// SHOW FPS and the lore panel for free. isVoteEvent puts that card in vote mode: gold/purple,
// and nothing configurable (no extras, no cart, no wishlist).
function voteEventAsPC(ev) {
    return {
        _id: 'vote-event',
        name: ev.title || '',
        price: ev.price || '0',
        description: ev.description || '',
        lore: ev.lore || '',
        loreEl: ev.loreEl || '',
        images: ev.image ? [ev.image] : [],
        specs: ev.specs || {},
        specDetails: {},
        fps: ev.fps || [],
        multitasking: ev.multitasking || 0,
        stock: 1,
        isVoteEvent: true,
        // Keeps the mystery intact: INSPECT must not hand over an unblurred photo of a drop the
        // community hasn't unlocked yet.
        voteSecured: (ev.currentVotes || 0) >= (ev.targetVotes || 0)
    };
}

export function openVoteGallery() {
    if (!state.activeEvent || !state.activeEvent.title) return;
    if (window.openGallery) window.openGallery(voteEventAsPC(state.activeEvent));
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

        // Once the target is hit, unlockVisuals() owns the button ("DROP SECURED") — this runs
        // on a 1s interval and would otherwise overwrite it every tick.
        if (state.activeEvent.currentVotes >= state.activeEvent.targetVotes) return;

        if (state.activeEvent.hasVoted) {
            btn.innerText = "VOTE REGISTERED";
            btn.disabled = true;
            btn.classList.add('voted');
        } else {
            btn.innerText = "AUTHORIZE DROP";
            btn.disabled = false;
            btn.classList.remove('voted');
        }
    }
}

export async function castVote() {
    if (!state.isLoggedIn) {
        if (window.showToast) window.showToast("ACCESS DENIED. LOGIN REQUIRED TO VOTE.", "error");
        if (window.openModal) window.openModal('login-modal');
        return;
    }
    try {
        const res = await fetch(`${CONFIG.API_URL}/cast-vote`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` }
        });
        const data = await res.json();

        if (res.ok) {
            state.activeEvent.currentVotes = data.votes;
            state.activeEvent.hasVoted = true;
            renderVoteState();
            if(window.showToast) window.showToast("VOTE REGISTERED", "normal");
            if(window.checkAchievement) window.checkAchievement('vote');
        } else if (res.status === 409) {
            // Already voted on another device/session — sync the UI to the truth
            state.activeEvent.hasVoted = true;
            if (typeof data.votes === 'number') state.activeEvent.currentVotes = data.votes;
            renderVoteState();
            if(window.showToast) window.showToast("YOU HAVE ALREADY VOTED", "error");
        } else if (data.code === 'EMAIL_NOT_VERIFIED') {
            // One-vote-per-account only means anything if an account costs something to create —
            // this is what enforces that, so make the reason unmistakable rather than a bare "vote failed".
            if(window.showToast) window.showToast("⚠ VERIFY YOUR EMAIL FIRST — CHECK YOUR PROFILE MENU TO RESEND", "error");
        } else {
            if(window.showToast) window.showToast(data.error || "VOTE FAILED", "error");
        }
    } catch(e) {
        console.error("Vote failed.", e);
        if(window.showToast) window.showToast("CONNECTION ERROR", "error");
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
window.openVoteGallery = openVoteGallery;