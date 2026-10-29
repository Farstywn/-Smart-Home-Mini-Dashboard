/**
 * LuminaSmart IoT - Application Logic & Real-time Integration
 */

const API_BASE = 'api';
let trendChart = null;
let isUpdating = false;

// DOM Elements
const elStatusBadge = document.getElementById('connection-status');
const elClock = document.getElementById('digital-clock');
const elValTemp = document.getElementById('val-temp');
const elValHum = document.getElementById('val-hum');
const elValPower = document.getElementById('val-power');
const elValActive = document.getElementById('val-active');
const elDeviceGrid = document.getElementById('devices-grid');
const elActivityList = document.getElementById('activity-list');
const elSetupAlert = document.getElementById('setup-alert');
const elBtnAllOn = document.getElementById('btn-all-on');
const elBtnAllOff = document.getElementById('btn-all-off');
const elBtnSimulate = document.getElementById('btn-simulate');
const elBtnRefresh = document.getElementById('btn-refresh');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initChart();
    fetchAllData();

    // Auto-polling interval setiap 2.5 detik
    setInterval(fetchAllData, 2500);

    // Event Listeners
    if (elBtnAllOn) elBtnAllOn.addEventListener('click', () => setAllDevices('all_on'));
    if (elBtnAllOff) elBtnAllOff.addEventListener('click', () => setAllDevices('all_off'));
    if (elBtnSimulate) elBtnSimulate.addEventListener('click', simulateSensorData);
    if (elBtnRefresh) elBtnRefresh.addEventListener('click', () => {
        fetchAllData(true);
    });
});

/**
 * Jam Real-time
 */
function initClock() {
    function update() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
        if (elClock) elClock.textContent = `📅 ${dateStr} • ⏰ ${timeStr}`;
    }
    update();
    setInterval(update, 1000);
}

/**
 * Inisialisasi Chart.js untuk Suhu & Kelembaban
 */
function initChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    trendChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Suhu (°C)',
                    data: [],
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'Kelembaban (%)',
                    data: [],
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#64748b', maxTicksLimit: 7 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

/**
 * Fetch semua data (Perangkat + Sensor)
 */
async function fetchAllData(manual = false) {
    if (isUpdating && !manual) return;
    isUpdating = true;

    try {
        const [devicesRes, sensorsRes] = await Promise.all([
            fetch(`${API_BASE}/devices.php`).then(r => r.json()),
            fetch(`${API_BASE}/sensors.php`).then(r => r.json())
        ]);

        if (devicesRes.status === 'success') {
            renderDevices(devicesRes.data, devicesRes.summary);
            hideSetupAlert();
            updateConnectionStatus(true);
        } else {
            showSetupAlert(devicesRes.message, devicesRes.tip);
            updateConnectionStatus(false);
        }

        if (sensorsRes.status === 'success') {
            renderSensors(sensorsRes.latest, sensorsRes.history);
        }
    } catch (err) {
        console.warn('Gagal menghubungi API:', err);
        showSetupAlert(
            'Tidak dapat terhubung ke Backend API', 
            'Pastikan XAMPP (Apache & MySQL) aktif dan database smarthome_db sudah diimport di phpMyAdmin.'
        );
        updateConnectionStatus(false);
    } finally {
        isUpdating = false;
    }
}

/**
 * Render Kartu Perangkat / Saklar
 */
function renderDevices(devices, summary) {
    if (summary) {
        if (elValActive) elValActive.textContent = `${summary.active_devices} / ${summary.total_devices}`;
        if (elValPower) elValPower.textContent = `${summary.total_active_power_watt} W`;
    }

    if (!elDeviceGrid) return;

    // Simpan posisi switch agar tidak flicker saat re-render
    elDeviceGrid.innerHTML = '';

    devices.forEach(device => {
        const isActive = parseInt(device.status) === 1;
        const iconInfo = getDeviceIcon(device.device_type, isActive);

        const card = document.createElement('div');
        card.className = `device-card glass-panel ${isActive ? 'is-active' : ''}`;
        card.innerHTML = `
            <div class="device-top">
                <div class="device-avatar">
                    <span class="${iconInfo.anim}">${iconInfo.icon}</span>
                </div>
                <label class="switch">
                    <input type="checkbox" id="toggle-${device.id}" ${isActive ? 'checked' : ''} onchange="toggleDevice(${device.id})">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="device-info">
                <h3 class="device-name">${escapeHtml(device.device_name)}</h3>
                <div class="device-location">
                    <span>📍</span> ${escapeHtml(device.room)}
                </div>
                <div class="device-meta-tags">
                    <span class="tag-badge">GPIO ${device.pin_gpio}</span>
                    <span class="tag-badge">${device.power_watt}W</span>
                </div>
            </div>
            <div class="device-bottom">
                <span class="device-status-text">${isActive ? '● AKTIF (ON)' : '○ MATI (OFF)'}</span>
                <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.72rem;" onclick="toggleDevice(${device.id})">
                    ${isActive ? 'Matikan' : 'Nyalakan'}
                </button>
            </div>
        `;
        elDeviceGrid.appendChild(card);
    });
}

/**
 * Helper icon & animasi berdasarkan tipe alat
 */
function getDeviceIcon(type, isActive) {
    switch (type) {
        case 'fan':
            return { icon: '🌀', anim: isActive ? 'fan-spinning' : '' };
        case 'socket':
            return { icon: '🔌', anim: '' };
        case 'ac':
            return { icon: '❄️', anim: '' };
        case 'light':
        default:
            return { icon: isActive ? '💡' : '🌑', anim: '' };
    }
}

/**
 * Render Metrik & Grafik Sensor
 */
function renderSensors(latest, history) {
    if (latest) {
        const temp = parseFloat(latest.temperature || 0).toFixed(1);
        const hum  = parseFloat(latest.humidity || 0).toFixed(1);

        if (elValTemp) elValTemp.textContent = temp;
        if (elValHum)  elValHum.textContent = hum;
    }

    if (history && history.length > 0 && trendChart) {
        const labels = history.map(h => {
            const date = new Date(h.created_at);
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        });
        const temps = history.map(h => parseFloat(h.temperature));
        const hums  = history.map(h => parseFloat(h.humidity));

        trendChart.data.labels = labels;
        trendChart.data.datasets[0].data = temps;
        trendChart.data.datasets[1].data = hums;
        trendChart.update('none'); // smooth without full rebuild
    }
}

/**
 * Toggle Status Satu Perangkat
 */
async function toggleDevice(id) {
    try {
        const res = await fetch(`${API_BASE}/devices.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, toggle: true, triggered_by: 'WEB_USER' })
        });
        const result = await res.json();
        if (result.status === 'success') {
            logActivity(`Perangkat #${result.device_id}`, result.new_status ? 'ON' : 'OFF');
            fetchAllData(true);
        }
    } catch (e) {
        console.error('Gagal mengubah status perangkat:', e);
    }
}

/**
 * Kontrol Semua Perangkat (ON / OFF Sekaligus)
 */
async function setAllDevices(action) {
    try {
        const res = await fetch(`${API_BASE}/devices.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action_all: action, triggered_by: 'WEB_USER' })
        });
        const result = await res.json();
        if (result.status === 'success') {
            logActivity('Semua Perangkat', action === 'all_on' ? 'ON' : 'OFF');
            fetchAllData(true);
        }
    } catch (e) {
        console.error('Gagal menerapkan kontrol massal:', e);
    }
}

/**
 * Generator Simulasi Data Sensor untuk Pengujian Web Tanpa Wokwi
 */
async function simulateSensorData() {
    // Buat data acak yang realistis
    const randomTemp = (26.5 + Math.random() * 5).toFixed(1);
    const randomHum  = (58 + Math.random() * 15).toFixed(1);
    const randomLight = Math.floor(300 + Math.random() * 500);

    try {
        const res = await fetch(`${API_BASE}/sensors.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                temperature: randomTemp,
                humidity: randomHum,
                light_level: randomLight,
                motion_detected: Math.random() > 0.7 ? 1 : 0
            })
        });
        const json = await res.json();
        if (json.status === 'success') {
            fetchAllData(true);
        }
    } catch (e) {
        console.error('Simulasi gagal dikirim:', e);
    }
}

/**
 * Catat aktivitas ke daftar log UI
 */
function logActivity(target, action) {
    if (!elActivityList) return;
    const item = document.createElement('div');
    item.className = 'activity-item';
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    item.innerHTML = `
        <div>
            <strong>${escapeHtml(target)}</strong>
            <div style="font-size: 0.72rem; color: #64748b;">${time} via Web</div>
        </div>
        <span class="activity-badge ${action.toLowerCase()}">${action}</span>
    `;
    elActivityList.prepend(item);

    // Batasi list 6 item
    while (elActivityList.children.length > 6) {
        elActivityList.removeChild(elActivityList.lastChild);
    }
}

function updateConnectionStatus(isOnline) {
    if (!elStatusBadge) return;
    if (isOnline) {
        elStatusBadge.className = 'status-badge';
        elStatusBadge.innerHTML = '<span class="pulse-dot"></span> Sistem Siaga (Online)';
    } else {
        elStatusBadge.className = 'status-badge error';
        elStatusBadge.innerHTML = '<span class="pulse-dot"></span> Database Offline';
    }
}

function showSetupAlert(msg, tip) {
    if (!elSetupAlert) return;
    elSetupAlert.classList.add('show');
    const title = elSetupAlert.querySelector('h4');
    const desc = elSetupAlert.querySelector('p');
    if (title) title.textContent = msg;
    if (desc) desc.innerHTML = `${tip || ''} <br><br>👉 Jalankan database: buka <code>http://localhost/phpmyadmin</code> dan import file <code>database/schema.sql</code>.`;
}

function hideSetupAlert() {
    if (elSetupAlert) elSetupAlert.classList.remove('show');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str || '';
    return div.innerHTML;
}
