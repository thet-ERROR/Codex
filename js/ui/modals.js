export function openModal(id) { 
    let m = document.getElementById(id) || document.getElementById(id + '-modal');
    if(m) {
        if (id === 'gallery-overlay') m.style.display = 'flex';
        else m.classList.add('active'); 
    }
}

export function closeModal(id) { 
    let m = document.getElementById(id) || document.getElementById(id + '-modal');
    if(m) {
        m.classList.remove('active'); 
        if (id === 'gallery-overlay') m.style.display = 'none';
    }
}

export function showToast(msg, type = 'normal') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Εξαγωγή στο window (Επιλογή ii)
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
