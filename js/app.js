        const API = 'https://codex-backend-9kij.onrender.com/api';
        let inventory = [], filtered = [], currentTab = 'live', index = 0, compareList = [];
        let currentGalleryPC = null, galleryIndex = 0;
        let cart = JSON.parse(localStorage.getItem('codex_cart')) || [];
        let activeEvent = null;
        let isLoggedIn = false;
        let currentTicketCode = "";
        let achievements = JSON.parse(localStorage.getItem('codex_achievements')) || { 'login': false, 'cart': false, 'vote': false };
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

        function playClick() { if(audioEnabled) { audioClick.currentTime=0; audioClick.play().catch(()=>{}); } }
        function playHover() { if(audioEnabled) { audioHover.currentTime=0; audioHover.play().catch(()=>{}); } }

        document.documentElement.style.setProperty('--neon-green', currentTheme);
        if(!crtEnabled) document.querySelector('.scanlines').style.display = 'none';

        window.onload = async () => {
            const overlay = document.getElementById('startup-overlay');
            const bar = document.getElementById('loader-fill');
            if(audioEnabled) audioStart.play().catch(e => console.log("Audio blocked"));
            
            document.body.addEventListener('click', function() {
                if (audioEnabled && bgMusic.paused) { bgMusic.play().catch(()=>{}); }
            }, { once: true });

            document.getElementById('vol-slider').value = bgMusic.volume * 100;
            document.getElementById('vol-display').innerText = Math.round(bgMusic.volume * 100) + "%";

            setTimeout(() => { bar.style.width = "100%"; }, 500);
            setTimeout(() => { overlay.classList.add('hidden'); }, 1500);
            
            initInteractiveTutorial();
            
            try {
                const [resDrops, resVote] = await Promise.all([fetch(`${API}/drops`), fetch(`${API}/vote-event`)]);
                inventory = await resDrops.json();
                activeEvent = await resVote.json();
            } catch(e) { console.log("Server not connected"); }
            
            filterInv(); updateCartUI(); updateSettingsUI(); renderGlobalReviews(); initMatrix();
            if(activeEvent && activeEvent.title) { renderVoteState(); setInterval(updateTimer, 1000); }
            else { document.getElementById('v-title').innerText = "NO ACTIVE VOTE"; document.getElementById('v-btn').disabled = true; }
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
                        {
                            popover: { title: 'WELCOME AGENT', description: 'Initiating System Override. Let us give you a quick tour of the CODEX Terminal.', side: "over", align: 'center' }
                        },
                        {
                            element: '#tab-live',
                            popover: { title: 'LIVE DROPS', description: 'Here you will find the currently available, custom-built gaming rigs ready for deployment.', side: "bottom", align: 'start' }
                        },
                        {
                            element: '#tab-vault',
                            popover: { title: 'THE VAULT', description: 'Access classified systems that are either sold out or incoming. Keep an eye out for legendary drops.', side: "bottom", align: 'start' }
                        },
                        {
                            element: '.cart-btn',
                            popover: { title: 'YOUR LOOT', description: 'Your secured items are stored here. Check your total and proceed to secure checkout.', side: "bottom", align: 'end' }
                        },
                        {
                            element: '.cli-btn',
                            popover: { title: 'THE TERMINAL', description: 'Click here or press the [`] key to open the command line interface. Try typing "hack" inside it.', side: "bottom", align: 'end' }
                        },
                        {
                            element: '.add-review-btn',
                            popover: { title: 'MISSION CODES', description: 'Found a physical code in your PC box? Enter it here to validate your system and unlock achievements.', side: "left", align: 'center' }
                        }
                    ]
                });
                setTimeout(() => { tour.drive(); }, 2000);
            }
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
            const user = document.getElementById('reg-user').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-pass').value;
            const res = await fetch(`${API}/register`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ username: user, email: email, password: pass }) });
            const d = await res.json();
            if(d.success) { showToast("WELCOME AGENT: " + d.username, "achievement"); closeModal('signup-modal'); isLoggedIn = true; document.getElementById('user-display').innerText = d.username; document.getElementById('guest-options').classList.add('hidden'); document.getElementById('user-options').classList.remove('hidden'); checkAchievement('login'); } else { alert(d.error); }
        }
        async function handleLogin() {
            const user = document.getElementById('login-user').value;
            const pass = document.getElementById('login-pass').value;
            const res = await fetch(`${API}/user-login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ username: user, password: pass }) });
            const d = await res.json();
            if(d.success) { showToast("ACCESS GRANTED: " + d.username, "normal"); closeModal('login-modal'); isLoggedIn = true; document.getElementById('user-display').innerText = d.username; document.getElementById('guest-options').classList.add('hidden'); document.getElementById('user-options').classList.remove('hidden'); checkAchievement('login'); } else { alert(d.error); }
        }
        function logout() { isLoggedIn = false; document.getElementById('guest-options').classList.remove('hidden'); document.getElementById('user-options').classList.add('hidden'); showToast("LOGGED OUT", "normal"); }

        function initMatrix() {
            const canvas = document.getElementById('matrix-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
            const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const nums = '0123456789';
            const alphabet = katakana + latin + nums;
            const fontSize = 16;
            const columns = canvas.width/fontSize;
            const rainDrops = [];
            for( let x = 0; x < columns; x++ ) { rainDrops[x] = 1; }
            const draw = () => { if(!matrixEnabled) { ctx.clearRect(0,0,canvas.width,canvas.height); return; } ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#00ff00'; ctx.font = fontSize + 'px monospace'; for(let i = 0; i < rainDrops.length; i++) { const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length)); ctx.fillText(text, i*fontSize, rainDrops[i]*fontSize); if(rainDrops[i]*fontSize > canvas.height && Math.random() > 0.975){ rainDrops[i] = 0; } rainDrops[i]++; } }; setInterval(draw, 30);
        }

        document.addEventListener('keydown', (e) => { if (e.key === '`') { e.preventDefault(); toggleCLI(); } });
        function toggleCLI() { const cli = document.getElementById('cli-overlay'); const input = document.getElementById('cli-input'); cli.classList.toggle('active'); if (cli.classList.contains('active')) input.focus(); }
        
        const cliInput = document.getElementById('cli-input');
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
        
        function toggleHackMode() { isHacked = !isHacked; matrixEnabled = isHacked; if(isHacked) { document.getElementById('matrix-canvas').style.opacity = '0.3'; document.documentElement.style.setProperty('--neon-green', '#00ff00'); } else { document.getElementById('matrix-canvas').style.opacity = '0'; document.documentElement.style.setProperty('--neon-green', currentTheme); } }

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
                alert("⚠️ ΣΦΑΛΜΑ ΣΥΝΔΕΣΗΣ!\nΟ Server δεν ανταποκρίνεται.\n\n1. Βεβαιώσου ότι το 'node server.js' τρέχει.\n2. Δες την Κονσόλα (F12) για λεπτομέρειες.");
            }
        }

        function startMissionTimer(ms) {
            const timerEl = document.getElementById('mission-timer');
            let timeLeft = ms;
            const interval = setInterval(() => { timeLeft -= 1000; if (timeLeft <= 0) { clearInterval(interval); timerEl.innerText = "EXPIRED"; } else { const h = Math.floor(timeLeft / (1000 * 60 * 60)); const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)); const s = Math.floor((timeLeft % (1000 * 60)) / 1000); timerEl.innerText = `${h}h ${m}m ${s}s`; } }, 1000);
        }
        function openReviewForm() { closeModal('mission-modal'); document.getElementById('rc-code').value = currentTicketCode; document.getElementById('rc-code').disabled = true; openModal('review-code-modal'); }
        function requestReturn() {
            const reasonSelect = document.getElementById('return-reason');
            const reasonValue = reasonSelect.value;
            const pcName = document.getElementById('mission-pc-name').innerText;
            if (!reasonValue) { alert("⚠️ SYSTEM ALERT: Please select a valid Error Protocol."); return; }
            let reasonText = "";
            switch(reasonValue) { case "1": reasonText = "FPS / Performance Mismatch"; break; case "2": reasonText = "Hardware Defect / DOA"; break; case "3": reasonText = "Specification Mismatch"; break; case "4": reasonText = "Other Critical Error"; break; }
            const msg = `🚨 **RETURN SIGNAL** 🚨%0A%0A📦 **System:** ${pcName}%0A🎫 **Code:** ${currentTicketCode}%0A⚠️ **Reason:** ${reasonText}%0A%0AWaiting for authorization...`;
            window.open(`https://wa.me/306912345678?text=${msg}`, '_blank');
        }
        
        function renderGlobalReviews() {
            const rList = document.getElementById('review-list');
            let allReviews = [];
            inventory.forEach(pc => { if(pc.reviews) { pc.reviews.forEach(r => { allReviews.push({ ...r, pcName: pc.name }); }); } });
            allReviews.sort((a,b) => new Date(b.date) - new Date(a.date));
            if(allReviews.length === 0) { rList.innerHTML = '<div style="color:#666;text-align:center;margin-top:50px; font-size:0.8rem;">NO TRANSMISSIONS YET</div>'; } 
            else { rList.innerHTML = allReviews.map(r => { const date = r.date ? new Date(r.date).toLocaleDateString() : 'RECENT'; return `<div class="review-card"><span class="r-date">${date}</span><div class="r-user">${r.user} <span class="r-stars">★${r.rating}</span></div><div style="font-size:0.7rem; color:var(--neon-purple); margin-bottom:4px; font-weight:bold;">PURCHASED: ${r.pcName}</div><div class="r-text">"${r.text}"</div></div>`; }).join(''); }
        }

        async function submitNewsletter() {
            const email = document.getElementById('nl-email').value;
            if(!email || !email.includes('@')) { showToast("SYNTAX ERROR: MISSING '@' SYMBOL", "error"); return; }
            const res = await fetch(`${API}/newsletter`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
            const d = await res.json();
            if(d.success) { showToast("WELCOME TO THE NETWORK", "achievement"); closeModal('newsletter-modal'); } else { showToast("CONNECTION FAILED", "error"); }
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

        function toggleCRT() { crtEnabled = !crtEnabled; localStorage.setItem('codex_crt', crtEnabled); document.querySelector('.scanlines').style.display = crtEnabled ? 'block' : 'none'; updateSettingsUI(); }
        function setTheme(color) { currentTheme = color; localStorage.setItem('codex_theme', currentTheme); document.documentElement.style.setProperty('--neon-green', currentTheme); }
        function updateSettingsUI() { const audBtn = document.getElementById('set-audio'); audBtn.className = audioEnabled ? 'setting-card active' : 'setting-card'; audBtn.querySelector('.s-title').innerText = audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF'; const crtBtn = document.getElementById('set-crt'); crtBtn.className = crtEnabled ? 'setting-card active' : 'setting-card'; crtBtn.querySelector('.s-title').innerText = crtEnabled ? 'CRT FX: ON' : 'CRT FX: OFF'; }

        function checkAchievement(id) { if(!achievements[id]) { achievements[id] = true; localStorage.setItem('codex_achievements', JSON.stringify(achievements)); showToast(`ACHIEVEMENT UNLOCKED: ${id.toUpperCase()}`, "achievement"); } }
        function openAchievements() { if(!isLoggedIn) { showToast("ACCESS DENIED. LOGIN REQUIRED.", "normal"); openModal('login'); return; } const list = document.getElementById('ach-list'); list.innerHTML = achList.map(a => { const unlocked = achievements[a.id]; return `<div class="ach-card ${unlocked ? 'unlocked' : ''}"><i class="ph-fill ${a.icon} ach-icon"></i><div class="ach-info"><h4>${a.title}</h4><p>${a.desc}</p></div><div class="ach-status">${unlocked ? 'UNLOCKED' : 'LOCKED'}</div></div>`; }).join(''); openModal('achievements'); }
        
        function switchTab(mode) { 
            currentTab = mode; 
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-live','active-vault','active-starter','active-vote','active-gear')); 
            document.getElementById(`tab-${mode}`).classList.add(`active-${mode}`); 
            ['carousel-wrapper','starter-menu','gear-view','vote-view'].forEach(id => document.getElementById(id).classList.add('hidden')); 
            if(mode === 'vote') { 
                document.getElementById('vote-view').classList.remove('hidden'); 
                document.getElementById('stage-label').innerText = "// COMMUNITY VOTE //"; 
            } else if(mode === 'starter') { 
                document.getElementById('starter-menu').classList.remove('hidden'); 
                document.getElementById('stage-label').innerText = "// STARTER PACKS //"; 
            } else if(mode === 'gear') { 
                document.getElementById('gear-view').classList.remove('hidden'); 
                document.getElementById('stage-label').innerText = "// ARMORY //"; 
            } else { 
                document.getElementById('carousel-wrapper').classList.remove('hidden'); 
                document.getElementById('stage-label').innerText = "// SYSTEM SELECT //"; 
                filterInv(); 
            } 
        }

        function toggleCartDropdown() { const d = document.getElementById('cart-dropdown'); const btn = document.querySelector('.nav-btn.cart-btn'); d.classList.toggle('show'); btn.classList.toggle('active'); }
        window.onclick = function(event) { if (!event.target.closest('.cart-btn') && !event.target.closest('.cart-dropdown') && !event.target.closest('.add-review-btn')) { document.getElementById('cart-dropdown').classList.remove('show'); } }
        function updateCartUI() { document.getElementById('cart-count').innerText = cart.length; const items = document.getElementById('mini-cart-items'); let total = 0; if (cart.length === 0) { items.innerHTML = '<div style="color:#666; text-align:center; padding:20px; font-size:0.9rem;">CART IS EMPTY</div>'; } else { items.innerHTML = cart.map((item, i) => { total += item.price; return `<div class="mini-cart-item"><img src="${item.img}" class="mc-img"><div class="mc-details"><div class="mc-name">${item.name}</div><div class="mc-opt">${item.option}</div><div class="mc-price">€${item.price}</div></div><i class="ph-bold ph-x mc-remove" onclick="removeFromCart(${i})"></i></div>`; }).join(''); } document.getElementById('mc-total').innerText = "€" + total; }
        function addToCart() { if(currentGalleryPC.stock === 0) return alert("SOLD OUT!"); const extra = parseInt(document.getElementById('storage-select').value); const base = parseInt(currentGalleryPC.price.replace(/[^0-9]/g, '')); cart.push({ name: currentGalleryPC.name, price: base + extra, option: extra === 50 ? "+1TB HDD" : extra === 80 ? "+1TB SSD" : "Standard", img: currentGalleryPC.images[0] }); localStorage.setItem('codex_cart', JSON.stringify(cart)); updateCartUI(); const dropdown = document.getElementById('cart-dropdown'); dropdown.classList.add('show'); setTimeout(() => dropdown.classList.remove('show'), 2000); closeModal('gallery-overlay'); showToast("ITEM ADDED TO CART", "normal"); checkAchievement('cart'); }
        
        function renderVoteState() { 
            document.getElementById('v-title').innerText = activeEvent.title; 
            document.getElementById('v-price-display').innerText = activeEvent.price ? "ESTIMATED PRICE: €" + activeEvent.price : "";
            document.getElementById('v-img').src = activeEvent.image || ''; 
            const pct = (activeEvent.currentVotes / activeEvent.targetVotes) * 100; 
            document.getElementById('v-fill').style.width = Math.min(pct, 100) + '%'; 
            document.getElementById('v-count').innerText = `${activeEvent.currentVotes} / ${activeEvent.targetVotes} VOTES`; 
            if(activeEvent.currentVotes >= activeEvent.targetVotes) unlockVisuals(); 
        }

        function updateTimer() { if(!activeEvent) return; const now = new Date(); const start = new Date(activeEvent.startDate); const end = new Date(start.getTime() + (activeEvent.durationDays * 24 * 60 * 60 * 1000)); const btn = document.getElementById('v-btn'); const timer = document.getElementById('v-timer'); if (now < start) { timer.innerText = `VOTING OPENS IN: ${formatTime(start - now)}`; btn.innerText = "LOCKED"; btn.disabled = true; } else if (now > end) { timer.innerText = "EXPIRED"; timer.style.color = "red"; btn.innerText = "FAILED"; btn.disabled = true; } else { timer.innerText = `TIME REMAINING: ${formatTime(end - now)}`; if(activeEvent.currentVotes < activeEvent.targetVotes) { btn.disabled = false; btn.innerText = "AUTHORIZE DROP"; } } }
        function formatTime(ms) { const d = Math.floor(ms / (1000*60*60*24)); const h = Math.floor((ms / (1000*60*60)) % 24); const m = Math.floor((ms / 1000 / 60) % 60); return `${d}d ${h}h ${m}m`; }
        async function castVote() { const res = await fetch(`${API}/cast-vote`, { method: 'POST' }); const data = await res.json(); if(data.votes) { activeEvent.currentVotes = data.votes; renderVoteState(); showToast("VOTE REGISTERED", "normal"); checkAchievement('vote'); } }
        
        function unlockVisuals() { 
            document.getElementById('v-img').classList.add('unlocked'); 
            document.getElementById('v-lock').style.opacity = '0'; 
            
            const btn = document.getElementById('v-btn'); 
            btn.innerText = "DROP SECURED"; 
            btn.style.background = "#333"; 
            btn.style.color = "#888"; 
            btn.disabled = true; 
            
            // Εμφάνιση του κουμπιού Αγοράς
            document.getElementById('v-buy-btn').classList.remove('hidden');
        }

        function buyVotePC() {
            if(!activeEvent) return;
            const msg = `Hello! I want to secure the community drop:%0A%0A- *${activeEvent.title}*%0A- Estimated Price: €${activeEvent.price || 'TBD'}%0A%0AIs it available?`;
            window.open(`https://wa.me/306912345678?text=${msg}`, '_blank');
        }

        function selectPack(cat) { document.getElementById('starter-menu').classList.add('hidden'); document.getElementById('carousel-wrapper').classList.remove('hidden'); filtered = inventory.filter(p => p.category === cat); index = 0; renderCard(); }
        
        function filterInv() { 
            filtered = inventory.filter(p => { 
                if(currentTab === 'live') return (p.category === 'drop' || !p.category) && p.status !== 'coming'; 
                if(currentTab === 'vault') return p.status === 'coming'; 
            }); 
            index = 0; renderCard(); 
        }

        function nextPC() { if(filtered.length) { index=(index+1)%filtered.length; renderCard(); } }
        function prevPC() { if(filtered.length) { index=(index-1+filtered.length)%filtered.length; renderCard(); } }
        
        function renderCard() { const c = document.getElementById('main-card'); if(!filtered.length) { c.innerHTML = "<h3>NO SIGNAL</h3>"; return; } const pc = filtered[index]; const inCompare = compareList.find(p => p._id === pc._id); const priceVal = parseInt(pc.price.replace(/[^0-9]/g, '')); const fakeOldPrice = Math.floor(priceVal * 1.2); const stock = pc.stock || 0; let stockHTML = ''; if(stock === 0) stockHTML = '<div class="stock-badge out">SOLD OUT</div>'; else if(stock < 5) stockHTML = `<div class="stock-badge low">LOW STOCK: ${stock} UNITS</div>`; else stockHTML = '<div class="stock-badge in">IN STOCK</div>'; let fpsHTML = ''; if(pc.multitasking) fpsHTML += `<div class="fps-row"><span class="fps-name">MULTI</span><div class="bar-track"><div class="bar-fill" data-width="${pc.multitasking}%" style="width:0%"></div></div><span class="fps-num">${pc.multitasking}</span></div>`; if(pc.fps) pc.fps.forEach(f => { let max=200; if(f.game==='Fortnite')max=300; fpsHTML += `<div class="fps-row"><span class="fps-name">${f.game}</span><div class="bar-track"><div class="bar-fill" data-width="${Math.min((f.score/max)*100,100)}%" style="width:0%"></div></div><span class="fps-num">${f.score}</span></div>`; }); c.innerHTML = `<img src="${pc.images[0]||'assets/images/'}" class="hero-img" onmouseenter="playHover()">${stockHTML}<div class="pc-title">${pc.name}</div><div class="card-price-row"><div class="pc-price">${pc.price}</div><div class="pc-price-old">€${fakeOldPrice}</div></div><div class="perf-container">${fpsHTML}</div><button class="btn-inspect" onclick="playClick(); openGallery()">INSPECT SYSTEM</button><button class="btn-compare-add ${inCompare?'selected':''}" onclick="playClick(); toggleCompare('${pc._id}')">${inCompare?'ADDED':'COMPARE'}</button>`; setTimeout(()=>document.querySelectorAll('.bar-fill').forEach(b=>b.style.width=b.getAttribute('data-width')), 50); }
        
        function updatePrice() { const extra = parseInt(document.getElementById('storage-select').value); const base = parseInt(currentGalleryPC.price.replace(/[^0-9]/g, '')); document.getElementById('g-price-live').innerText = "€" + (base + extra); }
        function removeFromCart(i) { cart.splice(i, 1); localStorage.setItem('codex_cart', JSON.stringify(cart)); updateCartUI(); }
        function handleCheckout() { if(cart.length === 0) return alert("Cart is empty!"); let msg = "Hello! I want to order:%0A%0A"; let total = 0; cart.forEach(item => { msg += `- ${item.name} (${item.option}): €${item.price}%0A`; total += item.price; }); msg += `%0A*TOTAL: €${total}*`; window.open(`https://wa.me/306912345678?text=${msg}`, '_blank'); }
        async function submitReviewCode() { const code = document.getElementById('rc-code').value; const user = document.getElementById('rc-user').value; const rating = document.getElementById('rc-rating').value; const text = document.getElementById('rc-text').value; if(!code || !user || !text) return alert("Please fill all fields"); const res = await fetch(`${API}/submit-review`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ code, user, rating, text }) }); const data = await res.json(); if(data.success) { showToast("REVIEW VERIFIED & POSTED", "achievement"); closeModal('review-code-modal'); const currentPCID = filtered[index] ? filtered[index]._id : null; const resDrops = await fetch(`${API}/drops`); inventory = await resDrops.json(); renderGlobalReviews(); renderCard(); } else { alert(data.error); } }
        function showToast(msg, type) { const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = type === 'achievement' ? `<i class="ph-fill ph-trophy"></i> ${msg}` : `<i class="ph-bold ph-check-circle"></i> ${msg}`; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 3000); }
        function openGallery() { currentGalleryPC = filtered[index]; galleryIndex = 0; document.getElementById('g-title').innerText = currentGalleryPC.name; const basePrice = parseInt(currentGalleryPC.price.replace(/[^0-9]/g, '')); document.getElementById('g-price-live').innerText = "€" + basePrice; document.getElementById('g-price-old').innerText = "€" + Math.floor(basePrice * 1.2); document.getElementById('storage-select').value = "0"; const stock = currentGalleryPC.stock || 0; const badge = document.getElementById('g-stock-badge'); const addBtn = document.getElementById('g-add-cart'); const buyBtn = document.getElementById('g-buy-btn'); if(stock === 0) { badge.innerText = "SOLD OUT"; badge.className = "stock-badge out"; addBtn.disabled = true; buyBtn.disabled = true; } else if(stock < 5) { badge.innerText = `LOW STOCK: ${stock}`; badge.className = "stock-badge low"; addBtn.disabled = false; buyBtn.disabled = false; } else { badge.innerText = "IN STOCK"; badge.className = "stock-badge in"; addBtn.disabled = false; buyBtn.disabled = false; } let h=""; for(const [k,v] of Object.entries(currentGalleryPC.specs)) { h+=`<div class="spec-row"><div class="spec-label">${k.toUpperCase()}</div><div class="spec-val">${v}</div></div>`; } document.getElementById('g-specs').innerHTML = h; updateGalleryImage(); document.getElementById('gallery-overlay').classList.add('active'); }
        function updateGalleryImage() { document.getElementById('g-main-img').src = currentGalleryPC.images[galleryIndex]; }
        function changeGalleryImage(d) { galleryIndex = (galleryIndex+d+currentGalleryPC.images.length)%currentGalleryPC.images.length; updateGalleryImage(); }
        function toggleCompare(id) { const pc = filtered[index]; if(compareList.find(p=>p._id===id)) compareList = compareList.filter(p=>p._id!==id); else { if(compareList.length<2) compareList.push(pc); else alert("MAX 2"); } renderCard(); const b = document.getElementById('compare-float'); if(compareList.length===2) b.classList.add('active'); else b.classList.remove('active'); }
        function openCompareModal() { if(compareList.length!==2) return; const c1=compareList[0], c2=compareList[1]; const renderCol = (p) => `<div class="compare-col"><img src="${p.images[0]}" class="compare-img"><h3>${p.name}</h3><div style="color:var(--neon-green);font-weight:bold;margin-bottom:10px;">${p.price}</div><div class="gallery-desc-box">${p.description}</div>${Object.keys(p.specs).map(k=>`<div class="compare-spec-row"><span class="compare-spec-label">${k.toUpperCase()}</span><span class="compare-spec-val">${p.specs[k]}</span></div>`).join('')}</div>`; document.getElementById('compare-grid').innerHTML = renderCol(c1)+'<div class="compare-divider"></div>'+renderCol(c2); document.getElementById('compare-modal').classList.add('active'); }
        
        function openModal(id) { 
            let modal = document.getElementById(id) || document.getElementById(id + '-modal');
            if(modal) modal.classList.add('active'); 
        }
        function closeModal(id) { 
            let modal = document.getElementById(id) || document.getElementById(id + '-modal');
            if(modal) modal.classList.remove('active'); 
        }
        
        function handleBuy() { if(currentGalleryPC.stock === 0) return alert("SOLD OUT!"); window.open(`https://wa.me/306912345678`, '_blank'); }
        function toggleProfileMenu() { document.getElementById('profile-menu').classList.toggle('show'); }
        function login() { isLoggedIn = true; document.getElementById('guest-options').classList.add('hidden'); document.getElementById('user-options').classList.remove('hidden'); closeModal('login-modal'); closeModal('signup-modal'); showToast("WELCOME BACK, AGENT", "normal"); checkAchievement('login'); }
        function logout() { isLoggedIn = false; document.getElementById('guest-options').classList.remove('hidden'); document.getElementById('user-options').classList.add('hidden'); }
        function toggleChat() { document.getElementById('chat-widget').classList.toggle('open'); }
        
        // 🔴 CODEX AI - ΕΞΥΠΝΟΣ ΕΓΚΕΦΑΛΟΣ (ANTI-AMNESIA)
        let codexAiState = 'idle'; // Παγκόσμια, μόνιμη μνήμη

        // Αφαιρεί τόνους από τα Ελληνικά για να μην μπερδεύεται
        function removeAccents(str) {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        function sendChat(inputElement) { 
            const text = inputElement.value.trim();
            if(!text) return;

            const chatMsgs = document.getElementById('chat-msgs');
            chatMsgs.innerHTML += `<div class="msg user">${text}</div>`; 
            inputElement.value = '';
            chatMsgs.scrollTop = chatMsgs.scrollHeight;

            setTimeout(() => {
                const lowerText = removeAccents(text.toLowerCase());
                let botResponse = "";

                // --- 1. ΕΛΕΓΧΟΣ ΜΝΗΜΗΣ (Ναι/Όχι) ---
                if (codexAiState === 'waiting_admin_redirect') {
                    if (lowerText === 'ναι' || lowerText.includes('ναι') || lowerText.includes('nai') || lowerText.includes('θελω')) {
                        botResponse = "🚀 <b>Εκκίνηση σύνδεσης...</b><br>Σε μεταφέρω στο ασφαλές κανάλι του Admin.";
                        setTimeout(() => window.open("https://wa.me/306912345678", "_blank"), 1500); // ⚠️ Βάλε το WhatsApp σου
                    } else {
                        botResponse = "Λήψη ελήφθη. 🤖 Τι άλλο θα ήθελες να μάθεις;";
                    }
                    codexAiState = 'idle'; // Μηδενισμός
                } 
                
                // --- 2. ΕΛΕΓΧΟΣ ΜΝΗΜΗΣ (Budget) ---
                else if (codexAiState === 'waiting_budget') {
                    const budget = parseInt(lowerText.replace(/[^0-9]/g, '')); 
                    if (budget > 0) {
                        botResponse = `💰 Με budget <b>€${budget}</b>, τσέκαρε τα <b>STARTER PACKS</b> ή ρώτα τον Admin για Custom Build!<br><br><button class='btn-inspect' style='padding:5px; font-size:0.8rem;' onclick='window.open("https://wa.me/306912345678", "_blank")'>CUSTOM BUILD</button>`;
                    } else {
                        botResponse = "Δεν κατάλαβα το ποσό. Πες μου απλά νούμερα, π.χ. '800'.";
                    }
                    codexAiState = 'idle'; // Μηδενισμός
                }
                
                // --- 3. ΚΑΝΟΝΙΚΗ ΣΥΖΗΤΗΣΗ (Idle) ---
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