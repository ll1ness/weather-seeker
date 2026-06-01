/**
 * Lunar Calendar / Moon Phases module
 * Calculates moon phases algorithmically (no external API needed)
 * Based on the well-known moon phase algorithm by John Walker
 */

// Moon phase names in Russian
const PHASE_NAMES = {
    new: '🌑 Новолуние',
    waxing_crescent: '🌒 Молодая луна',
    first_quarter: '🌓 Первая четверть',
    waxing_gibbous: '🌔 Растущая луна',
    full: '🌕 Полнолуние',
    waning_gibbous: '🌖 Убывающая луна',
    last_quarter: '🌗 Последняя четверть',
    waning_crescent: '🌘 Старая луна'
};

const PHASE_EMOJIS = {
    new: '🌑',
    waxing_crescent: '🌒',
    first_quarter: '🌓',
    waxing_gibbous: '🌔',
    full: '🌕',
    waning_gibbous: '🌖',
    last_quarter: '🌗',
    waning_crescent: '🌘'
};

/**
 * Calculate moon phase for a given date
 * Returns: { phase, illumination, age, name, emoji, nextNew, nextFull }
 */
export function calculateMoonPhase(date = new Date()) {
    // Julian date calculation
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate() + date.getHours() / 24 + date.getMinutes() / 1440;

    let jd;
    if (month <= 2) {
        jd = Math.floor(365.25 * (year - 1)) + Math.floor(30.6001 * (month + 12)) + day + 1720994.5;
    } else {
        jd = Math.floor(365.25 * year) + Math.floor(30.6001 * (month + 1)) + day + 1720994.5;
    }

    // Days since known new moon (Jan 6, 2000)
    const daysSinceNew = jd - 2451550.1;
    
    // New moons occur every 29.53058867 days
    const lunations = daysSinceNew / 29.53058867;
    const lunationFraction = lunations - Math.floor(lunations);
    
    // Age of moon in days (0-29.53)
    const age = lunationFraction * 29.53058867;
    
    // Illumination (0-1)
    const illumination = (1 - Math.cos(lunationFraction * 2 * Math.PI)) / 2;
    
    // Determine phase name
    let phaseKey;
    if (lunationFraction < 0.025 || lunationFraction >= 0.975) {
        phaseKey = 'new';
    } else if (lunationFraction < 0.225) {
        phaseKey = 'waxing_crescent';
    } else if (lunationFraction < 0.275) {
        phaseKey = 'first_quarter';
    } else if (lunationFraction < 0.475) {
        phaseKey = 'waxing_gibbous';
    } else if (lunationFraction < 0.525) {
        phaseKey = 'full';
    } else if (lunationFraction < 0.725) {
        phaseKey = 'waning_gibbous';
    } else if (lunationFraction < 0.775) {
        phaseKey = 'last_quarter';
    } else {
        phaseKey = 'waning_crescent';
    }

    // Calculate next new moon
    const nextNewLunation = Math.ceil(lunations);
    const nextNewJD = 2451550.1 + nextNewLunation * 29.53058867;
    const nextNewDate = julianToDate(nextNewJD);

    // Calculate next full moon
    const nextFullLunation = Math.ceil(lunations - 0.5);
    const nextFullJD = 2451550.1 + (nextFullLunation + 0.5) * 29.53058867;
    const nextFullDate = julianToDate(nextFullJD);

    return {
        phase: phaseKey,
        illumination: Math.round(illumination * 100),
        age: Math.round(age * 10) / 10,
        name: PHASE_NAMES[phaseKey],
        emoji: PHASE_EMOJIS[phaseKey],
        nextNew: nextNewDate,
        nextFull: nextFullDate,
        lunationFraction
    };
}

/**
 * Convert Julian date to JavaScript Date
 */
function julianToDate(jd) {
    const jd0 = Math.floor(jd + 0.5);
    const dayFraction = (jd + 0.5) - jd0;
    
    let a = jd0;
    if (jd0 >= 2299161) {
        const alpha = Math.floor((jd0 - 1867216.25) / 36524.25);
        a = jd0 + 1 + alpha - Math.floor(alpha / 4);
    }
    
    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);
    
    const day = b - d - Math.floor(30.6001 * e) + dayFraction;
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;
    
    return new Date(year, month - 1, Math.floor(day));
}

/**
 * Get all moon phases for a given month
 * Returns array of { date, phase, name, emoji }
 */
export function getMonthPhases(year, month) {
    const phases = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day, 12, 0, 0);
        const phase = calculateMoonPhase(date);
        phases.push({
            date,
            day,
            ...phase
        });
    }
    
    return phases;
}

/**
 * Draw moon phase on canvas
 * @param {HTMLCanvasElement} canvas
 * @param {number} illumination - 0-100
 * @param {number} lunationFraction - 0-1
 */
export function drawMoon(canvas, illumination, lunationFraction) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 10;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius + 20);
    gradient.addColorStop(0, 'rgba(200, 200, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
    ctx.fill();

    // Moon body (dark side)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Moon border
    ctx.strokeStyle = 'rgba(200, 200, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Light side
    const isWaxing = lunationFraction < 0.5;
    const terminator = (lunationFraction % 0.5) / 0.5; // 0-1 within half cycle

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Light gradient
    const lightGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    lightGrad.addColorStop(0, '#fffde7');
    lightGrad.addColorStop(0.5, '#fff9c4');
    lightGrad.addColorStop(1, '#f0e68c');
    ctx.fillStyle = lightGrad;

    if (isWaxing) {
        // Right side illuminated
        ctx.beginPath();
        ctx.arc(cx + radius * (1 - 2 * terminator), cy, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Left side illuminated
        ctx.beginPath();
        ctx.arc(cx - radius * (1 - 2 * terminator), cy, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Surface details (craters) - subtle
    ctx.fillStyle = 'rgba(200, 200, 200, 0.08)';
    const craters = [
        { x: 0.3, y: 0.3, r: 0.08 },
        { x: -0.2, y: 0.4, r: 0.05 },
        { x: 0.1, y: -0.35, r: 0.06 },
        { x: -0.3, y: -0.2, r: 0.04 },
        { x: 0.4, y: -0.1, r: 0.03 }
    ];
    craters.forEach(c => {
        ctx.beginPath();
        ctx.arc(cx + c.x * radius, cy + c.y * radius, c.r * radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

/**
 * Render the moon section
 */
export function renderMoonSection() {
    const now = new Date();
    const phase = calculateMoonPhase(now);

    // Update today's phase
    document.getElementById('moonPhaseName').textContent = phase.name;
    document.getElementById('moonIllumination').textContent = `Освещённость: ${phase.illumination}%`;
    document.getElementById('moonAge').textContent = `Возраст луны: ${phase.age} дней`;

    const nextNew = phase.nextNew;
    const nextFull = phase.nextFull;
    document.getElementById('moonNextNew').textContent = `🌑 Следующее новолуние: ${nextNew.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    document.getElementById('moonNextFull').textContent = `🌕 Следующее полнолуние: ${nextFull.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    // Draw moon canvas
    const canvas = document.getElementById('moonCanvas');
    drawMoon(canvas, phase.illumination, phase.lunationFraction);

    // Render month calendar
    renderMonthCalendar(now.getFullYear(), now.getMonth() + 1);

    // Render phases list
    renderPhasesList(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Render the month calendar grid
 */
function renderMonthCalendar(year, month) {
    const grid = document.getElementById('moonCalGrid');
    const monthEl = document.getElementById('moonCalMonth');
    if (!grid || !monthEl) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    monthEl.textContent = new Date(year, month - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    // Convert Sunday=0 to Monday=0
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    let html = '<div class="moon-cal-day-header">';
    dayNames.forEach(d => { html += `<span>${d}</span>`; });
    html += '</div>';

    let dayCount = 1;
    let nextMonthDay = 1;
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
        if (i < startOffset) {
            // Previous month days
            const prevDay = daysInPrevMonth - startOffset + i + 1;
            html += `<span class="moon-cal-day other-month">${prevDay}</span>`;
        } else if (dayCount <= daysInMonth) {
            const isToday = dayCount === currentDay && month === currentMonth && year === currentYear;
            const date = new Date(year, month - 1, dayCount, 12, 0, 0);
            const phase = calculateMoonPhase(date);
            const isPhaseDay = ['new', 'first_quarter', 'full', 'last_quarter'].includes(phase.phase);
            
            html += `<span class="moon-cal-day${isToday ? ' today' : ''}${isPhaseDay ? ' phase-day' : ''}" title="${phase.name}">
                ${dayCount}
                ${isPhaseDay ? `<span class="moon-cal-phase-icon">${phase.emoji}</span>` : ''}
            </span>`;
            dayCount++;
        } else {
            // Next month days
            html += `<span class="moon-cal-day other-month">${nextMonthDay}</span>`;
            nextMonthDay++;
        }
    }

    grid.innerHTML = html;
}

/**
 * Render the list of key phases for the month
 */
function renderPhasesList(year, month) {
    const grid = document.getElementById('moonPhasesGrid');
    if (!grid) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const phases = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day, 12, 0, 0);
        const phase = calculateMoonPhase(date);
        
        // Only show key phases
        if (['new', 'first_quarter', 'full', 'last_quarter'].includes(phase.phase)) {
            // Check if this is the exact day of the phase (closest to 0.0, 0.25, 0.5, 0.75)
            const prevDay = new Date(year, month - 1, day - 1, 12, 0, 0);
            const nextDay = new Date(year, month - 1, day + 1, 12, 0, 0);
            const prevPhase = calculateMoonPhase(prevDay);
            const nextPhase = calculateMoonPhase(nextDay);
            
            const currentDist = Math.abs(phase.lunationFraction - getTargetFraction(phase.phase));
            const prevDist = Math.abs(prevPhase.lunationFraction - getTargetFraction(phase.phase));
            const nextDist = Math.abs(nextPhase.lunationFraction - getTargetFraction(phase.phase));
            
            if (currentDist <= prevDist && currentDist <= nextDist) {
                phases.push({ date, ...phase });
            }
        }
    }

    if (phases.length === 0) {
        grid.innerHTML = '<p style="opacity: 0.6;">Нет ключевых фаз в этом месяце</p>';
        return;
    }

    grid.innerHTML = phases.map(p => `
        <div class="moon-phase-card">
            <div class="moon-phase-emoji">${p.emoji}</div>
            <div class="moon-phase-info">
                <strong>${p.name}</strong>
                <span>${p.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                <span>Освещённость: ${p.illumination}%</span>
            </div>
        </div>
    `).join('');
}

function getTargetFraction(phase) {
    switch (phase) {
        case 'new': return 0;
        case 'first_quarter': return 0.25;
        case 'full': return 0.5;
        case 'last_quarter': return 0.75;
        default: return 0;
    }
}

/**
 * Navigate to previous/next month
 */
let currentCalYear, currentCalMonth;

export function initMoonCalendar() {
    const now = new Date();
    currentCalYear = now.getFullYear();
    currentCalMonth = now.getMonth() + 1;

    const prevBtn = document.getElementById('moonPrevMonth');
    const nextBtn = document.getElementById('moonNextMonth');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalMonth--;
            if (currentCalMonth < 1) {
                currentCalMonth = 12;
                currentCalYear--;
            }
            renderMonthCalendar(currentCalYear, currentCalMonth);
            renderPhasesList(currentCalYear, currentCalMonth);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalMonth++;
            if (currentCalMonth > 12) {
                currentCalMonth = 1;
                currentCalYear++;
            }
            renderMonthCalendar(currentCalYear, currentCalMonth);
            renderPhasesList(currentCalYear, currentCalMonth);
        });
    }
}