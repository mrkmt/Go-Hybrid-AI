# Go-Hybrid AI (v1.2.5)

**Go-Hybrid AI** is a high-speed, local-first forensic testing platform. It transforms manual testing into automated "investigations" using a unique Digital Detective methodology that bridges **Admin Ground Truth** (Standards) and **Current Executions** (Tests).

## 🕵️‍♂️ Core Features

- **Hybrid AI Bridge:** Combines **Local AI (Ollama)** for data privacy and **Cloud AI (Gemini)** for high-level reasoning.
- **Forensic Dashboard:** Side-by-side 3-frame visual audit (Admin vs. Manual vs. Automated).
- **Real-time Streaming:** Live WebSocket feed of recording steps appearing instantly in the dashboard.
- **Object Repository:** Centralized UI element management with **Self-Healing** AI repair.
- **Multi-Vector Ingestion:** Ingest intelligence from **Playwright, Selenium, Postman, and JMeter**.
- **Specialized Forensic Units:** Built-in logic for auditing HR modules like Payroll, Attendance, and Leave.

## 🏗️ Technical Stack

- **Backend:** Node.js, Express, TypeScript, PostgreSQL.
- **Frontend:** React, Vite (Cyber-Security Dark Theme).
- **Storage:** MinIO (Local S3-compatible asset storage).
- **AI:** Ollama (Qwen 2.5) & Gemini 1.5 Flash.

---

## 🚀 How to Run (စနစ်ကို စတင်အသုံးပြုပုံ)

### 1. Fast Setup (One-Click)
The easiest way to set up everything (DB creation, dependencies, and launch) is using the PowerShell script:
```powershell
.\setup.ps1
```

### 2. Manual Start (အဆင့်ဆင့် စတင်ပုံ)
If you prefer starting components manually:

**Step A: Initialize Database**
```bash
npm run init-db
```

**Step B: Start Forensic Backend (API)**
```bash
npm run start-api
```

**Step C: Start Forensic Dashboard (UI)**
```bash
npm run start-kb
```

**Step D: Load Extension**
1. Open Chrome -> `chrome://extensions`
2. Enable **Developer Mode**.
3. Click **Load Unpacked** and select the `extension/recorder` folder.

---

## 🧪 How to Test (စနစ်ကို စမ်းသပ်စစ်ဆေးပုံ)

### 1. Full System Forensic Audit (စနစ်တစ်ခုလုံးကို စစ်ဆေးရန်)
Run the master audit script to verify DB, AI, and Logic integrity:
```bash
npx ts-node scripts/test-full-system.ts
```

### 2. Run Logic Validator Tests (မူဝါဒစစ်ဆေးချက်များကို စမ်းသပ်ရန်)
Verify the HR logic validators (Leave, Holiday, etc.):
```bash
npm test
```

### 3. Run Typecheck (Code တည်ဆောက်ပုံ စစ်ဆေးရန်)
Ensure all TypeScript definitions are correct:
```bash
npm run typecheck
```

---

## 🇲🇲 Burmese Translation (မြန်မာဘာသာ ပြန်ဆိုချက်)

**Go-Hybrid AI** သည် မြန်မာနိုင်ငံရှိ software developer များနှင့် QA အဖွဲ့များအတွက် အထူးရည်ရွယ်ထားသော local-first forensic testing platform ဖြစ်ပါသည်။

### အဓိက လုပ်ဆောင်ချက်များ
- **Hybrid AI Bridge:** အချက်အလက်လုံခြုံမှုအတွက် Local AI (Ollama) နှင့် ပိုမိုနက်ရှိုင်းသော စစ်ဆေးမှုများအတွက် Cloud AI (Gemini) ကို ပေါင်းစပ်အသုံးပြုထားသည်။
- **Forensic Dashboard:** Admin standard နှင့် လက်ရှိ failure ကို ယှဉ်ကြည့်နိုင်သော ၃-ဖက်မြင် visual audit စနစ်။
- **Real-time Streaming:** Browser တွင် record လုပ်နေစဉ် dashboard တွင် ချက်ချင်းမြင်တွေ့နိုင်သော WebSocket စနစ်။
- **Self-Healing Core:** UI ပြောင်းလဲမှုများကြောင့် test များမပျက်စီးစေရန် AI က အလိုအလျောက် ပြင်ဆင်ပေးသည့် စနစ်။

### စုံထောက် workflow (Investigation Workflow)
1. **Capture:** "ပြီးပြည့်စုံသော run" တစ်ခုကို record လုပ်ပြီး Admin Standard အဖြစ် သတ်မှတ်ပါ။
2. **Execute:** Automated test များ run ပါ သို့မဟုတ် manual failure များကို capture လုပ်ပါ။
3. **Audit:** CLI သို့မဟုတ် Dashboard ကိုသုံး၍ Standard နှင့် ယှဉ်စစ်ပါ။
4. **Verdict:** ကုမ္ပဏီ၏ မူဝါဒများ (MD files) အပေါ် မူတည်၍ AI က **[GUILTY] (အမှား)** သို့မဟုတ် **[CLEAR] (အမှန်)** ဖြစ်ကြောင်း ဆုံးဖြတ်ပေးပါမည်။

---
*Developed for high-integrity software environments. Privacy-first. Local-first.*
