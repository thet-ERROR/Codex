export function showToast(msg, type = 'normal') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Το κάνουμε διαθέσιμο στο HTML (Κανόνας Β - Επιλογή ii)
window.showToast = showToast;