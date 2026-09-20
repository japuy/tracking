/**
 * SkateKids Track - Map Manager (Leaflet.js)
 * 100% Peta Real-Time (Tanpa Dummy).
 * Menunggu koordinat pertama dari HP anak untuk menentukan titik awal lintasan,
 * radius geofence aman, marker berputar arah, dan polyline jejak nyata.
 */

class MapManager {
  constructor(mapContainerId) {
    this.containerId = mapContainerId;
    this.map = null;
    this.currentTileLayer = null;
    this.tileLayers = {};

    this.skaterMarker = null;
    this.pathCoordinates = [];
    this.coloredPolylines = [];

    this.followSkater = true;
    this.geofenceCircle = null;
    this.hasInitialGpsFix = false;

    this.initMap();
  }

  initMap() {
    // Default neutral view until first real GPS fix arrives
    const defaultLat = -6.2088;
    const defaultLng = 106.8456;

    this.map = L.map(this.containerId, {
      center: [defaultLat, defaultLng],
      zoom: 14,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Tile Layers
    this.tileLayers = {
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 20,
        subdomains: 'abcd'
      }),
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri World Imagery',
        maxZoom: 19
      })
    };

    this.currentTileLayer = this.tileLayers.dark;
    this.currentTileLayer.addTo(this.map);

    this.map.on('dragstart', () => {
      this.setFollowSkater(false);
    });
  }

  updateGeofenceCircle(centerLat, centerLng, radiusMeters) {
    if (this.geofenceCircle) {
      this.map.removeLayer(this.geofenceCircle);
    }

    this.geofenceCircle = L.circle([centerLat, centerLng], {
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.06,
      weight: 2,
      dashArray: '6, 8',
      radius: radiusMeters
    }).addTo(this.map);

    this.geofenceCircle.bindTooltip(`🛡️ Batas Aman Latihan (Radius ${radiusMeters}m)`, {
      permanent: false,
      direction: 'top'
    });
  }

  setLayer(layerName) {
    if (this.tileLayers[layerName]) {
      this.map.removeLayer(this.currentTileLayer);
      this.currentTileLayer = this.tileLayers[layerName];
      this.currentTileLayer.addTo(this.map);
    }
  }

  setFollowSkater(enabled) {
    this.followSkater = enabled;
    const btn = document.getElementById('btnToggleFollow');
    if (btn) {
      if (enabled) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }

  getSpeedColor(speed) {
    if (speed < 12) return '#10b981'; // Green
    if (speed < 22) return '#38bdf8'; // Blue
    if (speed < 28) return '#f59e0b'; // Amber
    return '#ef4444'; // Red (Sprint)
  }

  updateSkaterPosition(telemetry) {
    if (!telemetry.lat || !telemetry.lng) return;
    const latLng = [telemetry.lat, telemetry.lng];

    // First real GPS fix: snap map to child's actual physical location
    if (!this.hasInitialGpsFix) {
      this.hasInitialGpsFix = true;
      this.map.setView(latLng, 18, { animate: true });
      this.updateGeofenceCircle(telemetry.lat, telemetry.lng, 200);
    }

    // Create or update marker
    if (!this.skaterMarker) {
      const customIcon = L.divIcon({
        className: 'skater-custom-div-icon',
        html: `
          <div class="vehicle-marker-wrapper">
            <div class="vehicle-radar-ping"></div>
            <div class="vehicle-marker-core" id="mapMarkerCore">
              <div class="vehicle-heading-arrow"></div>
              <i class="fa-solid fa-person-skating" id="markerDeviceIcon"></i>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      this.skaterMarker = L.marker(latLng, { icon: customIcon }).addTo(this.map);
    } else {
      this.skaterMarker.setLatLng(latLng);

      const coreEl = document.getElementById('mapMarkerCore');
      if (coreEl && telemetry.heading !== undefined) {
        coreEl.style.transform = `translate(-50%, -50%) rotate(${telemetry.heading}deg)`;
      }
    }

    // Popup with live child telemetry
    const popupContent = `
      <div style="font-size: 0.85rem; line-height: 1.5;">
        <strong style="color: #00f2fe; font-size: 0.95rem;">🧒 ${telemetry.device.name}</strong><br>
        <span style="color: #94a3b8; font-size: 0.75rem;">${telemetry.device.category}</span>
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
        <b>⚡ Kecepatan:</b> <span style="color:#10b981; font-weight:bold;">${telemetry.speed} km/jam</span><br>
        <b>🏁 Putaran (Lap):</b> Ke-${telemetry.lapCount}<br>
        <b>📏 Jarak:</b> ${telemetry.distanceMeters} meter (${telemetry.distanceKm} km)<br>
        <b>🔋 Baterai HP Anak:</b> ${telemetry.device.battery}%<br>
        <b>📡 Akurasi:</b> &plusmn; ${telemetry.accuracy} meter
      </div>
    `;
    this.skaterMarker.bindPopup(popupContent);

    // Speed-colored trail line from actual coordinates
    if (this.pathCoordinates.length > 0) {
      const prevCoord = this.pathCoordinates[this.pathCoordinates.length - 1];
      const segmentColor = this.getSpeedColor(telemetry.speed);

      const segmentLine = L.polyline([prevCoord, latLng], {
        color: segmentColor,
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.map);

      this.coloredPolylines.push(segmentLine);

      if (this.coloredPolylines.length > 300) {
        const removed = this.coloredPolylines.shift();
        this.map.removeLayer(removed);
      }
    }

    this.pathCoordinates.push(latLng);

    // Follow camera if enabled
    if (this.followSkater) {
      this.map.panTo(latLng, { animate: true, duration: 0.8 });
    }
  }

  centerOnSkater() {
    if (this.pathCoordinates.length > 0) {
      const latest = this.pathCoordinates[this.pathCoordinates.length - 1];
      this.map.setView(latest, 18, { animate: true });
      this.setFollowSkater(true);
    }
  }

  clearTrail() {
    this.coloredPolylines.forEach(line => this.map.removeLayer(line));
    this.coloredPolylines = [];
    this.pathCoordinates = [];
    if (this.skaterMarker) {
      this.pathCoordinates.push(this.skaterMarker.getLatLng());
    }
  }
}

// Global instance
window.mapManager = null;
