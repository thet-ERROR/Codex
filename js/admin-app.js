    // ⚠️ ΒΑΛΕ ΤΗΝ IP ΣΟΥ ΕΔΩ (π.χ. 'http://192.168.1.15:5000/api') ΓΙΑ ΚΙΝΗΤΟ Ή ΑΦΗΣΕ LOCALHOST
    const API = 'https://phoenix-codex.onrender.com/api';
    
    let TOKEN = null, inventory = [], editId = null;
    let currentImgs = [], currentFPS = [], currentReviews = [], currentVoteImg = "";

    async function tryLogin() {
        const p = document.getElementById('admin-pass').value;
        const res = await fetch(`${API}/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:p}) });
        const d = await res.json();
        if(d.success) { 
            TOKEN=p; 
            document.getElementById('login-ui').style.display='none'; 
            document.getElementById('dashboard-ui').style.display='grid'; 
            loadInv(); loadVote(); loadTickets(); loadEmails(); loadUserCount(); loadMaintenance();
        } else alert('WRONG PASSWORD');
    }

    // --- LOAD DATA ---
    async function loadInv() {
        const res = await fetch(`${API}/drops`, { headers:{'x-admin-auth':TOKEN} }); inventory = await res.json();
        
        // 1. Fill Inventory List
        document.getElementById('inventory-list').innerHTML = inventory.map(pc => {
            let statusColor = pc.status === 'available' ? '#ccff00' : pc.status === 'coming' ? '#ffaa00' : '#ff3333';
            let statusText = pc.status === 'coming' ? 'LAST CALL' : pc.status === 'available' ? 'LIVE' : 'SOLD OUT';
            
            return `
            <div class="item">
                <img src="${pc.images[0]||''}">
                <div class="item-info">
                    <div style="font-weight:bold; color:#fff;">${pc.name}</div>
                    <div style="font-size:0.8rem; color:#888;">
                        ${pc.category.toUpperCase()} | 
                        <span style="color:${statusColor}; font-weight:bold;">${statusText}</span> | 
                        Stock: ${pc.stock}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-sm edit-btn" onclick="edit('${pc._id}')">EDIT</button>
                    <button class="btn-sm del-btn" onclick="del('${pc._id}')">DEL</button>
                </div>
            </div>`;
        }).join('');

        // 2. Fill Dropdown for Codes
        document.getElementById('sold-pc-select').innerHTML = inventory.map(pc => `<option value="${pc._id}">${pc.name}</option>`).join('');
    }

    async function loadUserCount() {
        try {
            const res = await fetch(`${API}/users/count`, { headers:{'x-admin-auth':TOKEN} });
            const data = await res.json();
            document.getElementById('user-count').innerText = data.count;
        } catch(e) { console.log("User count error", e); }
    }

    // --- FORM LOGIC ---
    function addFPS() { 
        const g=document.getElementById('fps-game').value, s=document.getElementById('fps-score').value; 
        if(s) { currentFPS.push({game:g, score:s}); renderTags(); } 
    }
    function addReview() { 
        const u=document.getElementById('rev-user').value, t=document.getElementById('rev-text').value, r=document.getElementById('rev-rating').value; 
        if(u&&t) { currentReviews.push({user:u, text:t, rating:r, date:new Date()}); renderTags(); } 
    }
    function renderTags() {
        document.getElementById('fps-area').innerHTML = currentFPS.map((f,i) => `<div class="tag">${f.game}:${f.score} <span onclick="currentFPS.splice(${i},1);renderTags()">x</span></div>`).join('');
        document.getElementById('review-area').innerHTML = currentReviews.map((r,i) => `<div class="tag" style="border-color:#b026ff;">${r.user} <span onclick="currentReviews.splice(${i},1);renderTags()">x</span></div>`).join('');
    }

    // --- EXTRAS HELPERS ---
    const $ = id => document.getElementById(id);

    // <input type="datetime-local"> has no timezone of its own — "2024-01-01T10:00" is read/written
    // as the BROWSER's local time. Sending that raw string to the backend meant Mongoose re-parsed
    // it with `new Date(...)` on the server (Render runs in UTC), silently shifting every vote
    // window by the admin's UTC offset (+2/+3h for Greece) — this is why the vote timer/button
    // could look locked or expired at times that felt wrong. Converting through toISOString() here
    // pins the moment to a real instant before it ever leaves the browser.
    function localInputToISO(value) {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d) ? null : d.toISOString();
    }
    function isoToLocalInput(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // Preset dropdown just fills the fields — you can always type your own colour over it.
    function applyPaintPreset(value) {
        if (!value) return;
        const [en, el, hex] = value.split('|');
        $('opt-paint-name').value = en;
        $('opt-paint-nameEl').value = el;
        $('opt-paint-hex').value = hex;
        if ($('opt-paint-enabled')) $('opt-paint-enabled').checked = true;
    }

    function fillOptions(pc) {
        const o = pc.options || {};
        const st = o.storage || {}, paint = o.paint || {};
        $('opt-storage-enabled').checked = st.enabled !== false;
        $('opt-storage-hdd').value = st.hdd ?? 50;
        $('opt-storage-ssd').value = st.ssd ?? 80;
        $('opt-proconfig-enabled').checked = !!(o.proConfig && o.proConfig.enabled);
        $('opt-paint-enabled').checked = !!paint.enabled;
        $('opt-paint-name').value = paint.colorName || '';
        $('opt-paint-nameEl').value = paint.colorNameEl || '';
        $('opt-paint-hex').value = paint.colorHex || '#1a1a1a';
        $('opt-paint-price').value = paint.price ?? 40;
        $('opt-paint-lead').value = paint.leadTimeHours ?? 48;
        $('opt-paint-images').value = (paint.images || []).join('\n');
        $('opt-paint-preset').value = '';
    }

    function resetOptions() {
        $('opt-storage-enabled').checked = true;
        $('opt-storage-hdd').value = 50;
        $('opt-storage-ssd').value = 80;
        $('opt-proconfig-enabled').checked = false;
        $('opt-paint-enabled').checked = false;
        $('opt-paint-hex').value = '#1a1a1a';
        $('opt-paint-price').value = 40;
        $('opt-paint-lead').value = 48;
        $('opt-paint-preset').value = '';
    }

    function collectOptions() {
        return {
            storage: {
                enabled: $('opt-storage-enabled').checked,
                hdd: parseInt($('opt-storage-hdd').value) || 0,
                ssd: parseInt($('opt-storage-ssd').value) || 0
            },
            proConfig: { enabled: $('opt-proconfig-enabled').checked },
            paint: {
                enabled: $('opt-paint-enabled').checked,
                colorName: $('opt-paint-name').value.trim(),
                colorNameEl: $('opt-paint-nameEl').value.trim(),
                colorHex: $('opt-paint-hex').value,
                price: parseInt($('opt-paint-price').value) || 0,
                leadTimeHours: parseInt($('opt-paint-lead').value) || 48,
                images: $('opt-paint-images').value.split('\n').map(s => s.trim()).filter(Boolean)
            }
        };
    }

    function edit(id) {
        const pc = inventory.find(i=>i._id===id); if(!pc) return;
        fillOptions(pc);
       ['name','price','stock','description','lore','loreEl','multitasking','status','category'].forEach(k => {
    if(document.getElementById(k)) document.getElementById(k).value = pc[k]||'';
});
        ['cpu','gpu','ram','ssd','mobo','psu','case'].forEach(k => document.getElementById(k).value = pc.specs[k]||'');
        ['cpu','gpu','ram','ssd','mobo','psu','case'].forEach(k => {
            const el = document.getElementById('specInfo-' + k);
            if (el) el.value = (pc.specDetails && pc.specDetails[k]) || '';
        });


        // Load the image URL into the text box
        document.getElementById('imageUrl').value = pc.images[0] || '';
        
        currentFPS = pc.fps || []; currentReviews = pc.reviews || []; renderTags();
        editId = id;
        document.getElementById('submit-btn').innerText = "UPDATE SYSTEM";
        document.getElementById('cancel-btn').style.display = 'block';
    }

    function resetForm() {
        editId=null; currentFPS=[]; currentReviews=[]; renderTags();
        // Scoped to the PC form — the unscoped version also wiped the vote form, the maintenance
        // message and the global settings box every time a build was saved.
        document.querySelectorAll('.col-left input, .col-left textarea').forEach(i=>i.value='');
        resetOptions(); // checkboxes/colour/number defaults the blanket .value='' above can't restore
        document.getElementById('stock').value='1';
        document.getElementById('submit-btn').innerText = "UPLOAD SYSTEM";
        document.getElementById('cancel-btn').style.display = 'none';
    }

    async function handleFormSubmit() {
        // Παίρνουμε το Link απευθείας από το Text Box!
        const imgInput = document.getElementById('imageUrl').value.trim();
        const imgs = imgInput ? [imgInput] : [];
        
const data = {
            name: document.getElementById('name').value, 
            price: document.getElementById('price').value,
            stock: document.getElementById('stock').value, 
            category: document.getElementById('category').value,
            status: document.getElementById('status').value, 
            description: document.getElementById('description').value, 
            lore: document.getElementById('lore') ? document.getElementById('lore').value : "", // Προσθήκη Lore
            loreEl: document.getElementById('loreEl') ? document.getElementById('loreEl').value : "",
            multitasking: document.getElementById('multitasking').value, 
            images: imgs,
            specs: { 
                cpu:document.getElementById('cpu').value, 
                gpu:document.getElementById('gpu').value, 
                ram:document.getElementById('ram').value, 
                ssd:document.getElementById('ssd').value, 
                mobo:document.getElementById('mobo').value, 
                psu:document.getElementById('psu').value, 
                case:document.getElementById('case').value
            },
            specDetails: {
                cpu: document.getElementById('specInfo-cpu').value,
                gpu: document.getElementById('specInfo-gpu').value,
                ram: document.getElementById('specInfo-ram').value,
                ssd: document.getElementById('specInfo-ssd').value,
                mobo: document.getElementById('specInfo-mobo').value,
                psu: document.getElementById('specInfo-psu').value,
                case: document.getElementById('specInfo-case').value
            },
            fps: currentFPS,
            reviews: currentReviews,
            options: collectOptions()
        };

        // A paint option with no colour name renders as a nameless toggle on the storefront
        if (data.options.paint.enabled && !data.options.paint.colorName && !data.options.paint.colorNameEl) {
            return alert("CUSTOM ΒΑΦΗ: συμπλήρωσε όνομα χρώματος (ή διάλεξε έτοιμο) πριν την αποθήκευση.");
        }

        const url = editId ? `${API}/drops/${editId}` : `${API}/drops`;
        const method = editId ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, { method: method, headers:{'Content-Type':'application/json', 'x-admin-auth':TOKEN}, body:JSON.stringify(data) });
            if(res.ok) {
                alert("SYSTEM SAVED!");
                resetForm(); loadInv();
            } else {
                alert("ERROR SAVING SYSTEM");
            }
        } catch(e) {
            console.error(e);
            alert("NETWORK ERROR");
        }
    }

    async function del(id) { if(confirm('Delete?')) { await fetch(`${API}/drops/${id}`, {method:'DELETE', headers:{'x-admin-auth':TOKEN}}); loadInv(); } }

    // --- TOOLS ---
    async function loadVote() {
        try {
            const res=await fetch(`${API}/vote-event`, { headers:{'x-admin-auth':TOKEN} }); const v=await res.json();
            if(v.title) {
                document.getElementById('v-title').value=v.title;
                document.getElementById('v-price').value=v.price || '';
                document.getElementById('v-target').value=v.targetVotes;
                document.getElementById('v-days').value=v.durationDays;
                document.getElementById('v-imageUrl').value = v.image || '';
                document.getElementById('v-start').value = isoToLocalInput(v.startDate);
                const specs = v.specs || {};
                ['cpu','gpu','ram','ssd','mobo','psu','case'].forEach(k => {
                    const el = document.getElementById('v-' + k);
                    if (el) el.value = specs[k] || '';
                });
            }
        } catch(e) {} 
    }
    
    async function uploadVote() {
        // Παίρνουμε το Link απευθείας από το Text Box για το Vote Event!
        const imgInput = document.getElementById('v-imageUrl').value.trim();
        const startISO = localInputToISO(document.getElementById('v-start').value);
        if (!startISO) return alert("Βάλε ημερομηνία/ώρα έναρξης — χωρίς αυτήν το countdown δεν ξεκινάει ποτέ.");

        const data = {
            title: document.getElementById('v-title').value,
            price: document.getElementById('v-price').value,
            image: imgInput,
            targetVotes: document.getElementById('v-target').value,
            startDate: startISO,
            durationDays: document.getElementById('v-days').value,
            specs: {
                cpu: document.getElementById('v-cpu').value,
                gpu: document.getElementById('v-gpu').value,
                ram: document.getElementById('v-ram').value,
                ssd: document.getElementById('v-ssd').value,
                mobo: document.getElementById('v-mobo').value,
                psu: document.getElementById('v-psu').value,
                case: document.getElementById('v-case').value
            }
        };
        await fetch(`${API}/vote-event`, { method: 'POST', headers:{'Content-Type':'application/json', 'x-admin-auth':TOKEN}, body:JSON.stringify(data) }); alert('VOTE LIVE');
    }

    async function loadTickets() {
        const res = await fetch(`${API}/tickets`, { headers:{'x-admin-auth':TOKEN} }); const tickets = await res.json();
        document.getElementById('tickets-list').innerHTML = tickets.map(t => {
            let action = t.status==='pending' ? `<button onclick="activateCode('${t._id}')" class="btn-sm btn-cyan" style="width:100%; margin-top:5px;">DELIVER</button>` : '';
            return `<div class="ticket"><div><span class="t-code">${t.code}</span> <span style="float:right; color:${t.status==='active'?'#ccff00':'orange'}">${t.status}</span></div><div style="color:#888;">${t.pcName}</div>${action}</div>`;
        }).join('');
    }
    async function generateCode() {
        const pcId = document.getElementById('sold-pc-select').value; const pc = inventory.find(p => p._id === pcId);
        await fetch(`${API}/generate-code`, { method: 'POST', headers:{'Content-Type':'application/json', 'x-admin-auth':TOKEN}, body:JSON.stringify({ pcId: pc._id, pcName: pc.name }) }); loadTickets();
    }
    async function activateCode(id) { if(confirm("Confirm?")) { await fetch(`${API}/activate-ticket/${id}`, { method: 'POST', headers:{'x-admin-auth':TOKEN} }); loadTickets(); } }

    async function loadEmails() {
        const res = await fetch(`${API}/newsletter`, { headers:{'x-admin-auth':TOKEN} }); const emails = await res.json();
        document.getElementById('email-list').innerHTML = emails.map(e => `<div style="border-bottom:1px solid #222; padding:5px;">${e.email} <span style="float:right; font-size:0.7rem;">${new Date(e.date).toLocaleDateString()}</span></div>`).join('');
    }

    // --- MAINTENANCE KILL SWITCH ---
    async function loadMaintenance() {
        try {
            const res = await fetch(`${API}/site-config`, { headers:{'x-admin-auth':TOKEN} });
            const config = await res.json();
            document.getElementById('maint-toggle').checked = !!config.maintenanceMode;
            document.getElementById('maint-message').value = config.maintenanceMessage || '';
            document.getElementById('proconfig-price').value = config.proConfigPrice ?? 30;
        } catch(e) { console.log("Maintenance config load error", e); }
    }

    // Pro Config is priced once for the whole shop; the storefront reads it from /api/status.
    async function saveProConfigPrice() {
        const proConfigPrice = parseInt(document.getElementById('proconfig-price').value);
        if (Number.isNaN(proConfigPrice) || proConfigPrice < 0) return alert("Βάλε έγκυρη τιμή.");
        const res = await fetch(`${API}/site-config`, {
            method:'POST',
            headers:{'Content-Type':'application/json', 'x-admin-auth':TOKEN},
            body:JSON.stringify({ proConfigPrice })
        });
        alert(res.ok ? `PRO CONFIG PRICE: €${proConfigPrice}` : "ERROR SAVING PRICE");
    }

    async function saveMaintenance() {
        const maintenanceMode = document.getElementById('maint-toggle').checked;
        const maintenanceMessage = document.getElementById('maint-message').value;
        await fetch(`${API}/site-config`, { method:'POST', headers:{'Content-Type':'application/json', 'x-admin-auth':TOKEN}, body:JSON.stringify({ maintenanceMode, maintenanceMessage }) });
        alert(maintenanceMode ? "⚠ MAINTENANCE MODE ACTIVE" : "SITE LIVE");
    }