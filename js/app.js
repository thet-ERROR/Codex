const API = 'https://codex-backend-9kij.onrender.com/api';
let inventory = [], filtered = [], currentTab = 'live', index = 0, compareList = [];
let currentGalleryPC = null, galleryIndex = 0;
let cart = JSON.parse(localStorage.getItem('codex_cart')) || [];
let activeEvent = null;
let isLoggedIn = false;
let currentTicketCode = "";
let achievements = JSON.parse(localStorage.getItem('codex_achievements')) || { 'login': false, 'cart': false, 'vote': false };
let wishlist = JSON.parse(localStorage.getItem('codex_wishlist')) || [];
const achList = [
    { id: 'login', title: 'AGENT RECRUITED', desc: 'Logged in for the first time.', icon: 'ph-identification-card' },
    { id: 'cart', title: 'FIRST LOOT', desc: 'Added an item to the cart.', icon: 'ph-shopping-cart' },
    { id: 'vote', title: 'VOTE CASTER', desc: 'Participated in a community vote.', icon: 'ph-thumbs-up' }
];

let audioEnabled = localStorage.getItem('codex_audio') !== 'false';
let crtEnabled = localStorage.getItem('codex_crt') !== 'false';
let currentTheme = localStorage.getItem('codex_theme') || '#ccff00';
let matrixEnabled = false;
let isHacked = false;

const audioClick = new Audio('assets/audio/click.mp3');
const audioHover = new Audio('assets/audio/hover.mp3');
const audioStart = new Audio('assets/audio/startup.mp3');
const bgMusic = new Audio('assets/audio/bg.mp3'); 
bgMusic.loop = true;

let savedVol = localStorage.getItem('codex_volume');
bgMusic.volume = savedVol ? parseFloat(savedVol) : 0.1;
function toggleWishlist(id) {
    const pc = inventory.find(p => (p._id || p.id) === id);
    if(!pc) return;

    const index = wishlist.findIndex(p => (p._id || p.id) === id);
    if(index > -1) {
        wishlist.splice(index, 1);
        showToast("TARGET REMOVED FROM WISHLIST", "normal");
    } else {
        wishlist.push(pc);
        showToast("TARGET LOCKED: SAVED TO PROFILE", "achievement");
    }
    
    localStorage.setItem('codex_wishlist', JSON.stringify(wishlist));
    renderCard(); // Ανανεώνει την κάρτα για να αλλάξει χρώμα το εικονίδιο
}
function playClick() { if(audioEnabled) { audioClick.currentTime=0; audioClick.play().catch(()=>{}); } }
function playHover() { if(audioEnabled) { audioHover.currentTime=0; audioHover.play().catch(()=>{}); } }

document.documentElement.style.setProperty('--neon-green', currentTheme);
if(!crtEnabled) document.querySelector('.scanlines').style.display = 'none';

window.onload = async () => {
    // ΑΥΤΟΜΑΤΟ LOGIN ΑΠΟ ΤΟ LOCALSTORAGE
    const savedUser = localStorage.getItem('codex_logged_user');
    if (savedVol) bgMusic.volume = parseFloat(savedVol); // (Υπήρχε ήδη)
    
    if (savedUser) {
        isLoggedIn = true;
        setTimeout(() => {
            const userDisplay = document.getElementById('user-display');
            const dossierName = document.getElementById('dossier-username');
            if (userDisplay) userDisplay.innerText = savedVol.toUpperCase(); // fallback
            if (dossierName) dossierName.innerText = savedVol.toUpperCase();
            
            // Ψάχνουμε αν έχουμε αποθηκεύσει το username
            let localUser = localStorage.getItem('codex_username') || "AGENT";
            if(userDisplay) userDisplay.innerText = localUser.toUpperCase();
            if(dossierName) dossierName.innerText = lowerText = localUser.toUpperCase();
            
            updateAuthStates(true, localUser);
        }, 1000);
    }
    const overlay = document.getElementById('startup-overlay');
    const bar = document.getElementById('loader-fill');
    
    if(audioEnabled) audioStart.play().catch(e => console.log("Audio blocked by browser"));
    
    document.body.addEventListener('click', function() {
        if (audioEnabled && bgMusic.paused) { bgMusic.play().catch(()=>{}); }
    }, { once: true });

    const volSlider = document.getElementById('vol-slider');
    const volDisp = document.getElementById('vol-display');
    if(volSlider) volSlider.value = bgMusic.volume * 100;
    if(volDisp) volDisp.innerText = Math.round(bgMusic.volume * 100) + "%";

    setTimeout(() => { if(bar) bar.style.width = "100%"; }, 500);
    setTimeout(() => { if(overlay) overlay.classList.add('hidden'); }, 1500);
    
    initInteractiveTutorial();
    
    try {
        const [resDrops, resVote] = await Promise.all([
            fetch(`${API}/drops`), 
            fetch(`${API}/vote-event`)
        ]);
        inventory = await resDrops.json();
        activeEvent = await resVote.json();
    } catch(e) { 
        console.error("Critical: Could not connect to Backend API."); 
    }
    
    filterInv(); 
    updateCartUI(); 
    updateSettingsUI(); 
    renderGlobalReviews(); 
    initMatrix();

    if(activeEvent && activeEvent.title) { 
        renderVoteState(); 
        setInterval(updateTimer, 1000); 
    } else { 
        const vTitle = document.getElementById('v-title');
        const vBtn = document.getElementById('v-btn');
        if(vTitle) vTitle.innerText = "NO ACTIVE VOTE"; 
        if(vBtn) vBtn.disabled = true; 
    }
};

function initInteractiveTutorial() {
    if(!localStorage.getItem('codex_tutorial_done')) {
        const driver = window.driver.js.driver;
        const tour = driver({
            showProgress: true,
            allowClose: true,
            doneBtnText: 'FINISH',
            nextBtnText: 'NEXT >',
            prevBtnText: '< PREV',
            onDestroyed: () => {
                localStorage.setItem('codex_tutorial_done', 'true');
                showToast("ONBOARDING COMPLETE", "achievement");
            },
            steps: [
                { popover: { title: 'WELCOME AGENT', description: 'Initiating System Override. Let us give you a quick tour of the CODEX Terminal.', side: "over", align: 'center' } },
                { element: '#tab-live', popover: { title: 'LIVE DROPS', description: 'Here you will find the currently available, custom-built gaming rigs ready for deployment.', side: "bottom", align: 'start' } },
                { element: '#tab-vault', popover: { title: 'THE VAULT', description: 'Access classified systems that are either sold out or incoming. Keep an eye out for legendary drops.', side: "bottom", align: 'start' } },
                { element: '.cart-btn', popover: { title: 'YOUR LOOT', description: 'Your secured items are stored here. Check your total and proceed to secure checkout.', side: "bottom", align: 'end' } },
                { element: '.cli-btn', popover: { title: 'THE TERMINAL', description: 'Click here or press the [`] key to open the command line interface. Try typing "hack" inside it.', side: "bottom", align: 'end' } },
                { element: '.add-review-btn', popover: { title: 'MISSION CODES', description: 'Found a physical code in your PC box? Enter it here to validate your system and unlock achievements.', side: "left", align: 'center' } }
            ]
        });
        setTimeout(() => { tour.drive(); }, 2000);
    }
}

function openModal(id) { 
    let m = document.getElementById(id) || document.getElementById(id + '-modal');
    if(m) {
        if (id === 'gallery-overlay') {
            m.style.display = 'flex';
        } else {
            m.classList.add('active'); 
        }
    }
}

function closeModal(id) { 
    let m = document.getElementById(id) || document.getElementById(id + '-modal');
    if(m) {
        m.classList.remove('active'); 
        if (id === 'gallery-overlay') {
            m.style.display = 'none';
        }
    }
}

function showToast(msg, type = 'normal') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function openRecovery() { closeModal('login-modal'); openModal('forgot-modal'); }
async function requestReset() {
    const email = document.getElementById('forgot-email').value;
    if(!email) return alert("ENTER EMAIL");
    try {
        const res = await fetch(`${API}/forgot-password`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email }) });
        const data = await res.json();
        if(data.success) { showToast("TOKEN SENT TO EMAIL", "achievement"); closeModal('forgot-modal'); openModal('reset-modal'); } 
        else { alert(data.error || "EMAIL NOT FOUND"); }
    } catch(e) { alert("SERVER ERROR"); }
}

async function completeReset() {
    const token = document.getElementById('reset-token').value;
    const newPass = document.getElementById('new-pass').value;
    try {
        const res = await fetch(`${API}/reset-password`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ token, newPass }) });
        const data = await res.json();
        if(data.success) { showToast("ACCESS RESTORED", "achievement"); closeModal('reset-modal'); openModal('login-modal'); } 
        else { alert(data.error || "INVALID TOKEN"); }
    } catch(e) { alert("SERVER ERROR"); }
}

async function handleSignup() {
    const user = document.getElementById('reg-user').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    
    if(!user || !email || !pass) {
        alert("SYSTEM ALERT: ALL FIELDS REQUIRED FOR RECRUITMENT");
        return;
    }

    const res = await fetch(`${API}/register`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ username: user, email: email, password: pass }) 
    });
    const d = await res.json();
    
    if(d.success) {
        // Κάνουμε αυτόματο login αμέσως μετά το register
        localStorage.setItem('codex_logged_user', 'true');
        localStorage.setItem('codex_username', d.username);
        
        updateAuthStates(true, d.username);
        showToast("WELCOME AGENT: " + d.username.toUpperCase(), "achievement"); 
        closeModal('signup-modal'); 
        checkAchievement('login'); 
    } else { 
        alert(d.error); 
    }
}

async function handleLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    try {
        const res = await fetch(`${API}/user-login`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ username: user, password: pass }) 
        });
        const d = await res.json();

        if (d.success) {
            isLoggedIn = true;
            // Αποθηκεύουμε τα στοιχεία τοπικά
            localStorage.setItem('codex_logged_user', 'true');
            localStorage.setItem('codex_username', d.username);

            updateAuthStates(true, d.username);
            showToast('WELCOME BACK, AGENT ' + d.username.toUpperCase(), 'normal');
            closeModal('login-modal');
            checkAchievement('login');
        } else {
            alert(d.error || "INVALID CREDENTIALS");
        }
    } catch(e) { alert("SERVER ERROR"); }
}

function logout() { 
    isLoggedIn = false; 
    // Σβήνουμε τα δεδομένα από τον browser
    localStorage.removeItem('codex_logged_user');
    localStorage.removeItem('codex_username');
    
    updateAuthStates(false, "");
    showToast("LOGGED OUT", "normal"); 
}

// Βοηθητική συνάρτηση που αλλάζει ταυτόχρονα όλα τα UI στοιχεία
function updateAuthStates(loggedIn, username) {
    isLoggedIn = loggedIn;
    const userDisplay = document.getElementById('user-display');
    const dossierName = document.getElementById('dossier-username');
    
    if (loggedIn) {
        if (userDisplay) userDisplay.innerText = username.toUpperCase();
        if (dossierName) dossierName.innerText = username.toUpperCase();
        document.getElementById('guest-options').classList.add('hidden');
        document.getElementById('user-options').classList.remove('hidden');
    } else {
        if (userDisplay) userDisplay.innerText = "GUEST";
        document.getElementById('guest-options').classList.remove('hidden');
        document.getElementById('user-options').classList.add('hidden');
    }
    updateAuthMenuUI();
}

function initMatrix() {
    const canvas = document.getElementById('matrix-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ';
    const fontSize = 16;
    const columns = canvas.width/fontSize;
    const drops = Array(Math.floor(columns)).fill(1);
    
    const draw = () => { 
        if(!matrixEnabled) return;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height); 
        ctx.fillStyle = '#0f0'; 
        ctx.font = fontSize + 'px monospace'; 
        drops.forEach((y, i) => {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, y * fontSize);
            if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        });
    }; 
    setInterval(draw, 33);
}

document.addEventListener('keydown', (e) => { if (e.key === '`') { e.preventDefault(); toggleCLI(); } });

function toggleCLI() { 
    const cli = document.getElementById('cli-overlay'); 
    const input = document.getElementById('cli-input'); 
    if(!cli) return;
    cli.classList.toggle('active'); 
    if (cli.classList.contains('active')) input.focus(); 
}

const cliInput = document.getElementById('cli-input');
if(cliInput) {
    cliInput.addEventListener('keypress', function (e) { 
        if (e.key === 'Enter') { 
            const cmd = this.value.trim().toLowerCase(); 
            const output = document.getElementById('cli-output'); 
            this.value = ''; 
            output.innerText += `\nvisitor@codex:~$ ${cmd}\n`; 
            
            if (cmd === 'help') { 
                output.innerText += "AVAILABLE COMMANDS:\n  help        - Show this list\n  clear       - Clear terminal\n  hack        - Toggle SYSTEM OVERRIDE\n  loot        - [CLASSIFIED]\n  codex       - [CLASSIFIED]\n  exit        - Close terminal\n"; 
            } else if (cmd === 'clear') { 
                output.innerText = "CODEX TERMINAL v1.0 [SECURE CONNECTION ESTABLISHED]"; 
            } else if (cmd === 'exit') { 
                toggleCLI(); 
            } else if (cmd === 'hack') { 
                toggleHackMode(); 
                output.innerText += isHacked ? ">> SYSTEM COMPROMISED. ACCESS GRANTED.\n" : ">> SYSTEM RESTORED. PROTOCOLS NORMAL.\n"; 
            } else if (cmd === 'loot') {
                output.innerText += ">> DECRYPTING VAULT...\n>> HIDDEN COMMUNIQUE FOUND:\n>> TELL THE ADMIN THE CODE 'CYBER10' ON WHATSAPP FOR A SURPRISE.\n";
            } else if (cmd === 'codex') {
                output.innerText += ">> ACCESSING MAINFRAME...\n>> WAKE UP, AGENT.\n>> THE MATRIX HAS YOU.\n";
            } else { 
                output.innerText += `Command not found: ${cmd}\n`; 
            } 
            output.scrollTop = output.scrollHeight; 
        } 
    });
}

function toggleHackMode() { 
    isHacked = !isHacked; 
    matrixEnabled = isHacked; 
    const canvas = document.getElementById('matrix-canvas');
    if(isHacked) { 
        if(canvas) canvas.style.opacity = '0.3'; 
        document.documentElement.style.setProperty('--neon-green', '#00ff00'); 
    } else { 
        if(canvas) canvas.style.opacity = '0'; 
        document.documentElement.style.setProperty('--neon-green', currentTheme); 
    } 
}

async function checkMissionCode() {
    const code = prompt("ENTER MISSION CODE (Found in Box):"); 
    if(!code) return; 
    try {
        const res = await fetch(`${API}/check-code/${code}`);
        if (!res.ok) throw new Error(`Server Error: ${res.status}`); 
        const data = await res.json();
        if (!data.valid) { alert("❌ " + data.msg); return; }
        if (data.expired) { alert("⚠️ MISSION EXPIRED. 48 HOURS HAVE PASSED."); return; }
        currentTicketCode = code;
        const pcNameElement = document.getElementById('mission-pc-name');
        if(pcNameElement) pcNameElement.innerText = data.pcName;
        startMissionTimer(data.timeLeft);
        openModal('mission-modal');
    } catch (error) {
        console.error("⛔ CONNECTION ERROR:", error);
        alert("⚠️ ΣΦΑΛΜΑ ΣΥΝΔΕΣΗΣ!\nΟ Server δεν ανταποκρίνεται.");
    }
}

function startMissionTimer(ms) {
    const timerEl = document.getElementById('mission-timer');
    let timeLeft = ms;
    const interval = setInterval(() => { 
        timeLeft -= 1000; 
        if (timeLeft <= 0) { 
            clearInterval(interval); 
            if(timerEl) timerEl.innerText = "EXPIRED"; 
        } else { 
            const h = Math.floor(timeLeft / (1000 * 60 * 60)); 
            const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)); 
            const s = Math.floor((timeLeft % (1000 * 60)) / 1000); 
            if(timerEl) timerEl.innerText = `${h}h ${m}m ${s}s`; 
        } 
    }, 1000);
}

function openReviewForm() { 
    closeModal('mission-modal'); 
    const codeEl = document.getElementById('rc-code');
    if(codeEl) { codeEl.value = currentTicketCode; codeEl.disabled = true; }
    openModal('review-code-modal'); 
}

function requestReturn() {
    const reasonSelect = document.getElementById('return-reason');
    const reasonValue = reasonSelect.value;
    const pcNameEl = document.getElementById('mission-pc-name');
    const pcName = pcNameEl ? pcNameEl.innerText : "Unknown";
    
    if (!reasonValue) { alert("⚠️ SYSTEM ALERT: Please select a valid Error Protocol."); return; }
    let reasonText = "";
    switch(reasonValue) { 
        case "1": reasonText = "FPS / Performance Mismatch"; break; 
        case "2": reasonText = "Hardware Defect / DOA"; break; 
        case "3": reasonText = "Specification Mismatch"; break; 
        case "4": reasonText = "Other Critical Error"; break; 
    }
    const msg = `🚨 **RETURN SIGNAL** 🚨%0A%0A📦 **System:** ${pcName}%0A🎫 **Code:** ${currentTicketCode}%0A⚠️ **Reason:** ${reasonText}%0A%0AWaiting for authorization...`;
    window.open(`https://wa.me/306912345678?text=${msg}`, '_blank');
}

function renderGlobalReviews() {
    const rList = document.getElementById('review-list');
    if(!rList) return;
    let allReviews = [];
    inventory.forEach(pc => { 
        if(pc.reviews) { pc.reviews.forEach(r => { allReviews.push({ ...r, pcName: pc.name }); }); } 
    });
    allReviews.sort((a,b) => new Date(b.date) - new Date(a.date));
    if(allReviews.length === 0) { 
        rList.innerHTML = '<div style="color:#666;text-align:center;margin-top:50px; font-size:0.8rem;">NO TRANSMISSIONS YET</div>'; 
    } else { 
        rList.innerHTML = allReviews.map(r => { 
            const date = r.date ? new Date(r.date).toLocaleDateString() : 'RECENT'; 
            return `<div class="review-card">
                        <span class="r-date">${date}</span>
                        <div class="r-user">${r.user} <span class="r-stars">★${r.rating}</span></div>
                        <div style="font-size:0.7rem; color:var(--neon-purple); margin-bottom:4px; font-weight:bold;">PURCHASED: ${r.pcName}</div>
                        <div class="r-text">"${r.text}"</div>
                    </div>`; 
        }).join(''); 
    }
}

async function submitNewsletter() {
    const email = document.getElementById('nl-email').value;
    if(!email || !email.includes('@')) { showToast("SYNTAX ERROR: MISSING '@' SYMBOL", "error"); return; }
    try {
        const res = await fetch(`${API}/newsletter`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
        const d = await res.json();
        if(d.success) { showToast("WELCOME TO THE NETWORK", "achievement"); closeModal('newsletter-modal'); } 
        else { showToast("CONNECTION FAILED", "error"); }
    } catch(e) { showToast("SERVER ERROR", "error"); }
}

function toggleAudio() { 
    audioEnabled = !audioEnabled; 
    localStorage.setItem('codex_audio', audioEnabled); 
    if (audioEnabled) { bgMusic.play().catch(e => console.log("Music blocked")); } else { bgMusic.pause(); }
    updateSettingsUI(); 
}

function updateVolume(val) {
    const decimal = val / 100;
    bgMusic.volume = decimal;
    document.getElementById('vol-display').innerText = val + "%";
    localStorage.setItem('codex_volume', decimal);
}

function toggleCRT() { 
    crtEnabled = !crtEnabled; 
    localStorage.setItem('codex_crt', crtEnabled); 
    const scanlines = document.querySelector('.scanlines');
    if(scanlines) scanlines.style.display = crtEnabled ? 'block' : 'none'; 
    updateSettingsUI(); 
}

function setTheme(color) { 
    currentTheme = color; 
    localStorage.setItem('codex_theme', currentTheme); 
    document.documentElement.style.setProperty('--neon-green', currentTheme); 
}

function updateSettingsUI() { 
    const audBtn = document.getElementById('set-audio'); 
    if(audBtn) {
        audBtn.className = audioEnabled ? 'setting-card active' : 'setting-card'; 
        const sTitle = audBtn.querySelector('.s-title');
        if(sTitle) sTitle.innerText = audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF'; 
    }
    const crtBtn = document.getElementById('set-crt'); 
    if(crtBtn) {
        crtBtn.className = crtEnabled ? 'setting-card active' : 'setting-card'; 
        const cTitle = crtBtn.querySelector('.s-title');
        if(cTitle) cTitle.innerText = crtEnabled ? 'CRT FX: ON' : 'CRT FX: OFF'; 
    }
}

function checkAchievement(id) { 
    if(!achievements[id]) { 
        achievements[id] = true; 
        localStorage.setItem('codex_achievements', JSON.stringify(achievements)); 
        showToast(`ACHIEVEMENT UNLOCKED: ${id.toUpperCase()}`, "achievement"); 
    } 
}

function openAchievements() { 
    if(!isLoggedIn) { showToast("ACCESS DENIED. LOGIN REQUIRED.", "normal"); openModal('login-modal'); return; } 
    const list = document.getElementById('ach-list'); 
    if(list) {
        list.innerHTML = achList.map(a => { 
            const unlocked = achievements[a.id]; 
            return `<div class="ach-card ${unlocked ? 'unlocked' : ''}">
                        <i class="ph-fill ${a.icon} ach-icon"></i>
                        <div class="ach-info"><h4>${a.title}</h4><p>${a.desc}</p></div>
                        <div class="ach-status">${unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
                    </div>`; 
        }).join(''); 
    }
    openModal('achievements-modal'); 
}
function openAgentDashboard() {
    // 1. Έλεγχος αν είναι συνδεδεμένος
    if(!isLoggedIn) { 
        showToast("ACCESS DENIED. LOGIN REQUIRED.", "error"); 
        openModal('login-modal'); 
        return; 
    }

    // 2. Ενημέρωση Ονόματος
    const userName = document.getElementById('user-display').innerText || 'UNKNOWN_AGENT';
    const dossierNameEl = document.getElementById('dossier-username');
    if(dossierNameEl) dossierNameEl.innerText = userName;

    // 3. Υπολογισμός Rank (βάσει ξεκλειδωμένων achievements)
    let unlockedCount = Object.values(achievements).filter(val => val === true).length;
    let rank = "RECRUIT";
    if (unlockedCount >= 1) rank = "OPERATIVE";
    if (unlockedCount >= 3) rank = "ELITE AGENT";
    
    const rankEl = document.getElementById('dossier-rank');
    if(rankEl) rankEl.innerText = rank;

    // 4. Ενημέρωση Achievements μέσα στο Dashboard
    const achListContainer = document.getElementById('dossier-achievements');
    if(achListContainer) {
        achListContainer.innerHTML = achList.map(a => { 
            const unlocked = achievements[a.id]; 
            return `<div class="ach-card ${unlocked ? 'unlocked' : ''}" style="margin-bottom:10px; width:100%; box-sizing:border-box;">
                        <i class="ph-fill ${a.icon} ach-icon"></i>
                        <div class="ach-info">
                            <h4>${a.title}</h4>
                            <p style="font-size:0.7rem; color:#888;">${a.desc}</p>
                        </div>
                        <div class="ach-status" style="font-size:0.7rem;">${unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
                    </div>`; 
        }).join(''); 
    }

    // 5. Άνοιγμα του παραθύρου!
    // Ενημέρωση Wishlist μέσα στο Dashboard
    const wishlistContainer = document.getElementById('dossier-wishlist');
    if(wishlistContainer) {
        if(wishlist.length === 0) {
            wishlistContainer.innerHTML = '<div class="dossier-empty">> NO TARGETS LOCKED.</div>';
        } else {
            wishlistContainer.innerHTML = wishlist.map(pc => `
                <div style="display:flex; align-items:center; gap:15px; background:rgba(0,0,0,0.5); padding:10px; border:1px solid #333; border-radius:6px; width:100%; box-sizing:border-box; margin-bottom:10px;">
                    <img src="${pc.images[0]}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border:1px solid var(--neon-purple);">
                    <div>
                        <div style="color:#fff; font-family:var(--font-ui); font-size:0.9rem;">${pc.name}</div>
                        <div style="color:var(--neon-green); font-size:0.8rem; font-family:monospace;">${pc.price}</div>
                    </div>
                    <button onclick="toggleWishlist('${pc._id || pc.id}'); openAgentDashboard();" style="margin-left:auto; background:transparent; border:none; color:#ff3333; cursor:pointer; font-size:1.2rem; transition:0.2s;">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    openModal('agent-dashboard-modal');
}

function switchTab(mode) { 
    currentTab = mode; 
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-live','active-vault','active-starter','active-vote','active-gear')); 
    const tabBtn = document.getElementById(`tab-${mode}`);
    if(tabBtn) tabBtn.classList.add(`active-live`); 
    
    ['carousel-wrapper','starter-menu','gear-view','vote-view'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    
    const label = document.getElementById('stage-label');
    if(mode === 'vote') { 
        document.getElementById('vote-view').classList.remove('hidden'); 
        if(label) label.innerText = "// COMMUNITY VOTE //"; 
    } else if(mode === 'starter') { 
        document.getElementById('starter-menu').classList.remove('hidden'); 
        if(label) label.innerText = "// STARTER PACKS //"; 
    } else if(mode === 'gear') { 
        document.getElementById('gear-view').classList.remove('hidden'); 
        if(label) label.innerText = "// ARMORY //"; 
    } else { 
        document.getElementById('carousel-wrapper').classList.remove('hidden'); 
        if(label) label.innerText = "// SYSTEM SELECT //"; 
        filterInv(); 
    } 
}

function toggleCartDropdown() { 
    const d = document.getElementById('cart-dropdown'); 
    const btn = document.querySelector('.nav-btn.cart-btn'); 
    if(d) d.classList.toggle('show'); 
    if(btn) btn.classList.toggle('active'); 
}

window.onclick = function(event) { 
    if (!event.target.closest('.cart-btn') && !event.target.closest('.cart-dropdown') && !event.target.closest('.add-review-btn')) { 
        const cd = document.getElementById('cart-dropdown');
        if(cd) cd.classList.remove('show'); 
    } 
}

function updateCartUI() { 
    const cCount = document.getElementById('cart-count');
    if(cCount) cCount.innerText = cart.length; 
    
    const items = document.getElementById('mini-cart-items'); 
    let total = 0; 
    if (cart.length === 0) { 
        if(items) items.innerHTML = '<div style="color:#666; text-align:center; padding:20px; font-size:0.9rem;">CART IS EMPTY</div>'; 
    } else { 
        if(items) items.innerHTML = cart.map((item, i) => { 
            total += item.price; 
            return `<div class="mini-cart-item">
                        <img src="${item.img}" class="mc-img">
                        <div class="mc-details">
                            <div class="mc-name">${item.name}</div>
                            <div class="mc-opt">${item.option}</div>
                            <div class="mc-price">€${item.price}</div>
                        </div>
                        <i class="ph-bold ph-x mc-remove" onclick="removeFromCart(${i})"></i>
                    </div>`; 
        }).join(''); 
    } 
    const mcTotal = document.getElementById('mc-total');
    if(mcTotal) mcTotal.innerText = "€" + total; 
}

function addToCart() { 
    if(!currentGalleryPC) return;
    if(currentGalleryPC.stock === 0) return alert("SOLD OUT!"); 
    
    const sel = document.getElementById('storage-select');
    const extra = sel ? parseInt(sel.value) : 0; 
    const base = parseInt(currentGalleryPC.price.replace(/[^0-9]/g, '')) || 0; 
    
    cart.push({ 
        name: currentGalleryPC.name, 
        price: base + extra, 
        option: extra === 50 ? "+1TB HDD" : (extra === 80 ? "+1TB SSD" : "Standard"), 
        img: currentGalleryPC.images[0] 
    }); 
    
    localStorage.setItem('codex_cart', JSON.stringify(cart)); 
    updateCartUI(); 
    
    const dropdown = document.getElementById('cart-dropdown'); 
    if(dropdown) {
        dropdown.classList.add('show'); 
        setTimeout(() => dropdown.classList.remove('show'), 2000); 
    }
    closeModal('gallery-overlay'); 
    showToast("ITEM ADDED TO CART", "normal"); 
    checkAchievement('cart'); 
}

function removeFromCart(i) {
    cart.splice(i, 1); 
    localStorage.setItem('codex_cart', JSON.stringify(cart)); 
    updateCartUI(); 
    playClick();
}

function handleCheckout() { 
    if(cart.length === 0) return alert("Cart is empty!");
    window.open("https://wa.me/306912345678", "_blank"); 
}

function renderVoteState() { 
    if(!activeEvent) return;
    document.getElementById('v-title').innerText = activeEvent.title; 
    document.getElementById('v-price-display').innerText = activeEvent.price ? "ESTIMATED PRICE: €" + activeEvent.price : "";
    document.getElementById('v-img').src = activeEvent.image || ''; 
    const pct = (activeEvent.currentVotes / activeEvent.targetVotes) * 100; 
    document.getElementById('v-fill').style.width = Math.min(pct, 100) + '%'; 
    document.getElementById('v-count').innerText = `${activeEvent.currentVotes} / ${activeEvent.targetVotes} VOTES`; 
    if(activeEvent.currentVotes >= activeEvent.targetVotes) unlockVisuals(); 
}

function updateTimer() { 
    if(!activeEvent) return; 
    const now = new Date(); 
    const start = new Date(activeEvent.startDate); 
    const end = new Date(start.getTime() + (activeEvent.durationDays * 24 * 60 * 60 * 1000)); 
    const btn = document.getElementById('v-btn'); 
    const timer = document.getElementById('v-timer'); 
    
    if(!timer || !btn) return;

    if (now < start) { 
        timer.innerText = `VOTING OPENS IN: ${formatTime(start - now)}`; 
        btn.innerText = "LOCKED"; 
        btn.disabled = true; 
    } else if (now > end) { 
        timer.innerText = "EXPIRED"; 
        timer.style.color = "red"; 
        btn.innerText = "FAILED"; 
        btn.disabled = true; 
    } else { 
        timer.innerText = `TIME REMAINING: ${formatTime(end - now)}`; 
        if(activeEvent.currentVotes < activeEvent.targetVotes) { 
            btn.disabled = false; 
            btn.innerText = "AUTHORIZE DROP"; 
        } 
    } 
}

function formatTime(ms) { 
    const d = Math.floor(ms / (1000*60*60*24)); 
    const h = Math.floor((ms / (1000*60*60)) % 24); 
    const m = Math.floor((ms / 1000 / 60) % 60); 
    return `${d}d ${h}h ${m}m`; 
}

async function castVote() { 
    try {
        const res = await fetch(`${API}/cast-vote`, { method: 'POST' }); 
        const data = await res.json(); 
        if(data.votes) { 
            activeEvent.currentVotes = data.votes; 
            renderVoteState(); 
            showToast("VOTE REGISTERED", "normal"); 
            checkAchievement('vote'); 
        } 
    } catch(e) { console.error("Vote failed."); }
}

function unlockVisuals() { 
    const img = document.getElementById('v-img');
    const lock = document.getElementById('v-lock');
    const btn = document.getElementById('v-btn');
    const buyBtn = document.getElementById('v-buy-btn');

    if(img) img.classList.add('unlocked'); 
    if(lock) lock.style.opacity = '0'; 
    if(btn) {
        btn.innerText = "DROP SECURED"; 
        btn.style.background = "#333"; 
        btn.style.color = "#888"; 
        btn.disabled = true; 
    }
    if(buyBtn) buyBtn.classList.remove('hidden');
}

function buyVotePC() {
    if(!activeEvent) return;
    const msg = `Hello! I want to secure the community drop:%0A%0A- *${activeEvent.title}*%0A- Estimated Price: €${activeEvent.price || 'TBD'}%0A%0AIs it available?`;
    window.open(`https://wa.me/306912345678?text=${msg}`, '_blank');
}

function selectPack(cat) { 
    document.getElementById('starter-menu').classList.add('hidden'); 
    document.getElementById('carousel-wrapper').classList.remove('hidden'); 
    filtered = inventory.filter(p => p.category === cat); 
    index = 0; 
    renderCard(); 
}

function filterInv() { 
    filtered = inventory.filter(p => { 
        if(currentTab === 'live') return (p.category === 'drop' || !p.category) && p.status !== 'coming'; 
        if(currentTab === 'vault') return p.status === 'coming'; 
        return true;
    }); 
    index = 0; 
    renderCard(); 
}

function nextPC() { if(filtered.length) { index=(index+1)%filtered.length; renderCard(); } }
function prevPC() { if(filtered.length) { index=(index-1+filtered.length)%filtered.length; renderCard(); } }

function renderCard() { 
    const c = document.getElementById('main-card'); 
    if(!c) return;
    if(!filtered.length) { c.innerHTML = "<h3>NO SIGNAL</h3>"; return; } 
    
    const pc = filtered[index]; 
    const inCompare = compareList.find(p => p._id === pc._id); 
    const priceVal = parseInt(pc.price.replace(/[^0-9]/g, '')) || 0; 
    const fakeOldPrice = Math.floor(priceVal * 1.2); 
    const stock = pc.stock || 0; 
    
    let stockHTML = ''; 
    if(stock === 0) stockHTML = '<div class="stock-badge out">SOLD OUT</div>'; 
    else if(stock < 5) stockHTML = `<div class="stock-badge low">LOW STOCK: ${stock} UNITS</div>`; 
    else stockHTML = '<div class="stock-badge in">IN STOCK</div>'; 

    let fpsHTML = ''; 
    if(pc.multitasking) fpsHTML += `<div class="fps-row"><span class="fps-name">MULTI</span><div class="bar-track"><div class="bar-fill" data-width="${pc.multitasking}%" style="width:0%"></div></div><span class="fps-num">${pc.multitasking}</span></div>`; 
    if(pc.fps) {
        pc.fps.forEach(f => { 
            let max=200; 
            if(f.game==='Fortnite') max=300; 
            fpsHTML += `<div class="fps-row"><span class="fps-name">${f.game}</span><div class="bar-track"><div class="bar-fill" data-width="${Math.min((f.score/max)*100,100)}%" style="width:0%"></div></div><span class="fps-num">${f.score}</span></div>`; 
        }); 
    }
// Αν το PC δεν έχει lore από τη βάση, βάζουμε ένα default μήνυμα
    const pcLore = pc.lore || "Σύστημα τακτικών επιχειρήσεων. Οι πλήρεις προδιαγραφές βρίσκονται στον φάκελο INSPECT. Απαιτείται εξουσιοδότηση.";
    const inWishlist = wishlist.find(p => (p._id || p.id) === (pc._id || pc.id));
    const wishColor = inWishlist ? "var(--neon-green)" : "#555";
    c.innerHTML = `
        <div class="holo-card-inner">
            <img src="${pc.images[0]||'assets/images/bg.jpg'}" class="hero-img">
            <button onclick="toggleWishlist('${pc._id || pc.id}')" style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.7); border:1px solid ${wishColor}; color:${wishColor}; border-radius:50%; width:40px; height:40px; display:flex; justify-content:center; align-items:center; cursor:pointer; z-index:10; transition:all 0.3s;">
    <i class="ph-bold ph-crosshair" style="font-size:1.3rem;"></i>
</button>
            ${stockHTML}
            <div class="pc-title">${pc.name}</div>
            <div class="card-price-row">
                <div class="pc-price">${pc.price}</div>
                <div class="pc-price-old">€${fakeOldPrice}</div>
            </div>
            
            <div class="sys-brief">
                <div class="sys-brief-title">>// CLASSIFIED_BRIEF</div>
                <div class="sys-brief-text">${pcLore}</div>
            </div>

            <button class="btn-card-inspect" onclick="openGallery()">INSPECT SYSTEM</button>
            <button class="btn-card-compare ${inCompare ? 'selected' : ''}" onclick="toggleCompare('${pc._id || pc.id}', this)">
                ${inCompare ? 'ADDED TO VS' : 'COMPARE'}
            </button>
        </div>
    `;
    
    setTimeout(()=> {
        document.querySelectorAll('.bar-fill').forEach(b=>b.style.width=b.getAttribute('data-width'));
    }, 50); 
}

/* 🌟 YU-GI-OH OPENGALLERY FUNCTION 🌟 */
function openGallery() { 
    currentGalleryPC = filtered[index]; 
    if(!currentGalleryPC) return;
    galleryIndex = 0; 
    
    const cardInner = document.getElementById('yg-card');
    if(cardInner) cardInner.classList.remove('flipped');

    // 1. Basic Info
    const elTitle = document.getElementById('yg-title');
    if(elTitle) elTitle.innerText = currentGalleryPC.name; 
    
    const elDesc = document.getElementById('yg-desc');
    if(elDesc) elDesc.innerText = currentGalleryPC.description || "Detailed specifications for this system.";
    
    const elTag = document.getElementById('yg-tagline');
    if(elTag) elTag.innerText = currentGalleryPC.tagline || "AUTHORIZED SYSTEM BUILD";

    const basePrice = parseInt(currentGalleryPC.price.replace(/[^0-9]/g, '')) || 0; 
    const elLivePrice = document.getElementById('yg-price-live');
    if(elLivePrice) elLivePrice.innerText = "€" + basePrice; 
    
    const elOldPrice = document.getElementById('yg-price-old');
    if(elOldPrice) elOldPrice.innerText = "€" + Math.floor(basePrice * 1.2); 
    
    const elSelect = document.getElementById('storage-select');
    if(elSelect) elSelect.value = "0"; 

    // 2. Power Bar & Tier Badge
    let mScore = currentGalleryPC.multitasking || 0;
    
    const powerFill = document.getElementById('g-power-fill');
    if(powerFill) powerFill.style.width = mScore + "%";

    let tier = mScore > 80 ? 'S-TIER' : (mScore > 50 ? 'A-TIER' : 'B-TIER');
    let tierColor = mScore > 80 ? '#a855f7' : (mScore > 50 ? '#ec48d9' : '#bef264');
    let tierBadge = document.getElementById('yg-tier-badge');
    if(tierBadge) {
        tierBadge.innerText = tier;
        tierBadge.style.background = `linear-gradient(135deg, ${tierColor} 0%, #111 100%)`;
        tierBadge.style.boxShadow = `0 0 20px ${tierColor}80`;
    }

    // 3. Image & Watermark
    const elImg = document.getElementById('yg-main-img');
    if(elImg) elImg.src = currentGalleryPC.images[0] || 'assets/images/bg.jpg';
    
    const elWater = document.getElementById('g-watermark');
    if(elWater) elWater.innerText = currentGalleryPC.name;

    // 4. Quick Spec Pills
    let cpuText = currentGalleryPC.specs && currentGalleryPC.specs.cpu ? currentGalleryPC.specs.cpu.split(' ').slice(0,2).join(' ') : 'CPU';
    let gpuText = currentGalleryPC.specs && currentGalleryPC.specs.gpu ? currentGalleryPC.specs.gpu.split(' ').slice(0,2).join(' ') : 'GPU';
    let ramText = currentGalleryPC.specs && currentGalleryPC.specs.ram ? currentGalleryPC.specs.ram.split(' ')[0] : 'RAM';
    
    const elQuickSpecs = document.getElementById('yg-quick-specs');
    if(elQuickSpecs) {
        elQuickSpecs.innerHTML = `
            <div class="yg-spec-badge"><div class="yg-spec-icon">⚙️</div><span>${cpuText}</span></div>
            <div class="yg-spec-badge"><div class="yg-spec-icon">🎮</div><span>${gpuText}</span></div>
            <div class="yg-spec-badge"><div class="yg-spec-icon">💾</div><span>${ramText}</span></div>
        `;
    }

    // 5. Stock Status
    const stock = currentGalleryPC.stock || 0; 
    const stockContainer = document.getElementById('yg-stock-container');
    const stockBadge = document.getElementById('yg-stock-badge'); 
    const addBtn = document.getElementById('yg-add-cart'); 
    
    if(stockContainer && stockBadge) {
        if(stock === 0) { 
            stockContainer.style.borderColor = "#ff3333";
            stockContainer.style.background = "rgba(255, 51, 51, 0.1)";
            stockBadge.style.color = "#ff3333";
            stockBadge.innerText = "❌ OUT OF STOCK"; 
            if(addBtn) addBtn.disabled = true;
        } 
        else if(stock < 5) { 
            stockContainer.style.borderColor = "#fbbf24";
            stockContainer.style.background = "rgba(251, 191, 36, 0.1)";
            stockBadge.style.color = "#fbbf24";
            stockBadge.innerText = `⚠️ LOW STOCK: ${stock} UNITS`; 
            if(addBtn) addBtn.disabled = false;
        } 
        else { 
            stockContainer.style.borderColor = "#bef264";
            stockContainer.style.background = "rgba(190, 242, 100, 0.1)";
            stockBadge.style.color = "#bef264";
            stockBadge.innerText = "✔️ IN STOCK"; 
            if(addBtn) addBtn.disabled = false;
        } 
    }
    
    // 6. Back Side Detailed Specs
    let backH = ""; 
    if(currentGalleryPC.specs) {
        for(const [k,v] of Object.entries(currentGalleryPC.specs)) { 
            const safeKey = k.replace(/'/g, "\\'"); 
            backH += `
            <div class="yg-spec-item">
                <div class="yg-spec-label">
                    ${k.toUpperCase()}
                    <i class="ph-bold ph-info yg-info-btn" onclick="playClick(); openSpecInfo('${safeKey}')"></i>
                </div>
                <div class="yg-spec-value">${v}</div>
            </div>`; 
        } 
    }
    const elSpecsBack = document.getElementById('yg-specs-back');
    if(elSpecsBack) elSpecsBack.innerHTML = backH; 

    // 7. Back Side Benchmarks
    let benchH = "";
    if (currentGalleryPC.fps && currentGalleryPC.fps.length > 0) {
        currentGalleryPC.fps.forEach(f => {
            let settings = "Competitive / Low";
            if(f.game.toLowerCase().includes('cyberpunk') || f.game.toLowerCase().includes('gta')) settings = "High / Ultra";
            benchH += `
            <div class="yg-benchmark-card">
                <div class="yg-benchmark-game">${f.game}</div>
                <div class="yg-benchmark-fps">${f.score}</div>
                <div class="yg-benchmark-settings">${settings}</div>
            </div>`;
        });
    } else {
        benchH = "<div style='color:#888; font-size:12px; font-style:italic; text-align:center; grid-column: span 2; padding: 20px;'>No benchmark data available.</div>";
    }
    const elBenchmarks = document.getElementById('yg-benchmarks');
    if(elBenchmarks) elBenchmarks.innerHTML = benchH;
    
    openModal('gallery-overlay');
}

function openSpecInfo(key) {
    const pc = currentGalleryPC;
    if(!pc) return;
    
    const titleEl = document.getElementById('spec-info-title');
    const descEl = document.getElementById('spec-info-desc');

    if(titleEl) titleEl.innerText = key.toUpperCase() + " INFO";
    
    if(pc.specDetails && pc.specDetails[key]) {
        if(descEl) descEl.innerText = pc.specDetails[key];
    } else {
        if(descEl) descEl.innerText = "Detailed specifications for this component will be provided by the admin soon.";
    }
    
    openModal('spec-info-modal');
}

function updatePrice() { 
    if(!currentGalleryPC) return;
    const sel = document.getElementById('storage-select');
    const extra = sel ? parseInt(sel.value) : 0; 
    const base = parseInt(currentGalleryPC.price.replace(/[^0-9]/g, '')) || 0; 
    const liveP = document.getElementById('yg-price-live');
    if(liveP) liveP.innerText = "€" + (base + extra); 
}

function toggleCardFlip() {
    const cardInner = document.getElementById('yg-card');
    if (cardInner) {
        cardInner.classList.toggle('flipped');
    }
}

function updateGalleryImage() { 
    const img = document.getElementById('yg-main-img');
    if(img && currentGalleryPC && currentGalleryPC.images) {
        img.src = currentGalleryPC.images[galleryIndex]; 
    }
}

function changeGalleryImage(d) { 
    if(!currentGalleryPC || !currentGalleryPC.images) return;
    galleryIndex = (galleryIndex+d+currentGalleryPC.images.length)%currentGalleryPC.images.length; 
    updateGalleryImage(); 
}

function toggleCompare(id, btnElement) { 
    const pc = filtered[index]; 
    const alreadyInList = compareList.find(p => (p._id || p.id) === id);

    if (alreadyInList) {
        // Αν είναι ήδη μέσα, το αφαιρούμε
        compareList = compareList.filter(p => (p._id || p.id) !== id); 
        if (btnElement) {
            btnElement.classList.remove('selected');
            btnElement.innerText = 'COMPARE';
        }
    } else { 
        if (compareList.length < 2) {
            // Το προσθέτουμε
            compareList.push(pc); 
            if (btnElement) {
                btnElement.classList.add('selected');
                btnElement.innerText = 'ADDED TO VS';
            }
        } else { 
            alert("MAX 2 ITEMS ALLOWED IN VS MODE"); 
        } 
    } 
    
    // Ανανεώνουμε το πλωτό κουμπί (float button) του Compare
    const b = document.getElementById('compare-float'); 
    if(b) {
        if(compareList.length === 2) b.classList.add('active'); 
        else b.classList.remove('active'); 
    }
}
function openCompareModal() { 
    if(compareList.length!==2) return; 
    const c1=compareList[0], c2=compareList[1]; 
    const renderCol = (p) => `
        <div class="compare-col">
            <img src="${p.images[0]}" class="compare-img">
            <h3>${p.name}</h3>
            <div style="color:var(--neon-green);font-weight:bold;margin-bottom:10px;">${p.price}</div>
            <div class="gallery-desc-box">${p.description || 'System Details'}</div>
            ${Object.keys(p.specs).map(k=>`<div class="compare-spec-row"><span class="compare-spec-label">${k.toUpperCase()}</span><span class="compare-spec-val">${p.specs[k]}</span></div>`).join('')}
        </div>
    `; 
    const grid = document.getElementById('compare-grid');
    if(grid) grid.innerHTML = renderCol(c1) + '<div class="compare-divider"></div>' + renderCol(c2); 
    openModal('compare-modal'); 
}

function toggleProfileMenu() { 
    const m = document.getElementById('profile-menu');
    if(m) m.classList.toggle('show'); 
}

function toggleChat() { 
    const c = document.getElementById('chat-widget');
    if(c) c.classList.toggle('open'); 
}

let codexAiState = 'idle'; 

function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function toggleBenchmarksView() {
    const cardBack = document.querySelector('.yg-card-back');
    const btn = document.getElementById('bench-toggle-btn');
    const isShowing = cardBack.classList.toggle('benchmarks-active');

    if (isShowing) {
        btn.innerHTML = '<i class="ph-bold ph-arrow-down"></i> HIDE BENCHMARKS';
        btn.classList.add('bench-active-btn');
        showToast('LOADING BENCHMARK DATA...', 'normal');
    } else {
        btn.innerHTML = '<i class="ph-bold ph-crosshair"></i> SHOW BENCHMARKS';
        btn.classList.remove('bench-active-btn');
    }
}

function sendChat(inputElement) { 
    const text = inputElement.value.trim();
    if(!text) return;

    const chatMsgs = document.getElementById('chat-msgs');
    if(!chatMsgs) return;

    chatMsgs.innerHTML += `<div class="msg user">${text}</div>`; 
    inputElement.value = '';
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    setTimeout(() => {
        const lowerText = removeAccents(text.toLowerCase());
        let botResponse = "";

        if (codexAiState === 'waiting_admin_redirect') {
            if (lowerText === 'ναι' || lowerText.includes('ναι') || lowerText.includes('nai') || lowerText.includes('θελω')) {
                botResponse = "🚀 <b>Εκκίνηση σύνδεσης...</b><br>Σε μεταφέρω στο ασφαλές κανάλι του Admin.";
                setTimeout(() => window.open("https://wa.me/306912345678", "_blank"), 1500); 
            } else {
                botResponse = "Λήψη ελήφθη. 🤖 Τι άλλο θα ήθελες να μάθεις;";
            }
            codexAiState = 'idle'; 
        } 
        else if (codexAiState === 'waiting_budget') {
            const budget = parseInt(lowerText.replace(/[^0-9]/g, '')); 
            if (budget > 0) {
                botResponse = `💰 Με budget <b>€${budget}</b>, τσέκαρε τα <b>STARTER PACKS</b> ή ρώτα τον Admin για Custom Build!<br><br><button class='btn-inspect' style='padding:5px; font-size:0.8rem;' onclick='window.open("https://wa.me/306912345678", "_blank")'>CUSTOM BUILD</button>`;
            } else {
                botResponse = "Δεν κατάλαβα το ποσό. Πες μου απλά νούμερα, π.χ. '800'.";
            }
            codexAiState = 'idle'; 
        }
        else {
            botResponse = "Δεν το έπιασα αυτό, Agent. 🤖<br>Ρώτα με για <b>Αγορά</b>, <b>Μεταφορικά</b>, <b>Εγγύηση</b>, ή <b>Παιχνίδια</b>!";
            
            if (lowerText.includes('μεταφορικα') || lowerText.includes('αποστολη') || lowerText.includes('πολη') || lowerText.includes('ελλαδα')) {
                botResponse = "📦 <b>Αποστολές πανελλαδικά!</b><br>Τα μεταφορικά καθορίζονται κατά την παραγγελία.<br><br><b>Θέλεις να μιλήσεις με τον Admin για λεπτομέρειες; (Ναι/Όχι)</b>";
                codexAiState = 'waiting_admin_redirect'; 
            }
            else if (lowerText.includes('budget') || lowerText.includes('χρηματα') || lowerText.includes('ευρω') || lowerText.includes('λεφτα')) {
                botResponse = "💶 Πόσα χρήματα (budget) περίπου διαθέτεις για το νέο σου PC;";
                codexAiState = 'waiting_budget'; 
            }
            else if (lowerText.includes('εγγυηση') || lowerText.includes('χαλασε') || lowerText.includes('προβλημα') || lowerText.includes('support')) {
                botResponse = "🛡️ <b>MISSION PROTOCOL:</b><br>Όλα ελέγχονται εξονυχιστικά. Αν υπάρξει θέμα, κάνεις Initiate Return Protocol από το site!";
            }
            else if (lowerText.includes('αγορα') || lowerText.includes('τιμη') || lowerText.includes('παραγγελια') || lowerText.includes('εκπτωση')) {
                botResponse = "🛒 <b>ΔΙΑΔΙΚΑΣΙΑ ΑΓΟΡΑΣ:</b><br>Βάζεις το σύστημα στο Cart. Εναλλακτικά κλείνουμε το deal στο WhatsApp!<br><br><b>Να σε συνδέσω με τον Admin; (Ναι/Όχι)</b>";
                codexAiState = 'waiting_admin_redirect'; 
            }
            else if (lowerText.includes('fortnite') || lowerText.includes('valorant') || lowerText.includes('csgo') || lowerText.includes('lol') || lowerText.includes('παιχνιδια')) {
                botResponse = "🎮 <b>ESPORTS READY:</b><br>Πήγαινε στα <b>STARTER PACKS</b> και δες τη σειρά 'Gaming'!";
            }
            else if (lowerText.includes('gta') || lowerText.includes('warzone') || lowerText.includes('fivem') || lowerText.includes('cyberpunk') || lowerText.includes('βαρια')) {
                botResponse = "🔥 <b>HEAVY DUTY:</b><br>Χρειάζεσαι δυνατό GPU (16GB+ RAM). Ψάξε στα Drops για υψηλό Multitasking Score.";
            }
            else if (lowerText.includes('stream') || lowerText.includes('video') || lowerText.includes('edit') || lowerText.includes('coding')) {
                botResponse = "🎥 <b>CREATOR MODE:</b><br>Δες τις κατηγορίες 'Streaming' & 'Coding' στα Starter Packs!";
            }
        }

        chatMsgs.innerHTML += `<div class="msg bot">${botResponse}</div>`;
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
        playHover(); 

    }, 600); 
}
// ==========================================
// DASHBOARD LOGIC (WISHLIST & ACHIEVEMENTS)
// ==========================================

// 1. Λειτουργία για το Target Lock (Wishlist)
function toggleWishlist(btn) {
    if(typeof playClick === 'function') playClick();
    
    // Εφέ περιστροφής & κλειδώματος στο κουμπί
    btn.classList.toggle('locked');
    const isLocked = btn.classList.contains('locked');
    
    // Παίρνουμε το όνομα του υπολογιστή από τον τίτλο
    const pcNameElement = document.getElementById('yg-title');
    const pcName = pcNameElement ? pcNameElement.innerText : 'UNKNOWN SYSTEM';
    
    const wishlistContainer = document.getElementById('dossier-wishlist');
    const safeId = 'wish-' + pcName.replace(/\s+/g, '-').toLowerCase();
    
    if (isLocked) {
        if(typeof showToast === 'function') showToast('TARGET ACQUIRED: ' + pcName, 'normal');
        
        // Αφαίρεση του "NO SAVED SYSTEMS" (αν υπάρχει)
        const emptyMsg = wishlistContainer.querySelector('.dossier-empty');
        if (emptyMsg) emptyMsg.remove();
        
        // Προσθήκη του υπολογιστή στο Dashboard
        if (!document.getElementById(safeId)) {
            const item = document.createElement('div');
            item.id = safeId;
            item.style.cssText = 'color: var(--neon-green); font-family: monospace; font-size: 0.9rem; padding: 8px; border-bottom: 1px dashed rgba(204,255,0,0.2); width: 100%; display: flex; justify-content: space-between; align-items: center;';
            item.innerHTML = `<span>> ${pcName}</span> <i class="ph-bold ph-crosshair"></i>`;
            wishlistContainer.appendChild(item);
        }
    } else {
        if(typeof showToast === 'function') showToast('TARGET REMOVED', 'error');
        
        // Αφαίρεση από το Dashboard
        const itemToRemove = document.getElementById(safeId);
        if (itemToRemove) itemToRemove.remove();
        
        // Επαναφορά του μηνύματος αν αδειάσει η λίστα
        if (wishlistContainer.children.length === 0) {
            wishlistContainer.innerHTML = '<div class="dossier-empty">> NO SAVED SYSTEMS.</div>';
        }
    }
}

// 2. Λειτουργία για Ξεκλείδωμα Achievements
function unlockAchievement(id, title) {
    const achContainer = document.getElementById('dossier-achievements');
    const emptyMsg = achContainer.querySelector('.dossier-empty');
    if (emptyMsg) emptyMsg.remove(); // Βγάζει το άδειο μήνυμα
    
    const safeId = 'ach-' + id;
    if(document.getElementById(safeId)) return; // Αν υπάρχει ήδη, αγνόησέ το
    
    const ach = document.createElement('div');
    ach.className = 'ach-card unlocked';
    ach.id = safeId;
    ach.innerHTML = `
        <div class="ach-icon"><i class="ph-fill ph-trophy"></i></div>
        <div class="ach-info">
            <h4>${title}</h4>
        </div>
        <div class="ach-status">UNLOCKED</div>
    `;
    achContainer.appendChild(ach);
    
    if(typeof showToast === 'function') showToast('ACHIEVEMENT UNLOCKED: ' + title, 'achievement');
}
function updateAuthMenuUI() {
    const menu = document.getElementById('profile-menu');
    if (!menu) return;

    if (isLoggedIn) {
        // 🔒 Όταν είναι συνδεδεμένος: Κρύβουμε τα Sign In / Sign Up, δείχνουμε μόνο Dashboard και Sign Out
        menu.innerHTML = `
            <div class="p-item" onclick="playClick(); toggleProfileMenu(); openAgentDashboard();" style="color: var(--neon-green);">📊 DASHBOARD</div>
            <div class="p-item" onclick="playClick(); logout(); toggleProfileMenu();" style="color: #ff3333;">❌ SIGN OUT</div>
        `;
    } else {
        // 🔓 Όταν είναι επισκέπτης: Δείχνουμε τα κανονικά κουμπιά
        menu.innerHTML = `
            <div class="p-item" onclick="playClick(); toggleProfileMenu(); openModal('login-modal');">SIGN IN</div>
            <div class="p-item" onclick="playClick(); toggleProfileMenu(); openModal('signup-modal');">REGISTER</div>
        `;
    }
}