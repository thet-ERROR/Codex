// Toasts: the small messages that come up from the bottom. Pressing the same button again and again used
// to add a new one each time, a growing stack of the same sentence. Now:
//  - the same message (same type and text, or the same `key`) is shown once: pressing again keeps it
//    on screen for a full time again and gives it a small bump, so the press is seen to count;
//  - a message whose text changes (a countdown) passes a `key` and replaces itself;
//  - never more than MAX_TOASTS at once: a new one pushes the oldest out.
const SHOW_MS = 3000;
const MAX_TOASTS = 3;
const live = new Map();   // key -> { el, timer }, oldest first

function drop(key) {
    const entry = live.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.el.remove();
    live.delete(key);
}

export function showToast(msg, type = 'normal', opts = {}) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const key = (opts && opts.key) || `${type}\u0000${msg}`;

    const same = live.get(key);
    if (same && same.el.isConnected) {
        same.el.innerText = msg;
        clearTimeout(same.timer);
        same.timer = setTimeout(() => drop(key), SHOW_MS);
        live.delete(key); live.set(key, same);                   // the newest again
        same.el.classList.remove('bump'); void same.el.offsetWidth; same.el.classList.add('bump');
        return;
    }

    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    live.set(key, { el: t, timer: setTimeout(() => drop(key), SHOW_MS) });
    while (live.size > MAX_TOASTS) drop(live.keys().next().value);
}

// Το κάνουμε διαθέσιμο στο HTML (Κανόνας Β - Επιλογή ii)
window.showToast = showToast;
