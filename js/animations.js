// Animation functions for weather backgrounds
export function startAnimation(condition, container) {
    // Clear previous animations
    container.innerHTML = '';
    const isDay = true; // Default to day animation

    switch (condition) {
        case 'clear':
            createSunAnimation(container, isDay);
            break;
        case 'clouds':
            createCloudAnimation(container);
            break;
        case 'rain':
            createRainAnimation(container);
            break;
            break;
        case 'snow':
            createSnowAnimation(container);
            break;
        case 'thunderstorm':
            createThunderstormAnimation(container);
            break;
        case 'mist':
        case 'fog':
        case 'haze':
            createFogAnimation(container);
            break;
        default:
            createSunAnimation(container, isDay);
    }
}

function createSunAnimation(container, isDay) {
    const sun = document.createElement('div');
    sun.className = 'sun-ray';
    sun.style.top = '10%';
    sun.style.right = '10%';
    sun.style.width = '150px';
    sun.style.height = '150px';
    container.appendChild(sun);
}

function createCloudAnimation(container) {
    for (let i = 0; i < 5; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloud.style.width = (100 + Math.random() * 150) + 'px';
        cloud.style.height = (40 + Math.random() * 60) + 'px';
        cloud.style.top = (10 + Math.random() * 60) + '%';
        cloud.style.left = '-200px';
        cloud.style.animationDuration = (20 + Math.random() * 20) + 's';
        cloud.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(cloud);
    }
}

function createRainAnimation(container) {
    for (let i = 0; i < 100; i++) {
        const raindrop = document.createElement('div');
        raindrop.className = 'raindrop';
        raindrop.style.left = Math.random() * 100 + '%';
        raindrop.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';
        raindrop.style.animationDelay = Math.random() * 2 + 's';
        raindrop.style.height = (10 + Math.random() * 20) + 'px';
        container.appendChild(raindrop);
    }
}

function createSnowAnimation(container) {
    for (let i = 0; i < 50; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.animationDuration = (3 + Math.random() * 4) + 's';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        snowflake.style.width = (5 + Math.random() * 10) + 'px';
        snowflake.style.height = snowflake.style.width;
        container.appendChild(snowflake);
    }
}

function createThunderstormAnimation(container) {
    // Dark clouds
    for (let i = 0; i < 5; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloud.style.width = (150 + Math.random() * 100) + 'px';
        cloud.style.height = (60 + Math.random() * 40) + 'px';
        cloud.style.top = (10 + Math.random() * 50) + '%';
        cloud.style.left = '-200px';
        cloud.style.animationDuration = (15 + Math.random() * 15) + 's';
        cloud.style.background = 'rgba(50, 50, 50, 0.8)';
        container.appendChild(cloud);
    }

    // Lightning effect
    const lightning = document.createElement('div');
    lightning.className = 'lightning';
    container.appendChild(lightning);
}

function createFogAnimation(container) {
    for (let i = 0; i < 8; i++) {
        const fog = document.createElement('div');
        fog.className = 'fog-particle';
        fog.style.top = (Math.random() * 100) + '%';
        fog.style.left = '-200px';
        fog.style.animationDuration = (20 + Math.random() * 15) + 's';
        fog.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(fog);
    }
}
