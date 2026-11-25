// game/hud.js — RAM RUSH's HUD: everything drawn over the world that is not the world (plan §8c).
//
// Step 8c.1: moved here as it was, from main.js (the keys line, the pause screen, the hearts, LV and the
// XP bar, the LEVEL UP! banner, the game over, the touch PARRY button) and from powerups.js (a row per
// power-up on, with the MHz meter). Not redrawn, not restyled: the next steps of §8c change it here.
//
// createHud(ctx, g, { txt, touchUI }): g is the running game (main.js), read as the code always read it.
//
// Step 8c.6: on a touch screen the HUD grows by g.hudScale (main.js measures it), each part from its own
// corner or centre, so its text is never under 14 px on the screen; with g.compact the secondary parts hide.
// A desktop draws at scale 1, exactly as before.

import { HERO, HEARTS, XP_BAR, XP_FLOAT, BOSS_BAR, RAM_TIERS, PX_PER_M, PARRY, POWERUPS, POWERUP_ROW, PAUSE_BUTTON } from './config.js';

const W = 960, H = 540;

export function createHud(ctx, g, { txt, touchUI, reducedMotion = false }) {
    const h = {};
    // The hearts' own state: the life last seen (a change starts an animation), the shake and the pop
    // running, which heart just went, the time for the pulse
    const life = { hp: -1, shake: 0, pop: 0, lost: -1, gained: 0, t: 0 };
    // The XP bar's own state: the level it shows (it may lag behind a level up while it fills to the end),
    // how full it is drawn, its flash, and its texts, made again only when a number changes
    const bar = { level: 1, shown: 0, flash: 0, key: '', lv: '', nums: '', tier: '' };

    // Draws fn grown by k around (ax, ay): a corner or a centre of the screen stays put, the part grows
    // inward from it. At 1 (a desktop) it is drawn as it always was.
    const scale = () => g.hudScale || 1;
    function at(ax, ay, k, fn, arg) {
        if (k === 1) { fn(arg); return; }
        ctx.save();
        ctx.translate(ax, ay); ctx.scale(k, k); ctx.translate(-ax, -ay);
        fn(arg);
        ctx.restore();
    }

    // The reminder at the start, bottom centre: the keys, or on a touch screen the swipes (two lines)
    const hintLines = () => (touchUI ? txt().swipes : [txt().keys]);
    function drawHint() {
        const a = Math.min(1, g.hintT / 1.2);   // fades out over its last second
        const lines = hintLines(), lh = 22, bh = lines.length * lh + 8, top = H - 16 - bh;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = '600 15px system-ui, sans-serif';
        let w = 0;
        for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
        w += 32;
        // on a touch screen at the left, clear of the PARRY button at the right
        const left = touchUI ? 16 : (W - w) / 2, cx = left + w / 2;
        ctx.fillStyle = 'rgba(13, 12, 29, 0.72)';
        ctx.beginPath();
        ctx.roundRect(left, top, w, bh, 15);
        ctx.fill();
        ctx.fillStyle = '#f1f0f7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((l, n) => ctx.fillText(l, cx, top + 4 + lh * (n + 0.5)));
        ctx.restore();
    }
    function pauseText() {
        ctx.fillStyle = '#f1f0f7';
        ctx.textAlign = 'center';
        ctx.font = '800 44px system-ui, sans-serif';
        ctx.fillText(txt().paused, W / 2, H / 2 - 6);
        ctx.font = '500 17px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(241, 240, 247, 0.75)';
        ctx.fillText(touchUI ? txt().resumeTouch : txt().resume, W / 2, H / 2 + 30);
    }
    function drawPause() {
        ctx.save();
        ctx.fillStyle = 'rgba(13, 12, 29, 0.6)';
        ctx.fillRect(0, 0, W, H);
        at(W / 2, H / 2, scale(), pauseText);
        ctx.restore();
    }
    // A phone held upright (plan §8c.6): the request to turn it, over the whole picture. Its own sizes:
    // the canvas is at its smallest then (about 0.37 of a screen px per game px).
    function drawRotate() {
        ctx.save();
        ctx.fillStyle = '#0d0c1d';
        ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = 170;
        // a phone lying sideways, and an arrow turning round it
        ctx.lineWidth = 6; ctx.strokeStyle = '#22d3ee';
        ctx.beginPath(); ctx.roundRect(cx - 80, cy - 45, 160, 90, 16); ctx.stroke();
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath(); ctx.arc(cx + 62, cy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(240, 171, 252, 0.9)';
        ctx.beginPath(); ctx.arc(cx, cy, 120, -Math.PI * 0.85, -Math.PI * 0.2); ctx.stroke();
        const ex = cx + 120 * Math.cos(-Math.PI * 0.2), ey = cy + 120 * Math.sin(-Math.PI * 0.2);
        ctx.fillStyle = 'rgba(240, 171, 252, 0.9)';
        ctx.beginPath(); ctx.moveTo(ex + 16, ey - 6); ctx.lineTo(ex - 6, ey - 14); ctx.lineTo(ex + 2, ey + 14); ctx.closePath(); ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f1f0f7';
        ctx.font = '800 56px system-ui, sans-serif';
        ctx.fillText(txt().rotate, cx, 360);
        ctx.font = '500 40px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(241, 240, 247, 0.75)';
        ctx.fillText(txt().rotateSub, cx, 425);
        ctx.restore();
    }

    // The hero's life, top left (the HUD of plan §8c will dress it up): full and empty hearts
    // fill / stroke: colours, overriding the full and empty ones (a heart going, or the last one)
    function heart(x, y, r, full, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x, y + r * 0.9);
        ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.45);
        ctx.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
        ctx.fillStyle = fill || (full ? '#ef4444' : 'rgba(13, 12, 29, 0.7)');
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = stroke || (full ? '#fecaca' : 'rgba(241, 240, 247, 0.45)');
        ctx.stroke();
    }
    // The hearts (8c.3): one per point of life. Losing one: the row shakes, and the heart that went
    // flashes bright red and drains to empty. Gaining one: it pops (1.3 → 1). The last heart: a slow pulse
    // and a red outline. With reduced motion: no shake, pop or pulse; the flash and the outline remain.
    function drawLife(dt = 0) {
        const hp = g.hero.hp;
        life.t += dt;
        if (life.hp >= 0 && hp < life.hp) { life.shake = HEARTS.shake; life.lost = hp; }
        if (life.hp >= 0 && hp > life.hp) { life.pop = HEARTS.pop; life.gained = life.hp; }
        life.hp = hp;
        life.shake = Math.max(0, life.shake - dt);
        life.pop = Math.max(0, life.pop - dt);
        const sx = reducedMotion ? 0 : Math.sin(life.t * 70) * 3 * (life.shake / HEARTS.shake);
        const r0 = HEARTS.radius;
        ctx.save();
        for (let k = 0; k < HERO.maxHp; k++) {
            const x = 30 + k * HEARTS.spacing + sx, y = 30;
            let r = r0, fill, stroke;
            if (k === life.lost && life.shake > 0) {
                // the one that went: bright red, draining to the empty colour
                const f = life.shake / HEARTS.shake;
                fill = `rgba(255, 90, 90, ${0.2 + 0.8 * f})`; stroke = '#ffffff';
            } else if (k >= life.gained && k < hp && life.pop > 0 && !reducedMotion) {
                r = r0 * (1 + (HEARTS.popScale - 1) * life.pop / HEARTS.pop);
            }
            if (hp === 1 && k === 0) {
                stroke = '#ff2d2d';
                if (!reducedMotion) r = r0 * (1 + 0.1 * Math.sin(life.t * Math.PI * 2 * HEARTS.pulse));
                ctx.save(); ctx.shadowColor = '#ff2d2d'; ctx.shadowBlur = 10;
                heart(x, y, r, true, fill, stroke);
                ctx.restore();
                continue;
            }
            heart(x, y, r, k < hp, fill, stroke);
        }
        ctx.restore();
    }
    // Under the hearts: the level and his RAM tier, and the XP bar to the next level (the HUD of §8c will
    // dress it up); it fills smoothly, not in jumps
    // The XP bar (8c.4): "LV n" at its start, xp / xpNeeded in its middle, his RAM tier after it. It fills
    // smoothly; on a level up it runs to the end first, flashes, and starts again from what is left over
    // (several levels at once: one after the other).
    function drawXp(dt) {
        const pr = g.prog, B = XP_BAR;
        if (pr.level < bar.level) { bar.level = pr.level; bar.shown = 0; }      // a new run
        const behind = bar.level < pr.level;
        const target = behind ? 1 : pr.into / pr.need;
        bar.shown += (target - bar.shown) * (1 - Math.exp(-B.fill * dt));
        if (behind && bar.shown > 0.985) { bar.level++; bar.shown = 0; bar.flash = B.flash; }
        bar.flash = Math.max(0, bar.flash - dt);
        g.xpShown = bar.shown;
        // the texts, only when a number changes (no new strings each frame)
        const level = bar.level, into = behind ? pr.need : pr.into, need = behind ? into : pr.need;
        const key = level * 1e9 + into * 1e4 + need;
        if (key !== bar.key) {
            bar.key = key;
            bar.lv = `LV ${level}`;
            bar.nums = behind ? '' : `${into} / ${need}`;
            bar.tier = RAM_TIERS[Math.min(RAM_TIERS.length - 1, level - 1)].name;   // the tier of the level shown
        }
        ctx.save();
        ctx.fillStyle = 'rgba(13, 12, 29, 0.75)';
        ctx.beginPath(); ctx.roundRect(B.x, B.y, B.w, B.h, B.h / 2); ctx.fill();
        // the fill, clipped to the bar's round ends
        ctx.save();
        ctx.beginPath(); ctx.roundRect(B.x, B.y, B.w, B.h, B.h / 2); ctx.clip();
        ctx.fillStyle = bar.flash > 0 ? `rgba(255, 240, 255, ${0.6 + 0.4 * bar.flash / B.flash})` : B.color;
        ctx.fillRect(B.x, B.y, B.w * Math.max(0, Math.min(1, bar.shown)), B.h);
        ctx.restore();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(241, 240, 247, 0.35)';
        ctx.beginPath(); ctx.roundRect(B.x, B.y, B.w, B.h, B.h / 2); ctx.stroke();
        ctx.font = '800 11px system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(13, 12, 29, 0.9)';
        ctx.fillStyle = '#f1f0f7';
        const cy = B.y + B.h / 2 + 0.5;
        ctx.textAlign = 'left';
        ctx.strokeText(bar.lv, B.x + 7, cy); ctx.fillText(bar.lv, B.x + 7, cy);
        ctx.textAlign = 'center';
        if (bar.nums) { ctx.strokeText(bar.nums, B.x + B.w / 2 + 12, cy); ctx.fillText(bar.nums, B.x + B.w / 2 + 12, cy); }
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f0abfc';
        ctx.strokeText(bar.tier, B.x + B.w + 8, cy); ctx.fillText(bar.tier, B.x + B.w + 8, cy);
        ctx.restore();
    }
    // LEVEL UP!: a banner with the new tier, fading out over its time (XP_BAR.banner)
    function levelUpText() {
        const k = g.levelT / XP_BAR.banner;
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
    function overText() {
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
        ctx.fillText(touchUI ? txt().againTouch : txt().again, W / 2, H / 2 + 74);
    }
    function drawOver() {
        ctx.save();
        ctx.fillStyle = 'rgba(13, 12, 29, 0.72)';
        ctx.fillRect(0, 0, W, H);
        at(W / 2, H / 2, scale(), overText);
        ctx.restore();
    }

    // The PARRY button on a touch screen: its rest as a ring that fills back. It grows with the HUD from the
    // bottom right corner, but at most by b.maxScale (the road ahead stays seen); its label grows in full.
    let parryLabel = 1;
    h.parryButton = () => {
        if (!touchUI) return;
        const k = Math.min(scale(), PARRY.button.maxScale);
        parryLabel = scale() / k;
        at(W, H, k, drawParryButton);
    };
    function drawParryButton() {
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
        ctx.font = `800 ${Math.round(15 * parryLabel)}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PARRY', b.x, b.y);
        ctx.restore();
    }

    // Top left: each power-up on, its icon and a bar that empties; under XMP the MHz meter
    // What each power-up does, in words built from its numbers in config.js (8c.5), made once: e.g. XMP
    // "RAM ×1.6 speed · ×1.7 rate · ×1.5 damage" (a rate is how often: 1 / its cooldown multiplier)
    const x1 = (v) => `×${Math.round(v * 10) / 10}`;
    function effect(id) {
        const d = POWERUPS[id], f = txt().fx, m = d.mults || {}, parts = [];
        if (m.speedMult) parts.push(`${x1(m.speedMult)} ${f.speed}`);
        if (m.rofMult) parts.push(`${x1(1 / m.rofMult)} ${f.rate}`);
        if (m.damageMult) parts.push(`${x1(m.damageMult)} ${f.damage}`);
        if (parts.length) return `RAM ${parts.join(' · ')}`;
        if (d.shield) return f.shield(d.shield);
        if (d.every) return f.drone(d.every);
        return '';
    }
    const effects = {};
    for (const id of Object.keys(POWERUPS)) effects[id] = effect(id);
    h.effects = effects;

    // One row per power-up on (8c.5): its icon, its name, a bar of the time left, what it does. Taken (or
    // taken again): the icon pops and the name shines in its colour for a moment. The last seconds blink.
    // On a small canvas (g.compact) only the icon and the time bar: no name, no effect, no MHz meter
    let rowsTop = 34;
    h.powerups = (p, top = 34) => { rowsTop = top; at(0, 0, scale(), drawRows, p); };
    function drawRows(p) {
        let y = rowsTop;
        const R = POWERUP_ROW, compact = !!g.compact;
        for (const a of p.active.values()) {
            const def = POWERUPS[a.id];
            const since = p.t - (a.at ?? -99);
            const pop = !reducedMotion && since < R.pop ? 1 + (R.popScale - 1) * (1 - since / R.pop) : 1;
            if (!p.blinkOff(a.remaining)) p.icon(ctx, 34, y, 18 * pop, def.color, a.id);
            ctx.fillStyle = 'rgba(13, 12, 29, 0.7)';
            ctx.fillRect(60, y - 5, 120, 10);
            ctx.fillStyle = def.color;
            ctx.fillRect(60, y - 5, 120 * Math.max(0, a.remaining / def.duration), 10);
            if (compact) { y += R.compactGap; continue; }
            ctx.font = '700 12px system-ui, sans-serif';
            ctx.textAlign = 'left';
            const shine = since < R.shine;
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(13, 12, 29, 0.85)';
            ctx.strokeText(def.name, 60, y - 10);
            ctx.fillStyle = shine ? def.color : '#f1f0f7';
            ctx.fillText(def.name, 60, y - 10);
            ctx.font = '600 10px system-ui, sans-serif';
            ctx.strokeText(effects[a.id], 60, y + 15);
            ctx.fillStyle = 'rgba(241, 240, 247, 0.8)';
            ctx.fillText(effects[a.id], 60, y + 15);
            y += R.gap;
        }
        if (!compact && (p.isOn('xmp') || p.mhz > POWERUPS.xmp.mhz[0] + 5)) {
            ctx.font = '800 15px ui-monospace, monospace';
            ctx.fillStyle = POWERUPS.xmp.color;
            ctx.textAlign = 'left';
            ctx.fillText(`${Math.round(p.mhz)} MHz`, 60, y - 18);
        }
    }

    h.hint = () => at(touchUI ? 0 : W / 2, H, scale(), drawHint);
    h.hintLines = hintLines;
    h.pause = drawPause;
    h.rotate = drawRotate;

    // The pause button, top right (8c.2): two bars, or a play triangle while paused (it resumes too)
    h.pauseButton = (paused) => at(W, 0, scale(), drawPauseButton, paused);
    function drawPauseButton(paused) {
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
    }
    h.life = (dt) => at(0, 0, scale(), drawLife, dt);

    // The floating "+XP" (8c.7): a fixed pool, nothing made per frame (each text is made once, when it is
    // won). Full, the oldest gives way. It rises and fades, and drifts back with the road (dx).
    const floats = Array.from({ length: XP_FLOAT.max }, () => ({ on: false, x: 0, y: 0, t: 0, text: '' }));
    h.floatXp = (x, y, n) => {
        let f = floats.find(o => !o.on);
        if (!f) f = floats.reduce((a, b) => (b.t > a.t ? b : a));
        f.on = true; f.x = x; f.y = y; f.t = 0; f.text = `+${n} XP`;
    };
    h.clearFloats = () => { for (const f of floats) f.on = false; };
    function drawFloat(f) {
        const k = f.t / XP_FLOAT.life;
        ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        const y = f.y - (reducedMotion ? 0 : XP_FLOAT.rise * (1 - (1 - k) * (1 - k)));
        ctx.strokeText(f.text, f.x, y);
        ctx.fillText(f.text, f.x, y);
    }
    h.floats = (dt, dx) => {
        ctx.save();
        ctx.font = `900 ${XP_FLOAT.font}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(13, 12, 29, 0.85)'; ctx.fillStyle = XP_FLOAT.color;
        for (const f of floats) {
            if (!f.on) continue;
            f.t += dt; f.x -= dx;
            if (f.t >= XP_FLOAT.life) { f.on = false; continue; }
            at(f.x, f.y, scale(), drawFloat, f);
        }
        ctx.restore();
    };
    h.floatInfo = () => floats.filter(f => f.on).map(f => ({ x: f.x, y: f.y, t: f.t, text: f.text }));

    // The boss's life bar (8c.7), over its head while it stands: its name, the red of its life, and the pale
    // trail of the damage just done, which waits a moment and then drains down to it. A hit flashes it.
    const boss = { who: null, trail: 1, hold: 0 };
    let bossNow = null;
    function drawBossBar() {
        const s = bossNow, B = BOSS_BAR, life = Math.max(0, s.hp) / s.def.hp;
        const x = s.x - B.w / 2, y = s.y - s.drawH - B.gap - B.h;
        ctx.save();
        ctx.fillStyle = 'rgba(10, 6, 24, 0.8)';
        ctx.beginPath(); ctx.roundRect(x - 3, y - 3, B.w + 6, B.h + 6, (B.h + 6) / 2); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.roundRect(x, y, B.w, B.h, B.h / 2); ctx.clip();
        ctx.fillStyle = B.trail;
        ctx.fillRect(x, y, B.w * boss.trail, B.h);
        ctx.fillStyle = s.flash > 0 ? '#ffffff' : B.color;
        ctx.fillRect(x, y, B.w * life, B.h);
        ctx.restore();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(241, 240, 247, 0.4)';
        ctx.beginPath(); ctx.roundRect(x, y, B.w, B.h, B.h / 2); ctx.stroke();
        ctx.font = '800 11px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(13, 12, 29, 0.9)';
        ctx.strokeText(txt().boss, s.x, y - 5);
        ctx.fillStyle = '#fecdd3';
        ctx.fillText(txt().boss, s.x, y - 5);
        ctx.restore();
    }
    h.bossBar = (s, dt) => {
        bossNow = s;
        if (!s) { boss.who = null; return; }
        const life = Math.max(0, s.hp) / s.def.hp;
        if (boss.who !== s) { boss.who = s; boss.trail = life; boss.hold = 0; boss.hp = s.hp; }
        if (s.hp < boss.hp) boss.hold = BOSS_BAR.hold;          // a new blow: the trail waits again
        boss.hp = s.hp;
        boss.hold = Math.max(0, boss.hold - dt);
        if (boss.hold <= 0) boss.trail = Math.max(life, boss.trail - BOSS_BAR.drain * dt);
        boss.trail = Math.max(boss.trail, life);
        at(s.x, s.y - s.drawH - BOSS_BAR.gap, scale(), drawBossBar);
    };
    h.bossInfo = () => (boss.who ? { trail: boss.trail, hold: boss.hold, life: Math.max(0, boss.who.hp) / boss.who.def.hp } : null);
    // For the tests: what the hearts are doing now
    h.info = () => ({ shake: life.shake, pop: life.pop, lost: life.lost, last: g.hero.hp === 1,
        bar: { level: bar.level, shown: bar.shown, flash: bar.flash, nums: bar.nums } });
    h.rows = (p) => [...p.active.values()].map(a => ({ id: a.id, remaining: a.remaining, since: p.t - (a.at ?? -99), blinkOff: p.blinkOff(a.remaining) }));
    h.xp = (dt) => at(0, 0, scale(), drawXp, dt);
    h.levelUp = () => at(W / 2, 150, scale(), levelUpText);
    h.over = drawOver;
    return h;
}
