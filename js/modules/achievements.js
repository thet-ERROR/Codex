// js/modules/achievements.js
import { state } from '../state.js';
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { esc, escUrl, formatPrice, priceCentsOf, formatShortDateTime } from '../utils.js';
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
    if (Array.isArray(profile.ranks)) state.ranks = profile.ranks;
    if (typeof profile.bonusSpins === 'number' && window.applyWheelData) window.applyWheelData({ bonusSpins: profile.bonusSpins });
    localStorage.setItem('codex_achievements', JSON.stringify(state.achievements));
    // Rewards the server paid out on this very request — shown once, and a colour is usable at once
    if (Array.isArray(profile.rankRewards) && profile.rankRewards.length) announceRankRewards(profile.rankRewards);
    refreshProgressionUI();
}

// One notice for whatever the rank-up brought: the new (highest) rank, the spins, the colours. An
// account paid for several ranks at once (it was past them before rewards existed) gets one, not five.
function announceRankRewards(granted) {
    const colors = granted.map(g => g.color).filter(Boolean);
    const spins = granted.reduce((n, g) => n + (g.spins || 0), 0);
    if (colors.length && window.applyWheelData) window.applyWheelData({ unlockedColors: colors });
    const parts = [];
    if (spins) parts.push(t('rankUpSpins', { n: spins }));
    colors.forEach(id => parts.push(t('rankUpColor', { name: (CONFIG.RANK_COLORS[id] || {}).name || id })));
    const top = granted[granted.length - 1].rank;
    if (window.showToast) window.showToast(t('rankUpToast', { rank: rankName(top) }) + (parts.length ? ' — ' + parts.join(' · ') : ''), 'achievement');
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
                    <div class="ach-status" title="${unlocked ? esc(t('achUnlocked')) : esc(t('achLocked'))}"><i class="ph-bold ${unlocked ? 'ph-check' : 'ph-lock-simple'}" aria-hidden="true"></i><span class="ach-status-text">${unlocked ? esc(t('achUnlocked')) : esc(t('achLocked'))}</span></div>
                </div>`;
    }).join('');
}

// The rank ladder in the profile: every rank with its XP threshold and what it gives, the ones you
// have reached marked, the current one lit, the next one saying how much XP is left. All numbers come
// from the server's ladder (state.ranks) — nothing here decides a threshold or a reward.
function renderRankLadder() {
    const box = document.getElementById('dossier-ladder');
    const list = document.getElementById('dossier-ladder-list');
    if (!box || !list) return;
    const ranks = state.ranks || [];
    box.classList.toggle('has-ranks', ranks.length > 0);
    if (!ranks.length) { list.innerHTML = ''; return; }

    list.innerHTML = ranks.map(r => {
        const reached = state.xp >= r.minXp;
        const current = r.id === state.rank;
        const next = r.id === state.nextRank;
        const cls = current ? 'current' : reached ? 'done' : next ? 'next' : 'locked';
        const rw = r.rewards || {};
        const chips = [];
        if (rw.spins) chips.push(`<span class="rk-chip"><i class="ph-fill ph-arrows-clockwise" aria-hidden="true"></i>${esc(t('rankStepSpins', { n: rw.spins }))}</span>`);
        if (rw.color) {
            const c = CONFIG.RANK_COLORS[rw.color];
            chips.push(`<span class="rk-chip"><i class="rk-dot" style="background:${esc(c ? c.hex : '#888')}" aria-hidden="true"></i>${esc(c ? c.name : rw.color)}</span>`);
        }
        const sub = next ? t('rankStepLeft', { n: Math.max(0, r.minXp - state.xp) }) : `${r.minXp} XP`;
        const mark = current ? esc(t('rankStepNow')) : reached ? '<i class="ph-bold ph-check" aria-hidden="true"></i>' : '<i class="ph-bold ph-lock-simple" aria-hidden="true"></i>';
        return `<div class="rank-step ${cls}"${current ? ' aria-current="step"' : ''}>
            <div class="rank-step-ico"><i class="ph-duotone ${esc(CONFIG.RANK_ICONS[r.id] || CONFIG.RANK_ICONS.recruit)}" aria-hidden="true"></i></div>
            <div class="rank-step-body">
                <strong>${esc(rankName(r.id))}</strong>
                <small>${esc(sub)}</small>
                ${chips.length ? `<span class="rk-chips">${chips.join('')}</span>` : ''}
            </div>
            <div class="rank-step-mark">${mark}</div>
        </div>`;
    }).join('');
}

// Rank line, XP readout and bar. Called by applyProfile and by every renderer below, so the two
// places these appear (the standalone modal and the dossier) can never disagree.
export function refreshProgressionUI() {
    const rankEl = document.getElementById('dossier-rank');
    if (rankEl) rankEl.innerText = rankName(state.rank);
    // The emblem is the rank's badge (dossier-hud.css lights the top rank differently)
    const emblem = document.querySelector('#agent-dashboard-modal .dossier-emblem');
    if (emblem) {
        emblem.dataset.rank = state.rank;
        const icon = emblem.querySelector('i');
        if (icon) icon.className = 'ph-duotone ' + (CONFIG.RANK_ICONS[state.rank] || CONFIG.RANK_ICONS.recruit);
    }

    const xpEl = document.getElementById('dossier-xp');
    if (xpEl) {
        xpEl.innerText = state.nextRankXp
            ? t('xpToNextRank', { xp: state.xp, next: state.nextRankXp, rank: rankName(state.nextRank) })
            : t('xpMaxRank', { xp: state.xp });
    }

    const fillEl = document.getElementById('dossier-rank-fill');
    if (fillEl) fillEl.style.width = Math.max(0, Math.min(state.rankProgress, 100)) + '%';

    renderRankLadder();

    const unlockedCount = state.achievements.length;
    const total = CONFIG.ACHIEVEMENTS_LIST.length;
    const statsEl = document.getElementById('dossier-stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="dossier-stat-chip"><i class="ph-fill ph-star" aria-hidden="true"></i> ${state.xp} XP</div>
            <div class="dossier-stat-chip"><i class="ph-bold ph-crosshair" aria-hidden="true"></i> ${state.wishlist.length} ${esc(t('chipWishlist'))}</div>
            <div class="dossier-stat-chip"><i class="ph-bold ph-medal" aria-hidden="true"></i> ${unlockedCount}/${total} ${esc(t('chipAchievements'))}</div>
            <div class="dossier-stat-chip"><i class="ph-bold ph-shopping-cart" aria-hidden="true"></i> ${state.cart.length} ${esc(t('chipInCart'))}</div>
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
        if (window.showToast) window.showToast(window.t('toastLoginRequired'), "normal");
        if (window.openModal) window.openModal('login-modal');
        return;
    }
    refreshProgressionUI();
    if (window.openModal) window.openModal('achievements-modal');
}

export function openAgentDashboard() {
    if (!state.isLoggedIn) {
        if (window.showToast) window.showToast(window.t('toastLoginRequired'), "error");
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
                        <div class="dw-price">${formatPrice(priceCentsOf(pc))}</div>
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

    renderDossierCoupons();
    if (window.openModal) window.openModal('agent-dashboard-modal');
}

// Coupons won on the daily wheel (issued and stored by the server — see POST /api/wheel/spin). Each
// shows its discount, the code to quote, and until when it's valid; used ones stay listed, marked.
export function renderDossierCoupons() {
    const box = document.getElementById('dossier-coupons');
    if (!box) return;
    const coupons = state.coupons || [];
    if (!coupons.length) {
        box.innerHTML = `<div class="dossier-empty">${esc(t('dossierNoCoupons'))}</div>
            <button type="button" class="coupon-spin-btn" data-coupon-act="spin"><i class="ph-bold ph-gift"></i> ${esc(t('colorsSpinBtn'))}</button>`;
        return;
    }
    box.innerHTML = coupons.map(c => {
        const used = !!c.usedAt;
        return `<div class="coupon-row${used ? ' used' : ''}">
            <div class="coupon-pct">-${esc(c.percent)}%</div>
            <div class="coupon-info">
                <div class="coupon-code">${esc(c.code)}</div>
                <div class="coupon-meta">${esc(used ? t('couponUsed') : t('couponValidUntil', { until: formatShortDateTime(c.expiresAt) }))}</div>
            </div>
            ${used ? '' : `<button type="button" class="coupon-copy" data-coupon-act="copy" data-code="${esc(c.code)}" aria-label="${esc(t('couponCopy'))}" title="${esc(t('couponCopy'))}"><i class="ph-bold ph-copy"></i></button>`}
        </div>`;
    }).join('');
}

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#dossier-coupons [data-coupon-act]');
    if (!btn) return;
    if (window.playClick) window.playClick();
    if (btn.dataset.couponAct === 'spin') {
        if (window.closeModal) window.closeModal('agent-dashboard-modal');
        if (window.openWheelFromSettings) window.openWheelFromSettings();
        return;
    }
    try { await navigator.clipboard.writeText(btn.dataset.code); } catch (err) { /* shown anyway */ }
    if (window.showToast) window.showToast(t('couponCopied', { code: btn.dataset.code }), 'normal');
});

// Εξαγωγή στο global scope για να λειτουργούν τα onclick στο HTML
window.rankName = rankName;
window.checkAchievement = checkAchievement;
window.openAchievements = openAchievements;
window.openAgentDashboard = openAgentDashboard;
window.applyProfile = applyProfile;
window.refreshProgressionUI = refreshProgressionUI;
