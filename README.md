# 🦅 Phoenix Codex - Cyberpunk PC Store DEMO
🔗 Live Demo: https://codex-iota-nine.vercel.app
A high-end custom PC retail platform featuring a cyberpunk aesthetic and AI integration.

## 🚀 Features
- **Cyberpunk UI:** Built with CSS Grid and Flexbox for a full "Matrix" experience.
- Secure API Communication
- **Support Assistant:** Guided help menu (Codex Support) covering the most common customer questions.
- **Holographic Effects** Dynamic product showcase with hover effects.
- **Mobile Optimized:** Fully responsive layout for smartphones and tablets.

## 🛠️ Tech Stack
- **Frontend:** HTML5, CSS3 (Custom Variables), JavaScript (Vanilla).
- **Backend:** Node.js / Express (Hosted on Render).
- **Deployment:** Vercel (Frontend), Render (Backend).

## 📁 Project Structure
- `/css`: Contains all styling and media queries.
- `/js`: Store logic and Chatbot functionality.
- `/assets`: Images, GIFs, and sound effects.

## 👷 Development Workflow
This project follows the **Git Flow** model. All development and testing occur in the `main-test` branch before merging into `main`.

Vercel is wired to match: a push to `main-test` builds a **Preview** deployment, and merging the
pull request into `main` is what promotes it to **Production**. The API lives in the separate
[codex-backend](https://github.com/thet-ERROR/codex-backend) repository and follows the same flow,
deployed on Render.

## 🚢 Deploy order
A single feature often touches both repositories, and they deploy independently. **Deploy the
backend first**, wait for Render to report *Live*, and only then merge the frontend pull request.

An older frontend works fine against a newer API, because backend changes are additive. A frontend
that ships first calls routes that do not exist yet and breaks production.
