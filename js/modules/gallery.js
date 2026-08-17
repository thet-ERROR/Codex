// js/modules/gallery.js
import { state } from '../state.js';

export function openGallery() { 
    state.currentGalleryPC = state.filtered[state.index]; 
    if(!state.currentGalleryPC) return;
    state.galleryIndex = 0; 
    
    const cardInner = document.getElementById('yg-card');
    if(cardInner) cardInner.classList.remove('flipped');

    // 1. Basic Info
    const elTitle = document.getElementById('yg-title');
    if(elTitle) elTitle.innerText = state.currentGalleryPC.name; 
    
    const elDesc = document.getElementById('yg-desc');
    if(elDesc) elDesc.innerText = state.currentGalleryPC.description || "Detailed specifications for this system.";
    
    const elTag = document.getElementById('yg-tagline');
    if(elTag) elTag.innerText = state.currentGalleryPC.tagline || "AUTHORIZED SYSTEM BUILD";

    const basePrice = parseInt(state.currentGalleryPC.price.replace(/[^0-9]/g, '')) || 0; 
    const elLivePrice = document.getElementById('yg-price-live');
    if(elLivePrice) elLivePrice.innerText = "€" + basePrice; 
    
    const elOldPrice = document.getElementById('yg-price-old');
    if(elOldPrice) elOldPrice.innerText = "€" + Math.floor(basePrice * 1.2); 
    
    const elSelect = document.getElementById('storage-select');
    if(elSelect) elSelect.value = "0"; 

    // 2. Power Bar & Tier Badge
    let mScore = state.currentGalleryPC.multitasking || 0;
    
    const powerFill = document.getElementById('g-power-fill');
    if(powerFill) powerFill.style.width = mScore + "%";

    let tier = mScore > 80 ? 'S-TIER' : (mScore > 50 ? 'A-TIER' : 'B-TIER');
    let tierColor = mScore > 80 ? '#a855f7' : (mScore > 50 ? '#ec48d9' : '#bef264');
    let tierBadge = document.getElementById('yg-tier-badge');
    if(tierBadge) {
        tierBadge.innerText = tier;
        tierBadge.style.background = `linear-gradient(135deg, ${tierColor} 0%, #111 100%)`;
        tierBadge.style.boxShadow = `0 0 20px ${tierColor}80`;
    }

    // 3. Image & Watermark
    const elImg = document.getElementById('yg-main-img');
    if(elImg) elImg.src = state.currentGalleryPC.images[0] || 'assets/images/bg.jpg';
    
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
    const starCount = tier === 'S-TIER' ? 5 : (tier === 'A-TIER' ? 4 : 3);
    const tierClass = tier === 'S-TIER' ? 'tier-s' : (tier === 'A-TIER' ? 'tier-a' : '');
    backH += `<div class="yg-rarity-stars ${tierClass}">${'<i class="ph-fill ph-star"></i>'.repeat(starCount)}</div>`;

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
    // 7. Back Side Benchmarks
    let benchH = "";
    if (state.currentGalleryPC.fps && state.currentGalleryPC.fps.length > 0) {
        state.currentGalleryPC.fps.forEach(f => {
            let settings = "Competitive / Low";
            if(f.game.toLowerCase().includes('cyberpunk') || f.game.toLowerCase().includes('gta')) settings = "High / Ultra";
            benchH += `
            <div class="yg-benchmark-card">
                <div class="yg-benchmark-game">${f.game}</div>
                <div class="yg-benchmark-fps">${f.score}</div>
                <div class="yg-benchmark-settings">${settings}</div>
            </div>`;
        });
    } else {
        benchH = "<div style='color:#888; font-size:12px; font-style:italic; text-align:center; grid-column: span 2; padding: 20px;'>No benchmark data available.</div>";
    }
    const elBenchmarks = document.getElementById('yg-benchmarks');
    if(elBenchmarks) elBenchmarks.innerHTML = benchH;
    
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
    const sel = document.getElementById('storage-select');
    const extra = sel ? parseInt(sel.value) : 0; 
    const base = parseInt(state.currentGalleryPC.price.replace(/[^0-9]/g, '')) || 0; 
    const liveP = document.getElementById('yg-price-live');
    if(liveP) liveP.innerText = "€" + (base + extra); 
}

export function toggleCardFlip() {
    const cardInner = document.getElementById('yg-card');
    if (cardInner) {
        cardInner.classList.toggle('flipped');
    }
}

export function updateGalleryImage() { 
    const img = document.getElementById('yg-main-img');
    if(img && state.currentGalleryPC && state.currentGalleryPC.images) {
        img.src = state.currentGalleryPC.images[state.galleryIndex]; 
    }
}

export function changeGalleryImage(d) { 
    if(!state.currentGalleryPC || !state.currentGalleryPC.images) return;
    state.galleryIndex = (state.galleryIndex + d + state.currentGalleryPC.images.length) % state.currentGalleryPC.images.length; 
    updateGalleryImage(); 
}

export function toggleBenchmarksView() {
    const cardBack = document.querySelector('.yg-card-back');
    const btn = document.getElementById('bench-toggle-btn');
    if(!cardBack || !btn) return;
    
    const isShowing = cardBack.classList.toggle('benchmarks-active');

    if (isShowing) {
        btn.innerHTML = '<i class="ph-bold ph-arrow-down"></i> HIDE BENCHMARKS';
        btn.classList.add('bench-active-btn');
        if(window.showToast) window.showToast('LOADING BENCHMARK DATA...', 'normal');
    } else {
        btn.innerHTML = '<i class="ph-bold ph-crosshair"></i> SHOW BENCHMARKS';
        btn.classList.remove('bench-active-btn');
    }
}

// Εξαγωγή στο window
window.openGallery = openGallery;
window.openSpecInfo = openSpecInfo;
window.updatePrice = updatePrice;
window.toggleCardFlip = toggleCardFlip;
window.changeGalleryImage = changeGalleryImage;
window.toggleBenchmarksView = toggleBenchmarksView;