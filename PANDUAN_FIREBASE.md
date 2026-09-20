# 🔥 Panduan Setup Firebase untuk SkateKids Track

Ikuti langkah berikut **satu kali saja**, kemudian web akan berjalan di Vercel secara online.

---

## 📋 Langkah 1 — Buat Project Firebase (Gratis)

1. Buka **https://console.firebase.google.com/**
2. Klik **"Add project"** (Tambahkan Proyek)
3. Nama project: misalnya `skatekids-tracker`
4. Nonaktifkan Google Analytics (opsional)
5. Klik **"Create project"** → tunggu hingga selesai

---

## 📋 Langkah 2 — Daftarkan Web App

1. Di halaman project, klik ikon **`</>`** (Web)
2. Isi App nickname: `SkateKids Dashboard`
3. **JANGAN centang** Firebase Hosting
4. Klik **"Register app"**
5. Anda akan melihat kode seperti ini — **salin seluruhnya!**

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "skatekids-tracker.firebaseapp.com",
  databaseURL: "https://skatekids-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "skatekids-tracker",
  storageBucket: "skatekids-tracker.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## 📋 Langkah 3 — Aktifkan Realtime Database

1. Di panel kiri Firebase Console, klik **"Realtime Database"**
2. Klik **"Create Database"**
3. Pilih lokasi: **Singapore (asia-southeast1)**
4. Pilih mode: **"Start in test mode"** *(untuk mudah digunakan)*
5. Klik **"Enable"**

---

## 📋 Langkah 4 — Edit File Config

Buka **2 file** berikut dan ganti config:

### File 1: `js/app.js` (baris 9-17)
### File 2: `tracker.html` (baris di dalam script)

Ganti bagian:
```javascript
const FIREBASE_CONFIG = {
  apiKey:            "GANTI_DENGAN_API_KEY_ANDA",
  authDomain:        "GANTI_DENGAN_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://GANTI_DENGAN_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "GANTI_DENGAN_PROJECT_ID",
  storageBucket:     "GANTI_DENGAN_PROJECT_ID.appspot.com",
  messagingSenderId: "GANTI_DENGAN_SENDER_ID",
  appId:             "GANTI_DENGAN_APP_ID"
};
```

Dengan config yang Anda salin dari Firebase Console:
```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",          // ← dari Firebase
  authDomain:        "skatekids-tracker.firebaseapp.com",
  databaseURL:       "https://skatekids-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "skatekids-tracker",
  storageBucket:     "skatekids-tracker.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

---

## 📋 Langkah 5 — Upload ke Vercel

Upload file-file ini ke Vercel (vercel.com):

```
📁 iot-gps-tracker/
├── index.html          ← Dashboard orang tua
├── tracker.html        ← HP anak
├── firebase-config.js  ← (opsional, tidak dipakai langsung)
├── css/
│   └── styles.css
└── js/
    ├── app.js          ← Sudah pakai Firebase
    ├── map-manager.js
    └── telemetry-engine.js
```

**CATATAN: `server.js` TIDAK PERLU DIUPLOAD lagi!**

---

## 🚀 Cara Pakai Setelah Setup

### HP Orang Tua (Dashboard):
1. Buka: `https://skate-xi.vercel.app/`
2. Klik **"+ Hubungkan HP Anak (QR Code)"**
3. Isi nama dan berat badan anak
4. Klik **"Buat Kode / Ruangan Baru"**

### HP Anak (Tracker):
1. Scan QR Code di layar orang tua, ATAU
2. Buka link yang dikopi: `https://skate-xi.vercel.app/tracker.html?room=SKATE-XXXX`
3. Klik **"MULAI MELUNCUR ⛸️"**

### Mulai Monitoring:
- Orang tua akan melihat posisi, kecepatan, dan jarak anak secara **real-time** ✅

---

## ❓ FAQ

**Q: Apakah gratis?**  
A: Ya! Firebase Realtime Database gratis hingga 1GB data dan 10GB/bulan transfer data. Lebih dari cukup.

**Q: Apakah aman?**  
A: Data GPS dikirim langsung dari HP anak ke Firebase, tidak melewati server lain.

**Q: Berapa delay real-time?**  
A: Firebase biasanya < 500ms. Sangat cepat untuk monitoring anak!

**Q: Apakah bisa banyak anak?**  
A: Ya! Setiap anak memiliki kode room berbeda (SKATE-XXXX).
