// js/modules/whoami.js
const WHOAMI_TEXT = `> IDENTITY: CODEX

Είμαι ο Codex.

Σκοπός μου δεν είναι να γεμίσω την αγορά με άλλο ένα τυποποιημένο, άψυχο μηχάνημα μαζικής παραγωγής. Το PHOENIX CODEX δημιουργήθηκε για να στήσει ένα εντελώς διαφορετικό Network. Ένα δίκτυο από custom rigs, φτιαγμένα στο χέρι, με απόλυτη έμφαση στο performance, το cable management και την αισθητική. Κάθε σύστημα που βγαίνει από εδώ περνάει τα δικά μου, αυστηρά πρωτόκολλα.

Αν ψάχνεις απλά ένα PC, είσαι σε λάθος δίκτυο.
Αν ψάχνεις το επόμενο Project σου, μόλις έκανες log in στο σωστό μέρος.`;

let typeTimer = null;

function typeWriter(el, text, speed = 18) {
    clearTimeout(typeTimer);
    el.textContent = '';
    let i = 0;
    const step = () => {
        if (i >= text.length) return;
        el.textContent += text.charAt(i);
        i++;
        typeTimer = setTimeout(step, speed);
    };
    step();
}

export function openWhoAmI() {
    if (window.openModal) window.openModal('whoami-modal');
    const textEl = document.getElementById('whoami-text');
    if (textEl) typeWriter(textEl, WHOAMI_TEXT);
}

window.openWhoAmI = openWhoAmI;
