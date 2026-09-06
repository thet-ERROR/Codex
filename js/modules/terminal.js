// js/modules/terminal.js
import { state } from '../state.js';

export function toggleCLI() { 
    const cli = document.getElementById('cli-overlay'); 
    const input = document.getElementById('cli-input'); 
    if(!cli) return;
    
    cli.classList.toggle('active');
    if (cli.classList.contains('active')) {
        const output = document.getElementById('cli-output');
        if (output) output.scrollTop = output.scrollHeight;
        if (input) input.focus();
    }
}

export function toggleHackMode() { 
    state.isHacked = !state.isHacked; 
    state.matrixEnabled = state.isHacked; 
    
    const canvas = document.getElementById('matrix-canvas');
    if (state.isHacked) { 
        if (canvas) canvas.style.opacity = '0.3'; 
        // Αλλάζει το βασικό πράσινο σε έντονο "Matrix" πράσινο
        document.documentElement.style.setProperty('--neon-green', '#00ff00'); 
    } else { 
        if (canvas) canvas.style.opacity = '0'; 
        // Επαναφέρει το χρώμα στο επιλεγμένο θέμα του χρήστη
        document.documentElement.style.setProperty('--neon-green', state.currentTheme); 
    } 
}

export function initMatrix() {
    const canvas = document.getElementById('matrix-canvas');
    if(!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ';
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);
    
    const draw = () => { 
        if (!state.matrixEnabled) return;
        
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

export function initTerminal() {
    // 1. Event Listener για το άνοιγμα/κλείσιμο με το πλήκτρο `
    document.addEventListener('keydown', (e) => { 
        if (e.key === '`') { 
            e.preventDefault(); 
            toggleCLI(); 
        } 
    });

    // 2. Event Listener για την επεξεργασία των εντολών
    const cliInput = document.getElementById('cli-input');
    if (cliInput) {
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
                    output.innerText += state.isHacked ? ">> SYSTEM COMPROMISED. ACCESS GRANTED.\n" : ">> SYSTEM RESTORED. PROTOCOLS NORMAL.\n"; 
                } else if (cmd === 'loot') {
                    // Same reasoning as the wheel: a literal code in client-side source is
                    // public the moment anyone opens devtools.
                    output.innerText += ">> DECRYPTING VAULT...\n>> HIDDEN COMMUNIQUE FOUND:\n>> MENTION 'THE VAULT IS OPEN' ON WHATSAPP FOR A SURPRISE.\n";
                } else if (cmd === 'codex') {
                    output.innerText += ">> ACCESSING MAINFRAME...\n>> WAKE UP, AGENT.\n>> THE MATRIX HAS YOU.\n";
                } else if (cmd !== "") { 
                    output.innerText += `Command not found: ${cmd}\n`; 
                } 
                
                // Αυτόματο scroll στο κάτω μέρος του τερματικού
                output.scrollTop = output.scrollHeight; 
            } 
        });
    }
}

// Εξαγωγή στο global scope (χρησιμοποιείται στο onclick="toggleCLI()")
window.toggleCLI = toggleCLI;