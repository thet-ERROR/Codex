// js/modules/catalog.js
import { state } from '../state.js';

export function switchTab(mode) { 
    state.currentTab = mode; 
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-live', 'active-vault', 'active-starter', 'active-vote', 'active-gear')); 
    const tabBtn = document.getElementById(`tab-${mode}`);
    if (tabBtn) tabBtn.classList.add(`active-live`); 
    
    ['carousel-wrapper', 'starter-menu', 'gear-view', 'vote-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    const label = document.getElementById('stage-label');
    if (mode === 'vote') { 
        document.getElementById('vote-view').classList.remove('hidden'); 
        if (label) label.innerText = "// COMMUNITY VOTE //"; 
    } else if (mode === 'starter') { 
        document.getElementById('starter-menu').classList.remove('hidden'); 
        if (label) label.innerText = "// STARTER PACKS //"; 
    } else if (mode === 'gear') { 
        document.getElementById('gear-view').classList.remove('hidden'); 
        if (label) label.innerText = "// ARMORY //"; 
    } else { 
        document.getElementById('carousel-wrapper').classList.remove('hidden'); 
        if (label) label.innerText = "// SYSTEM SELECT //"; 
        filterInv(); 
    } 
}

export function selectPack(cat) { 
    document.getElementById('starter-menu').classList.add('hidden'); 
    document.getElementById('carousel-wrapper').classList.remove('hidden'); 
    state.filtered = state.inventory.filter(p => p.category === cat); 
    state.index = 0; 
    renderCard(); 
}

export function filterInv() { 
    state.filtered = state.inventory.filter(p => { 
        if (state.currentTab === 'live') return (p.category === 'drop' || !p.category) && p.status !== 'coming'; 
        if (state.currentTab === 'vault') return p.status === 'coming'; 
        return true;
    }); 
    state.index = 0; 
    renderCard(); 
}

export function nextPC() { 
    if (state.filtered.length) { 
        state.index = (state.index + 1) % state.filtered.length; 
        renderCard(); 
    } 
}

export function prevPC() { 
    if (state.filtered.length) { 
        state.index = (state.index - 1 + state.filtered.length) % state.filtered.length; 
        renderCard(); 
    } 
}

export function renderCard() { 
    const c = document.getElementById('main-card'); 
    if (!c) return;
    if (!state.filtered.length) { 
        c.innerHTML = "<h3>NO SIGNAL</h3>"; 
        return; 
    } 
    
    const pc = state.filtered[state.index]; 
    const inCompare = state.compareList.find(p => p._id === pc._id); 
    const priceVal = parseInt(pc.price.replace(/[^0-9]/g, '')) || 0; 
    const fakeOldPrice = Math.floor(priceVal * 1.2); 
    const stock = pc.stock || 0; 
    
    let stockHTML = ''; 
    if (stock === 0) stockHTML = '<div class="stock-badge out">SOLD OUT</div>'; 
    else if (stock < 5) stockHTML = `<div class="stock-badge low">LOW STOCK: ${stock} UNITS</div>`; 
    else stockHTML = '<div class="stock-badge in">IN STOCK</div>'; 

    let fpsHTML = ''; 
    if (pc.multitasking) {
        fpsHTML += `<div class="fps-row"><span class="fps-name">MULTI</span><div class="bar-track"><div class="bar-fill" data-width="${pc.multitasking}%" style="width:0%"></div></div><span class="fps-num">${pc.multitasking}</span></div>`; 
    }
    if (pc.fps) {
        pc.fps.forEach(f => { 
            let max = 200; 
            if (f.game === 'Fortnite') max = 300; 
            fpsHTML += `<div class="fps-row"><span class="fps-name">${f.game}</span><div class="bar-track"><div class="bar-fill" data-width="${Math.min((f.score/max)*100,100)}%" style="width:0%"></div></div><span class="fps-num">${f.score}</span></div>`; 
        }); 
    }

    const isGreek = (localStorage.getItem('codex_lang') || 'en') === 'el';
    const loreFallback = window.t ? window.t('loreFallback') : "Σύστημα τακτικών επιχειρήσεων. Οι πλήρεις προδιαγραφές βρίσκονται στον φάκελο INSPECT. Απαιτείται εξουσιοδότηση.";
    const pcLore = (isGreek && pc.loreEl) ? pc.loreEl : (pc.lore || loreFallback);
    const inWishlist = state.wishlist.find(p => (p._id || p.id) === (pc._id || pc.id));
    const wishColor = inWishlist ? "var(--neon-green)" : "#555";

    c.innerHTML = `
        <div class="holo-card-inner">
            <div class="hero-img-frame" onclick="openGallery()" style="cursor:pointer;"><img src="${pc.images[0]||'assets/images/bg.jpg'}" class="hero-img"></div>
            <button onclick="toggleWishlist('${pc._id || pc.id}')" style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.7); border:1px solid ${wishColor}; color:${wishColor}; border-radius:50%; width:40px; height:40px; display:flex; justify-content:center; align-items:center; cursor:pointer; z-index:10; transition:all 0.3s;">
                <i class="ph-bold ph-crosshair" style="font-size:1.3rem;"></i>
            </button>
            ${stockHTML}
            <div class="pc-title">${pc.name}</div>
            <div class="card-price-row">
                <div class="pc-price">${pc.price}</div>
                <div class="pc-price-old">€${fakeOldPrice}</div>
            </div>
            
            <div class="sys-brief">
                <div class="sys-brief-title">${window.t ? window.t('classifiedBrief') : '>// CLASSIFIED_BRIEF'}</div>
                <div class="sys-brief-text">${pcLore}</div>
            </div>

            <button class="btn-card-inspect" onclick="openGallery()">${window.t ? window.t('inspectSystemBtn') : 'INSPECT SYSTEM'}</button>
            <button class="btn-card-compare ${inCompare ? 'selected' : ''}" onclick="toggleCompare('${pc._id || pc.id}', this)">
                ${inCompare ? (window.t ? window.t('addedToVs') : 'ADDED TO VS') : (window.t ? window.t('compareBtn') : 'COMPARE')}
            </button>
        </div>
    `;
    
    // Ξεκινάμε το animation στις μπάρες
    setTimeout(()=> {
        document.querySelectorAll('.bar-fill').forEach(b => b.style.width = b.getAttribute('data-width'));
    }, 50); 
}

// Εξαγωγή στο window
window.switchTab = switchTab;
window.selectPack = selectPack;
window.filterInv = filterInv;
window.nextPC = nextPC;
window.prevPC = prevPC;
window.renderCard = renderCard;