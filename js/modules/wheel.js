// js/modules/wheel.js
import { state } from '../state.js';

const BLANK_COLOR = '#2a2a2a';
const COUPON_COLOR = '#00f0ff';

const SLICES = [
    { type: 'blank', color: BLANK_COLOR, label: 'BLANK' },
    { type: 'color', id: 'cyberGold', hex: '#ffd700', label: 'CYBER GOLD' },
    { type: 'coupon', color: COUPON_COLOR, label: '5% COUPON' },
    { type: 'color', id: 'toxicOrange', hex: '#ff5e00', label: 'TOXIC ORANGE' },
    { type: 'blank', color: BLANK_COLOR, label: 'BLANK' },
    { type: 'color', id: 'neonPink', hex: '#ff2bd6', label: 'NEON PINK' },
    { type: 'coupon', color: COUPON_COLOR, label: '5% COUPON' },
    { type: 'color', id: 'matrixGreen', hex: '#00ff41', label: 'MATRIX GREEN' }
];
const SLICE_DEG = 360 / SLICES.length;

let spinning = false;
let currentRotation = 0;

function sliceFill(slice) {
    return slice.type === 'color' ? slice.hex : slice.color;
}

function buildWheel() {
    const wheel = document.getElementById('wheel');
    if (!wheel) return;

    const gradientStops = SLICES.map((s, i) => `${sliceFill(s)} ${i * SLICE_DEG}deg ${(i + 1) * SLICE_DEG}deg`).join(', ');
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

export function openWheel() {
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

    const btn = document.getElementById('wheel-spin-btn');
    if (btn) btn.disabled = false;

    requestAnimationFrame(buildWheel);
}

function resolveSpin(slice) {
    spinning = false;
    const resultEl = document.getElementById('wheel-result');
    const btn = document.getElementById('wheel-spin-btn');
    if (btn) btn.disabled = false;

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
        if (resultEl) resultEl.textContent = '> ENCRYPTED REWARD FOUND. CONTACT ADMIN DIRECTLY WITH SECURE CODE: PHOENIX-5 TO CLAIM 5% DISCOUNT.';
    } else {
        if (resultEl) resultEl.textContent = '> HACK FAILED. NO REWARD EXTRACTED.';
    }
}

export function spinWheel() {
    if (spinning) return;
    const wheel = document.getElementById('wheel');
    if (!wheel) return;

    spinning = true;
    const btn = document.getElementById('wheel-spin-btn');
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

    setTimeout(() => resolveSpin(SLICES[chosenIndex]), 4600);
}

window.spinWheel = spinWheel;
window.openWheel = openWheel;
window.refreshColorLocks = refreshColorLocks;
