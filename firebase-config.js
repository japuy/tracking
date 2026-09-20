/**
 * SkateKids Track - Firebase Configuration
 * =========================================
 * INSTRUKSI SETUP (WAJIB DILAKUKAN SEKALI):
 *
 * 1. Buka https://console.firebase.google.com/
 * 2. Klik "Add project" → beri nama misal: "skatekids-tracker"
 * 3. Setelah project dibuat, klik ikon "</>" (Web App)
 * 4. Daftarkan app, JANGAN aktifkan Firebase Hosting
 * 5. Salin konfigurasi firebaseConfig dan ganti nilai di bawah ini
 * 6. Di panel kiri, klik "Realtime Database" → "Create Database"
 *    → Pilih lokasi (Singapore/Asia) → Start in TEST MODE
 * 7. Selesai! Upload ke Vercel, web akan berjalan.
 */

const FIREBASE_CONFIG = {
  apiKey:            "GANTI_DENGAN_API_KEY_ANDA",
  authDomain:        "GANTI_DENGAN_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://GANTI_DENGAN_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "GANTI_DENGAN_PROJECT_ID",
  storageBucket:     "GANTI_DENGAN_PROJECT_ID.appspot.com",
  messagingSenderId: "GANTI_DENGAN_SENDER_ID",
  appId:             "GANTI_DENGAN_APP_ID"
};

// =========================================================================
// Firebase Service Layer - Dipakai oleh tracker.html & index.html
// =========================================================================

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isReady = false;
  }

  async init() {
    try {
      // Import Firebase SDK dari CDN
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const { getDatabase, ref, set, onValue, push, serverTimestamp, get } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

      this.app = initializeApp(FIREBASE_CONFIG);
      this.db = getDatabase(this.app);

      this._ref = ref;
      this._set = set;
      this._onValue = onValue;
      this._push = push;
      this._serverTimestamp = serverTimestamp;
      this._get = get;

      this.isReady = true;
      console.log('[Firebase] Connected ✓');
      return true;
    } catch (err) {
      console.error('[Firebase] Init failed:', err);
      return false;
    }
  }

  /**
   * TRACKER (HP ANAK): Kirim data GPS ke Firebase
   */
  async sendTelemetry(roomCode, payload) {
    if (!this.isReady) return;
    const path = this._ref(this.db, `rooms/${roomCode}/telemetry`);
    await this._set(path, {
      ...payload,
      _ts: Date.now()
    });
  }

  /**
   * TRACKER (HP ANAK): Cek apakah ada sinyal ping dari orang tua
   */
  listenForPing(roomCode, callback) {
    if (!this.isReady) return;
    const path = this._ref(this.db, `rooms/${roomCode}/ping`);
    this._onValue(path, (snapshot) => {
      const data = snapshot.val();
      if (data && data.active === true) callback(data);
    });
  }

  /**
   * TRACKER (HP ANAK): Reset / hapus flag ping setelah diakui anak
   */
  async ackPing(roomCode) {
    if (!this.isReady) return;
    const path = this._ref(this.db, `rooms/${roomCode}/ping`);
    await this._set(path, { active: false });
  }

  /**
   * DASHBOARD (HP ORANG TUA): Dengarkan update GPS secara real-time
   */
  listenToTelemetry(roomCode, callback) {
    if (!this.isReady) return;
    const path = this._ref(this.db, `rooms/${roomCode}/telemetry`);
    return this._onValue(path, (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    });
  }

  /**
   * DASHBOARD (HP ORANG TUA): Daftarkan profil anak & buat Room
   */
  async registerChild(roomCode, profile) {
    if (!this.isReady) return;
    const path = this._ref(this.db, `rooms/${roomCode}/profile`);
    await this._set(path, {
      ...profile,
      createdAt: Date.now()
    });
  }

  /**
   * DASHBOARD (HP ORANG TUA): Ambil profil anak dari Firebase
   */
  async getChildProfile(roomCode) {
    if (!this.isReady) return null;
    const path = this._ref(this.db, `rooms/${roomCode}/profile`);
    const snapshot = await this._get(path);
    return snapshot.exists() ? snapshot.val() : null;
  }

  /**
   * DASHBOARD (HP ORANG TUA): Kirim sinyal ping/panggil ke HP anak
   */
  async pingChild(roomCode) {
    if (!this.isReady) return;
    const path = this._ref(this.db, `rooms/${roomCode}/ping`);
    await this._set(path, {
      active: true,
      sentAt: Date.now()
    });
  }
}

// Global singleton
window.firebaseService = new FirebaseService();
