// js/utils.js — shared helpers

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapes a value for safe interpolation into an innerHTML template.
 *
 * Everything that reaches the DOM from the database goes through here. Customer-submitted
 * review text is the sharpest case: /api/submit-review takes a name and free text from anyone
 * holding a mission code, so an unescaped `<img onerror=...>` in a review would execute for
 * every visitor who opens the site — and, because the login token lives in localStorage, it
 * could be read and exfiltrated. Admin-authored fields are escaped too, so a compromised admin
 * account can't turn the catalogue into a script host either.
 *
 * Use it for text and for attribute values inside quotes. It is NOT enough on its own for a
 * URL in href/src (escaping doesn't stop `javascript:`) or for text placed inside a <script>.
 */
export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ESCAPE_MAP[c]);
}

/**
 * For image/link URLs: escapes, and drops anything that isn't a plain http(s), data:image,
 * or relative URL so a stored `javascript:` value can't become a clickable script.
 */
export function escUrl(value) {
    const raw = String(value ?? '').trim();
    if (/^(https?:\/\/|data:image\/|\/|\.\/|[\w./-]+$)/i.test(raw)) return esc(raw);
    return '';
}

// --- PRICES ---
// Every amount on the site is integer euro cents internally and goes through formatPrice() to be
// shown — one formatter, so the card, the inspect view, the cart and the WhatsApp message can't
// drift into four different ways of writing the same number. el-GR is Greek convention:
// "1.249,90 €" (dot for thousands, comma for decimals, symbol after).
const EUR = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' });

export function formatPrice(cents) {
    return EUR.format((Number(cents) || 0) / 100);
}

// A PC or vote event's price in cents. The API backfills priceCents on boot, so the fallback only
// matters for a document it couldn't parse — it reads the old free-text field the same way the
// server's parseLegacyPriceToCents does (last separator is decimal only with 1-2 digits after it).
export function priceCentsOf(item) {
    if (item && Number.isFinite(item.priceCents)) return item.priceCents;
    const s = String((item && item.price) ?? '').replace(/[^\d.,]/g, '');
    if (!/\d/.test(s)) return 0;
    const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
    let whole = s, frac = '';
    if (lastSep !== -1) {
        const after = s.slice(lastSep + 1);
        if (after.length === 1 || after.length === 2) { whole = s.slice(0, lastSep); frac = after; }
    }
    return parseInt(whole.replace(/[.,]/g, '') || '0', 10) * 100 + (frac ? parseInt(frac.padEnd(2, '0'), 10) : 0);
}

window.esc = esc;
window.formatPrice = formatPrice;
