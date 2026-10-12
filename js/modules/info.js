// js/modules/info.js
//
// The Information window: Warranty & Returns / Terms / Support in one place (index.html #info-modal),
// where there used to be three icons and three differently-styled modals. This file owns the tabs and
// the email links — a return is an email, so the message is prefilled in the visitor's own language.
import { CONFIG } from '../config.js';
import { t } from '../i18n.js';

const TABS = ['returns', 'terms', 'support'];

export function mailto(subject, body) {
    return `mailto:${CONFIG.SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function setTab(tab, { focus = false } = {}) {
    if (!TABS.includes(tab)) tab = 'returns';
    document.querySelectorAll('#info-modal .info-tab').forEach(btn => {
        const on = btn.dataset.infoTab === tab;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', String(on));
        btn.tabIndex = on ? 0 : -1;
        if (on && focus) btn.focus();
    });
    document.querySelectorAll('#info-modal .info-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `info-panel-${tab}`);
    });
    const body = document.querySelector('#info-modal .info-body');
    if (body) body.scrollTop = 0;
}

export function openInfo(tab = 'returns') {
    setTab(tab);
    refreshLinks();
    if (window.openModal) window.openModal('info-modal');
}

// Subject and body follow the language, so they're rebuilt on open and whenever the language changes
function refreshLinks() {
    const ret = document.getElementById('info-return-btn');
    if (ret) ret.href = mailto(t('returnMailSubject'), t('returnMailBody'));
    const mail = document.getElementById('info-email-link');
    if (mail) mail.href = `mailto:${CONFIG.SUPPORT_EMAIL}`;
    const text = document.getElementById('info-email-text');
    if (text) text.textContent = CONFIG.SUPPORT_EMAIL;
}

// Not every desktop has a mail app wired to mailto: — so the address is always copyable
export async function copySupportEmail() {
    try {
        await navigator.clipboard.writeText(CONFIG.SUPPORT_EMAIL);
    } catch (e) {
        // Clipboard API refused (insecure context, permissions) — the select-and-copy fallback
        const ta = document.createElement('textarea');
        ta.value = CONFIG.SUPPORT_EMAIL;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { /* nothing left to try */ }
        ta.remove();
    }
    if (window.showToast) window.showToast(t('returnCopied'), 'normal');
}

document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('#info-modal [data-info-tab]');
    if (tabBtn) { if (window.playClick) window.playClick(); setTab(tabBtn.dataset.infoTab); return; }
    // In-text links between tabs (Terms → Warranty & Returns, Terms → Support)
    const go = e.target.closest('[data-info-go]');
    if (go) { e.preventDefault(); if (window.playClick) window.playClick(); setTab(go.dataset.infoGo); }
});

// Arrow keys move between tabs, as on any tab list
document.addEventListener('keydown', (e) => {
    const tabBtn = e.target.closest && e.target.closest('#info-modal [data-info-tab]');
    if (!tabBtn || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const i = TABS.indexOf(tabBtn.dataset.infoTab);
    setTab(TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length], { focus: true });
});

document.addEventListener('codex:lang', refreshLinks);
document.addEventListener('DOMContentLoaded', refreshLinks);

window.openInfo = openInfo;
window.copySupportEmail = copySupportEmail;
