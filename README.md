# CloudVault

**CloudVault** is a modern, student-centric personal cloud storage and clipboard web application. It is designed to act as a secure, fast, and temporary bridge for students needing to transfer assignment files or text snippets between home and college computer labs (where USB drives are often forbidden, lost, or unsecure, and logging into personal email/drive accounts on lab computers presents credential theft risks).

---

## 🚀 Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No Frameworks, No Bootstrap)
- **Backend-as-a-Service**: Supabase (Authentication, PostgreSQL Database, Storage Bucket)
- **Design Theme**: Premium glassmorphism light-blue and white theme (Soft Light-Blue `#F0F4F8` background, Crisp White `#FFFFFF` panels, Sky-Blue `#0284C7` primary highlights, with a fully responsive grid system and togglable dark mode).

---

## 📂 Project Structure
```
CloudVault/
├── index.html        # Landing Page & Public share code downloader
├── login.html        # Login Page
├── register.html     # Registration Page
├── dashboard.html    # Core dashboard interface (tabbed panels)
├── schema.sql        # Database tables schema and RLS security policies
├── .gitignore        # Prevents committing local config.js and env keys
├── api/
│   └── config.js     # Vercel Serverless Function serving credentials from env variables
├── css/
│   ├── style.css     # Design system, themes, animations, utilities
│   └── responsive.css# Mobile & Tablet layout overrides
└── js/
    ├── config.js     # [LOCAL ONLY] Ignored local development keys
    ├── supabase.js   # Supabase client initializer and configuration cascades
    ├── auth.js       # Login, register, password recovery flows, and toast component
    ├── dashboard.js  # Main navigation, storage calculation, keyboard shortcuts
    ├── upload.js     # Drag-and-Drop, Abortable upload, DB cataloging
    ├── clipboard.js  # Quick Text manager, pasted notes txt file writer
    ├── files.js      # Vault explorer, download URL generators, media previews, sharing codes
    ├── settings.js   # Light/Dark mode toggles, inactivity auto-logout monitor
    └── profile.js    # Initials avatars, display name changes, data wiping
```

---

## 🛠️ Step-by-Step Setup Guide

To run CloudVault locally or deploy it to Vercel, follow these setup steps:

### 1. Set up your Supabase Project
1. Create a free account at [Supabase](https://supabase.com/).
2. Create a new project named `CloudVault`.
3. In your Supabase project dashboard, navigate to the **SQL Editor** tab in the sidebar.
4. Click **New query**, paste the entire contents of the [schema.sql](file:///c:/Users/Admin/OneDrive/Desktop/CloudVault/schema.sql) file, and click **Run**.
   - This creates the `files`, `notes`, and `share_codes` database tables.
   - This enables Row Level Security (RLS) and configures security policies so users can only access their own files.
   - This creates a storage bucket called `vault` and sets its upload/read policies.
5. Under **Authentication** -> **Sign In / Providers** -> **Anonymous**, toggle **"Allow anonymous sign-ins"** to **Enabled (On)** and click **Save changes**.

### 2. Configure Storage Bucket
1. In your Supabase dashboard, go to **Storage**.
2. Make sure you see a bucket named `vault`. If it wasn't automatically created by the SQL script, click **New bucket**, name it `vault`, set it to **Private** (do not toggle public access), and click **Create**.
3. Under Storage settings, verify that Row Level Security (RLS) is enabled for the `vault` bucket.

### 3. Local Development Credentials
1. Edit the file [js/config.js](file:///c:/Users/Admin/OneDrive/Desktop/CloudVault/js/config.js) in your local workspace.
2. Replace the `SUPABASE_URL` and `SUPABASE_ANON_KEY` values with your project's credentials.
3. This file is ignored by `.gitignore` so your secret API keys are never leaked to public git repositories.

### 4. Production Vercel Deployment & Environment Variables
When deploying to Vercel, you do not need to upload `js/config.js`. Vercel will securely load your keys from the environment:
1. Go to your **Vercel Project Dashboard** -> **Settings** -> **Environment Variables**.
2. Create the following two variables:
   - `SUPABASE_URL` : (Your Supabase Project URL, e.g., `https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` : (Your Supabase Publishable/Anon API Key)
3. Deploy the project. The serverless function inside `api/config.js` will automatically read these variables and securely load them for the frontend website on load.
4. *Fallback Wizard*: If both local files and Vercel variables are missing, the website will show a beautiful setup connection wizard that stores inputs locally in `localStorage` for testing.

---

## 💎 Features Walkthrough

### 1. Landing Page Sharing Code Retrieve
- On the landing page, click the **Access Shared File via Temporary Code** input box.
- Enter a 6-digit sharing code generated from another device.
- If the code is active (expires in 30 minutes), a download box pops up. You can download the file instantly without even having to register or log in on the target computer!

### 2. Send to Server (Uploader)
- Drag and drop files directly onto the dotted card or select them.
- Features active uploads list with progress bars, individual **Cancel** buttons (using `AbortController`), and **Retry** triggers.
- Constrained to **100MB** max per file.

### 3. Clipboard Pasting (CTRL + SHIFT + V)
- Pressing `Ctrl + Shift + V` on the dashboard opens a paste panel.
- Entering text and saving writes a physical `clipboard_[timestamp].txt` file into the storage bucket, logs it in the files database, and registers it in the snippets table!

### 4. Vault File Management (Receive)
- Switch layout between **Grid** and **List**.
- Filter files by tag (Images, Documents, Code, Text, ZIPs, Others).
- Sort files by size, date, or name, and perform instant searching.
- Open **Preview** modal for Images (lightbox) and Text/Code files (with scrollable syntax code display). PDFs are opened directly in a clean browser preview.
- Rename, delete, or generate a **6-digit Sharing Code**.

### 5. Inactivity Auto-Logout
- In the Settings panel, configure the auto-logout idle timer (Disabled, 5 mins, 15 mins, 30 mins).
- Keeps track of user activity (keyboards, mouse movements, scrolling, touches). If inactive, automatically logs the student out to protect their session on shared lab computers.
