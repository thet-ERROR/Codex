// js/modules/wheel.js
//
// The daily wheel. The spin is decided by the server (POST /api/wheel/spin): it counts the attempts,
// picks the slice and, for a coupon, issues a unique code saved on the account. This file only
// animates the wheel to the slice it was told and shows the result — a spin decided in the browser
// could be faked from devtools, and a coupon is worth real money.
import { state } from '../state.js';
import { CONFIG } from '../config.js';
import { t, getLang } from '../i18n.js';
import { formatShortDateTime } from '../utils.js';

// Same order as WHEEL_SLICES in the backend — the server answers with an index into this list
const SLICES = [
    { type: 'blank', label: 'BLANK' },
    { type: 'color', id: 'cyberGold', hex: '#ffd700', label: 'CYBER GOLD' },
    { type: 'coupon', label: '5% COUPON' },
    { type: 'color', id: 'toxicOrange', hex: '#ff5e00', label: 'TOXIC ORANGE' },
    { type: 'blank', label: 'BLANK' },
    { type: 'color', id: 'neonPink', hex: '#ff2bd6', label: 'NEON PINK' },
    { type: 'coupon', label: '5% COUPON' },
    { type: 'color', id: 'matrixGreen', hex: '#00ff41', label: 'MATRIX GREEN' }
];
const SLICE_DEG = 360 / SLICES.length;
const SPIN_MS = 4600;

let spinning = false;
let currentRotation = 0;
let status = { attemptsLeft: 3, maxAttempts: 3, nextAvailableAt: null, bonusSpins: 0 };
// The day's attempts first, then the banked bonus spins a rank gave (the server spends them in that order)
const canSpin = () => status.attemptsLeft > 0 || status.bonusSpins > 0;

function sliceFill(i) {
    return i % 2 === 0 ? '#111' : '#1a1a1a';
}

function buildWheel() {
    const wheel = document.getElementById('wheel');
    if (!wheel) return;

    const gradientStops = SLICES.map((s, i) => `${sliceFill(i)} ${i * SLICE_DEG}deg ${(i + 1) * SLICE_DEG}deg`).join(', ');
    wheel.style.background = `conic-gradient(${gradientStops})`;

    wheel.querySelectorAll('.wheel-slice-label').forEach(el => el.remove());
    const radius = wheel.offsetWidth * 0.33;
    SLICES.forEach((s, i) => {
        const centerAngle = i * SLICE_DEG + SLICE_DEG / 2;
        const label = document.createElement('div');
        label.className = 'wheel-slice-label';
        label.textContent = s.label;
        label.style.transform = `rotate(${centerAngle}deg) translateY(-${radius}px)`;
        wheel.appendChild(label);
    });
}

export function refreshColorLocks() {
    document.querySelectorAll('.color-btn.locked').forEach(btn => {
        const id = btn.dataset.id;
        if (id && state.unlockedColors.includes(id)) btn.classList.remove('locked');
    });
}

// Colours and coupons the server holds for the account — merged with colours unlocked on this
// browser before the wheel moved server-side, so nobody loses a skin
export function applyWheelData(data) {
    if (!data) return;
    if (Array.isArray(data.unlockedColors)) {
        const merged = Array.from(new Set([...(state.unlockedColors || []), ...data.unlockedColors]));
        state.unlockedColors = merged;
        try { localStorage.setItem('codex_unlocked_colors', JSON.stringify(merged)); } catch (e) {}
        refreshColorLocks();
    }
    if (Array.isArray(data.coupons)) {
        state.coupons = data.coupons;
        if (window.updateCartUI) window.updateCartUI();
    }
    if (typeof data.attemptsLeft === 'number') {
        status = { ...status, attemptsLeft: data.attemptsLeft, maxAttempts: data.maxAttempts || 3, nextAvailableAt: data.nextAvailableAt || null };
    }
    // Also arrives on its own with every profile (achievements.js applyProfile)
    if (typeof data.bonusSpins === 'number') { status.bonusSpins = data.bonusSpins; updateAttemptsDisplay(); }
}

function formatCountdown(ms) {
    const total = Math.max(0, Math.ceil(ms / 60000));
    const [h, m] = getLang() === 'el' ? ['ώ', 'λ'] : ['h', 'm'];
    return `${Math.floor(total / 60)}${h} ${total % 60}${m}`;
}

function updateAttemptsDisplay() {
    const el = document.getElementById('wheel-attempts');
    if (el) el.textContent = t('wheelSpinsLeft', { n: Math.max(status.attemptsLeft, 0), max: status.maxAttempts })
        + (status.bonusSpins > 0 ? t('wheelBonusSpins', { n: status.bonusSpins }) : '');
}

function authHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` };
}

function notify(msg, type = 'error') { if (window.showToast) window.showToast(msg, type); }

export async function openWheelFromSettings() {
    if (!state.isLoggedIn) {
        notify(t('wheelLoginRequired'));
        if (window.openModal) window.openModal('login-modal');
        return;
    }
    if (!state.emailVerified) { notify(t('toastVerifyReminder')); return; }

    try {
        const res = await fetch(`${CONFIG.API_URL}/wheel`, { headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { if (window.logout) window.logout(); if (window.openModal) window.openModal('login-modal'); return; }
        if (!res.ok) { notify(data.code === 'EMAIL_NOT_VERIFIED' ? t('toastVerifyReminder') : t('wheelError')); return; }
        applyWheelData(data);
    } catch (e) { notify(t('wheelError')); return; }

    if (!canSpin()) {
        const wait = status.nextAvailableAt ? Date.parse(status.nextAvailableAt) - Date.now() : 0;
        notify(t('wheelNoSpins', { time: formatCountdown(wait) }));
        return;
    }

    if (window.openModal) window.openModal('wheel-modal');
    const resultEl = document.getElementById('wheel-result');
    if (resultEl) resultEl.textContent = '';

    const wheel = document.getElementById('wheel');
    if (wheel) {
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
        void wheel.offsetWidth;
        wheel.style.transition = '';
    }
    currentRotation = 0;
    spinning = false;

    updateAttemptsDisplay();
    const btn = document.getElementById('wheel-initiate-btn');
    if (btn) btn.disabled = false;

    requestAnimationFrame(buildWheel);
}

function resolveSpin(data) {
    spinning = false;
    const slice = SLICES[data.index] || SLICES[0];
    const reward = data.reward || { type: slice.type };
    const resultEl = document.getElementById('wheel-result');
    const btn = document.getElementById('wheel-initiate-btn');
    const pointer = document.querySelector('.wheel-pointer');
    if (pointer) {
        pointer.classList.add('locked');
        setTimeout(() => pointer.classList.remove('locked'), 700);
    }

    applyWheelData(data);
    updateAttemptsDisplay();

    let text;
    if (reward.type === 'color') {
        if (window.setTheme) window.setTheme(slice.hex, slice.id);
        text = t(reward.alreadyUnlocked ? 'wheelSkinAgain' : 'wheelSkinNew', { name: slice.label });
    } else if (reward.type === 'coupon' && reward.coupon) {
        text = t('wheelCouponWon', { p: reward.coupon.percent, code: reward.coupon.code, until: formatShortDateTime(reward.coupon.expiresAt) });
        notify(t('wheelCouponToast', { p: reward.coupon.percent }), 'achievement');
    } else {
        text = canSpin() ? t('wheelBlank') : t('wheelBlankLast');
    }
    if (resultEl) resultEl.textContent = text;
    if (btn) btn.disabled = !canSpin();
}

export async function spinWheel() {
    if (spinning || !canSpin()) return;
    const wheel = document.getElementById('wheel');
    if (!wheel) return;

    spinning = true;
    const btn = document.getElementById('wheel-initiate-btn');
    if (btn) btn.disabled = true;
    const resultEl = document.getElementById('wheel-result');
    if (resultEl) resultEl.textContent = '';

    // Earned for spinning, not for winning (a client-reported badge, see achievements.js)
    if (window.checkAchievement) window.checkAchievement('hacker');

    let data;
    try {
        const res = await fetch(`${CONFIG.API_URL}/wheel/spin`, { method: 'POST', headers: authHeaders() });
        data = await res.json().catch(() => ({}));
        if (!res.ok) {
            spinning = false;
            if (data.code === 'NO_SPINS') {
                status = { ...status, attemptsLeft: 0, bonusSpins: 0, nextAvailableAt: data.nextAvailableAt };
                updateAttemptsDisplay();
                notify(t('wheelNoSpins', { time: formatCountdown(Date.parse(data.nextAvailableAt) - Date.now()) }));
            } else if (res.status === 401) {
                if (window.logout) window.logout();
            } else {
                notify(data.code === 'EMAIL_NOT_VERIFIED' ? t('toastVerifyReminder') : t('wheelError'));
                if (btn) btn.disabled = false;
            }
            return;
        }
    } catch (e) {
        spinning = false;
        if (btn) btn.disabled = false;
        notify(t('wheelError'));
        return;
    }

    // Six full turns, landing on the slice the server picked
    const targetCenterAngle = data.index * SLICE_DEG + SLICE_DEG / 2;
    const targetMod = (360 - targetCenterAngle + 360) % 360;
    const currentMod = currentRotation % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;
    currentRotation += 6 * 360 + delta;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => resolveSpin(data), SPIN_MS);
}

document.addEventListener('codex:lang', updateAttemptsDisplay);

window.spinWheel = spinWheel;
window.openWheelFromSettings = openWheelFromSettings;
window.refreshColorLocks = refreshColorLocks;
window.applyWheelData = applyWheelData;
