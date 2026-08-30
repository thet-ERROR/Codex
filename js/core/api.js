// js/api.js
import { CONFIG } from './config.js';

export const api = {
    async fetchDrops() {
        try {
            const res = await fetch(`${CONFIG.API_URL}/drops`);
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("Critical: Could not fetch drops.", e);
            return []; // Επιστρέφει άδειο πίνακα για να μην κρασάρει το UI
        }
    },

    async fetchVoteEvent() {
        try {
            const res = await fetch(`${CONFIG.API_URL}/vote-event`);
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("Critical: Could not fetch vote event.", e);
            return null;
        }
    },

    async login(username, password) {
        try {
            const res = await fetch(`${CONFIG.API_URL}/user-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            // Αν ο server απαντήσει με σφάλμα αλλά σε μορφή JSON, θα περάσει κανονικά.
            // Αν "σκάσει" εντελώς, θα το πιάσει το catch.
            return await res.json();
        } catch (e) {
            console.error("Login Error:", e);
            // Επιστρέφουμε object ίδιας δομής με το backend για να το χειριστεί σωστά το auth.js
            return { error: "Network Error: Could not reach the server" };
        }
    },

    async register(username, email, password) {
        try {
            const res = await fetch(`${CONFIG.API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            return await res.json();
        } catch (e) {
            console.error("Register Error:", e);
            return { error: "Network Error: Could not reach the server" };
        }
    },

    async checkMissionCode(code) {
        try {
            const res = await fetch(`${CONFIG.API_URL}/check-code/${code}`);
            if (!res.ok) throw new Error(`Server Error: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("Mission Code Error:", e);
            throw e; // Το πετάμε ξανά (throw) για να βγάλει alert το UI
        }
    }
};