/**
 * SkateKids Track v3.0 - Firebase Real-Time Application Controller
 * ================================================================
 * Menghubungkan HP Anak → Firebase Realtime Database → Dashboard Orang Tua
 * 100% Frontend Only, No Server Required, Fully Vercel-Compatible
 */

// ===== FIREBASE CONFIG =====
// WAJIB: Ganti nilai ini dengan config dari Firebase Console Anda!
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBMWI-kGim5JrKdfTzfu6JbVBOgmN3-vtA",
  authDomain:        "skate-b99ac.firebaseapp.com",
  databaseURL:       "https://skate-b99ac-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "skate-b99ac",
  storageBucket:     "skate-b99ac.firebasestorage.app",
  messagingSenderId: "795296616628",
  appId:             "1:795296616628:web:415a8afe03189c7d0647e1",
  measurementId:     "G-KWDDTVYN7W"
};

// ===== FIREBASE IMPORTS =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, set, onValue, get } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// ===== INIT =====
let db = null;
let isFirebaseReady = false;

async function initFirebase() {
  try {
    if (FIREBASE_CONFIG.apiKey === 'GANTI_DENGAN_API_KEY_ANDA') {
      console.warn('[Firebase] Config belum diisi! Lihat firebase-config.js');
      showFirebaseWarning();
      return false;
    }
    const app = initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
    isFirebaseReady = true;
    console.log('[Firebase] Connected ✓');
    return true;
  } catch (err) {
    console.error('[Firebase] Init error:', err);
    showFirebaseWarning();
    return false;
  }
}

function showFirebaseWarning() {
  const el = document.getElementById('globalConnIndicator');
  if (el) {
    el.className = 'status-indicator offline';
    el.querySelector('span:last-child').textContent = 'FIREBASE BELUM SETUP';
  }
  addAlertItem(
    '⚠️ Firebase Belum Dikonfigurasi',
    'Buka firebase-config.js dan isi dengan config dari Firebase Console Anda',
    'danger'
  );
}

// ===== MAIN APP INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Map Manager
  window.mapManager = new MapManager('map');

  // 2. State & Engine
  const engine = window.telemetryEngine;
  let currentUnit = 'kmh';
  let audioContext = null;
  let lastReportedLap = 0;
  const telemetryLogs = [];

  // Pairing State
  let currentRoomCode = generateRoomCode();
  let isChildConnected = false;
  let firebaseListener = null;

  function generateRoomCode() {
    return 'SKATE-' + Math.floor(1000 + Math.random() * 9000);
  }

  // DOM Elements
  const elLiveClock              = document.getElementById('liveClock');
  const elActiveChildLabel       = document.getElementById('activeChildLabel');
  const elGlobalConnIndicator    = document.getElementById('globalConnIndicator');
  const elConnStatusText         = document.getElementById('connStatusText');

  const elCurrentDeviceName      = document.getElementById('currentDeviceName');
  const elCurrentDevicePlate     = document.getElementById('currentDevicePlate');
  const elBatteryLevel           = document.getElementById('batteryLevel');
  const elSignalStrength         = document.getElementById('signalStrength');
  const elHeartRate              = document.getElementById('heartRateValue');
  const elSkateActivityBadge     = document.getElementById('skateActivityBadge');

  const elGeofenceStatusBadge    = document.getElementById('geofenceStatusBadge');
  const elGeofenceText           = document.getElementById('geofenceText');
  const elDistanceToParent       = document.getElementById('distanceToParent');

  const elValLatitude            = document.getElementById('valLatitude');
  const elValLongitude           = document.getElementById('valLongitude');
  const elValHeading             = document.getElementById('valHeading');
  const elValAltitude            = document.getElementById('valAltitude');
  const elValAccuracy            = document.getElementById('valAccuracy');
  const elCurrentAddress         = document.getElementById('currentAddress');

  const elBtnCenterMap           = document.getElementById('btnCenterMap');
  const elBtnRestartSession      = document.getElementById('btnRestartSession');

  const elMetricSpeedValue       = document.getElementById('metricSpeedValue');
  const elMetricSpeedUnit        = document.getElementById('metricSpeedUnit');
  const elSpeedStatusTag         = document.getElementById('speedStatusTag');
  const elMetricMaxSpeed         = document.getElementById('metricMaxSpeed');
  const elMetricAvgSpeed         = document.getElementById('metricAvgSpeed');

  const elMetricTotalDistance    = document.getElementById('metricTotalDistance');
  const elMetricDistanceKm       = document.getElementById('metricDistanceKm');
  const elMetricLapCount         = document.getElementById('metricLapCount');
  const elLastLapTime            = document.getElementById('lastLapTime');
  const elBestLapTime            = document.getElementById('bestLapTime');
  const elBtnResetTrip           = document.getElementById('btnResetTrip');

  const elMetricCalories         = document.getElementById('metricCalories');
  const elMetricTripDuration     = document.getElementById('metricTripDuration');
  const elMetricIdleDuration     = document.getElementById('metricIdleDuration');

  const elGaugeSpeedDigit        = document.getElementById('gaugeSpeedDigit');
  const elGaugeSpeedUnit         = document.getElementById('gaugeSpeedUnit');
  const elGaugeStatusText        = document.getElementById('gaugeStatusText');
  const elGaugeNeedle            = document.getElementById('gaugeNeedle');
  const elGaugeFillArc           = document.getElementById('gaugeFillArc');

  const elMapHeadingBadge        = document.getElementById('mapHeadingBadge');
  const elBtnToggleFollow        = document.getElementById('btnToggleFollow');
  const elBtnClearTrail          = document.getElementById('btnClearTrail');

  const elAlertStream            = document.getElementById('alertStream');
  const elAlertCountBadge        = document.getElementById('alertCountBadge');
  const elChkAudioAlerts         = document.getElementById('chkAudioAlerts');

  const elTelemetryTableBody     = document.getElementById('telemetryTableBody');
  const elLogCountBadge          = document.getElementById('logCountBadge');
  const elBtnExportCSV           = document.getElementById('btnExportCSV');
  const elBtnExportJSON          = document.getElementById('btnExportJSON');
  const elClearLogs              = document.getElementById('btnClearLogs');
  const elBtnCopyCoords          = document.getElementById('btnCopyCoords');

  const elUnitKmh                = document.getElementById('unitKmh');
  const elUnitMph                = document.getElementById('unitMph');

  const elBtnOpenPairingModal    = document.getElementById('btnOpenPairingModal');
  const elPairingModalOverlay    = document.getElementById('pairingModalOverlay');
  const elBtnClosePairingModal   = document.getElementById('btnClosePairingModal');
  const elQrCodeImage            = document.getElementById('qrCodeImage');
  const elTxtTrackerUrl          = document.getElementById('txtTrackerUrl');
  const elBtnCopyTrackerUrl      = document.getElementById('btnCopyTrackerUrl');
  const elBtnShareWhatsApp       = document.getElementById('btnShareWhatsApp');
  const elDisplayRoomCode        = document.getElementById('displayRoomCode');
  const elModalConnStatus        = document.getElementById('modalConnStatus');
  const elModalConnStatusText    = document.getElementById('modalConnStatusText');
  const elBtnUpdateChildProfile  = document.getElementById('btnUpdateChildProfile');
  const elBtnPingChild           = document.getElementById('btnPingChild');

  // 3. Live Clock
  function updateClock() {
    const now = new Date();
    if (elLiveClock) {
      elLiveClock.textContent = now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 4. Chart.js
  const ctx = document.getElementById('speedTrendChart').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 100);
  gradient.addColorStop(0, 'rgba(0, 242, 254, 0.45)');
  gradient.addColorStop(1, 'rgba(0, 242, 254, 0.0)');
  const chartLabels = Array(20).fill('');
  const chartData   = Array(20).fill(0);
  const speedChart  = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Kecepatan Riil',
        data: chartData,
        borderColor: '#00f2fe',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 150 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(9, 15, 28, 0.95)',
          borderColor: '#00f2fe',
          borderWidth: 1,
          bodyFont: { family: 'JetBrains Mono', size: 11 },
          displayColors: false,
          callbacks: { label: (ctx) => `⚡ ${ctx.parsed.y} ${currentUnit === 'kmh' ? 'km/jam' : 'mph'}` }
        }
      },
      scales: {
        x: { display: false },
        y: {
          min: 0, max: 35,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 }, stepSize: 10 }
        }
      }
    }
  });

  // 5. Audio Tones
  function playAlertTone(type = 'warn') {
    if (!elChkAudioAlerts.checked) return;
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      if (type === 'lap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, audioContext.currentTime);
        osc.frequency.setValueAtTime(880, audioContext.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(350, audioContext.currentTime + 0.25);
        gain.gain.setValueAtTime(0.09, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      }
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.4);
    } catch (e) { console.warn('Audio:', e); }
  }

  // 6. Speedometer
  function updateSpeedometer(speedKmh) {
    const displaySpeed = currentUnit === 'kmh' ? speedKmh : Math.round(speedKmh * 0.621371 * 10) / 10;
    const maxScale = currentUnit === 'kmh' ? 45 : 30;
    const clampedSpeed = Math.min(maxScale, Math.max(0, displaySpeed));
    elGaugeSpeedDigit.textContent = displaySpeed.toFixed(1);
    elMetricSpeedValue.textContent = displaySpeed.toFixed(1);
    const ratio = clampedSpeed / maxScale;
    elGaugeNeedle.style.transform = `translate(-50%, -100%) rotate(${-135 + ratio * 270}deg)`;
    const totalArc = 447;
    elGaugeFillArc.style.strokeDashoffset = totalArc - (ratio * totalArc);
    if (speedKmh > 28) {
      elGaugeFillArc.style.stroke = 'var(--rose-danger)';
      elSpeedStatusTag.textContent = 'SPRINT MAKSIMAL';
      elSpeedStatusTag.className = 'metric-tag badge-danger';
      elGaugeStatusText.textContent = 'FAST SPRINT';
      elGaugeStatusText.style.fill = 'var(--rose-danger)';
      elSkateActivityBadge.textContent = 'SPRINT';
      elSkateActivityBadge.className = 'badge badge-danger';
    } else if (speedKmh > 16) {
      elGaugeFillArc.style.stroke = 'var(--cyan-primary)';
      elSpeedStatusTag.textContent = 'LATIHAN INTI';
      elSpeedStatusTag.className = 'metric-tag';
      elGaugeStatusText.textContent = 'STEADY CRUISE';
      elGaugeStatusText.style.fill = 'var(--cyan-primary)';
      elSkateActivityBadge.textContent = 'MELUNCUR';
      elSkateActivityBadge.className = 'badge badge-success';
    } else if (speedKmh > 2.5) {
      elGaugeFillArc.style.stroke = 'var(--emerald-green)';
      elSpeedStatusTag.textContent = 'LUNCUR SANTAI';
      elSpeedStatusTag.className = 'metric-tag';
      elGaugeStatusText.textContent = 'EASY GLIDE';
      elGaugeStatusText.style.fill = 'var(--emerald-green)';
      elSkateActivityBadge.textContent = 'SANTAI';
      elSkateActivityBadge.className = 'badge badge-info';
    } else {
      elGaugeFillArc.style.stroke = 'var(--text-dim)';
      elSpeedStatusTag.textContent = isChildConnected ? 'BERHENTI / DUDUK' : 'STANDBY';
      elSpeedStatusTag.className = 'metric-tag badge-neutral';
      elGaugeStatusText.textContent = isChildConnected ? 'RESTING' : 'STANDBY';
      elGaugeStatusText.style.fill = 'var(--text-dim)';
      elSkateActivityBadge.textContent = isChildConnected ? 'ISTIRAHAT' : 'STANDBY';
      elSkateActivityBadge.className = 'badge badge-warning';
    }
  }

  // 7. Alert Feed
  function addAlertItem(title, subtitle, type = 'info') {
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${type === 'danger' ? 'alert-danger' : type === 'warn' ? 'alert-warn' : 'alert-info'}`;
    let icon = 'fa-shield-check';
    if (type === 'danger') icon = 'fa-triangle-exclamation';
    else if (type === 'warn') icon = 'fa-circle-exclamation';
    else if (type === 'success') icon = 'fa-flag-checkered';
    alertItem.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <div class="alert-content">
        <span class="alert-title">${title}</span>
        <span class="alert-time">${subtitle} &bull; ${new Date().toLocaleTimeString('id-ID')}</span>
      </div>
    `;
    elAlertStream.prepend(alertItem);
    while (elAlertStream.children.length > 6) {
      elAlertStream.removeChild(elAlertStream.lastChild);
    }
  }
  // Expose globally so firebase warning function above can call it
  window._addAlertItem = addAlertItem;

  // 8. Table Row
  function addTableRow(telemetry) {
    const row = document.createElement('tr');
    let motionBadge = `<span class="badge badge-success">Meluncur</span>`;
    if (telemetry.speed > 28) motionBadge = `<span class="badge badge-danger">Sprint</span>`;
    else if (telemetry.speed < 2.5) motionBadge = `<span class="badge badge-neutral">Istirahat</span>`;
    row.innerHTML = `
      <td class="mono-text" style="color:#94a3b8;">${telemetry.timestamp}</td>
      <td><strong>${telemetry.device.name}</strong></td>
      <td class="mono-text"><strong style="color:#00f2fe;">${telemetry.speed} km/j</strong></td>
      <td class="mono-text">${telemetry.distanceMeters} m (${telemetry.distanceKm} km)</td>
      <td class="mono-text" style="color:#f59e0b;">Putaran ${telemetry.lapCount}</td>
      <td class="mono-text" style="color:#38bdf8;">${telemetry.lat}, ${telemetry.lng}</td>
      <td class="mono-text">${telemetry.heading}° ${telemetry.compass}</td>
      <td class="mono-text" style="color:#ef4444;"><i class="fa-solid fa-heart-pulse"></i> ${telemetry.heartRate} BPM</td>
      <td>${motionBadge}</td>
    `;
    elTelemetryTableBody.prepend(row);
    telemetryLogs.unshift({
      timestamp: telemetry.timestamp,
      athleteName: telemetry.device.name,
      category: telemetry.device.category,
      speedKmH: telemetry.speed,
      distanceMeters: telemetry.distanceMeters,
      distanceKm: telemetry.distanceKm,
      lapCount: telemetry.lapCount,
      heartRateBpm: telemetry.heartRate,
      caloriesKcal: telemetry.calories,
      latitude: telemetry.lat,
      longitude: telemetry.lng,
      headingDeg: telemetry.heading,
      condition: telemetry.condition
    });
    if (telemetryLogs.length > 200) telemetryLogs.pop();
    while (elTelemetryTableBody.children.length > 25) {
      elTelemetryTableBody.removeChild(elTelemetryTableBody.lastChild);
    }
    elLogCountBadge.textContent = `(${telemetryLogs.length} catatan)`;
  }

  // 9. Telemetry Engine Tick Handler
  function handleTelemetryTick(telemetry) {
    window.mapManager.updateSkaterPosition(telemetry);
    updateSpeedometer(telemetry.speed);
    elValLatitude.textContent = telemetry.lat.toFixed(6);
    elValLongitude.textContent = telemetry.lng.toFixed(6);
    elValHeading.textContent = `${telemetry.heading}° ${telemetry.compass}`;
    elValAltitude.textContent = `${telemetry.altitude} m`;
    elValAccuracy.textContent = `± ${telemetry.accuracy} m`;
    elCurrentAddress.textContent = `Titik GPS Nyata • Akurasi: ±${telemetry.accuracy}m`;
    elMapHeadingBadge.textContent = `${telemetry.heading}° ${telemetry.compass} • ${telemetry.speed} km/j`;
    elMetricTotalDistance.textContent = telemetry.distanceMeters.toLocaleString('id-ID');
    elMetricDistanceKm.textContent = `${telemetry.distanceKm} km`;
    elMetricLapCount.textContent = telemetry.lapCount;
    if (telemetry.lastLapSeconds > 0) {
      elLastLapTime.textContent = `00:${String(telemetry.lastLapSeconds).padStart(2, '0')} dtk`;
    }
    if (telemetry.bestLapSeconds) {
      elBestLapTime.textContent = `00:${String(telemetry.bestLapSeconds).padStart(2, '0')} dtk`;
    }
    elMetricCalories.textContent = telemetry.calories;
    elMetricTripDuration.textContent = telemetry.duration;
    elMetricIdleDuration.textContent = telemetry.idleDuration;
    elHeartRate.textContent = `${telemetry.heartRate} BPM`;
    if (telemetryLogs.length > 0) {
      const sum = telemetryLogs.reduce((a, c) => a + c.speedKmH, telemetry.speed);
      elMetricAvgSpeed.textContent = `${(sum / (telemetryLogs.length + 1)).toFixed(1)} km/jam`;
    }
    elMetricMaxSpeed.textContent = `${telemetry.maxSpeed} km/jam`;
    chartData.push(telemetry.speed);
    chartData.shift();
    speedChart.update('none');
    if (telemetry.lapCount > lastReportedLap) {
      lastReportedLap = telemetry.lapCount;
      addAlertItem(
        `🏁 Putaran Ke-${telemetry.lapCount} Selesai!`,
        `Waktu putaran: ${telemetry.lastLapSeconds} dtk`,
        'success'
      );
      playAlertTone('lap');
    }
    if (telemetry.distanceToCenterMeters !== undefined) {
      elDistanceToParent.textContent = `${telemetry.distanceToCenterMeters} meter`;
      if (!telemetry.isInsideGeofence) {
        elGeofenceStatusBadge.textContent = 'DI LUAR AREA!';
        elGeofenceStatusBadge.className = 'badge badge-danger';
        elGeofenceText.innerHTML = `<span style="color:#ef4444;">⚠️ Anak ${telemetry.distanceToCenterMeters}m keluar batas aman!</span>`;
        addAlertItem('Peringatan Batas Latihan!', `Anak meluncur ${telemetry.distanceToCenterMeters}m keluar radius aman!`, 'danger');
        playAlertTone('warn');
      } else {
        elGeofenceStatusBadge.textContent = 'DI DALAM AREA';
        elGeofenceStatusBadge.className = 'badge badge-success';
        elGeofenceText.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Anak berada di dalam area aman latihan.`;
      }
    }
    addTableRow(telemetry);
  }

  engine.onTick(handleTelemetryTick);

  // =========================================================================
  // Firebase Real-Time Listener (Ganti SSE)
  // =========================================================================

  function buildTrackerUrl(roomCode) {
    return `${window.location.origin}/tracker.html?room=${roomCode}`;
  }

  function updatePairingUrls() {
    const trackerUrl = buildTrackerUrl(currentRoomCode);
    elTxtTrackerUrl.value = trackerUrl;
    elDisplayRoomCode.textContent = `KODE: ${currentRoomCode}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(trackerUrl)}`;
    elQrCodeImage.src = qrApiUrl;
    const shareMsg = `Hai! Buka link ini di HP anak untuk mulai melacak latihan sepatu roda secara live: ${trackerUrl}`;
    elBtnShareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`;
  }

  function listenToChildPhone(roomCode) {
    if (!isFirebaseReady) return;

    // Unsubscribe previous listener
    if (firebaseListener) {
      firebaseListener(); // Firebase unsubscribe function
      firebaseListener = null;
    }

    const telemetryRef = ref(db, `rooms/${roomCode}/telemetry`);
    firebaseListener = onValue(telemetryRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // Check data freshness (< 15 seconds old)
      const age = Date.now() - (data._ts || 0);
      const isFresh = age < 15000;

      if (!isChildConnected && isFresh) {
        isChildConnected = true;
        elGlobalConnIndicator.className = 'status-indicator online';
        elConnStatusText.textContent = 'LIVE TRACKING AKTIF';
        elActiveChildLabel.textContent = `🟢 ${engine.athlete.name} (Terkoneksi Live)`;
        elModalConnStatus.className = 'conn-sync-status active';
        elModalConnStatusText.innerHTML = `🟢 <strong>${engine.athlete.name}</strong> Terhubung & Live Streaming!`;
        addAlertItem('HP Anak Terhubung', `${engine.athlete.name} mulai mengirim koordinat GPS nyata!`, 'info');
      }

      if (!isFresh) {
        // Data stale - child phone might be offline
        if (isChildConnected) {
          isChildConnected = false;
          elGlobalConnIndicator.className = 'status-indicator offline';
          elConnStatusText.textContent = 'HP ANAK OFFLINE';
          addAlertItem('HP Anak Terputus', 'Tidak ada data GPS dalam 15 detik terakhir', 'warn');
        }
        return;
      }

      // Update device info
      elCurrentDeviceName.textContent = engine.athlete.name || 'Anak Saya';
      elCurrentDevicePlate.textContent = `${engine.athlete.category || 'Inline Skate'} • Room: ${roomCode}`;
      elBatteryLevel.textContent = `${data.battery || '--'}%`;
      elSignalStrength.textContent = data.accuracy ? `±${data.accuracy}m GPS` : '-- GPS';

      // Pass to engine for full processing
      engine.athlete.name = engine.athlete.name || 'Anak Saya';
      engine.processIncomingGps(data);
    });
  }

  // Modal: Open
  elBtnOpenPairingModal.addEventListener('click', () => {
    updatePairingUrls();
    elPairingModalOverlay.style.display = 'flex';
  });

  elBtnClosePairingModal.addEventListener('click', () => {
    elPairingModalOverlay.style.display = 'none';
  });

  elPairingModalOverlay.addEventListener('click', (e) => {
    if (e.target === elPairingModalOverlay) {
      elPairingModalOverlay.style.display = 'none';
    }
  });

  elBtnCopyTrackerUrl.addEventListener('click', () => {
    navigator.clipboard.writeText(elTxtTrackerUrl.value).then(() => {
      elBtnCopyTrackerUrl.innerHTML = `<i class="fa-solid fa-check"></i> Tersalin!`;
      setTimeout(() => {
        elBtnCopyTrackerUrl.innerHTML = `<i class="fa-regular fa-copy"></i> Salin`;
      }, 2000);
      addAlertItem('Link Disalin', 'Kirimkan link ini ke HP anak atau buka langsung di HP anak', 'info');
    });
  });

  // Register Child Profile → Firebase
  elBtnUpdateChildProfile.addEventListener('click', async () => {
    const childNameVal    = document.getElementById('inputChildName').value.trim() || 'Anak Saya';
    const childAgeVal     = parseInt(document.getElementById('inputChildAge').value) || 9;
    const childWeightVal  = parseInt(document.getElementById('inputChildWeight').value) || 32;
    const childMaxSpeed   = parseInt(document.getElementById('inputChildMaxSpeed').value) || 28;

    // Generate new room code
    currentRoomCode = generateRoomCode();

    // Update engine athlete
    engine.athlete.name        = childNameVal;
    engine.athlete.weightKg    = childWeightVal;
    engine.athlete.maxSafeSpeed = childMaxSpeed;

    if (isFirebaseReady) {
      try {
        const profileRef = ref(db, `rooms/${currentRoomCode}/profile`);
        await set(profileRef, {
          childName:    childNameVal,
          age:          childAgeVal,
          weightKg:     childWeightVal,
          maxSafeSpeed: childMaxSpeed,
          category:     `Usia ${childAgeVal} Thn • Sepatu Roda`,
          createdAt:    Date.now()
        });
        addAlertItem('Profil Tersimpan ke Firebase', `Kode baru: ${currentRoomCode}`, 'info');
      } catch (err) {
        console.error('[Firebase] Save profile error:', err);
        addAlertItem('Gagal Menyimpan Profil', err.message, 'danger');
      }
    }

    updatePairingUrls();
    listenToChildPhone(currentRoomCode);

    elCurrentDeviceName.textContent  = childNameVal;
    elCurrentDevicePlate.textContent = `Menunggu HP anak buka kode ${currentRoomCode}`;
    elActiveChildLabel.textContent   = `📱 ${childNameVal} (Menunggu Terhubung...)`;

    addAlertItem('Kode Baru Dibuat', `Kirim link ke HP ${childNameVal}: buka tracker.html?room=${currentRoomCode}`, 'info');
  });

  // Ping Child via Firebase
  elBtnPingChild.addEventListener('click', async () => {
    if (!isFirebaseReady) {
      addAlertItem('Firebase Belum Siap', 'Konfigurasi Firebase terlebih dahulu', 'danger');
      return;
    }
    try {
      const pingRef = ref(db, `rooms/${currentRoomCode}/ping`);
      await set(pingRef, { active: true, sentAt: Date.now() });
      addAlertItem('🔔 Sinyal Terkirim', 'HP anak sedang berbunyi di lapangan memanggil anak!', 'warn');
      playAlertTone('lap');
    } catch (e) {
      addAlertItem('Gagal Mengirim Sinyal', e.message, 'danger');
    }
  });

  // Map & Session Controls
  elBtnCenterMap.addEventListener('click', () => window.mapManager.centerOnSkater());

  elBtnRestartSession.addEventListener('click', () => {
    engine.resetSession();
    lastReportedLap = 0;
    isChildConnected = false;
    window.mapManager.clearTrail();
    window.mapManager.hasInitialGpsFix = false;
    elMetricTotalDistance.textContent = '0';
    elMetricDistanceKm.textContent = '0.00 km';
    elMetricLapCount.textContent = '0';
    elLastLapTime.textContent = '--:-- dtk';
    elBestLapTime.textContent = '--:-- dtk';
    elMetricCalories.textContent = '0';
    elMetricTripDuration.textContent = '00:00:00';
    elMetricIdleDuration.textContent = '00:00:00';
    elMetricSpeedValue.textContent = '0.0';
    updateSpeedometer(0);
    addAlertItem('Sesi Latihan Direset', 'Perhitungan jarak, putaran, dan kalori dimulai dari nol', 'info');
  });

  elBtnResetTrip.addEventListener('click', () => elBtnRestartSession.click());

  document.querySelectorAll('.map-layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-layer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.mapManager.setLayer(btn.dataset.layer);
    });
  });

  elBtnToggleFollow.addEventListener('click', () => {
    const next = !window.mapManager.followSkater;
    window.mapManager.setFollowSkater(next);
  });

  elBtnClearTrail.addEventListener('click', () => {
    window.mapManager.clearTrail();
    addAlertItem('Peta Dibersihkan', 'Jejak rute sebelumnya dihapus', 'info');
  });

  // Unit Switcher
  elUnitKmh.addEventListener('click', () => {
    currentUnit = 'kmh';
    elUnitKmh.classList.add('active');
    elUnitMph.classList.remove('active');
    elGaugeSpeedUnit.textContent = 'KM/H';
    elMetricSpeedUnit.textContent = 'km/jam';
    updateSpeedometer(engine.currentSpeed);
  });

  elUnitMph.addEventListener('click', () => {
    currentUnit = 'mph';
    elUnitMph.classList.add('active');
    elUnitKmh.classList.remove('active');
    elGaugeSpeedUnit.textContent = 'MPH';
    elMetricSpeedUnit.textContent = 'mph';
    updateSpeedometer(engine.currentSpeed);
  });

  elBtnCopyCoords.addEventListener('click', () => {
    if (engine.currentLat && engine.currentLng) {
      const txt = `${engine.currentLat.toFixed(6)}, ${engine.currentLng.toFixed(6)}`;
      navigator.clipboard.writeText(txt).then(() => addAlertItem('Koordinat Disalin', txt, 'info'));
    }
  });

  // Export CSV
  elBtnExportCSV.addEventListener('click', () => {
    if (telemetryLogs.length === 0) { alert('Belum ada data latihan.'); return; }
    const headers = ['Waktu','Nama Atlet','Kategori','Kecepatan (km/j)','Jarak (meter)','Jarak (km)','Putaran','Detak Jantung (BPM)','Kalori (kkal)','Latitude','Longitude','Heading','Status'];
    const csvRows = [headers.join(',')];
    telemetryLogs.forEach(r => {
      csvRows.push([
        `"${r.timestamp}"`,`"${r.athleteName}"`,`"${r.category}"`,
        r.speedKmH, r.distanceMeters, r.distanceKm, r.lapCount,
        r.heartRateBpm, r.caloriesKcal, r.latitude, r.longitude,
        r.headingDeg, `"${r.condition}"`
      ].join(','));
    });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    a.download = `laporan_sepatu_roda_${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  });

  elBtnExportJSON.addEventListener('click', () => {
    if (telemetryLogs.length === 0) { alert('Belum ada data latihan.'); return; }
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(telemetryLogs, null, 2));
    a.download = `laporan_sepatu_roda_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  });

  elClearLogs.addEventListener('click', () => {
    telemetryLogs.length = 0;
    elTelemetryTableBody.innerHTML = '';
    elLogCountBadge.textContent = '(0 catatan)';
    addAlertItem('Log Dibersihkan', 'Riwayat data latihan dikosongkan', 'info');
  });

  // =========================================================================
  // INIT: Connect Firebase, start listening
  // =========================================================================
  const fbOk = await initFirebase();
  updatePairingUrls();

  if (fbOk) {
    listenToChildPhone(currentRoomCode);
    addAlertItem(
      '🟢 Firebase Terhubung',
      `Siap menerima GPS dari HP anak. Kode: ${currentRoomCode}`,
      'info'
    );
  }
});
