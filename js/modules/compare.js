// js/modules/compare.js
import { state } from '../state.js';

export function toggleCompare(id, btnElement) { 
    // Παίρνουμε το τρέχον PC που βλέπει ο χρήστης
    const pc = state.filtered[state.index]; 
    const alreadyInList = state.compareList.find(p => (p._id || p.id) === id);

    if (alreadyInList) {
        // Αν είναι ήδη μέσα, το αφαιρούμε
        state.compareList = state.compareList.filter(p => (p._id || p.id) !== id); 
        if (btnElement) {
            btnElement.classList.remove('selected');
            btnElement.innerText = 'COMPARE';
        }
    } else { 
        if (state.compareList.length < 2) {
            // Το προσθέτουμε
            state.compareList.push(pc); 
            if (btnElement) {
                btnElement.classList.add('selected');
                btnElement.innerText = 'ADDED TO VS';
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
    
    const c1 = state.compareList[0];
    const c2 = state.compareList[1]; 
    
    const renderCol = (p) => `
        <div class="compare-col">
            <img src="${p.images[0]}" class="compare-img">
            <h3>${p.name}</h3>
            <div style="color:var(--neon-green); font-weight:bold; margin-bottom:10px;">${p.price}</div>
            <div class="gallery-desc-box">${p.description || (window.t ? window.t('systemDetailsFallback') : 'System Details')}</div>
            ${Object.keys(p.specs).map(k => `
                <div class="compare-spec-row">
                    <span class="compare-spec-label">${k.toUpperCase()}</span>
                    <span class="compare-spec-val">${p.specs[k]}</span>
                </div>
            `).join('')}
        </div>
    `; 
    
    const grid = document.getElementById('compare-grid');
    if(grid) {
        grid.innerHTML = renderCol(c1) + '<div class="compare-divider"></div>' + renderCol(c2); 
    }
    
    if(window.openModal) window.openModal('compare-modal'); 
}

// Εξαγωγή στο global scope για το index.html
window.toggleCompare = toggleCompare;
window.openCompareModal = openCompareModal;