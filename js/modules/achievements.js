// js/modules/achievements.js
import { state } from '../state.js';
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { esc, escUrl } from '../utils.js';
import { t, getLang } from '../i18n.js';

// Ids the UI is allowed to report. Everything else in the catalogue is worked out by the API from
// its own data and refused if the client tries to claim it (server.js CLIENT_ACHIEVEMENT_IDS), so
// checking here just means a mistake shows up as a console warning instead of a silent 400.
const REPORTABLE = new Set(CONFIG.ACHIEVEMENTS_LIST.filter(a => a.source === 'client').map(a => a.id));
const BY_ID = new Map(CONFIG.ACHIEVEMENTS_LIST.map(a => [a.id, a]));

const localise = (pair) => (pair && (pair[getLang()] || pair.en)) || '';

export function rankName(id) {
    return localise(CONFIG.RANK_NAMES[id]) || String(id || '').toUpperCase();
}

// Single entry point for anything the API tells us about progression. Everything downstream —
// the rank line, the XP bar, the badge grid — reads state, so this is the only place that writes it.
export function applyProfile(profile) {
    if (!profile || !Array.isArray(profile.achievements)) return;

    // The server's list wins for everything it verifies, but a client-reported badge that hasn't
    // been accepted yet (the POST failed, the dyno was cold) is kept so it survives to the next
    // attempt. A plain assignment here erased those permanently, since this also writes the cache.
    // XP briefly under-counts an unsynced badge, which is the honest reading: the server hasn't
    // credited it yet.
    const fromServer = new Set(profile.achievements);
    const unsynced = state.achievements.filter(id => REPORTABLE.has(id) && !fromServer.has(id));
    state.achievements = unsynced.length ? [...profile.achievements, ...unsynced] : profile.achievements;

    state.xp = profile.xp || 0;
    state.rank = profile.rank || 'recruit';
    state.nextRank = profile.nextRank || null;
    state.nextRankXp = profile.nextRankXp ?? null;
    state.rankProgress = profile.progress ?? 0;
    localStorage.setItem('codex_achievements', JSON.stringify(state.achievements));
    refreshProgressionUI();
}

// Guests earn client-side badges too, and they sit in localStorage until there's an account to
// attach them to. Without this the first /api/me after signing in would simply overwrite them.
export async function pushLocalAchievements(serverList) {
    const known = new Set(serverList || []);
    const pending = state.achievements.filter(id => REPORTABLE.has(id) && !known.has(id));
    let latest = null;
    for (const id of pending) {
        try { latest = await api.saveAchievement(id); } catch (e) { break; } // unverified/offline: try again next boot
    }
    return latest;
}

export function checkAchievement(id) {
    if (!REPORTABLE.has(id)) {
        // A server-verified badge (or a typo). The API grants those itself; reporting one is
        // always a bug, and silently swallowing it is how the two catalogues drift apart.
        console.warn(`checkAchievement("${id}") ignored — not a client-reportable achievement.`);
        return;
    }
    if (state.achievements.includes(id)) return;

    // Unlock locally first so the toast is instant even on a cold Render dyno; the API's reply
    // then replaces the whole profile, which is what corrects XP and rank.
    state.achievements.push(id);
    localStorage.setItem('codex_achievements', JSON.stringify(state.achievements));
    const def = BY_ID.get(id);
    if (window.showToast) window.showToast(`${t('achUnlockedPrefix')}: ${localise(def && def.title) || id.toUpperCase()}`, 'achievement');
    refreshProgressionUI();

    if (state.isLoggedIn) api.saveAchievement(id).then(applyProfile).catch(() => {});
}

// --- RENDERING ---

// One markup for both grids — the dossier column and the full-size #achievements-modal — so the
// two can't drift. Which one it is, and therefore how tightly it's typeset, is decided by CSS on
// the container rather than by a flag passed in here.
function badgeCards() {
    return CONFIG.ACHIEVEMENTS_LIST.map(a => {
        const unlocked = state.achievements.includes(a.id);
        return `<div class="ach-card ${unlocked ? 'unlocked' : ''}">
                    <i class="ph-fill ${esc(a.icon)} ach-icon"></i>
                    <div class="ach-info">
                        <h4>${esc(localise(a.title))}</h4>
                        <p>${esc(localise(a.desc))}</p>
                    </div>
                    <div class="ach-status">${unlocked ? esc(t('achUnlocked')) : esc(t('achLocked'))}</div>
                </div>`;
    }).join('');
}

// Rank line, XP readout and bar. Called by applyProfile and by every renderer below, so the two
// places these appear (the standalone modal and the dossier) can never disagree.
export function refreshProgressionUI() {
    const rankEl = document.getElementById('dossier-rank');
    if (rankEl) rankEl.innerText = rankName(state.rank);

    const xpEl = document.getElementById('dossier-xp');
    if (xpEl) {
        xpEl.innerText = state.nextRankXp
            ? t('xpToNextRank', { xp: state.xp, next: state.nextRankXp, rank: rankName(state.nextRank) })
            : t('xpMaxRank', { xp: state.xp });
    }

    const fillEl = document.getElementById('dossier-rank-fill');
    if (fillEl) fillEl.style.width = Math.max(0, Math.min(state.rankProgress, 100)) + '%';

    const unlockedCount = state.achievements.length;
    const total = CONFIG.ACHIEVEMENTS_LIST.length;
    const statsEl = document.getElementById('dossier-stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="dossier-stat-chip">${state.xp} XP</div>
            <div class="dossier-stat-chip">${state.wishlist.length} ${esc(t('chipWishlist'))}</div>
            <div class="dossier-stat-chip">${unlockedCount}/${total} ${esc(t('chipAchievements'))}</div>
            <div class="dossier-stat-chip">${state.cart.length} ${esc(t('chipInCart'))}</div>
        `;
    }

    const cards = badgeCards();
    const list = document.getElementById('ach-list');
    if (list) list.innerHTML = cards;
    const dossierList = document.getElementById('dossier-achievements');
    if (dossierList) dossierList.innerHTML = cards;
}

export function openAchievements() {
    if (!state.isLoggedIn) {
        if (window.showToast) window.showToast("ACCESS DENIED. LOGIN REQUIRED.", "normal");
        if (window.openModal) window.openModal('login-modal');
        return;
    }
    refreshProgressionUI();
    if (window.openModal) window.openModal('achievements-modal');
}

export function openAgentDashboard() {
    if (!state.isLoggedIn) {
        if (window.showToast) window.showToast("ACCESS DENIED. LOGIN REQUIRED.", "error");
        if (window.openModal) window.openModal('login-modal');
        return;
    }

    const userName = localStorage.getItem('codex_username') || t('unknownUser');
    const dossierNameEl = document.getElementById('dossier-username');
    if (dossierNameEl) dossierNameEl.innerText = userName.toUpperCase();

    // Backend hard-gates dossier data behind a verified email — this banner is the difference
    // between that showing up as a blank/broken profile and a clear next step.
    const verifyBanner = document.getElementById('dossier-verify-banner');
    if (verifyBanner) verifyBanner.classList.toggle('hidden', !!state.emailVerified);
    // The RESEND EMAIL button inside that banner may already be mid-cooldown from an earlier
    // click (e.g. via the profile-menu shortcut) — reflect that the moment the banner is visible
    // again instead of showing an enabled button that will just 429.
    if (!state.emailVerified && window.refreshResendCooldownUI) window.refreshResendCooldownUI();

    // Rank, XP, chips and both badge grids in one call
    refreshProgressionUI();

    const wishlistContainer = document.getElementById('dossier-wishlist');
    if (wishlistContainer) {
        if (state.wishlist.length === 0) {
            wishlistContainer.innerHTML = `<div class="dossier-empty">${esc(t('dossierNoTargets'))}</div>`;
        } else {
            wishlistContainer.innerHTML = state.wishlist.map(pc => `
                <div class="dossier-wish-row">
                    <img src="${escUrl((pc.images || [])[0])}" alt="">
                    <div>
                        <div class="dw-name">${esc(pc.name)}</div>
                        <div class="dw-price">${esc(pc.price)}</div>
                    </div>
                    <button class="dw-remove" data-pc-id="${esc(pc._id || pc.id)}" title="${esc(t('dossierRemoveTarget'))}">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            `).join('');
            // Listener instead of an inline onclick: the ids are interpolated straight into the
            // markup, and this whole block is one of the places the CSP cleanup has to reach anyway.
            wishlistContainer.querySelectorAll('.dw-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (window.toggleWishlist) window.toggleWishlist(btn.dataset.pcId);
                });
            });
        }
    }

    if (window.openModal) window.openModal('agent-dashboard-modal');
}

// Εξαγωγή στο global scope για να λειτουργούν τα onclick στο HTML
window.checkAchievement = checkAchievement;
window.openAchievements = openAchievements;
window.openAgentDashboard = openAgentDashboard;
window.applyProfile = applyProfile;
window.refreshProgressionUI = refreshProgressionUI;
