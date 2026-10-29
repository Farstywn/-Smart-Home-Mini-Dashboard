/**
 * Smart Home - Application Logic (Clean & Minimalist)
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
    if (elBtnRefresh) elBtnRefresh.addEventListener('click', () => fetchAllData(true));
});

/**
 * Jam Minimalis
 */
function initClock() {
    function update() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        if (elClock) elClock.textContent = `${dateStr}, ${timeStr}`;
    }
    update();
    setInterval(update, 1000);
}

/**
 * Inisialisasi Chart.js Minimalis (Linear/Vercel Style)
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
                    borderColor: '#3b82f6',
                    borderWidth: 1.8,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#3b82f6',
                    fill: false
                },
                {
                    label: 'Kelembaban (%)',
                    data: [],
                    borderColor: '#10b981',
                    borderWidth: 1.8,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#10b981',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#71717a',
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        boxWidth: 12,
                        boxHeight: 3,
                        usePointStyle: false
                    }
                },
                tooltip: {
                    backgroundColor: '#18181b',
                    titleColor: '#f4f4f5',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 6,
                    titleFont: { size: 11 },
                    bodyFont: { size: 11 }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false },
                    ticks: { color: '#52525b', font: { size: 10 }, maxTicksLimit: 6 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
                    ticks: { color: '#52525b', font: { size: 10 } }
                }
            }
        }
    });
}

/**
 * Fetch semua data
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
        showSetupAlert(
            'Tidak dapat terhubung ke Backend API', 
            'Pastikan XAMPP (Apache & MySQL) aktif di port 8080 dan database smarthome_db sudah diimport.'
        );
        updateConnectionStatus(false);
    } finally {
        isUpdating = false;
    }
}

/**
 * Render Kartu Perangkat
 */
function renderDevices(devices, summary) {
    if (summary) {
        if (elValActive) elValActive.textContent = `${summary.active_devices} / ${summary.total_devices}`;
        if (elValPower) elValPower.textContent = summary.total_active_power_watt;
    }

    if (!elDeviceGrid) return;
    elDeviceGrid.innerHTML = '';

    devices.forEach(device => {
        const isActive = parseInt(device.status) === 1;
        const iconSvg = getDeviceSvg(device.device_type);

        const card = document.createElement('div');
        card.className = `device-card ${isActive ? 'is-active' : ''}`;
        card.innerHTML = `
            <div class="device-top">
                <div class="device-icon-box">
                    ${iconSvg}
                </div>
                <label class="switch">
                    <input type="checkbox" id="toggle-${device.id}" ${isActive ? 'checked' : ''} onchange="toggleDevice(${device.id})">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="device-info">
                <div class="device-name">${escapeHtml(device.device_name)}</div>
                <div class="device-location">${escapeHtml(device.room)}</div>
                <div class="device-meta-tags">
                    <span class="tag-badge">GPIO ${device.pin_gpio}</span>
                    <span class="tag-badge">${device.power_watt}W</span>
                </div>
            </div>
            <div class="device-bottom">
                <span class="device-status-text">${isActive ? 'Aktif' : 'Nonaktif'}</span>
                <button class="btn btn-secondary" style="padding: 3px 9px; font-size: 0.72rem;" onclick="toggleDevice(${device.id})">
                    ${isActive ? 'Matikan' : 'Nyalakan'}
                </button>
            </div>
        `;
        elDeviceGrid.appendChild(card);
    });
}

/**
 * SVG Icons Minimalis (Clean Stroke Icons)
 */
function getDeviceSvg(type) {
    switch (type) {
        case 'fan':
            return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 12a4 4 0 0 0-4-4c-2.5 0-3 2-3 2"></path>
                <path d="M12 12a4 4 0 0 0 4-4c0-2.5-2-3-2-3"></path>
                <path d="M12 12a4 4 0 0 0 4 4c2.5 0 3-2 3-2"></path>
                <path d="M12 12a4 4 0 0 0-4 4c0 2.5 2 3 2 3"></path>
            </svg>`;
        case 'socket':
            return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="9" y1="10" x2="9" y2="14"></line>
                <line x1="15" y1="10" x2="15" y2="14"></line>
            </svg>`;
        case 'ac':
            return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="2" y1="6" x2="22" y2="6"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="2" y1="18" x2="22" y2="18"></line>
            </svg>`;
        case 'light':
        default:
            return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18h6"></path>
                <path d="M10 22h4"></path>
                <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path>
            </svg>`;
    }
}

/**
 * Render Sensor
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
        trendChart.update('none');
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
        console.error('Gagal toggle perangkat:', e);
    }
}

/**
 * Set Semua Perangkat
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
        console.error('Gagal menerapkan aksi massal:', e);
    }
}

/**
 * Generator Simulasi Data Sensor
 */
async function simulateSensorData() {
    const randomTemp = (26.5 + Math.random() * 4.5).toFixed(1);
    const randomHum  = (58 + Math.random() * 12).toFixed(1);
    const randomLight = Math.floor(300 + Math.random() * 400);

    try {
        const res = await fetch(`${API_BASE}/sensors.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                temperature: randomTemp,
                humidity: randomHum,
                light_level: randomLight,
                motion_detected: 0
            })
        });
        const json = await res.json();
        if (json.status === 'success') {
            fetchAllData(true);
        }
    } catch (e) {
        console.error('Simulasi gagal:', e);
    }
}

/**
 * Catat aktivitas log minimalis
 */
function logActivity(target, action) {
    if (!elActivityList) return;
    const item = document.createElement('div');
    item.className = 'activity-item';
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    item.innerHTML = `
        <div>
            <div class="activity-target">${escapeHtml(target)}</div>
            <div class="activity-time">${time} via Web</div>
        </div>
        <span class="activity-badge ${action.toLowerCase()}">${action}</span>
    `;
    elActivityList.prepend(item);

    while (elActivityList.children.length > 5) {
        elActivityList.removeChild(elActivityList.lastChild);
    }
}

function updateConnectionStatus(isOnline) {
    if (!elStatusBadge) return;
    if (isOnline) {
        elStatusBadge.className = 'status-badge';
        elStatusBadge.innerHTML = '<span class="pulse-dot"></span> Terhubung';
    } else {
        elStatusBadge.className = 'status-badge error';
        elStatusBadge.innerHTML = '<span class="pulse-dot"></span> Offline';
    }
}

function showSetupAlert(msg, tip) {
    if (!elSetupAlert) return;
    elSetupAlert.classList.add('show');
    const title = elSetupAlert.querySelector('h4');
    const desc = elSetupAlert.querySelector('p');
    if (title) title.textContent = msg;
    if (desc) desc.innerHTML = `${tip || ''}`;
}

function hideSetupAlert() {
    if (elSetupAlert) elSetupAlert.classList.remove('show');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str || '';
    return div.innerHTML;
}
