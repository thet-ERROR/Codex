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
    async checkMissionCode(code) {
        const res = await fetch(`${CONFIG.API_URL}/check-code/${code}`);
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        return await res.json();
    },
    async castVote() {
        const res = await fetch(`${CONFIG.API_URL}/cast-vote`, { method: 'POST' });
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
    async saveWishlist(pcId, action) {
        const res = await fetch(`${CONFIG.API_URL}/wishlist/${pcId}`, {
            method: action === 'add' ? 'POST' : 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` }
        });
        return await res.json();
    },
    async saveAchievement(id) {
        const res = await fetch(`${CONFIG.API_URL}/achievements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('codex_token')}` },
            body: JSON.stringify({ id })
        });
        return await res.json();
    }
};

window.api = api;