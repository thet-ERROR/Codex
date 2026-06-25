// js/core/api.js
const API_URL = 'https://codex-backend-9kij.onrender.com/api';

export const api = {
    async fetchDrops() {
        try {
            const res = await fetch(`${API_URL}/drops`);
            return await res.json();
        } catch (e) {
            console.error("Critical: Could not fetch drops.", e);
            return [];
        }
    },

    async fetchVoteEvent() {
        try {
            const res = await fetch(`${API_URL}/vote-event`);
            return await res.json();
        } catch (e) {
            console.error("Critical: Could not fetch vote event.", e);
            return null;
        }
    },

    async login(username, password) {
        const res = await fetch(`${API_URL}/user-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await res.json();
    },

    async register(username, email, password) {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        return await res.json();
    },

    async checkMissionCode(code) {
        const res = await fetch(`${API_URL}/check-code/${code}`);
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        return await res.json();
    }
};