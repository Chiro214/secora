# 🛡️ Secora — AI-Powered Web Vulnerability Analyzer

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)]()
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)]()
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)]()
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)]()
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)]()
[![OpenAI API](https://img.shields.io/badge/OpenAI_API-412991?style=for-the-badge&logo=openai&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)]()
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-1E1F25?style=for-the-badge&logo=framer&logoColor=E300B5)]()
[![OWASP](https://img.shields.io/badge/OWASP-Security%20Standards-orange?style=for-the-badge)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)]()
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)]()

---

### 🧠 Overview
**Secora** is an AI-powered web vulnerability analyzer that inspects websites and codebases for potential risks.  
It combines **OWASP-based scanning**, **TLS/SSL validation**, and **OpenAI-driven remediation suggestions** — all inside a beautiful glass-morphic dashboard.

---

### 🚀 Features
✅ **AI-Enhanced Analysis** — uses OpenAI GPT to explain vulnerabilities and recommend real fixes.  
✅ **OWASP Mapped Findings** — every issue includes its OWASP category (e.g. A05:2021 Security Misconfiguration).  
✅ **TLS / SSL Inspection** — checks certificate validity, expiry, and encryption level.  
✅ **HTTP Header Audit** — detects missing security headers like CSP, HSTS, and Referrer-Policy.  
✅ **Redis Queue** — handles async background scanning for large-scale concurrency.  
✅ **Modular API Design** — built with Node.js + Express.js for easy SaaS integration.  
✅ **Next.js Frontend** — dynamic React UI with TailwindCSS and Framer Motion animations.  
✅ **Future-Ready** — can scale into a full SaaS app with authentication, billing, and report exports.  

---

### ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js • TypeScript • TailwindCSS • Framer Motion |
| **Backend** | Node.js • Express.js • OpenAI API |
| **Database / Queue** | Redis (BullMQ) |
| **AI Integration** | OpenAI GPT-4 (Security explanation & remediation) |
| **Security Standards** | OWASP 2021 Top 10 |
| **Deployment Ready** | Docker, Supabase, Vercel / Render |

---

### 🧩 Folder Structure
