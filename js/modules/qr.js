// js/modules/qr.js
//
// "Open it on your phone": a QR code of the page the visitor is on, from the share menu
// (index.html #social-menu → #qr-modal). Built at runtime from location, so it follows whatever
// address the site is served from — production, a Vercel preview, localhost. The QR library is
// only fetched the first time the window opens; it comes from jsDelivr (allowed by the CSP in
// vercel.json) as the static, unminified file so it can carry an SRI hash.
import { t } from '../i18n.js';

const QR_SRC = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const QR_SRI = 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k';

let libPromise = null;

function loadLib() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (!libPromise) {
        libPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = QR_SRC;
            s.integrity = QR_SRI;
            s.crossOrigin = 'anonymous';
            s.onload = () => (window.qrcode ? resolve(window.qrcode) : reject(new Error('qrcode missing')));
            s.onerror = () => reject(new Error('qrcode failed to load'));
            document.head.appendChild(s);
        }).catch(err => { libPromise = null; throw err; }); // offline now ≠ offline next time
    }
    return libPromise;
}

// The bare page address — no ?tab=, ?act=, reset tokens or #fragments riding along to someone else
function siteUrl() {
    return location.origin + location.pathname.replace(/index\.html$/, '');
}

export async function openQr() {
    const url = siteUrl();
    const tile = document.getElementById('qr-tile');
    const urlEl = document.getElementById('qr-url');
    const shareBtn = document.getElementById('qr-share-btn');
    if (urlEl) urlEl.textContent = url.replace(/^https?:\/\//, '');
    if (shareBtn) shareBtn.hidden = !navigator.share;
    const menu = document.getElementById('social-menu');
    if (menu) menu.classList.remove('active');
    if (window.openModal) window.openModal('qr-modal');
    if (!tile) return;

    tile.classList.add('is-loading');
    tile.innerHTML = `<span class="qr-wait">${t('qrLoading')}</span>`;
    try {
        const qrcode = await loadLib();
        const qr = qrcode(0, 'M');       // type 0 = smallest version that fits the URL
        qr.addData(url);
        qr.make();
        tile.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: url });
    } catch (e) {
        tile.innerHTML = `<span class="qr-wait">${t('qrFailed')}</span>`;
    }
    tile.classList.remove('is-loading');
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
        // Same fallback as copySupportEmail (info.js) for contexts that refuse the Clipboard API
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { /* nothing left to try */ }
        ta.remove();
    }
}

export async function copyQrLink() {
    await copyText(siteUrl());
    if (window.showToast) window.showToast(t('linkCopied'), 'normal');
}

export async function shareQrLink() {
    try {
        await navigator.share({ title: 'PHOENIX CODEX', url: siteUrl() });
    } catch (e) { /* share sheet dismissed */ }
}

window.openQr = openQr;
window.copyQrLink = copyQrLink;
window.shareQrLink = shareQrLink;
