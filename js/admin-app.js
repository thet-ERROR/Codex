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

    function edit(id) {
        const pc = inventory.find(i=>i._id===id); if(!pc) return;
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
        document.querySelectorAll('input, textarea').forEach(i=>i.value='');
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
            reviews: currentReviews
        };
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
        
        const data = {
            title: document.getElementById('v-title').value,
            price: document.getElementById('v-price').value,
            image: imgInput,
            targetVotes: document.getElementById('v-target').value,
            startDate: document.getElementById('v-start').value,
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
        } catch(e) { console.log("Maintenance config load error", e); }
    }

    async function saveMaintenance() {
        const maintenanceMode = document.getElementById('maint-toggle').checked;
        const maintenanceMessage = document.getElementById('maint-message').value;
        await fetch(`${API}/site-config`, { method:'POST', headers:{'Content-Type':'application/json', 'x-admin-auth':TOKEN}, body:JSON.stringify({ maintenanceMode, maintenanceMessage }) });
        alert(maintenanceMode ? "⚠ MAINTENANCE MODE ACTIVE" : "SITE LIVE");
    }