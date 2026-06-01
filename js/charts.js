// Charts Module
// Renders weather charts using Chart.js (loaded via CDN)

let tempChartInstance = null;
let precipChartInstance = null;
let windChartInstance = null;
let pressureChartInstance = null;

/**
 * Destroy all existing chart instances
 */
function destroyCharts() {
    [tempChartInstance, precipChartInstance, windChartInstance, pressureChartInstance].forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    tempChartInstance = null;
    precipChartInstance = null;
    windChartInstance = null;
    pressureChartInstance = null;
}

/**
 * Format date for chart labels
 * @param {string} dateStr - Date string from API (YYYY-MM-DD)
 * @returns {string}
 */
function formatChartDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Завтра';
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Get Chart.js default font color based on theme
 * @returns {string}
 */
function getTextColor() {
    return 'rgba(255, 255, 255, 0.7)';
}

function getGridColor() {
    return 'rgba(255, 255, 255, 0.1)';
}

/**
 * Create a temperature chart (max/min with fill)
 * @param {Array} daily - Daily forecast data
 * @param {number} days - Number of days to show
 */
function createTempChart(daily, days) {
    const ctx = document.getElementById('tempChart');
    if (!ctx) return;

    const labels = daily.time.slice(0, days);
    const maxTemps = daily.temperature_2m_max.slice(0, days);
    const minTemps = daily.temperature_2m_min.slice(0, days);

    tempChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(formatChartDate),
            datasets: [
                {
                    label: 'Макс.',
                    data: maxTemps,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#ff6b6b',
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Мин.',
                    data: minTemps,
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#4ecdc4',
                    borderWidth: 2,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: getTextColor(),
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8,
                    padding: 10
                }
            },
            scales: {
                x: {
                    ticks: { color: getTextColor(), font: { size: 10 } },
                    grid: { color: getGridColor() }
                },
                y: {
                    ticks: { color: getTextColor(), font: { size: 10 } },
                    grid: { color: getGridColor() },
                    title: {
                        display: true,
                        text: '°C',
                        color: getTextColor(),
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

/**
 * Create a precipitation chart (bar)
 * @param {Array} daily - Daily forecast data
 * @param {number} days - Number of days to show
 */
function createPrecipChart(daily, days) {
    const ctx = document.getElementById('precipChart');
    if (!ctx) return;

    const labels = daily.time.slice(0, days);
    const precip = daily.precipitation_sum.slice(0, days);

    precipChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(formatChartDate),
            datasets: [{
                label: 'Осадки',
                data: precip,
                backgroundColor: 'rgba(78, 205, 196, 0.6)',
                borderColor: '#4ecdc4',
                borderWidth: 1,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(78, 205, 196, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: getTextColor(),
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' мм';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: getTextColor(), font: { size: 10 } },
                    grid: { color: getGridColor() }
                },
                y: {
                    ticks: { color: getTextColor(), font: { size: 10 } },
                    grid: { color: getGridColor() },
                    title: {
                        display: true,
                        text: 'мм',
                        color: getTextColor(),
                        font: { size: 11 }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Create a wind speed chart (line)
 * @param {Array} daily - Daily forecast data
 * @param {number} days - Number of days to show
 */
function createWindChart(daily, days) {
    const ctx = document.getElementById('windChart');
    if (!ctx) return;

    const labels = daily.time.slice(0, days);
    const windSpeed = daily.windspeed_10m_max.slice(0, days);

    windChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(formatChartDate),
            datasets: [{
                label: 'Ветер',
                data: windSpeed,
                borderColor: '#ffd93d',
                backgroundColor: 'rgba(255, 217, 61, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ffd93d',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: getTextColor(),
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' км/ч';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: getTextColor(), font: { size: 10 } },
                    grid: { color: getGridColor() }
                },
                y: {
                    ticks: { color: getTextColor(), font: { size: 10 } },
                    grid: { color: getGridColor() },
                    title: {
                        display: true,
                        text: 'км/ч',
                        color: getTextColor(),
                        font: { size: 11 }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Create a pressure chart (line)
 * @param {Array} daily - Daily forecast data
 * @param {number} days - Number of days to show
 */
function createPressureChart(daily, days) {
    const ctx = document.getElementById('pressureChart');
    if (!ctx) return;

    const labels = daily.time.slice(0, days);
    // Convert hPa to mm Hg
    const pressure = daily.surface_pressure_max.slice(0, days).map(p => Math.round(p * 0.750062));

    pressureChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(formatChartDate),
            datasets: [{
                label: 'Давление',
                data: pressure,
                borderColor: '#a29bfe',
                backgroundColor: 'rgba(162, 155, 254, 0.1)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#a29bfe',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: getTextColor(),
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' мм рт.ст.';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: getTextColor(), font: { size: 10 } },
                    grid: { color: getGridColor() }
                },
                y: {
                    ticks: { color: getTextColor(), font: { size: 10 } },
                    grid: { color: getGridColor() },
                    title: {
                        display: true,
                        text: 'мм рт.ст.',
                        color: getTextColor(),
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

/**
 * Render all weather charts
 * @param {Object} daily - Daily forecast data from API
 * @param {number} days - Number of days to display
 */
export function renderCharts(daily, days) {
    if (!daily || !daily.time) return;

    const chartsSection = document.getElementById('chartsSection');
    if (!chartsSection) return;

    // Show charts section
    chartsSection.style.display = 'block';

    // Destroy old charts before creating new ones
    destroyCharts();

    const displayDays = Math.min(days, daily.time.length, 16);

    createTempChart(daily, displayDays);
    createPrecipChart(daily, displayDays);
    createWindChart(daily, displayDays);
    createPressureChart(daily, displayDays);
}

/**
 * Hide charts section (e.g., when no data)
 */
export function hideCharts() {
    const chartsSection = document.getElementById('chartsSection');
    if (chartsSection) {
        chartsSection.style.display = 'none';
    }
    destroyCharts();
}