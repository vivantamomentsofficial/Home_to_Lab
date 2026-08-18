# CloudVault V4: Future Roadmap & Code Enhancements

This document outlines the recommended new features to build and minor code fixes/polishes to apply in future updates to make CloudVault V4 an industry-grade, feature-rich platform.

---

## 🚀 1. Recommended New Features (आने वाले नए फीचर्स)

### 🔥 A. "Burn-After-Reading" Sharing (स्व-विनाश कोड)
* **Description:** Allow users to flag a file or online clipboard snippet as "Self-Destruct". The instant it is retrieved once via the 6-digit share code, the record is immediately purged from both the database and the Supabase storage bucket.
* **Why it's cool:** Perfect for students who want to securely pass a database password or private access key from the college lab to home without leaving any residual trace.

### ⚡ B. Download Multiple Files as a single ZIP
* **Description:** Add checkboxes to the Vault Explorer file list. Let users select multiple items and click a single button to download them compiled dynamically into a `.zip` archive on the client-side (using `JSZip` library).
* **Why it's cool:** Saves students from manually clicking download on 10 separate assignment files individually.

### ⏱️ C. Custom Share Expiry & Live Countdown Timers
* **Description:** Add an expiration duration selector (e.g., 5 mins, 30 mins, 2 hours, 12 hours) when generating sharing codes. In the active shares table, display a live ticking countdown timer showing exactly when the link will die.
* **Why it's cool:** Gives users complete control over temporal access and creates a very dynamic, live feel on the dashboard.

### 💻 D. Live Code Snippet Highlights & Preview Sandbox
* **Description:** Integrate a lightweight code editor library (like PrismJS or Monaco Editor) for online clipboard code clippings. Highlight python, java, or HTML snippets dynamically, and add an iframe-based preview panel for HTML clippings.
* **Why it's cool:** Lab computer users are heavily focused on writing code. Viewing formatted code rather than plain text is a massive upgrade.

### 🎤 E. Quick Voice Recorder Upload
* **Description:** Add a microphone icon inside the Quick Note creator. Students can record a quick voice snippet (e.g., a professor's lab guidelines or reminders) and upload it instantly as an `.mp3` or `.webm` audio file.
* **Why it's cool:** Increases accessibility and speed during hectic classes where typing takes too long.

---

## 🛠️ 2. Code Polishes & Minor Fixes (भविष्य के सुधार)

### 📈 A. Dynamic Storage Breakdown Charts
* **Improvement:** Replace the standard quota text loader with a modern canvas donut chart (using `Chart.js` or simple inline SVGs) displaying a visual breakdown of storage usage (e.g., 30% Images, 50% Code Files, 20% Documents).
* **Benefit:** Elevates the Dashboard visual aesthetics into a premium SaaS product look.

### 🔐 B. End-to-End Client-Side Encryption for Snippets
* **Improvement:** Currently, files can be encrypted using a password. Extend this exact cryptographic feature (Web Crypto API) to clipboard clippings so that text snippets are encrypted before hitting the database.
* **Benefit:** Absolute security for student notes—not even the Supabase database administrator can read the raw snippet content without the passphrase.

### 📧 C. Global Admin Alert Banner
* **Improvement:** Build a simple notification banner at the top of the User Dashboard that queries `public.global_alerts`. When the Super Admin posts a new announcement, it instantly displays for all active users.
* **Benefit:** Keeps lab students informed of server updates or lab schedules.

---

## 📝 3. Database Tweaks

### 🔄 Auto-Cleanup Cron Job Scheduling
* **Improvement:** Register the `public.cleanup_old_data()` cleanup function inside Supabase's `pg_cron` extension to run automatically every night:
  ```sql
  SELECT cron.schedule('cleanup-expired-shares', '0 0 * * *', 'SELECT public.cleanup_old_data();');
  ```
* **Benefit:** Automates storage purging so you never have to manually clean up expired file shares.
