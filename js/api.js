import { CONFIG } from './config.js';

export const api = {
    async checkStatus() {
        const res = await fetch(`${CONFIG.API_URL}/status`);
        return await res.json();
    },
    async fetchDrops() {
        const res = await fetch(`${CONFIG.API_URL}/drops`);
        return await res.json();
    },
    async fetchVoteEvent() {
        // Token is sent when we have one so the server can answer "has THIS agent already
        // voted?". The route is public — guests just get hasVoted: false.
        const token = localStorage.getItem('codex_token');
        const res = await fetch(`${CONFIG.API_URL}/vote-event`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return await res.json();
    },
    // Read-only: never starts the 48h validation window. See activateMissionCode for that.
    async checkMissionCode(code) {
        const res = await fetch(`${CONFIG.API_URL}/check-code/${encodeURIComponent(code)}`);
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        return await res.json();
    },
    // The only call that starts the 48h window — only ever fired from the user's own "enter my
    // code" action (js/modules/reviews.js), never automatically.
    async activateMissionCode(code) {
        const res = await fetch(`${CONFIG.API_URL}/check-code/${encodeURIComponent(code)}/activate`, { method: 'POST' });
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        return await res.json();
    },
    async registerUser(username, email, password, subscribed) {
        const res = await fetch(`${CONFIG.API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, subscribed })
        });
        return await res.json();
    },
    async loginUser(username, password) {
        const res = await fetch(`${CONFIG.API_URL}/user-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await res.json();
    },
    async getMe() {
        const res = await fetch(`${CONFIG.API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` }
        });
        if (!res.ok) throw { status: res.status, ...(await res.json().catch(() => ({}))) };
        return await res.json();
    },
    // Both of these used to `return await res.json()` unconditionally — a 403 (e.g. unverified
    // email) still has a JSON body, so it resolved as if it had succeeded and the caller's
    // .catch() never fired. Throwing on !res.ok makes a failed sync actually look like one.
    async saveWishlist(pcId, action) {
        const res = await fetch(`${CONFIG.API_URL}/wishlist/${pcId}`, {
            method: action === 'add' ? 'POST' : 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw { status: res.status, ...data };
        return data;
    },
    async saveAchievement(id) {
        const res = await fetch(`${CONFIG.API_URL}/achievements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` },
            body: JSON.stringify({ id })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw { status: res.status, ...data };
        return data;
    },
    // Called by the frontend's own load-time script when it sees ?verify=<token> in the URL —
    // never triggered by a bare link click/GET, so a mail client's link-preview scanner can't
    // verify an account nobody asked it to (see js/main.js).
    async verifyEmail(token) {
        const res = await fetch(`${CONFIG.API_URL}/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        return await res.json();
    },
    async resendVerification() {
        const res = await fetch(`${CONFIG.API_URL}/resend-verification`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` }
        });
        return await res.json();
    },
    // Always resolves to { success: true } by design — the backend deliberately gives the same
    // answer whether or not the address has an account, so nobody can probe for registered emails.
    async forgotPassword(email) {
        const res = await fetch(`${CONFIG.API_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return await res.json();
    },
    async resetPassword(token, newPass) {
        const res = await fetch(`${CONFIG.API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPass })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw { status: res.status, ...data };
        return data;
    }
};

window.api = api;