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

window.esc = esc;
