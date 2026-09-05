// js/modules/gallery.js
import { state } from '../state.js';
import { t } from '../i18n.js';

// --- EXTRAS: normalisation, pricing, image sets ---

// PCs created before the options field existed come back without it, so every read goes through
// here and lands on the same defaults the backend schema declares.
const DEFAULT_OPTIONS = {
    storage: { enabled: true, hdd: 50, ssd: 80 },
    proConfig: { enabled: false },
    paint: { enabled: false, colorName: '', colorNameEl: '', colorHex: '#1a1a1a', price: 40, leadTimeHours: 48, images: [] }
};

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function getOptions(pc) {
    const o = (pc && pc.options) || {};
    return {
        storage: { ...DEFAULT_OPTIONS.storage, ...(o.storage || {}) },
        proConfig: { ...DEFAULT_OPTIONS.proConfig, ...(o.proConfig || {}) },
        paint: { ...DEFAULT_OPTIONS.paint, ...(o.paint || {}) }
    };
}

function paintName(opts) {
    const isGreek = (localStorage.getItem('codex_lang') || 'en') === 'el';
    return (isGreek && opts.paint.colorNameEl) ? opts.paint.colorNameEl : (opts.paint.colorName || '');
}

// The image set currently on show: the painted photos while Custom Paint is on (and the admin
// actually supplied some), otherwise the stock photos.
export function getActiveImages(pc) {
    if (!pc) return [];
    const opts = getOptions(pc);
    if (state.build.paint && opts.paint.enabled && opts.paint.images.length) return opts.paint.images;
    return pc.images || [];
}

// Base price + every selected extra. Single source of truth for the live price, the breakdown
// line, the cart entry and the WhatsApp order message.
export function getBreakdown() {
    const pc = state.currentGalleryPC;
    if (!pc) return { base: 0, lines: [], total: 0 };
    const opts = getOptions(pc);
    const base = parseInt(String(pc.price).replace(/[^0-9]/g, '')) || 0;
    const lines = [];

    if (opts.storage.enabled && state.build.storage === 'hdd' && opts.storage.hdd > 0) {
        lines.push({ key: 'storage', label: t('storageOptHdd'), price: opts.storage.hdd });
    }
    if (opts.storage.enabled && state.build.storage === 'ssd' && opts.storage.ssd > 0) {
        lines.push({ key: 'storage', label: t('storageOptSsd'), price: opts.storage.ssd });
    }
    if (opts.proConfig.enabled && state.build.proConfig) {
        lines.push({ key: 'proConfig', label: t('proConfigTitle'), price: state.proConfigPrice });
    }
    if (opts.paint.enabled && state.build.paint) {
        const name = paintName(opts);
        lines.push({ key: 'paint', label: name ? `${t('paintTitle')} — ${name}` : t('paintTitle'), price: opts.paint.price });
    }

    return { base, lines, total: lines.reduce((sum, l) => sum + l.price, base) };
}

// Builds the extras block for the PC currently open. Called on openGallery and again on a
// language switch (prices/hours are baked into the strings, so data-i18n can't cover them).
export function renderExtras() {
    const host = document.getElementById('yg-extras-section');
    const pc = state.currentGalleryPC;
    if (!host || !pc) return;

    const opts = getOptions(pc);
    const showStorage = opts.storage.enabled && (opts.storage.hdd > 0 || opts.storage.ssd > 0);
    const showPro = !!opts.proConfig.enabled;
    const showPaint = !!opts.paint.enabled;

    // Nothing enabled for this build: hide the whole block rather than leave an empty frame
    host.classList.toggle('hidden', !showStorage && !showPro && !showPaint);

    let html = `<div class="yg-extras-label">${esc(t('extrasLabel'))}</div>`;

    if (showStorage) {
        const hddOpt = opts.storage.hdd > 0
            ? `<option value="hdd" ${state.build.storage === 'hdd' ? 'selected' : ''}>${esc(t('storageOptHdd'))} (+€${opts.storage.hdd})</option>` : '';
        const ssdOpt = opts.storage.ssd > 0
            ? `<option value="ssd" ${state.build.storage === 'ssd' ? 'selected' : ''}>${esc(t('storageOptSsd'))} (+€${opts.storage.ssd})</option>` : '';
        html += `
        <div class="yg-extra-block">
            <div class="yg-storage-label">${esc(t('storageLabel'))}</div>
            <select class="yg-storage-select" id="storage-select" onchange="onStorageChange(this.value)">
                <option value="" ${!state.build.storage ? 'selected' : ''}>${esc(t('storageOptStandard'))}</option>
                ${hddOpt}${ssdOpt}
            </select>
        </div>`;
    }

    if (showPro) {
        html += `
        <label class="yg-extra-toggle">
            <input type="checkbox" id="opt-proconfig" ${state.build.proConfig ? 'checked' : ''} onchange="onProConfigChange(this.checked)">
            <span class="yg-extra-body">
                <span class="yg-extra-title">
                    ${esc(t('proConfigTitle'))}
                    <span class="yg-extra-info" role="button" tabindex="0" title="${esc(t('proConfigInfoTitle'))}"
                          onclick="event.preventDefault(); event.stopPropagation(); playClick(); openProConfigInfo();">
                        <i class="ph-bold ph-info"></i>
                    </span>
                </span>
                <span class="yg-extra-sub">${esc(t('proConfigShort'))}</span>
            </span>
            <span class="yg-extra-price">+€${state.proConfigPrice}</span>
        </label>`;
    }

    if (showPaint) {
        const name = paintName(opts);
        html += `
        <label class="yg-extra-toggle">
            <input type="checkbox" id="opt-paint" ${state.build.paint ? 'checked' : ''} onchange="onPaintChange(this.checked)">
            <span class="yg-extra-body">
                <span class="yg-extra-title">
                    <span class="yg-paint-swatch" style="background:${esc(opts.paint.colorHex || '#1a1a1a')}"></span>
                    ${esc(t('paintTitle'))}${name ? ' — ' + esc(name) : ''}
                </span>
                <span class="yg-extra-sub">${esc(t('paintLeadTime', { hours: opts.paint.leadTimeHours }))}</span>
            </span>
            <span class="yg-extra-price">+€${opts.paint.price}</span>
        </label>`;
    }

    html += `<div class="yg-price-breakdown" id="yg-price-breakdown"></div>`;
    host.innerHTML = html;
    updatePrice();
}

export function onStorageChange(value) {
    state.build.storage = value || '';
    updatePrice();
}

export function onProConfigChange(checked) {
    state.build.proConfig = !!checked;
    updatePrice();
}

// Checking the box doesn't commit anything yet — it opens the consent modal (made-to-order,
// no 14-day withdrawal) and only acceptPaintConsent()/declinePaintConsent() decide the outcome.
// This also keeps the extras block a fixed height: nothing expands inline and shoves the photo
// out of view, which is what an inline notice used to do.
export function onPaintChange(checked) {
    if (checked) {
        const pc = state.currentGalleryPC;
        if (!pc) return;
        const opts = getOptions(pc);
        const leadEl = document.getElementById('paint-consent-lead');
        if (leadEl) leadEl.textContent = t('paintLeadTime', { hours: opts.paint.leadTimeHours });
        const legalEl = document.getElementById('paint-consent-legal');
        if (legalEl) legalEl.innerHTML = t('paintNoReturnText');
        if (window.openModal) window.openModal('paint-consent-modal');
    } else {
        state.build.paint = false;
        state.galleryIndex = 0;
        updateGalleryImage();
        updateGalleryArrows();
        updatePrice();
    }
}

export function acceptPaintConsent() {
    state.build.paint = true;
    state.galleryIndex = 0;
    updateGalleryImage();
    updateGalleryArrows();
    updatePrice();
    if (window.closeModal) window.closeModal('paint-consent-modal');
}

// Also wired to the modal's own X button, so dismissing it any way reverts the checkbox rather
// than leaving it visually checked while state.build.paint is still false.
export function declinePaintConsent() {
    state.build.paint = false;
    const cb = document.getElementById('opt-paint');
    if (cb) cb.checked = false;
    if (window.closeModal) window.closeModal('paint-consent-modal');
}

export function openProConfigInfo() {
    if (window.openModal) window.openModal('proconfig-info-modal');
}

export function openGallery() {
    state.currentGalleryPC = state.filtered[state.index]; 
    if(!state.currentGalleryPC) return;
    // Reset FPS panel state σε κάθε άνοιγμα κάρτας
    const fpsPanelReset = document.getElementById('fps-panel');
    if (fpsPanelReset) fpsPanelReset.classList.remove('active');
    const benchBtnReset = document.getElementById('bench-toggle-btn');
    if (benchBtnReset) benchBtnReset.innerHTML = '<i class="ph-bold ph-crosshair"></i> SHOW FPS';
    state.galleryIndex = 0;
    // Every build starts unconfigured — extras never leak from the previously viewed PC
    state.build = { storage: '', proConfig: false, paint: false };

    const cardInner = document.getElementById('yg-card');
    if(cardInner) cardInner.classList.remove('flipped');

    // 1. Basic Info
    const elTitle = document.getElementById('yg-title');
    if(elTitle) elTitle.innerText = state.currentGalleryPC.name; 
    const elBackTitle = document.getElementById('yg-back-title');
    if(elBackTitle) elBackTitle.innerText = state.currentGalleryPC.name;
    
    const elDesc = document.getElementById('yg-desc');
    if(elDesc) elDesc.innerText = state.currentGalleryPC.description || (window.t ? window.t('descFallback') : "Detailed specifications for this system.");

    const elTag = document.getElementById('yg-tagline');
    if(elTag) elTag.innerText = state.currentGalleryPC.tagline || (window.t ? window.t('taglineFallback') : "AUTHORIZED SYSTEM BUILD");

    const basePrice = parseInt(state.currentGalleryPC.price.replace(/[^0-9]/g, '')) || 0; 
    const elLivePrice = document.getElementById('yg-price-live');
    if(elLivePrice) elLivePrice.innerText = "€" + basePrice; 
    
    const elOldPrice = document.getElementById('yg-price-old');
    if(elOldPrice) elOldPrice.innerText = "€" + Math.floor(basePrice * 1.2);

    // Builds the extras this particular PC offers, then prices them (sets #yg-price-live)
    renderExtras();

    // 2. Power Bar & Tier Badge
    let mScore = state.currentGalleryPC.multitasking || 0;
    
    const powerFill = document.getElementById('g-power-fill');
    if(powerFill) powerFill.style.width = mScore + "%";

    let tier = mScore > 80 ? 'S-TIER' : (mScore > 50 ? 'A-TIER' : 'B-TIER');
    let tierColor = mScore > 80 ? '#a855f7' : (mScore > 50 ? '#ec48d9' : '#bef264');


    // 3. Image & Watermark
    const elImg = document.getElementById('yg-main-img');
    if(elImg) elImg.src = getActiveImages(state.currentGalleryPC)[0] || 'assets/images/bg.jpg';
    updateGalleryArrows();
    
    const elWater = document.getElementById('g-watermark');
    if(elWater) elWater.innerText = state.currentGalleryPC.name;

    // 4. Quick Spec Pills
    let cpuText = state.currentGalleryPC.specs && state.currentGalleryPC.specs.cpu ? state.currentGalleryPC.specs.cpu.split(' ').slice(0,2).join(' ') : 'CPU';
    let gpuText = state.currentGalleryPC.specs && state.currentGalleryPC.specs.gpu ? state.currentGalleryPC.specs.gpu.split(' ').slice(0,2).join(' ') : 'GPU';
    let ramText = state.currentGalleryPC.specs && state.currentGalleryPC.specs.ram ? state.currentGalleryPC.specs.ram.split(' ')[0] : 'RAM';
    
    const elQuickSpecs = document.getElementById('yg-quick-specs');
    if(elQuickSpecs) {
        elQuickSpecs.innerHTML = `
            <div class="yg-spec-badge"><div class="yg-spec-icon">⚙️</div><span>${cpuText}</span></div>
            <div class="yg-spec-badge"><div class="yg-spec-icon">🎮</div><span>${gpuText}</span></div>
            <div class="yg-spec-badge"><div class="yg-spec-icon">💾</div><span>${ramText}</span></div>
        `;
    }

    // 5. Stock Status
    const stock = state.currentGalleryPC.stock || 0; 
    const stockContainer = document.getElementById('yg-stock-container');
    const stockBadge = document.getElementById('yg-stock-badge'); 
    const addBtn = document.getElementById('yg-add-cart'); 
    
    if(stockContainer && stockBadge) {
        if(stock === 0) { 
            stockContainer.style.borderColor = "#ff3333";
            stockContainer.style.background = "rgba(255, 51, 51, 0.1)";
            stockBadge.style.color = "#ff3333";
            stockBadge.innerText = "❌ OUT OF STOCK"; 
            if(addBtn) addBtn.disabled = true;
        } 
        else if(stock < 5) { 
            stockContainer.style.borderColor = "#fbbf24";
            stockContainer.style.background = "rgba(251, 191, 36, 0.1)";
            stockBadge.style.color = "#fbbf24";
            stockBadge.innerText = `⚠️ LOW STOCK: ${stock} UNITS`; 
            if(addBtn) addBtn.disabled = false;
        } 
        else { 
            stockContainer.style.borderColor = "#bef264";
            stockContainer.style.background = "rgba(190, 242, 100, 0.1)";
            stockBadge.style.color = "#bef264";
            stockBadge.innerText = "✔️ IN STOCK"; 
            if(addBtn) addBtn.disabled = false;
        } 
    }    
    
// 6. Back Side Detailed Specs (Yu-Gi-Oh style: stars + stat boxes + spec items + flavor text)
    let backH = "";

    // Rarity stars ανάλογα με tier


    if (state.currentGalleryPC.specs) {
        const specs = state.currentGalleryPC.specs;

        // CPU/GPU σε ξεχωριστά "stat boxes" (ATK/DEF style)
        if (specs.cpu || specs.gpu) {
            backH += `<div class="yg-stat-highlight">`;
            if (specs.cpu) backH += `<div class="yg-stat-box"><div class="label">CPU POWER</div><div class="value">${specs.cpu}</div></div>`;
            if (specs.gpu) backH += `<div class="yg-stat-box"><div class="label">GPU POWER</div><div class="value">${specs.gpu}</div></div>`;
            backH += `</div>`;
        }

        // Τα υπόλοιπα specs (εκτός cpu/gpu που ήδη δείξαμε πάνω)
        for (const [k, v] of Object.entries(specs)) {
            if (k === 'cpu' || k === 'gpu') continue;
            const safeKey = k.replace(/'/g, "\\'");
            backH += `
            <div class="yg-spec-item">
                <div class="yg-spec-label">
                    ${k.toUpperCase()}
                    <i class="ph-bold ph-info yg-info-btn" onclick="playClick(); openSpecInfo('${safeKey}')"></i>
                </div>
                <div class="yg-spec-value">${v}</div>
            </div>`;
        }
    }

    // Flavor text — δικό του αν υπάρχει, αλλιώς auto-generate ανά tier
    const flavorPool = {
        'S-TIER': [
            "Forged for war, built to dominate. This rig doesn't compete — it conquers.",
            "Legends aren't found. They're assembled, component by component, right here."
        ],
        'A-TIER': [
            "A balanced warrior — strong enough for any battlefield you throw at it.",
            "Reliable power for those who take their game seriously."
        ],
        'B-TIER': [
            "Every legend starts somewhere. This is where yours begins.",
            "Solid, dependable, ready to run. The first step into the arena."
        ]
    };
    let flavor = state.currentGalleryPC.flavorText;
    if (!flavor) {
        const pool = flavorPool[tier] || flavorPool['B-TIER'];
        flavor = pool[Math.floor(Math.random() * pool.length)];
    }
    backH += `<div class="yg-flavor-text">${flavor}</div>`;

    const elSpecsBack = document.getElementById('yg-specs-back');
    if(elSpecsBack) elSpecsBack.innerHTML = backH;
// 7. FPS Panel Data — sorted by score, top result highlighted
    let benchH = "";
    const fpsData = state.currentGalleryPC.fps || [];
    if (fpsData.length > 0) {
        const sorted = [...fpsData].sort((a, b) => parseInt(b.score) - parseInt(a.score));
        sorted.forEach((f, idx) => {
            let settings = "Competitive / Low";
            if (f.game.toLowerCase().includes('cyberpunk') || f.game.toLowerCase().includes('gta')) settings = "High / Ultra";
            const bestBadge = idx === 0 ? '<span class="yg-fps-best-badge">BEST</span>' : '';
            benchH += `
            <div class="yg-fps-row ${idx === 0 ? 'yg-fps-top' : ''}">
                <div>
                    <div class="yg-fps-game">${f.game}${bestBadge}</div>
                    <div class="yg-fps-settings">${settings}</div>
                </div>
                <div class="yg-fps-score">${f.score}<span class="yg-fps-unit"> FPS</span></div>
            </div>`;
        });
    } else {
        benchH = "<div style='color:#888; font-size:0.8rem; font-style:italic; text-align:center; padding:30px 20px;'>No benchmark data available yet.</div>";
    }
    const elFpsList = document.getElementById('yg-fps-list');
    if (elFpsList) elFpsList.innerHTML = benchH;
    
    if(window.openModal) window.openModal('gallery-overlay');
}

export function openSpecInfo(key) {
    const pc = state.currentGalleryPC;
    if(!pc) return;
    
    const titleEl = document.getElementById('spec-info-title');
    const descEl = document.getElementById('spec-info-desc');

    if(titleEl) titleEl.innerText = key.toUpperCase() + " INFO";
    
    if(pc.specDetails && pc.specDetails[key]) {
        if(descEl) descEl.innerText = pc.specDetails[key];
    } else {
        if(descEl) descEl.innerText = "Detailed specifications for this component will be provided by the admin soon.";
    }
    
    if(window.openModal) window.openModal('spec-info-modal');
}

export function updatePrice() {
    if(!state.currentGalleryPC) return;
    const { base, lines, total } = getBreakdown();

    const liveP = document.getElementById('yg-price-live');
    if(liveP) liveP.innerText = "€" + total;
    const oldP = document.getElementById('yg-price-old');
    if(oldP) oldP.innerText = "€" + Math.floor(total * 1.2);

    const bd = document.getElementById('yg-price-breakdown');
    if (bd) {
        bd.hidden = lines.length === 0;
        bd.innerHTML = lines.length === 0 ? '' :
            `<div class="yg-bd-row"><span>${esc(t('priceBaseLabel'))}</span><span>€${base}</span></div>` +
            lines.map(l => `<div class="yg-bd-row"><span>+ ${esc(l.label)}</span><span>+€${l.price}</span></div>`).join('') +
            `<div class="yg-bd-row yg-bd-total"><span>${esc(t('priceTotalLabel'))}</span><span>€${total}</span></div>`;
    }

}

export function toggleCardFlip() {
    const cardInner = document.getElementById('yg-card');
    const fpsPanel = document.getElementById('fps-panel');

    if (fpsPanel && fpsPanel.classList.contains('active')) {
        fpsPanel.classList.remove('active');
        const btn = document.getElementById('bench-toggle-btn');
        if (btn) btn.innerHTML = '<i class="ph-bold ph-crosshair"></i> SHOW FPS';
    }

    if (cardInner) {
        cardInner.classList.toggle('flipped');
    }
}

export function updateGalleryArrows() {
    const imgCount = getActiveImages(state.currentGalleryPC).length;
    const arrowLeft = document.getElementById('yg-arrow-left');
    const arrowRight = document.getElementById('yg-arrow-right');
    if (arrowLeft) arrowLeft.classList.toggle('hidden-arrow', imgCount <= 1);
    if (arrowRight) arrowRight.classList.toggle('hidden-arrow', imgCount <= 1);
}

export function updateGalleryImage() {
    const img = document.getElementById('yg-main-img');
    const imgs = getActiveImages(state.currentGalleryPC);
    if (img && imgs.length) img.src = imgs[state.galleryIndex] || imgs[0];
}

export function changeGalleryImage(d) {
    const imgs = getActiveImages(state.currentGalleryPC);
    if (!imgs.length) return;
    state.galleryIndex = (state.galleryIndex + d + imgs.length) % imgs.length;
    updateGalleryImage();
}

export function toggleBenchmarksView() {
    const panel = document.getElementById('fps-panel');
    const btn = document.getElementById('bench-toggle-btn');
    if (!panel || !btn) return;

    const isShowing = panel.classList.toggle('active');

    if (isShowing) {
        btn.innerHTML = '<i class="ph-bold ph-arrow-down"></i> CLOSE FPS';
    } else {
        btn.innerHTML = '<i class="ph-bold ph-crosshair"></i> SHOW FPS';
    }
}

// Εξαγωγή στο window
window.openGallery = openGallery;
window.openSpecInfo = openSpecInfo;
window.updatePrice = updatePrice;
window.toggleCardFlip = toggleCardFlip;
window.changeGalleryImage = changeGalleryImage;
window.toggleBenchmarksView = toggleBenchmarksView;
window.renderExtras = renderExtras;
window.onStorageChange = onStorageChange;
window.onProConfigChange = onProConfigChange;
window.onPaintChange = onPaintChange;
window.acceptPaintConsent = acceptPaintConsent;
window.declinePaintConsent = declinePaintConsent;
window.openProConfigInfo = openProConfigInfo;