# ⚡ CloudVault V4 - Secure Cloud Storage & Code/File Sharing Platform

**CloudVault V4** is a modern, privacy-focused personal cloud storage, clipboard, and code snippet sharing web application. Designed for students, developers, and professionals, it provides a fast, encrypted, and temporary bridge to transfer files, code snippets, and text notes between computers without relying on untrusted USB drives or logging into personal accounts on shared lab PCs.

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React & FontAwesome Icons, Web Crypto API
- **Backend API**: Node.js, Express.js, Rate-Limiting, Morgan logging, Security Definer RPCs
- **Database & Storage**: Supabase (PostgreSQL with RLS, Auth, Object Storage Bucket)
- **Deployment**: Vercel (Frontend & Serverless API Support) / Node.js Host

---

## 📁 Project Architecture

```
CloudVault V4/
├── backend/                  # Express.js REST API Server
│   ├── middleware/           # JWT Authentication & Admin Guards
│   ├── routes/               # API endpoints (share.js, admin.js, auth.js)
│   ├── package.json          # Node dependencies
│   └── server.js             # Server entry point
│
├── frontend/                 # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/       # UI Components (QR Modal, PWA, Banners, Charts)
│   │   ├── context/          # Auth Context & Supabase Session Provider
│   │   ├── hooks/            # Custom Hooks (inactivity logout, theme)
│   │   ├── pages/            # React Pages (Home, Dashboard, Admin, Login, Register)
│   │   ├── services/         # File Service & Storage Utilities
│   │   ├── utils/            # Crypto Helper (AES-256) & Security Utilities
│   │   ├── App.jsx           # Routing & App Guard setup
│   │   └── main.jsx          # React entry point
│   ├── public/               # Static assets, PWA manifest, robots.txt
│   └── package.json          # Vite & React dependencies
│
├── schema.sql                # Complete Supabase PostgreSQL Schema & RLS Policies
├── sitemap.xml               # SEO Sitemap
└── vercel.json               # Vercel Deployment Configuration
```

---

## 🔑 Key Features & Highlights

### 1. 🔏 Code & File Sharing via 6-Digit Access Codes
- **Instant Code Share**: Generate cryptographically secure, collision-free 6-character access codes for any file or code snippet.
- **Custom Expiry**: Set code validity from 1 minute up to 7 days.
- **Single-Use Codes**: Create single-use download links where access codes expire immediately after the first retrieval.
- **QR Code Modal**: Generate downloadable QR codes for instant mobile device camera scanning and one-tap downloading.
- **Public Retrieval**: Recipients can enter the 6-digit code or scan the QR link on the landing page to view metadata and download files without needing an account.

### 2. 📝 Code Snippets & Encrypted Notes
- **Text & Code Management**: Create, edit, copy, and organize text notes and multi-language code snippets (Java, Python, C++, JS, SQL, Rust, Go, HTML/CSS).
- **AES-256 Client-Side Encryption**: Lock sensitive notes with personal encryption passphrases. Encrypted notes remain safe even on shared storage.
- **Convert & Share**: Share any text note or code snippet as a temporary 6-digit share code with a single click.

### 3. 📂 Advanced Vault File Explorer
- **Multi-Format Previews**: Built-in interactive lightbox for images, text/code viewer, audio/video players, and PDF previews.
- **Categorization & Filtering**: Sort and filter files by format (Images, Documents, Code, Text, Archives, Others).
- **Storage Donut Chart**: Dynamic breakdown of total vault storage used by file type.
- **Trash & Recovery**: Move deleted files and notes to trash with full restore capabilities or permanent deletion.

### 4. 🛡️ Security & Privacy
- **Row Level Security (RLS)**: Enforced PostgreSQL security policies ensure users can only access their own private data.
- **Security Definer RPCs**: Share code resolutions run inside isolated RPC functions, keeping base database tables fully hidden from public access.
- **Executable File Blocking**: Automatic security validation blocks executable files (`.exe`, `.bat`, `.cmd`, `.sh`, `.apk`, etc.) from being shared publicly.
- **Inactivity Auto-Logout**: Configurable idle timer automatically logs off idle sessions on shared lab PCs.

### 5. 👑 Super Admin Dashboard
- **User Management**: View active users, total storage consumption, and last login IP addresses.
- **Quota & Privilege Control**: Adjust individual user storage limits, suspend accounts, or revoke sharing privileges.
- **Audit Logging & System Flags**: Track system events and toggle global features dynamically.

---

## 🛠️ Step-by-Step Local Setup

### 1. Database & Supabase Setup
1. Create a project on [Supabase](https://supabase.com/).
2. Open the **SQL Editor** tab, paste the entire contents of `schema.sql`, and execute it.
3. Verify that the storage bucket `vault` is created and RLS policies are applied.

### 2. Backend Environment Setup
Navigate to the `backend/` directory:
```bash
cd backend
npm install
```
Create a `.env` file inside `backend/`:
```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAIL=aayushparekh26@gmail.com
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the `frontend/` directory:
```bash
cd frontend
npm install
```
Create a `.env` file inside `frontend/`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:5000
```
Start the Vite development server:
```bash
npm run dev
```

---

## 📜 License

This project is maintained under the MIT License. Developed for secure personal cloud storage and seamless code sharing.
