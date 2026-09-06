// js/modules/wheel.js
import { state } from '../state.js';

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
const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

let spinning = false;
let currentRotation = 0;

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

// --- Attempts / cooldown status ---
function getWheelStatus() {
    const now = Date.now();
    const stored = localStorage.getItem('codex_wheel_attempts_left');
    let attemptsLeft = stored === null ? MAX_ATTEMPTS : parseInt(stored);
    let nextAvailableAt = parseInt(localStorage.getItem('codex_wheel_next_available_at')) || 0;

    if (attemptsLeft <= 0 && now >= nextAvailableAt) {
        attemptsLeft = MAX_ATTEMPTS;
        nextAvailableAt = 0;
        localStorage.setItem('codex_wheel_attempts_left', attemptsLeft);
        localStorage.setItem('codex_wheel_next_available_at', nextAvailableAt);
    }
    return { attemptsLeft, nextAvailableAt, available: attemptsLeft > 0 };
}

function formatCountdown(ms) {
    if (ms <= 0) return '0h 0m';
    const totalMinutes = Math.ceil(ms / 60000);
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function updateAttemptsDisplay(n) {
    const el = document.getElementById('wheel-attempts');
    if (el) el.textContent = `SPINS LEFT: ${Math.max(n, 0)}/${MAX_ATTEMPTS}`;
}

export function openWheelFromSettings() {
    if (!state.isLoggedIn) {
        if (window.showToast) window.showToast('ACCESS DENIED. LOGIN REQUIRED.', 'error');
        if (window.openModal) window.openModal('login-modal');
        return;
    }

    const status = getWheelStatus();
    if (!status.available) {
        if (window.showToast) window.showToast(`NO SPINS LEFT. TRY AGAIN IN ${formatCountdown(status.nextAvailableAt - Date.now())}.`, 'error');
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

    updateAttemptsDisplay(status.attemptsLeft);
    const btn = document.getElementById('wheel-initiate-btn');
    if (btn) btn.disabled = false;

    requestAnimationFrame(buildWheel);
}

function resolveSpin(slice, attemptsLeftAfterSpin) {
    spinning = false;
    const resultEl = document.getElementById('wheel-result');
    const btn = document.getElementById('wheel-initiate-btn');
    const pointer = document.querySelector('.wheel-pointer');
    if (pointer) {
        pointer.classList.add('locked');
        setTimeout(() => pointer.classList.remove('locked'), 700);
    }

    const isWin = slice.type !== 'blank';

    if (isWin) {
        // Winning ends this cycle immediately, even with attempts left.
        localStorage.setItem('codex_wheel_attempts_left', 0);
        localStorage.setItem('codex_wheel_next_available_at', Date.now() + COOLDOWN_MS);
    } else if (attemptsLeftAfterSpin <= 0) {
        localStorage.setItem('codex_wheel_next_available_at', Date.now() + COOLDOWN_MS);
    }

    updateAttemptsDisplay(isWin ? 0 : attemptsLeftAfterSpin);

    if (slice.type === 'color') {
        const alreadyUnlocked = state.unlockedColors.includes(slice.id);
        if (!alreadyUnlocked) {
            state.unlockedColors.push(slice.id);
            localStorage.setItem('codex_unlocked_colors', JSON.stringify(state.unlockedColors));
        }
        refreshColorLocks();
        if (window.setTheme) window.setTheme(slice.hex, slice.id);
        if (resultEl) resultEl.textContent = alreadyUnlocked
            ? `> SKIN ALREADY UNLOCKED: ${slice.label}. RE-APPLIED TO SYSTEM THEME.`
            : `> SKIN UNLOCKED: ${slice.label}. AUTO-APPLIED TO SYSTEM THEME.`;
    } else if (slice.type === 'coupon') {
        // No fixed code here on purpose: the spin is decided client-side, so any literal string
        // in this file would be readable in devtools and claimable without ever spinning.
        // Quoting the agent name instead means you verify the claim on your side.
        const agent = (localStorage.getItem('codex_username') || '').toUpperCase();
        if (resultEl) resultEl.textContent = `> REWARD UNLOCKED: 5% DISCOUNT. MESSAGE US ON WHATSAPP AS AGENT ${agent} TO CLAIM IT.`;
    } else {
        if (resultEl) resultEl.textContent = attemptsLeftAfterSpin > 0
            ? '> HACK FAILED. NO REWARD EXTRACTED. TRY AGAIN.'
            : '> HACK FAILED. NO REWARD EXTRACTED. NO ATTEMPTS REMAINING.';
    }

    if (btn) btn.disabled = isWin || attemptsLeftAfterSpin <= 0;
}

export function spinWheel() {
    if (spinning) return;
    const status = getWheelStatus();
    if (!status.available) return;
    const wheel = document.getElementById('wheel');
    if (!wheel) return;

    spinning = true;
    const btn = document.getElementById('wheel-initiate-btn');
    if (btn) btn.disabled = true;
    const resultEl = document.getElementById('wheel-result');
    if (resultEl) resultEl.textContent = '';

    const chosenIndex = Math.floor(Math.random() * SLICES.length);
    const targetCenterAngle = chosenIndex * SLICE_DEG + SLICE_DEG / 2;

    const targetMod = (360 - targetCenterAngle + 360) % 360;
    const currentMod = currentRotation % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;
    currentRotation += 6 * 360 + delta;

    wheel.style.transform = `rotate(${currentRotation}deg)`;

    const attemptsLeftAfterSpin = status.attemptsLeft - 1;
    localStorage.setItem('codex_wheel_attempts_left', attemptsLeftAfterSpin);

    setTimeout(() => resolveSpin(SLICES[chosenIndex], attemptsLeftAfterSpin), 4600);
}

window.spinWheel = spinWheel;
window.openWheelFromSettings = openWheelFromSettings;
window.refreshColorLocks = refreshColorLocks;
