# 💻 CODEX | Advanced Custom PC Platform

Welcome to **CODEX**, a next-generation e-commerce and portfolio platform designed specifically for custom-built gaming PCs and tech enthusiasts. 

Moving away from traditional, boring storefronts, CODEX offers a fully immersive, cyberpunk-inspired user experience. Users act as "Agents" navigating a terminal-based interface to hunt for exclusive PC drops, benchmark systems, and interact with the mainframe.

## 🚀 Key Features

* **Interactive Terminal (CLI):** A fully functional, hidden command-line interface accessible via the `~` key. Features system overrides, easter eggs, and secure mainframe access simulations.
* **CODEX AI Assistant:** A smart, state-aware chatbot that guides users, recommends specific PC builds based on gaming needs, handles FAQs, and seamlessly connects high-intent buyers directly to the Admin via WhatsApp.
* **Agent Onboarding (Guided Tour):** A gamified, interactive tutorial built with `driver.js` that highlights key UI elements (Live Drops, Vault, CLI) for first-time visitors, automatically saving state to `localStorage`.
* **Mission Code Validation:** Physical "Mission Codes" shipped with PCs can be redeemed on the platform to leave verified reviews, establishing trust and community engagement.
* **Community Drops (Gamification):** A crowdfunding-style voting system where users collaborate to unlock highly anticipated future PC builds.
* **Secure Admin Dashboard:** A protected, backend panel to manage inventory (add/edit PCs), track incoming tickets, generate Mission Codes, and launch new Community Drop events.

## 🛠️ Tech Stack

* **Frontend:** Vanilla HTML5, CSS3 (Glassmorphism & Neon UI), JavaScript (ES6+).
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB (Mongoose).
* **Security:** Password hashing via `Bcrypt`, secure Admin routes, `.env` secret management.
* **Integrations:** Nodemailer (Password recovery & network updates).

## 🔒 Security Notice
This is a private repository. Sensitive environment variables (`.env`), database URIs, and authentication secrets are strictly ignored via `.gitignore` to ensure maximum security.
