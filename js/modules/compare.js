// js/modules/compare.js
import { state } from '../state.js';
import { esc, escUrl, formatPrice, priceCentsOf } from '../utils.js';

export function toggleCompare(id, btnElement) { 
    // Παίρνουμε το τρέχον PC που βλέπει ο χρήστης
    const pc = state.filtered[state.index]; 
    const alreadyInList = state.compareList.find(p => (p._id || p.id) === id);

    if (alreadyInList) {
        // Αν είναι ήδη μέσα, το αφαιρούμε
        state.compareList = state.compareList.filter(p => (p._id || p.id) !== id); 
        if (btnElement) {
            btnElement.classList.remove('selected');
            // Same keys renderCard() uses — this used to hardcode English and undo the Greek label
            btnElement.innerText = window.t ? window.t('compareBtn') : 'COMPARE';
        }
    } else { 
        if (state.compareList.length < 2) {
            // Το προσθέτουμε
            state.compareList.push(pc); 
            if (btnElement) {
                btnElement.classList.add('selected');
                btnElement.innerText = window.t ? window.t('addedToVs') : 'ADDED TO VS';
            }
        } else { 
            alert(window.t ? window.t('alertMaxCompare') : "MAX 2 ITEMS ALLOWED IN VS MODE");
        } 
    } 
    
    // Ανανεώνουμε το πλωτό κουμπί (float button) του Compare
    const b = document.getElementById('compare-float'); 
    if(b) {
        if(state.compareList.length === 2) b.classList.add('active'); 
        else b.classList.remove('active'); 
    }
}

export function openCompareModal() {
    if(state.compareList.length !== 2) return;

    // Actually opening the side-by-side is the moment VS mode was used — adding to the list isn't
    if (window.checkAchievement) window.checkAchievement('comparator');


    const [a, b] = state.compareList;
    const t = window.t || (k => k);
    const grid = document.getElementById('compare-grid');
    if (grid) grid.innerHTML = renderComparison(a, b, t);
    if(window.openModal) window.openModal('compare-modal');
}

// Head-to-head layout: each spec label appears ONCE, in the middle, with the two values either side.
// The old version repeated "CPU / GPU / RAM…" inside each column, which on a phone left each value
// a sliver of width and broke "Ryzen 5 5600" across three lines. It also printed the description
// box, which showed placeholders like "X" or the "System Details" fallback — dropped here.
const SPEC_ORDER = ['cpu', 'gpu', 'ram', 'ssd', 'mobo', 'psu', 'case'];
const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

function renderComparison(a, b, t) {
    const pa = priceCentsOf(a), pb = priceCentsOf(b);

    const head = (p, price, other) => `
        <div class="vs-head">
            <div class="vs-img-wrap"><img src="${escUrl((p.images || [])[0])}" class="vs-img" alt=""></div>
            <div class="vs-name">${esc(p.name)}</div>
            <div class="vs-price">${formatPrice(price)}</div>
            ${price > other ? `<div class="vs-price-diff">+${formatPrice(price - other)}</div>` : '<div class="vs-price-diff"></div>'}
        </div>`;

    // Identical values are dimmed so the eye lands on what actually differs between the two builds.
    // No "winner" colouring for specs — which CPU is "better" isn't something a string compare knows.
    const specRows = SPEC_ORDER
        .filter(k => (a.specs && a.specs[k]) || (b.specs && b.specs[k]))
        .map(k => {
            const va = a.specs?.[k] || '—', vb = b.specs?.[k] || '—';
            const same = norm(va) === norm(vb);
            return `<div class="vs-row${same ? ' same' : ''}">
                <div class="vs-val left">${esc(va)}</div>
                <div class="vs-label">${esc(k.toUpperCase())}</div>
                <div class="vs-val right">${esc(vb)}</div>
            </div>`;
        }).join('');

    // FPS and multitasking are numbers where higher really is better, so there the winner is marked.
    const fpsMap = (p) => new Map((p.fps || []).map(f => [f.game, Number(f.score) || 0]));
    const fa = fpsMap(a), fb = fpsMap(b);
    const games = [...new Set([...fa.keys(), ...fb.keys()])];
    const numRow = (label, x, y) => {
        const winA = x !== null && y !== null && x > y;
        const winB = x !== null && y !== null && y > x;
        return `<div class="vs-row">
            <div class="vs-val left${winA ? ' win' : ''}">${x === null ? '—' : x}${winA ? ' ▲' : ''}</div>
            <div class="vs-label">${esc(label)}</div>
            <div class="vs-val right${winB ? ' win' : ''}">${y === null ? '—' : y}${winB ? ' ▲' : ''}</div>
        </div>`;
    };
    let perfRows = games.map(g => numRow(g, fa.has(g) ? fa.get(g) : null, fb.has(g) ? fb.get(g) : null)).join('');
    if (a.multitasking || b.multitasking) {
        perfRows += numRow('MULTI', a.multitasking ? Number(a.multitasking) : null, b.multitasking ? Number(b.multitasking) : null);
    }

    const idA = esc(a._id || a.id), idB = esc(b._id || b.id);
    return `
        <div class="vs-heads">
            ${head(a, pa, pb)}
            <div class="vs-badge">VS</div>
            ${head(b, pb, pa)}
        </div>
        <div class="vs-section-title">${esc(t('compareSpecs'))}</div>
        ${specRows}
        ${perfRows ? `<div class="vs-section-title">${esc(t('compareFps'))}</div>${perfRows}` : ''}
        <div class="vs-actions">
            <button class="vs-view-btn" data-vs-id="${idA}">${esc(t('compareView'))}</button>
            <button class="vs-view-btn" data-vs-id="${idB}">${esc(t('compareView'))}</button>
        </div>`;
}

// VIEW opens that PC's full inspect card straight from the comparison — delegated once, since the
// grid's contents are rebuilt on every open.
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('compare-grid');
    if (!grid) return;
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.vs-view-btn');
        if (!btn) return;
        const pc = state.compareList.find(p => String(p._id || p.id) === btn.dataset.vsId);
        if (!pc) return;
        if (window.playClick) window.playClick();
        if (window.closeModal) window.closeModal('compare-modal');
        if (window.openGallery) window.openGallery(pc);
    });
});

// Εξαγωγή στο global scope για το index.html
window.toggleCompare = toggleCompare;
window.openCompareModal = openCompareModal;