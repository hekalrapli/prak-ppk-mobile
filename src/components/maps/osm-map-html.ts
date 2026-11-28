// src/components/maps/osm-map-html.ts
import type { ResolvedScheme } from '@/store/theme-context';

export const OSM_MAP_BASE_URL = 'https://prakyuks.app/';

export interface OsmMapThemeColors {
  scheme: ResolvedScheme;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  primary: string;
  secondary: string;
  onPrimary: string;
  link: string;
  userHalo: string;
}

export interface OsmMapLabPayload {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
}

export interface OsmMapUserPayload {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface OsmMapStatePayload {
  laboratories: OsmMapLabPayload[];
  selectedLabId: string | null;
  userPosition: OsmMapUserPayload | null;
  colors: OsmMapThemeColors;
}

export interface OsmMapInitialView {
  latitude: number;
  longitude: number;
  zoom: number;
  hasInitialFocus: boolean;
}

export type OsmMapMessage =
  | { type: 'ready' }
  | { type: 'selectLab'; labId: string | null }
  | { type: 'scriptError'; message: string };

/**
 * Men-serialisasi payload JSON dengan aman untuk `WebView.injectJavaScript`
 * (meng-escape U+2028/U+2029 serta tag penutup script).
 */
export function serializeForWebView(value: unknown): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/<\/script/gi, '<\\/script');
}

/**
 * Menghasilkan dokumen HTML statis Leaflet + OpenStreetMap untuk `react-native-webview`.
 *
 * - Tidak bergantung pada Google Maps SDK maupun API Key sehingga aman di Expo Go,
 *   EAS Development Build, dan APK Android/iOS.
 * - Menggunakan tile resmi OpenStreetMap (`tile.openstreetmap.org`) yang 100% gratis
 *   tanpa API Key, dengan fallback otomatis ke `tile.openstreetmap.fr/osmfr`.
 * - Mode gelap diterapkan lewat filter CSS khusus `.leaflet-tile-pane` sehingga warna
 *   pin lab, lingkaran geofence, dan titik GPS tetap akurat tanpa muat ulang tile.
 * - Leaflet CSS/JS dimuat dari jsDelivr dengan fallback otomatis ke unpkg.
 * - Pembaruan posisi GPS menggeser marker secara in-place tanpa merusak DOM marker lab,
 *   dan seluruh pembaruan state dikirim lewat `window.__PRAKYUKS_MAP__.setState(...)`
 *   tanpa me-reload WebView.
 */
export function buildOsmMapHtml(
  initialView: OsmMapInitialView,
  initialColors: OsmMapThemeColors
): string {
  const safeInitial = serializeForWebView({
    ...initialView,
    colors: initialColors,
  });

  return `<!DOCTYPE html>
<html lang="id" class="${initialColors.scheme === 'dark' ? 'map-dark' : ''}">
<head>
  <meta charset="utf-8" />
  <meta name="referrer" content="origin" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
  />
  <title>Peta Laboratorium PrakYuks</title>
  <link
    id="leaflet-css"
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
    onerror="if(!this.dataset.fb){this.dataset.fb='1';this.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';}"
  />
  <style>
    :root {
      --map-bg: ${initialColors.background};
      --map-surface: ${initialColors.surface};
      --map-text: ${initialColors.textPrimary};
      --map-text-muted: ${initialColors.textSecondary};
      --map-border: ${initialColors.border};
      --map-primary: ${initialColors.primary};
      --map-secondary: ${initialColors.secondary};
      --map-on-primary: ${initialColors.onPrimary};
      --map-link: ${initialColors.link};
      --map-user-halo: ${initialColors.userHalo};
    }

    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--map-bg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .leaflet-container {
      background: var(--map-bg);
      font-family: inherit;
    }

    html.map-dark .leaflet-tile-pane {
      filter: invert(100%) hue-rotate(180deg) brightness(92%) contrast(88%);
    }

    .leaflet-control-zoom {
      border: 1px solid var(--map-border) !important;
      border-radius: 14px !important;
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14) !important;
      margin-top: 12px !important;
      margin-left: 12px !important;
    }

    .leaflet-control-zoom a {
      width: 38px !important;
      height: 38px !important;
      line-height: 38px !important;
      background: var(--map-surface) !important;
      color: var(--map-text) !important;
      border-color: var(--map-border) !important;
      font-size: 18px !important;
      font-weight: 600 !important;
    }

    .leaflet-control-zoom a:active {
      opacity: 0.78;
    }

    .leaflet-control-attribution {
      background: var(--map-surface) !important;
      color: var(--map-text-muted) !important;
      opacity: 0.9;
      font-size: 10px !important;
      padding: 2px 6px !important;
      border-top-right-radius: 8px;
    }

    .leaflet-control-attribution a {
      color: var(--map-link) !important;
    }

    .lab-pin-icon {
      background: transparent;
      border: none;
    }

    .lab-pin-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 4px;
    }

    .lab-pin-drop {
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid var(--map-on-primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
      transition: transform 0.18s ease, background-color 0.18s ease;
    }

    .lab-pin-wrap.selected .lab-pin-drop {
      transform: rotate(-45deg) scale(1.14);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.34);
    }

    .lab-pin-core {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: var(--map-on-primary);
    }

    .lab-pin-label {
      position: absolute;
      top: 42px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 136px;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--map-surface);
      color: var(--map-text);
      border: 1px solid var(--map-border);
      font-size: 11px;
      font-weight: 600;
      line-height: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
      pointer-events: auto;
    }

    .lab-pin-wrap.selected .lab-pin-label {
      background: var(--map-primary);
      color: var(--map-on-primary);
      border-color: var(--map-primary);
    }

    .user-dot-icon {
      background: transparent;
      border: none;
    }

    .user-halo {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      background: var(--map-user-halo);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-dot {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: var(--map-link);
      border: 2.5px solid var(--map-bg);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var INITIAL = ${safeInitial};
      var SCRIPT_URLS = [
        'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      ];

      function postToNative(payload) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        } catch (e) {}
      }

      function escapeHtml(text) {
        return String(text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function applyCssVars(colors) {
        if (!colors) return;
        document.documentElement.classList.toggle('map-dark', colors.scheme === 'dark');
        var root = document.documentElement.style;
        root.setProperty('--map-bg', colors.background);
        root.setProperty('--map-surface', colors.surface);
        root.setProperty('--map-text', colors.textPrimary);
        root.setProperty('--map-text-muted', colors.textSecondary);
        root.setProperty('--map-border', colors.border);
        root.setProperty('--map-primary', colors.primary);
        root.setProperty('--map-secondary', colors.secondary);
        root.setProperty('--map-on-primary', colors.onPrimary);
        root.setProperty('--map-link', colors.link);
        root.setProperty('--map-user-halo', colors.userHalo);
      }

      function initMap() {
        if (!window.L) {
          postToNative({
            type: 'scriptError',
            message: 'Pustaka peta OpenStreetMap gagal dimuat. Periksa koneksi internet Anda.'
          });
          return;
        }

        var L = window.L;
        var currentColors = INITIAL.colors;
        var tileErrorCount = 0;
        var tileLoadedAny = false;
        var hasInitialFocus = Boolean(INITIAL.hasInitialFocus);
        var userInteracted = false;
        var lastLabsSignature = '';

        applyCssVars(currentColors);

        var map = L.map('map', {
          center: [INITIAL.latitude, INITIAL.longitude],
          zoom: INITIAL.zoom,
          zoomControl: false,
          attributionControl: false
        });

        L.control.zoom({ position: 'topleft' }).addTo(map);
        L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

        map.on('dragstart', function () {
          userInteracted = true;
        });

        map.on('click', function () {
          postToNative({ type: 'selectLab', labId: null });
        });

        var tileLayer = null;

        function createTileLayer(fallback) {
          if (fallback) {
            return L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
              subdomains: 'abc',
              maxZoom: 20,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · OSM France'
            });
          }

          return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          });
        }

        function mountTileLayer(fallback) {
          if (tileLayer) {
            map.removeLayer(tileLayer);
          }
          tileErrorCount = 0;
          tileLoadedAny = false;
          tileLayer = createTileLayer(fallback);
          tileLayer.on('tileload', function () {
            tileLoadedAny = true;
          });
          tileLayer.on('tileerror', function () {
            tileErrorCount += 1;
            if (!fallback && !tileLoadedAny && tileErrorCount >= 4) {
              mountTileLayer(true);
            }
          });
          tileLayer.addTo(map);
        }

        mountTileLayer(false);

        var labsLayer = L.layerGroup().addTo(map);
        var userMarker = null;
        var accuracyCircle = null;

        function buildLabIcon(lab, selected, colors) {
          var pinBg = selected ? colors.primary : colors.secondary;
          var html =
            '<div class="lab-pin-wrap' +
            (selected ? ' selected' : '') +
            '">' +
            '<div class="lab-pin-drop" style="background:' +
            escapeHtml(pinBg) +
            ';">' +
            '<div class="lab-pin-core"></div>' +
            '</div>' +
            '<div class="lab-pin-label">' +
            escapeHtml(lab.name) +
            '</div>' +
            '</div>';

          return L.divIcon({
            className: 'lab-pin-icon',
            html: html,
            iconSize: [44, 44],
            iconAnchor: [22, 38]
          });
        }

        function buildUserIcon() {
          return L.divIcon({
            className: 'user-dot-icon',
            html: '<div class="user-halo"><div class="user-dot"></div></div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
        }

        function focusPoint(latitude, longitude, zoom) {
          if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
          var targetZoom = typeof zoom === 'number' ? zoom : Math.max(map.getZoom(), 17);
          map.flyTo([latitude, longitude], targetZoom, {
            animate: true,
            duration: 0.45
          });
        }

        function updateLabs(labs, selectedLabId, colors) {
          var sig = JSON.stringify({
            labs: labs,
            selectedLabId: selectedLabId,
            primary: colors.primary,
            secondary: colors.secondary,
            scheme: colors.scheme
          });
          if (sig === lastLabsSignature) return;
          lastLabsSignature = sig;

          labsLayer.clearLayers();
          for (var i = 0; i < labs.length; i += 1) {
            (function (lab) {
              var selected = lab.id === selectedLabId;

              L.circle([lab.latitude, lab.longitude], {
                radius: Math.max(Number(lab.radiusMeter) || 1, 1),
                color: colors.primary,
                opacity: selected ? 0.9 : 0.6,
                fillColor: colors.primary,
                fillOpacity: selected ? 0.24 : 0.12,
                weight: selected ? 3 : 2,
                interactive: false
              }).addTo(labsLayer);

              var marker = L.marker([lab.latitude, lab.longitude], {
                icon: buildLabIcon(lab, selected, colors),
                zIndexOffset: selected ? 500 : 100
              });

              marker.on('click', function (ev) {
                L.DomEvent.stopPropagation(ev);
                focusPoint(lab.latitude, lab.longitude, Math.max(map.getZoom(), 17));
                postToNative({ type: 'selectLab', labId: lab.id });
              });

              marker.addTo(labsLayer);
            })(labs[i]);
          }
        }

        function updateUser(user, colors) {
          if (!user || typeof user.latitude !== 'number' || typeof user.longitude !== 'number') {
            if (userMarker) {
              map.removeLayer(userMarker);
              userMarker = null;
            }
            if (accuracyCircle) {
              map.removeLayer(accuracyCircle);
              accuracyCircle = null;
            }
            return;
          }

          var latLng = [user.latitude, user.longitude];
          if (typeof user.accuracy === 'number' && user.accuracy > 0) {
            if (!accuracyCircle) {
              accuracyCircle = L.circle(latLng, {
                radius: user.accuracy,
                color: colors.link,
                opacity: 0.35,
                fillColor: colors.link,
                fillOpacity: 0.08,
                weight: 1,
                interactive: false
              }).addTo(map);
            } else {
              accuracyCircle.setLatLng(latLng);
              accuracyCircle.setRadius(user.accuracy);
              accuracyCircle.setStyle({ color: colors.link, fillColor: colors.link });
            }
          } else if (accuracyCircle) {
            map.removeLayer(accuracyCircle);
            accuracyCircle = null;
          }

          if (!userMarker) {
            userMarker = L.marker(latLng, {
              icon: buildUserIcon(),
              interactive: false,
              zIndexOffset: 1000
            }).addTo(map);
          } else {
            userMarker.setLatLng(latLng);
          }
        }

        function renderState(state) {
          if (!state) return;

          if (state.colors) {
            currentColors = state.colors;
            applyCssVars(currentColors);
          }

          var labs = Array.isArray(state.laboratories) ? state.laboratories : [];
          updateLabs(labs, state.selectedLabId || null, currentColors);
          updateUser(state.userPosition || null, currentColors);

          if (!hasInitialFocus && !userInteracted) {
            var user = state.userPosition;
            if (user && typeof user.latitude === 'number' && typeof user.longitude === 'number') {
              hasInitialFocus = true;
              map.setView([user.latitude, user.longitude], 16, { animate: true });
            } else if (labs.length > 0) {
              hasInitialFocus = true;
              map.setView([labs[0].latitude, labs[0].longitude], 16, { animate: true });
            }
          }
        }

        window.__PRAKYUKS_MAP__ = {
          setState: renderState,
          focusPoint: focusPoint
        };

        postToNative({ type: 'ready' });
      }

      function loadScript(index) {
        if (index >= SCRIPT_URLS.length) {
          postToNative({
            type: 'scriptError',
            message: 'Gagal memuat peta OpenStreetMap. Periksa koneksi internet Anda.'
          });
          return;
        }

        var settled = false;
        var script = document.createElement('script');
        script.src = SCRIPT_URLS[index];
        script.async = true;

        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          loadScript(index + 1);
        }, 8000);

        script.onload = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          initMap();
        };
        script.onerror = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          loadScript(index + 1);
        };
        document.head.appendChild(script);
      }

      loadScript(0);
    })();
  </script>
</body>
</html>`;
}
