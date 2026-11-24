// game/hud.js — RAM RUSH's HUD: everything drawn over the world that is not the world (plan §8c).
//
// Step 8c.1: moved here as it was, from main.js (the keys line, the pause screen, the hearts, LV and the
// XP bar, the LEVEL UP! banner, the game over, the touch PARRY button) and from powerups.js (a row per
// power-up on, with the MHz meter). Not redrawn, not restyled: the next steps of §8c change it here.
//
// createHud(ctx, g, { txt, touchUI }): g is the running game (main.js), read as the code always read it.

import { HERO, PX_PER_M, PARRY, POWERUPS, PAUSE_BUTTON } from './config.js';

const W = 960, H = 540;

export function createHud(ctx, g, { txt, touchUI }) {
    const h = {};

    function drawHint() {
        const a = Math.min(1, g.hintT / 1.2);   // fades out over its last second
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = '600 15px system-ui, sans-serif';
        const w = ctx.measureText(txt().keys).width + 32;
        ctx.fillStyle = 'rgba(13, 12, 29, 0.72)';
        ctx.beginPath();
        ctx.roundRect((W - w) / 2, H - 46, w, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#f1f0f7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt().keys, W / 2, H - 31);
        ctx.restore();
    }
    function drawPause() {
        ctx.save();
        ctx.fillStyle = 'rgba(13, 12, 29, 0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f1f0f7';
        ctx.textAlign = 'center';
        ctx.font = '800 44px system-ui, sans-serif';
        ctx.fillText(txt().paused, W / 2, H / 2 - 6);
        ctx.font = '500 17px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(241, 240, 247, 0.75)';
        ctx.fillText(txt().resume, W / 2, H / 2 + 30);
        ctx.restore();
    }

    // The hero's life, top left (the HUD of plan §8c will dress it up): full and empty hearts
    function heart(x, y, r, full) {
        ctx.beginPath();
        ctx.moveTo(x, y + r * 0.9);
        ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.45);
        ctx.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
        ctx.fillStyle = full ? '#ef4444' : 'rgba(13, 12, 29, 0.7)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = full ? '#fecaca' : 'rgba(241, 240, 247, 0.45)';
        ctx.stroke();
    }
    function drawLife() {
        ctx.save();
        for (let k = 0; k < HERO.maxHp; k++) heart(30 + k * 32, 30, 11, k < g.hero.hp);
        ctx.restore();
    }
    // Under the hearts: the level and his RAM tier, and the XP bar to the next level (the HUD of §8c will
    // dress it up); it fills smoothly, not in jumps
    function drawXp(dt) {
        const pr = g.prog, target = pr.into / pr.need;
        g.xpShown += (target - g.xpShown) * (1 - Math.exp(-8 * dt));
        if (target < g.xpShown - 0.5) g.xpShown = target;           // a level up: it starts again from the bottom
        ctx.save();
        ctx.font = '800 12px system-ui, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(13, 12, 29, 0.85)';
        const label = `LV ${pr.level} · ${pr.tier().name}`;
        ctx.strokeText(label, 19, 56); ctx.fillStyle = '#f1f0f7'; ctx.fillText(label, 19, 56);
        ctx.fillStyle = 'rgba(13, 12, 29, 0.7)';
        ctx.fillRect(19, 66, 150, 7);
        ctx.fillStyle = '#d946ef';
        ctx.fillRect(19, 66, 150 * Math.max(0, Math.min(1, g.xpShown)), 7);
        ctx.restore();
    }
    // LEVEL UP!: a banner with the new tier, fading out over its time
    function drawLevelUp() {
        const k = g.levelT / 1.2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.textAlign = 'center';
        ctx.font = '900 40px system-ui, sans-serif';
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(13, 12, 29, 0.85)';
        ctx.strokeText(txt().levelUp, W / 2, 150); ctx.fillStyle = '#f0abfc'; ctx.fillText(txt().levelUp, W / 2, 150);
        ctx.font = '800 20px system-ui, sans-serif';
        ctx.strokeText(`LV ${g.prog.level} · ${g.prog.tier().name}`, W / 2, 182);
        ctx.fillStyle = '#f1f0f7'; ctx.fillText(`LV ${g.prog.level} · ${g.prog.tier().name}`, W / 2, 182);
        ctx.restore();
    }
    function drawOver() {
        ctx.save();
        ctx.fillStyle = 'rgba(13, 12, 29, 0.72)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f1f0f7';
        ctx.font = '800 52px system-ui, sans-serif';
        ctx.fillText(txt().over, W / 2, H / 2 - 30);
        ctx.font = '600 20px system-ui, sans-serif';
        ctx.fillStyle = '#22d3ee';
        ctx.fillText(`${txt().score} ${g.enemies.score} · ${Math.floor(g.distance / PX_PER_M)} m · ${g.enemies.killed} ${txt().kills} · LV ${g.prog.level}`, W / 2, H / 2 + 12);
        const r = g.records;
        ctx.font = '600 15px system-ui, sans-serif';
        ctx.fillStyle = r.beat.score || r.beat.distance ? '#f0abfc' : 'rgba(241, 240, 247, 0.6)';
        ctx.fillText(`${r.beat.score || r.beat.distance ? txt().newBest + ' ' : ''}${txt().best}: ${r.best.score} · ${r.best.distance} m · LV ${r.best.level}`, W / 2, H / 2 + 40);
        ctx.font = '500 17px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(241, 240, 247, 0.75)';
        ctx.fillText(txt().again, W / 2, H / 2 + 74);
        ctx.restore();
    }

    // The PARRY button on a touch screen: its rest as a ring that fills back
    h.parryButton = () => {
    if (touchUI) {
        const b = PARRY.button, ready = g.parryCool <= 0;
        ctx.save();
        ctx.fillStyle = ready ? 'rgba(13, 12, 29, 0.55)' : 'rgba(13, 12, 29, 0.35)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
        ctx.stroke();
        ctx.strokeStyle = '#22d3ee';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - g.parryCool / PARRY.cooldown)); ctx.stroke();
        ctx.fillStyle = ready ? '#f1f0f7' : 'rgba(241, 240, 247, 0.45)';
        ctx.font = '800 15px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PARRY', b.x, b.y);
        ctx.restore();
    }
    };

    // Top left: each power-up on, its icon and a bar that empties; under XMP the MHz meter
    h.powerups = (p, top = 34) => {
        let y = top;
        for (const a of p.active.values()) {
            const def = POWERUPS[a.id];
            if (!p.blinkOff(a.remaining)) p.icon(ctx, 34, y, 18, def.color, a.id);
            ctx.fillStyle = 'rgba(13, 12, 29, 0.7)';
            ctx.fillRect(60, y - 5, 120, 10);
            ctx.fillStyle = def.color;
            ctx.fillRect(60, y - 5, 120 * Math.max(0, a.remaining / def.duration), 10);
            ctx.font = '700 12px system-ui, sans-serif';
            ctx.fillStyle = '#f1f0f7';
            ctx.textAlign = 'left';
            ctx.fillText(def.name, 60, y - 10);
            y += 46;
        }
        if (p.isOn('xmp') || p.mhz > POWERUPS.xmp.mhz[0] + 5) {
            ctx.font = '800 15px ui-monospace, monospace';
            ctx.fillStyle = POWERUPS.xmp.color;
            ctx.textAlign = 'left';
            ctx.fillText(`${Math.round(p.mhz)} MHz`, 60, y - 18);
        }
    };


    h.hint = drawHint;
    h.pause = drawPause;

    // The pause button, top right (8c.2): two bars, or a play triangle while paused (it resumes too)
    h.pauseButton = (paused) => {
        const b = PAUSE_BUTTON, r = b.size / 2;
        ctx.save();
        // solid while paused: it is drawn over the button of the last frame, whose bars must not show through
        ctx.fillStyle = paused ? '#15132e' : 'rgba(13, 12, 29, 0.6)';
        ctx.strokeStyle = 'rgba(241, 240, 247, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(b.x - r, b.y - r, b.size, b.size, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f1f0f7';
        if (paused) {
            ctx.beginPath(); ctx.moveTo(b.x - 5, b.y - 8); ctx.lineTo(b.x + 9, b.y); ctx.lineTo(b.x - 5, b.y + 8); ctx.closePath(); ctx.fill();
        } else {
            ctx.fillRect(b.x - 8, b.y - 8, 5.5, 16);
            ctx.fillRect(b.x + 2.5, b.y - 8, 5.5, 16);
        }
        ctx.restore();
    };
    h.life = drawLife;
    h.xp = drawXp;
    h.levelUp = drawLevelUp;
    h.over = drawOver;
    return h;
}
