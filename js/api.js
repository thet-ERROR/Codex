import { CONFIG } from './config.js';

export const api = {
    async fetchDrops() {
        const res = await fetch(`${CONFIG.API_URL}/drops`);
        return await res.json();
    },
    async fetchVoteEvent() {
        const res = await fetch(`${CONFIG.API_URL}/vote-event`);
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
    async registerUser(username, email, password) {
        const res = await fetch(`${CONFIG.API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
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
    }
};

window.api = api;