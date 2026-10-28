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
            const msg = window.t ? window.t('alertMaxCompare') : "MAX 2 ITEMS ALLOWED IN VS MODE";
            if (window.showToast) window.showToast(msg, 'error'); else alert(msg);
        } 
    } 
    
    updateCompareFloat();
}

// The floating VS button: hidden with nothing picked, "half" with one (it invites a second pick),
// lit and ready with two
function updateCompareFloat() {
    const b = document.getElementById('compare-float');
    if (!b) return;
    const n = state.compareList.length;
    b.classList.toggle('active', n === 2);
    b.classList.toggle('half', n === 1);
}

export function openCompareModal() {
    if (state.compareList.length === 1) {
        // Half-filled: tapping it says what's missing instead of doing nothing
        if (window.showToast) window.showToast(window.t ? window.t('vsAddOne') : 'Pick one more system to compare', 'normal');
        return;
    }
    if(state.compareList.length !== 2) return;

    // Actually opening the side-by-side is the moment VS mode was used — adding to the list isn't
    if (window.checkAchievement) window.checkAchievement('comparator');


    const [a, b] = state.compareList;
    const t = window.t || (k => k);
    const grid = document.getElementById('compare-grid');
    const foot = document.getElementById('compare-foot');
    const view = renderComparison(a, b, t);
    if (grid) { grid.innerHTML = view.body; grid.scrollTop = 0; }
    if (foot) foot.innerHTML = view.foot;
    if(window.openModal) window.openModal('compare-modal');
}

// Specs / FPS tabs inside the duel
function setVsTab(id) {
    const box = document.querySelector('#compare-modal .compare-box');
    if (!box) return;
    box.querySelectorAll('.vs-tab').forEach(b => {
        const on = b.dataset.vsTab === id;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on);
    });
    box.querySelectorAll('.vs-panel').forEach(p => p.classList.toggle('active', p.dataset.vsPanel === id));
}

// Head-to-head layout: each spec label appears ONCE, in the middle, with the two values either side.
// The old version repeated "CPU / GPU / RAM…" inside each column, which on a phone left each value
// a sliver of width and broke "Ryzen 5 5600" across three lines. It also printed the description
// box, which showed placeholders like "X" or the "System Details" fallback — dropped here.
const SPEC_ORDER = ['cpu', 'gpu', 'ram', 'ssd', 'mobo', 'psu', 'case'];
const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// The duel: PC A on the left in magenta, PC B on the right in cyan, a pulsing VS core between them,
// then two tabs — Specs and FPS. Only real data is judged: specs are strings (which CPU is faster
// isn't something this page can know), so there the DIFFERENCES are lit and identical parts dimmed;
// FPS are numbers, so there each game has a winner, a bar per side and an honest average.
function renderComparison(a, b, t) {
    const pa = priceCentsOf(a), pb = priceCentsOf(b);

    const head = (p, price, other, side, no) => `
        <div class="vs-fighter ${side}">
            <span class="vs-tag">PROJECT ${no}</span>
            <div class="vs-img-wrap"><img src="${escUrl((p.images || [])[0])}" class="vs-img" alt="" decoding="async"></div>
            <div class="vs-name">${esc(p.name)}</div>
            <div class="vs-price-line">
                <span class="vs-price">${formatPrice(price)}</span>
                ${price > other ? `<span class="vs-price-diff">+${formatPrice(price - other)}</span>` : ''}
            </div>
        </div>`;

    const specRows = SPEC_ORDER
        .filter(k => (a.specs && a.specs[k]) || (b.specs && b.specs[k]))
        .map(k => {
            const va = a.specs?.[k] || '—', vb = b.specs?.[k] || '—';
            const same = norm(va) === norm(vb);
            return `<div class="vs-row${same ? ' same' : ' diff'}">
                <div class="vs-val left">${esc(va)}</div>
                <div class="vs-label">${esc(k.toUpperCase())}</div>
                <div class="vs-val right">${esc(vb)}</div>
            </div>`;
        }).join('');

    // FPS: one row per game either PC has a number for
    const fpsMap = (p) => new Map((p.fps || []).map(f => [String(f.game || ''), Number(f.score) || 0]));
    const fa = fpsMap(a), fb = fpsMap(b);
    const games = [...new Set([...fa.keys(), ...fb.keys()])].filter(Boolean);
    const fpsRows = games.map(g => {
        const x = fa.has(g) ? fa.get(g) : null, y = fb.has(g) ? fb.get(g) : null;
        const top = Math.max(x || 0, y || 0) || 1;
        const winA = x !== null && y !== null && x > y, winB = x !== null && y !== null && y > x;
        const w = v => v === null ? 0 : Math.round((v / top) * 92);
        return `<div class="vs-game">
            <div class="vs-game-line">
                <span class="vs-fps left${winA ? ' win' : ''}">${x === null ? '—' : `${x} FPS`}${winA ? ' ★' : ''}</span>
                <span class="vs-game-name">${esc(g)}</span>
                <span class="vs-fps right${winB ? ' win' : ''}">${y === null ? '—' : `${y} FPS`}${winB ? ' ★' : ''}</span>
            </div>
            <div class="vs-bars"><span class="vs-bar left"><i style="width:${w(x)}%"></i></span><span class="vs-bar right"><i style="width:${w(y)}%"></i></span></div>
        </div>`;
    }).join('');

    // The verdict: average FPS over the games BOTH have, and what the difference costs
    const shared = games.filter(g => fa.has(g) && fb.has(g) && fa.get(g) > 0 && fb.get(g) > 0);
    let verdict = '';
    if (shared.length) {
        const avg = m => Math.round(shared.reduce((s, g) => s + m.get(g), 0) / shared.length);
        const avgA = avg(fa), avgB = avg(fb);
        const lead = avgA >= avgB ? { p: a, pr: pa, avg: avgA, o: avgB, opr: pb } : { p: b, pr: pb, avg: avgB, o: avgA, opr: pa };
        const pct = lead.o ? Math.round(((lead.avg - lead.o) / lead.o) * 100) : 0;
        const d = lead.pr - lead.opr;
        const cost = d > 0 ? t('compareCostMore', { d: formatPrice(d) }) : d < 0 ? t('compareCostLess', { d: formatPrice(-d) }) : t('compareCostSame');
        const line = pct < 2 ? t('compareTie') : t('compareLead', { name: lead.p.name, pct, cost });
        verdict = `<div class="vs-verdict">
            <div class="vs-score left"><b>${avgA}</b><small>${esc(t('compareAvgFps'))}</small></div>
            <div class="vs-verdict-text"><strong>${esc(t('compareVerdict'))}</strong><span>${esc(line)}</span></div>
            <div class="vs-score right"><small>${esc(t('compareAvgFps'))}</small><b>${avgB}</b></div>
        </div>`;
    }

    const hasFps = fpsRows.length > 0;
    const tabs = hasFps ? `<div class="vs-tabs" role="tablist">
            <button type="button" class="vs-tab active" role="tab" aria-selected="true" data-vs-tab="specs"><i class="ph-bold ph-cpu"></i>${esc(t('compareSpecs'))}</button>
            <button type="button" class="vs-tab" role="tab" aria-selected="false" data-vs-tab="fps"><i class="ph-bold ph-chart-bar"></i>${esc(t('compareFps'))}</button>
        </div>` : '';

    const idA = esc(a._id || a.id), idB = esc(b._id || b.id);
    return {
        body: `
        <div class="vs-heads">
            ${head(a, pa, pb, 'left', '01')}
            <div class="vs-core" aria-hidden="true"><span>VS</span></div>
            ${head(b, pb, pa, 'right', '02')}
        </div>
        ${tabs}
        <div class="vs-panel active" data-vs-panel="specs">
            <div class="vs-section-title"><span>// ${esc(t('compareSpecs'))}</span><small>${esc(t('compareDiffHint'))}</small></div>
            ${specRows}
        </div>
        ${hasFps ? `<div class="vs-panel" data-vs-panel="fps">
            <div class="vs-section-title fps"><span>// ${esc(t('compareFpsTitle'))}</span></div>
            ${fpsRows}${verdict}
        </div>` : ''}`,
        foot: `
            <button class="vs-view-btn left" data-vs-id="${idA}"><span>${esc(t('compareViewName', { name: a.name }))}</span><small>${formatPrice(pa)}</small></button>
            <button class="vs-view-btn right" data-vs-id="${idB}"><span>${esc(t('compareViewName', { name: b.name }))}</span><small>${formatPrice(pb)}</small></button>`
    };
}

// VIEW opens that PC's full inspect card straight from the comparison — delegated once, since the
// grid's contents are rebuilt on every open.
document.addEventListener('DOMContentLoaded', () => {
    const box = document.querySelector('#compare-modal .compare-box');
    if (!box) return;
    box.addEventListener('click', (e) => {
        const tab = e.target.closest('.vs-tab');
        if (tab) { if (window.playClick) window.playClick(); setVsTab(tab.dataset.vsTab); return; }
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