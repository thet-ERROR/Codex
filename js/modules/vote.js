// js/modules/vote.js
//
// The VOTE tab: one community-drop card that decides what to show from the state of the vote
// (none / upcoming / open / unlocked / closed) and of the visitor (guest / unverified / can vote /
// voted). Every string goes through t(), so the tab follows the language like the rest of the site.
//
// When the community reaches the target, the API turns the drop into a regular PC in LIVE DROPS on
// the spot (server.js resolveVoteEvent). This card then plays the unlock — the lock breaks, the photo
// clears and the card flies up to the LIVE DROPS tab — and its button takes you to that PC.
import { state } from '../state.js';
import { CONFIG } from '../config.js';
import { api } from '../api.js';
import { t, getLang } from '../i18n.js';
import { formatPrice, priceCentsOf, formatShortDateTime } from '../utils.js';

const REFRESH_MS = 45000;               // live progress while the tab is on screen
const UNLOCK_SEEN_KEY = 'codex_vote_unlock_seen';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

let lastFetchAt = 0;
let fetching = null;
let lastToken = localStorage.getItem('codex_token') || '';
let serverOffset = 0;                   // server clock minus ours, from the last fetch
let voting = false;
let lastTimerText = null;
let closingRefetched = false;
// Until the first answer arrives the card says "loading" — not "no vote right now", which is a
// different (and wrong) thing to tell someone while a cold server wakes up
let loaded = false;

const ev = () => (state.activeEvent && state.activeEvent.title ? state.activeEvent : null);

// A drop's price is optional — an estimate — so no price must read as absent, not as 0,00 €.
function hasPrice(e) {
    return !!e && ((Number.isFinite(e.priceCents) && e.priceCents > 0) || /[1-9]/.test(String(e.price ?? '')));
}

function windowOf(e) {
    const start = e.startDate ? Date.parse(e.startDate) : null;
    const end = e.endsAt ? Date.parse(e.endsAt) : (start !== null ? start + (e.durationDays || 0) * 86400000 : null);
    return { start, end };
}

// The server's answer wins (it decides with its own clock); the local fallback covers the seconds
// between fetches and an older API that doesn't send `phase` yet.
export function votePhase(e = ev()) {
    if (!loaded) return 'loading';
    if (!e) return 'none';
    if (e.phase === 'unlocked' || e.phase === 'closed') return e.phase;
    if (e.status === 'unlocked' || e.status === 'closed') return e.status;
    const now = Date.now() + serverOffset;
    const { start, end } = windowOf(e);
    if (start !== null && now < start) return 'upcoming';
    if (e.targetVotes > 0 && e.currentVotes >= e.targetVotes) return 'unlocked';
    if (end !== null && now > end) return 'closed';
    return 'open';
}

function visitorState(e) {
    if (!state.isLoggedIn) return 'guest';
    if (!state.emailVerified) return 'unverified';
    return e && e.hasVoted ? 'voted' : 'can';
}

function formatDuration(ms) {
    const el = getLang() === 'el';
    const [dU, hU, mU, sU] = el ? ['ημ', 'ώ', 'λ', 'δ'] : ['d', 'h', 'm', 's'];
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400), h = Math.floor(total / 3600) % 24, m = Math.floor(total / 60) % 60, s = total % 60;
    if (d > 0) return `${d}${dU} ${h}${hU} ${m}${mU}`;
    if (h > 0) return `${h}${hU} ${m}${mU}`;
    return `${m}${mU} ${s}${sU}`;      // last hour: seconds, so the final stretch visibly counts down
}

const $ = (id) => document.getElementById(id);
function setText(id, text) { const el = $(id); if (el && el.textContent !== text) el.textContent = text; }

// --- RENDER ---
export function renderVoteState() {
    const box = $('vote-container');
    if (!box) return;
    const e = ev();
    const phase = votePhase(e);
    const user = visitorState(e);
    box.dataset.phase = phase;
    box.dataset.user = user;

    setText('v-status', t('voteStatus_' + phase));
    setText('v-title', e ? e.title : (phase === 'none' ? t('voteNoneTitle') : ' '));
    setText('v-price-display', e ? (hasPrice(e) ? t('voteEstPrice', { price: formatPrice(priceCentsOf(e)) }) : t('votePriceTbd')) : '');

    const img = $('v-img');
    if (img) {
        const src = e && e.image ? e.image : '';
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    }

    // Progress
    const target = e ? Math.max(0, Number(e.targetVotes) || 0) : 0;
    const votes = e ? Math.max(0, Number(e.currentVotes) || 0) : 0;
    const pct = target ? Math.min(100, (votes / target) * 100) : 0;
    const fill = $('v-fill');
    if (fill) fill.style.width = pct + '%';
    const bar = $('v-bar');
    if (bar) { bar.setAttribute('aria-valuenow', String(votes)); bar.setAttribute('aria-valuemax', String(target)); }
    setText('v-count', t('voteCount', { n: votes, target }));
    const remaining = Math.max(0, target - votes);
    const chip = $('v-remaining-chip');
    if (chip) {
        const showChip = remaining > 0 && (phase === 'open' || phase === 'upcoming');
        chip.classList.toggle('hidden', !showChip);
        // At 80%+ the chip itself turns hot — instead of the old toast that fired over the splash
        chip.classList.toggle('hot', showChip && pct >= 80);
        if (showChip) chip.textContent = remaining === 1 ? t('voteRemainingOne') : t('voteRemainingMany', { n: remaining });
    }

    // Message line for the states that have something to explain
    const msgKey = { none: 'voteMsgNone', unlocked: 'voteMsgUnlocked', closed: 'voteMsgClosed' }[phase];
    const msg = $('v-message');
    if (msg) { msg.classList.toggle('hidden', !msgKey); if (msgKey) msg.textContent = t(msgKey); }

    renderAction(phase, user);
    renderBrief(e);
    updateTimer();
    maybePlayUnlock(phase);
}

// One main button, decided here for every combination — each state has a next step
function renderAction(phase, user) {
    const btn = $('v-btn');
    const helper = $('v-helper');
    if (!btn) return;
    let action, label, help = '', link = null;
    if (phase === 'loading') {
        action = ''; label = ' ';
    } else if (phase === 'none' || phase === 'upcoming') {
        action = 'notify'; label = t('voteNotifyBtn');
        help = phase === 'upcoming' ? t('voteHelpUpcoming') : '';
    } else if (phase === 'unlocked' || phase === 'closed') {
        action = 'golive'; label = t('voteSeeLiveBtn');
        if (phase === 'unlocked') {
            // Unlocked in time: members order first until the vote would have ended (server.js)
            const end = ev() ? windowOf(ev()).end : null;
            help = end !== null && end > Date.now() + serverOffset
                ? t('voteHelpUnlockedMembers', { until: formatShortDateTime(end) })
                : t('voteHelpUnlocked');
        }
    } else if (user === 'guest') {
        action = 'login'; label = t('voteLoginBtn');
        help = t('voteHelpGuest'); link = { act: 'signup', text: t('voteSignupLink') };
    } else if (user === 'unverified') {
        action = 'verify'; label = t('voteVerifyBtn'); help = t('voteHelpVerify');
    } else if (user === 'voted') {
        action = 'voted'; label = t('voteDoneBtn');
        help = t('voteHelpVoted'); link = { act: 'share', text: t('voteShareLink') };
    } else {
        action = 'vote'; label = t('voteCastBtn'); help = t('voteHelpCan');
    }
    btn.dataset.action = action;
    if (!voting) {
        btn.disabled = action === 'voted';
        setText('v-btn-label', label);
    }
    if (helper) {
        helper.textContent = help;
        if (link) {
            const a = document.createElement('button');
            a.type = 'button';
            a.className = 'vote-link';
            a.dataset.voteAct = link.act;
            a.textContent = link.text;
            helper.append(help ? ' ' : '', a);
        }
        helper.classList.toggle('hidden', !help && !link);
    }
}

// The admin's lore (the drop's teaser story) — on the card itself now; it used to be collected in the
// admin panel and shown nowhere
function renderBrief(e) {
    const brief = $('v-brief');
    if (!brief) return;
    const lore = e ? ((getLang() === 'el' && e.loreEl) ? e.loreEl : (e.lore || '')) : '';
    brief.classList.toggle('hidden', !lore);
    if (!lore) return;
    setText('v-brief-title', t('classifiedBrief'));
    const text = $('v-brief-text');
    if (text && text.textContent !== lore) {
        text.textContent = lore;
        brief.classList.remove('expanded');
    }
    const more = $('v-brief-more');
    if (more && text) {
        more.textContent = brief.classList.contains('expanded') ? t('briefLess') : t('briefMore');
        // Only offered when the 3-line clamp actually cut something
        requestAnimationFrame(() => more.classList.toggle('hidden', !brief.classList.contains('expanded') && text.scrollHeight <= text.clientHeight + 1));
    }
}

// --- TIMER (main.js ticks this every second) ---
export function updateTimer() {
    const e = ev();
    const phase = votePhase(e);
    const box = $('vote-container');
    // The clock alone can move the phase (upcoming → open, open → closed): re-render on the change
    if (box && box.dataset.phase && box.dataset.phase !== phase) { renderVoteState(); return; }
    // Time ran out while watching: ask the server, which moves the drop to LIVE DROPS on that read
    if (phase === 'closed' && e && e.status !== 'closed' && e.phase !== 'closed' && !closingRefetched) {
        closingRefetched = true;
        refreshVoteEvent();
    }

    let text = '';
    if (e && (phase === 'upcoming' || phase === 'open')) {
        const now = Date.now() + serverOffset;
        const { start, end } = windowOf(e);
        if (phase === 'upcoming' && start !== null) text = t('voteOpensIn', { time: formatDuration(start - now) });
        else if (end !== null) text = t('voteClosesIn', { time: formatDuration(end - now) });
    }
    // Written only when it changes — once a minute, except in the last hour
    if (text !== lastTimerText) {
        lastTimerText = text;
        setText('v-timer-text', text);
        const pill = $('v-timer');
        if (pill) pill.classList.toggle('hidden', !text);
    }

    if (state.currentTab === 'vote' && !document.hidden && Date.now() - lastFetchAt > REFRESH_MS) refreshVoteEvent();
}

// --- DATA ---
function applyEvent(data) {
    if (data && data.serverNow) serverOffset = Date.parse(data.serverNow) - Date.now();
    state.activeEvent = data && data.title ? data : null;
    closingRefetched = false;
    loaded = true;
}

// The boot fetch (main.js) goes through here so the card knows it has real data and when it got it
export function applyVoteEventFromBoot(data) {
    applyEvent(data);
    lastFetchAt = Date.now();
}

export function refreshVoteEvent() {
    if (fetching) return fetching;
    lastFetchAt = Date.now();
    lastToken = localStorage.getItem('codex_token') || '';
    fetching = api.fetchVoteEvent()
        .then(data => { applyEvent(data); renderVoteState(); })
        .catch(() => { /* offline or waking server: keep showing what we have */ })
        .finally(() => { fetching = null; });
    return fetching;
}

// After an unlock the new PC has to be in the catalogue before anything can point at it
async function refreshDrops() {
    try {
        const drops = await api.fetchDrops();
        if (Array.isArray(drops)) {
            state.inventory = drops;
            if (state.currentTab === 'live' && window.filterInv) window.filterInv();
        }
    } catch (e) { /* the button will retry when pressed */ }
}

// Login, logout or verification changes who's asking — hasVoted depends on that, so refetch then.
// Called from updateAuthUI (which a language switch also calls; that just re-renders).
export function onVoteAuthChange() {
    const token = localStorage.getItem('codex_token') || '';
    if (token !== lastToken) refreshVoteEvent();
    else renderVoteState();
}

// --- ACTIONS ---
export function voteMainAction() {
    const btn = $('v-btn');
    if (!btn || voting) return;
    if (window.playClick) window.playClick();
    switch (btn.dataset.action) {
        case 'vote': castVote(); break;
        case 'login': if (window.openModal) window.openModal('login-modal'); break;
        case 'verify': if (window.resendVerification) window.resendVerification(); break;
        case 'notify': if (window.openModal) window.openModal('newsletter-modal'); break;
        case 'golive': goToLiveDrop(); break;
    }
}

export async function castVote() {
    const e = ev();
    if (!e || voting) return;
    if (!state.isLoggedIn) { if (window.openModal) window.openModal('login-modal'); return; }
    const btn = $('v-btn');
    voting = true;
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
    try {
        const res = await fetch(`${CONFIG.API_URL}/cast-vote`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` }
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            e.currentVotes = data.votes;
            e.hasVoted = true;
            if (window.applyProfile && data.profile) window.applyProfile(data.profile);
            if (data.phase === 'unlocked') {
                // This vote was the one that unlocked it
                e.phase = e.status = 'unlocked';
                e.pcId = data.pcId;
                await refreshDrops();
            } else if (window.showToast) {
                window.showToast(t('voteToastCounted'), 'normal');
            }
        } else if (res.status === 409 && data.code === 'VOTE_CLOSED') {
            // Someone else's vote unlocked it a moment earlier, or time ran out
            if (typeof data.votes === 'number') e.currentVotes = data.votes;
            e.phase = e.status = data.phase || 'closed';
            if (data.pcId) e.pcId = data.pcId;
            await refreshDrops();
        } else if (res.status === 409) {
            // Already voted (another tab or device) — sync to the truth, nothing went wrong
            e.hasVoted = true;
            if (typeof data.votes === 'number') e.currentVotes = data.votes;
            if (window.showToast) window.showToast(t('voteToastAlready'), 'normal');
        } else if (data.code === 'EMAIL_NOT_VERIFIED') {
            state.emailVerified = false;
            if (window.showToast) window.showToast(t('toastVerifyReminder'), 'error');
        } else if (res.status === 401) {
            // Session expired or revoked: sign out cleanly and ask to sign in again
            if (window.logout) window.logout();
            if (window.openModal) window.openModal('login-modal');
        } else {
            if (data.code === 'VOTE_NOT_OPEN') refreshVoteEvent();
            if (window.showToast) window.showToast(t('voteToastFailed'), 'error');
        }
    } catch (err) {
        console.error('Vote failed.', err);
        if (window.showToast) window.showToast(t('voteToastFailed'), 'error');
    } finally {
        voting = false;
        if (btn) btn.classList.remove('is-loading');
        renderVoteState();
    }
}

export async function goToLiveDrop() {
    const e = ev();
    const id = e && e.pcId ? String(e.pcId) : null;
    if (id && !state.inventory.some(p => String(p._id) === id)) await refreshDrops();
    if (window.switchTab) window.switchTab('live');
    if (id) {
        const i = state.filtered.findIndex(p => String(p._id) === id);
        if (i >= 0) { state.index = i; if (window.renderCard) window.renderCard(); }
    }
    const card = $('carousel-wrapper');
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function shareVote() {
    const e = ev();
    if (!e) return;
    const url = `${location.origin}${location.pathname}?tab=vote`;
    const text = t('voteShareText', { name: e.title });
    try {
        if (navigator.share) { await navigator.share({ title: e.title, text, url }); return; }
        await navigator.clipboard.writeText(`${text} ${url}`);
        if (window.showToast) window.showToast(t('linkCopied'), 'normal');
    } catch (err) { /* share sheet dismissed */ }
}

// --- UNLOCK SEQUENCE ---
// Once per event per browser: whoever is on the tab when it unlocks (or opens it afterwards) sees
// the lock break, the photo clear and the card fly up to LIVE DROPS.
function maybePlayUnlock(phase) {
    const e = ev();
    const box = $('vote-container');
    if (phase !== 'unlocked' || !e || !box) return;
    if (state.currentTab !== 'vote' || box.offsetParent === null) return; // played when the tab is opened
    const key = String(e._id || e.title);
    let seen = null;
    try { seen = localStorage.getItem(UNLOCK_SEEN_KEY); } catch (err) {}
    if (seen === key) return;
    try { localStorage.setItem(UNLOCK_SEEN_KEY, key); } catch (err) {}
    playUnlock(e);
}

function playUnlock(e) {
    const box = $('vote-container');
    const wrap = $('v-img-wrap');
    const tab = $('tab-live');
    const done = () => {
        if (tab) { tab.classList.remove('tab-ping'); void tab.offsetWidth; tab.classList.add('tab-ping'); }
        if (window.showToast) window.showToast(t('voteUnlockedToast', { name: e.title }), 'achievement');
    };
    if (REDUCED_MOTION.matches || !box || !wrap) { done(); return; }

    // 1. The lock shakes and bursts, the photo clears, a gold flash (CSS: .vote-container.unlocking)
    box.classList.remove('unlocking');
    void box.offsetWidth;
    box.classList.add('unlocking');

    // 2. A snapshot of the photo flies up into the LIVE DROPS tab — "it went there"
    setTimeout(() => {
        box.classList.remove('unlocking');
        if (!tab || tab.offsetParent === null) { done(); return; }
        const from = wrap.getBoundingClientRect();
        const to = tab.getBoundingClientRect();
        const flyer = wrap.cloneNode(true);
        flyer.removeAttribute('id');
        flyer.removeAttribute('onclick');
        flyer.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
        flyer.className = 'mystery-img-wrap vote-flyer';
        flyer.setAttribute('aria-hidden', 'true');
        Object.assign(flyer.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
        document.body.appendChild(flyer);
        const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
        const scale = Math.max(0.08, to.height / from.height);
        const anim = flyer.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
            { transform: `translate(${dx * 0.15}px, ${dy * 0.15 - 30}px) scale(0.9)`, opacity: 1, offset: 0.25 },
            { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.15, offset: 1 }
        ], { duration: 750, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' });
        const finish = () => { flyer.remove(); done(); };
        anim.onfinish = finish;
        anim.oncancel = () => flyer.remove();
    }, 1100);
}

// --- INFO + INSPECT ---
// Admin-editable via GLOBAL SETTINGS in the admin panel (SiteConfig.voteInfoText/-El), with an i18n
// default when that's empty. Set via textContent — free-form admin input, never parsed as HTML;
// `white-space: pre-line` on .vote-info-text keeps the admin's line breaks.
export function openVoteInfo() {
    const isGreek = getLang() === 'el';
    const text = (isGreek ? state.voteInfoTextEl : state.voteInfoText) || state.voteInfoText || t('voteInfoDefault');
    const el = $('vote-info-text');
    if (el) el.textContent = text;
    if (window.openModal) window.openModal('vote-info-modal');
}

// The vote drop opens in the same inspect card as every other build (flip to specs, FPS). isVoteEvent
// puts that card in vote mode: gold/purple, and nothing configurable (no extras, no cart, no wishlist).
function voteEventAsPC(e) {
    const priced = hasPrice(e);
    return {
        _id: 'vote-event',
        name: e.title || '',
        price: priced ? (e.price || '') : '',
        priceCents: priced ? e.priceCents : null,
        priceTbd: !priced,
        description: e.description || '',
        lore: e.lore || '',
        loreEl: e.loreEl || '',
        images: e.image ? [e.image] : [],
        specs: e.specs || {},
        specDetails: {},
        fps: e.fps || [],
        multitasking: e.multitasking || 0,
        stock: 1,
        isVoteEvent: true,
        // Keeps the mystery intact: INSPECT doesn't hand over an unblurred photo before the unlock
        voteSecured: votePhase(e) === 'unlocked' || votePhase(e) === 'closed'
    };
}

export function openVoteGallery() {
    const e = ev();
    if (!e) return;
    if (window.openGallery) window.openGallery(voteEventAsPC(e));
}

// Helper-line links and the lore toggle (rebuilt on every render, so delegated once)
document.addEventListener('click', (evt) => {
    const link = evt.target.closest('#vote-container [data-vote-act]');
    if (link) {
        if (window.playClick) window.playClick();
        if (link.dataset.voteAct === 'signup' && window.openModal) window.openModal('signup-modal');
        if (link.dataset.voteAct === 'share') shareVote();
        return;
    }
    if (evt.target.closest('#v-brief-more')) {
        const brief = $('v-brief');
        if (!brief) return;
        const open = brief.classList.toggle('expanded');
        setText('v-brief-more', open ? t('briefLess') : t('briefMore'));
    }
});

// Back on the tab after a while: show the current count right away
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.currentTab === 'vote' && Date.now() - lastFetchAt > 10000) refreshVoteEvent();
});

// Εξαγωγή στο global scope για τα onclick του HTML
window.renderVoteState = renderVoteState;
window.updateTimer = updateTimer;
window.castVote = castVote;
window.voteMainAction = voteMainAction;
window.openVoteGallery = openVoteGallery;
window.openVoteInfo = openVoteInfo;
window.refreshVoteEvent = refreshVoteEvent;
window.onVoteAuthChange = onVoteAuthChange;
// Called by switchTab('vote'): a fresh count, and the unlock sequence if it's waiting to be seen
window.onVoteTabShown = () => {
    renderVoteState();
    if (Date.now() - lastFetchAt > 10000) refreshVoteEvent();
};
