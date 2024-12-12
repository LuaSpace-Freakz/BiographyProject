document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const canvas = document.getElementById('background');
    const context = canvas.getContext('2d');

    const sparkleCanvas = document.getElementById('sparkle-canvas');
    const sparkleCtx = sparkleCanvas.getContext('2d');

    let descriptions = [];
    const descriptionContainer = document.getElementById('description');

    let insideContainer = false;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function resizeSparkleCanvas() {
        sparkleCanvas.width = window.innerWidth;
        sparkleCanvas.height = window.innerHeight;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        resizeSparkleCanvas();
    });
    resizeCanvas();
    resizeSparkleCanvas();

    let basePointCount, maxDistance, repulsionDistance, maxSpeed, baseSpeed, acceleration, deceleration;
    let scalingFactor, pointCount;
    let assetsFolder;
    let config;

    let points = [];

    try {
        const res = await fetch('./config.json');
        config = await res.json();

        assetsFolder = config.assetsFolder || 'assets/';

        const backgroundConfig = config.background;

        const devicePixelRatio = window.devicePixelRatio || 1;
        scalingFactor = devicePixelRatio * (window.innerWidth / 1680) * (window.innerHeight / 945);

        basePointCount = backgroundConfig.basePointCount;
        maxDistance = backgroundConfig.maxDistance * scalingFactor;
        repulsionDistance = backgroundConfig.repulsionDistance * scalingFactor;
        maxSpeed = backgroundConfig.maxSpeed * scalingFactor;
        baseSpeed = backgroundConfig.baseSpeed * scalingFactor;
        acceleration = backgroundConfig.acceleration;
        deceleration = backgroundConfig.deceleration;
        pointCount = Math.floor(basePointCount * scalingFactor);

        for (let i = 0; i < pointCount; i++) {
            points.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * baseSpeed,
                vy: (Math.random() - 0.5) * baseSpeed,
            });
        }

        let mouseX = -100;
        let mouseY = -100;

        let targetSpeed = baseSpeed;
        let currentSpeed = baseSpeed;

        document.addEventListener('mousemove', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;

            targetSpeed = Math.min(maxSpeed, baseSpeed + 1.0 * scalingFactor);
        });

        let mouseMoveTimeout;
        document.addEventListener('mousemove', () => {
            clearTimeout(mouseMoveTimeout);
            mouseMoveTimeout = setTimeout(() => {
                targetSpeed = baseSpeed;
            }, 100);
        });

        window.addEventListener('keydown', function (e) {
            const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown', 'Home', 'End'];
            if (keys.includes(e.code)) {
                e.preventDefault();
            }
        }, { passive: false });

        window.addEventListener('touchmove', function (e) {
            e.preventDefault();
        }, { passive: false });

        function draw(timestamp, deltaTime) {
            context.clearRect(0, 0, canvas.width, canvas.height);

            points.forEach((point, index) => {
                const dx = point.x - mouseX;
                const dy = point.y - mouseY;
                const distanceToMouse = Math.sqrt(dx * dx + dy * dy);

                if (distanceToMouse < repulsionDistance) {
                    const angle = Math.atan2(dy, dx);
                    const force = (repulsionDistance - distanceToMouse) / repulsionDistance;
                    point.vx += Math.cos(angle) * force * 0.5;
                    point.vy += Math.sin(angle) * force * 0.5;

                    const currentPointSpeed = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
                    if (currentPointSpeed > currentSpeed) {
                        point.vx *= currentSpeed / currentPointSpeed;
                        point.vy *= currentSpeed / currentPointSpeed;
                    }
                }

                point.x += point.vx * deltaTime * 60;
                point.y += point.vy * deltaTime * 60;

                if (point.x <= 0) {
                    point.x = 0;
                    point.vx = Math.abs(point.vx);
                } else if (point.x >= canvas.width) {
                    point.x = canvas.width;
                    point.vx = -Math.abs(point.vx);
                }

                if (point.y <= 0) {
                    point.y = 0;
                    point.vy = Math.abs(point.vy);
                } else if (point.y >= canvas.height) {
                    point.y = canvas.height;
                    point.vy = -Math.abs(point.vy);
                }

                context.fillStyle = 'white';
                context.beginPath();
                context.arc(point.x, point.y, 2 * scalingFactor, 0, Math.PI * 2);
                context.fill();

                let closePoints = [];
                for (let i = 0; i < points.length; i++) {
                    if (i === index) continue;
                    const other = points[i];
                    const distance = Math.sqrt(
                        (point.x - other.x) ** 2 + (point.y - other.y) ** 2
                    );

                    if (distance < maxDistance) {
                        closePoints.push(other);
                        const alpha = Math.pow(1 - (distance / maxDistance), 3);
                        context.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
                        context.beginPath();
                        context.moveTo(point.x, point.y);
                        context.lineTo(other.x, other.y);
                        context.stroke();
                    }
                }

                if (closePoints.length > 1) {
                    closePoints.unshift(point);
                    closePoints.sort((a, b) => {
                        const angleA = Math.atan2(a.y - point.y, a.x - point.x);
                        const angleB = Math.atan2(b.y - point.y, b.x - point.x);
                        return angleA - angleB;
                    });

                    context.beginPath();
                    context.moveTo(closePoints[0].x, closePoints[0].y);
                    for (let i = 1; i < closePoints.length; i++) {
                        context.lineTo(closePoints[i].x, closePoints[i].y);
                    }
                    context.closePath();

                    const fillAlpha = closePoints.reduce((acc, p) =>
                        acc + Math.pow(1 - (Math.sqrt((point.x - p.x) ** 2 + (point.y - p.y) ** 2) / maxDistance), 3), 0
                    ) / closePoints.length;

                    context.fillStyle = `rgba(255, 255, 255, ${fillAlpha * 0.2})`;
                    context.fill();
                }
            });

            if (currentSpeed < targetSpeed) {
                currentSpeed += acceleration * deltaTime;
                if (currentSpeed > targetSpeed) currentSpeed = targetSpeed;
            }

            if (currentSpeed > baseSpeed) {
                currentSpeed -= deceleration * deltaTime;
                if (currentSpeed < baseSpeed) currentSpeed = baseSpeed;
            }

            requestAnimationFrame(animate);
        }

        let lastTimestamp = 0;
        function animate(timestamp) {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const deltaTime = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;

            draw(timestamp, deltaTime);
        }

        requestAnimationFrame(animate);

        let sparklesEnabled = false;
        const sparkles = [];
        const sparkleColors = ['#a29bfe', '#dfe6e9', '#a18ae5', '#ffffff', '#c9c9ff'];
        const sparkleCountPerMove = 3;
        const sparkleBaseGravity = 0.15;
        let lastTime = 0;

        function calculateGravity() {
            return sparkleBaseGravity * (window.innerHeight / 1080);
        }

        document.addEventListener('mousemove', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;

            if (sparklesEnabled) {
                for (let i = 0; i < sparkleCountPerMove; i++) {
                    sparkles.push({
                        x: mouseX,
                        y: mouseY,
                        vy: Math.random() * -0.5 - 0.25,
                        vx: (Math.random() - 0.5) * 0.25,
                        life: 120 + Math.random() * 40,
                        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)]
                    });
                }
            }
        });

        document.addEventListener('mouseleave', () => {
            mouseX = -100;
            mouseY = -100;
        });

        function drawSparkles(timestamp) {
            const deltaTime = (timestamp - lastTime) / 1000;
            lastTime = timestamp;

            sparkleCtx.clearRect(0, 0, sparkleCanvas.width, sparkleCanvas.height);

            if (sparklesEnabled && sparkles.length > 0) {
                const dynamicGravity = calculateGravity();
                for (let i = sparkles.length - 1; i >= 0; i--) {
                    const sp = sparkles[i];
                    sp.vy += dynamicGravity * deltaTime * 60;
                    sp.x += sp.vx * deltaTime * 60;
                    sp.y += sp.vy * deltaTime * 60;
                    sp.life -= deltaTime * 150;

                    sparkleCtx.fillStyle = sp.color;
                    sparkleCtx.beginPath();
                    sparkleCtx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
                    sparkleCtx.fill();

                    if (sp.life <= 0 || sp.y > sparkleCanvas.height) {
                        sparkles.splice(i, 1);
                    }
                }
            }

            requestAnimationFrame(drawSparkles);
        }

        requestAnimationFrame(drawSparkles);

        const container = document.querySelector('.container');
        if (container) {
            container.addEventListener('mouseenter', () => {
                insideContainer = true;
            });

            container.addEventListener('mouseleave', () => {
                insideContainer = false;
                container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
            });

            document.addEventListener('mousemove', (e) => {
                if (!insideContainer) return;
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                const rotateX = -(y / rect.height) * 10;
                const rotateY = (x / rect.width) * 10;

                container.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
        }

        function startTypingEffect(descriptionsList, index = 0) {
            if (index < descriptionsList.length) {
                const p = document.createElement('p');
                p.classList.add('typing');
                descriptionContainer.appendChild(p);
                typeEffect(p, descriptionsList[index], () => {
                    startTypingEffect(descriptionsList, index + 1);
                });
            }
        }

        function typeEffect(element, text, callback) {
            let i = 0;
            const interval = setInterval(() => {
                element.textContent += text.charAt(i);
                i++;
                if (i === text.length) {
                    clearInterval(interval);
                    element.classList.remove('typing');
                    if (callback) callback();
                }
            }, 50);
        }

        async function fetchSocialProfiles(data) {
            const socialMediaContainer = document.getElementById('social-media');
            socialMediaContainer.innerHTML = '';

            const urlPattern = new RegExp('^(https?:\\/\\/)?' +
                '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' +
                '((\\d{1,3}\\.){3}\\d{1,3}))' +
                '(\\:\\d+)?(\\/[-a-z\\d%_.~+@]*)*' +
                '(\\?[;&a-z\\d%_.~+=-]*)?' +
                '(\\#[-a-z\\d_]*)?$', 'i');

            const socialLinks = [];
            const defaultFavicon = assetsFolder + 'default-favicon.png';

            for (let i = 1; i <= 7; i++) {
                const key = `socialprofile${i === 1 ? '' : i}`;
                const imageKey = `socialprofile${i === 1 ? '' : i}image`;

                if (data[key] && data[key].trim() !== '' && urlPattern.test(data[key])) {
                    let url = data[key];
                    let faviconUrl;

                    if (data[imageKey] && data[imageKey].trim() !== '') {
                        faviconUrl = assetsFolder + data[imageKey];
                    } else {
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            url = 'http://' + url;
                        }
                        try {
                            faviconUrl = `https://api.faviconkit.com/${new URL(url).hostname}/64`;
                        } catch (e) {
                            faviconUrl = defaultFavicon;
                        }
                    }

                    try {
                        await loadImage(faviconUrl);
                        const a = document.createElement('a');
                        a.href = url;
                        a.target = "_blank";
                        a.style.backgroundImage = `url(${faviconUrl})`;
                        a.style.backgroundSize = 'cover';
                        a.style.backgroundPosition = 'center';
                        a.style.backgroundRepeat = 'no-repeat';
                        a.style.width = '40px';
                        a.style.height = '40px';
                        a.style.display = 'inline-block';
                        a.style.margin = '0 10px';
                        a.style.borderRadius = '50%';
                        a.style.border = '1px solid #5f5f5f';
                        socialMediaContainer.appendChild(a);
                        socialLinks.push(a);
                    } catch (error) {
                        const a = document.createElement('a');
                        a.href = url;
                        a.target = "_blank";
                        a.style.backgroundImage = `url(${defaultFavicon})`;
                        a.style.backgroundSize = 'cover';
                        a.style.backgroundPosition = 'center';
                        a.style.backgroundRepeat = 'no-repeat';
                        a.style.width = '40px';
                        a.style.height = '40px';
                        a.style.display = 'inline-block';
                        a.style.margin = '0 10px';
                        a.style.borderRadius = '50%';
                        a.style.border = '1px solid #5f5f5f';
                        socialMediaContainer.appendChild(a);
                        socialLinks.push(a);
                    }
                }
            }
            return socialLinks;
        }

        function loadImage(url) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = reject;
                img.src = url;
            });
        }

        async function loadContent() {
            try {
                if (config.title && config.title.trim() !== '') {
                    document.title = config.title;
                }

                if (config.cursor && config.cursor.trim() !== '' && config.cursor.toLowerCase().endsWith('.cur')) {
                    const cursorURL = assetsFolder + config.cursor;
                    const style = document.createElement('style');
                    style.type = 'text/css';
                    style.appendChild(document.createTextNode(`
                        * {
                            cursor: url("${cursorURL}"), default !important;
                        }
                    `));
                    document.head.appendChild(style);
                }

                sparklesEnabled = !!config.sparkles;

                const songFolder = assetsFolder;

                const songs = [];
                for (let i = 1; i <= 6; i++) {
                    const songKey = `song${i}`;
                    if (config[songKey] && config[songKey].trim() !== '') {
                        songs.push({
                            path: songFolder + config[songKey],
                            name: config[`song${i}name`] || null,
                            author: config[`song${i}author`] || null,
                            audio: null
                        });
                    }
                }

                await Promise.all(songs.map(song => loadPreloadedSong(song)));
                window.preloadedSongs = songs;

                const bannerImage = document.getElementById('bannerImage');
                const bannerLoaded = new Promise((resolve, reject) => {
                    bannerImage.onload = resolve;
                    bannerImage.onerror = () => reject(new Error('Failed to load banner image'));
                    bannerImage.src = assetsFolder + config.banner;
                });

                const avatarImage = document.getElementById('avatarImage');
                const avatarLoaded = new Promise((resolve, reject) => {
                    avatarImage.onload = resolve;
                    avatarImage.onerror = () => reject(new Error('Failed to load avatar image'));
                    avatarImage.src = assetsFolder + config.avatar;
                });

                const name = document.getElementById('name');
                name.setAttribute('data-name', config.name);

                descriptions = [];
                descriptionContainer.innerHTML = '';

                for (let i = 1; i <= 5; i++) {
                    const key = `description${i === 1 ? '' : i}`;
                    if (config[key] && config[key].trim() !== '') {
                        descriptions.push(config[key]);
                    }
                }

                await fetchSocialProfiles(config);
                adjustForMobile();

                const style = document.createElement('style');
                style.type = 'text/css';
                const fontFace = `
                    @font-face {
                        font-family: 'CustomFont';
                        src: url('${assetsFolder + config.font}') format('opentype');
                        font-weight: normal;
                        font-style: normal;
                    }
                    body {
                        font-family: 'CustomFont', sans-serif;
                    }
                    #name::before {
                        font-family: 'CustomFont', sans-serif;
                    }
                `;
                style.appendChild(document.createTextNode(fontFace));
                document.head.appendChild(style);

                loadingText.textContent = config.blurText || "Lade Inhalte...";

                const websiteIcon = document.getElementById('websiteIcon');
                websiteIcon.href = assetsFolder + config.icon;

                await Promise.all([bannerLoaded, avatarLoaded]);

                loadingOverlay.style.cursor = 'pointer';
                const hideLoadingOverlayOnce = () => {
                    hideLoadingOverlay();
                    loadingOverlay.removeEventListener('click', hideLoadingOverlayOnce);
                };
                loadingOverlay.addEventListener('click', hideLoadingOverlayOnce);

            } catch (error) {
                loadingText.textContent = "Fehler beim Laden der Inhalte.";
                console.error(error);
            }
        }

        async function loadPreloadedSong(song) {
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                audio.src = song.path;
                audio.preload = 'auto';
                audio.addEventListener('canplaythrough', () => {
                    song.audio = audio;
                    resolve();
                }, { once: true });
                audio.addEventListener('error', () => {
                    console.warn(`Failed to load song: ${song.path}`);
                    resolve();
                }, { once: true });
                audio.load();
            });
        }

        function adjustForMobile() {
            if (/Mobi|Android/i.test(navigator.userAgent)) {
                const boxes = document.querySelectorAll('.box');
                boxes.forEach(box => {
                    box.style.width = 'calc(100% - 100px)';
                    box.style.marginLeft = '50px';
                });

                const socialMediaContainer = document.getElementById('social-media');
                if (socialMediaContainer) {
                    const currentMarginTop = parseFloat(window.getComputedStyle(socialMediaContainer).marginTop);
                    socialMediaContainer.style.marginTop = (currentMarginTop * 1.15) + 'px';
                    socialMediaContainer.style.gap = '15px';
                    const socialLinks = socialMediaContainer.querySelectorAll('a');
                    if (socialLinks.length > 0) {
                        socialLinks.forEach(social => {
                            const currentWidth = parseFloat(window.getComputedStyle(social).width);
                            const currentHeight = parseFloat(window.getComputedStyle(social).height);
                            if (!isNaN(currentWidth) && !isNaN(currentHeight)) {
                                social.style.width = (currentWidth * 1.5) + 'px';
                                social.style.height = (currentHeight * 1.5) + 'px';
                            }
                        });
                    }
                }

                if (descriptionContainer) {
                    const currentFontSize = parseFloat(window.getComputedStyle(descriptionContainer).fontSize);
                    if (!isNaN(currentFontSize)) {
                        descriptionContainer.style.fontSize = (currentFontSize * 1.4) + 'px';
                    }
                }

                const name = document.getElementById('name');
                if (name) {
                    const currentPaddingTop = parseFloat(window.getComputedStyle(name).paddingTop);
                    const currentPaddingBottom = parseFloat(window.getComputedStyle(name).paddingBottom);
                    name.style.paddingTop = (currentPaddingTop + 10) + 'px';
                    name.style.paddingBottom = (currentPaddingBottom + 10) + 'px';

                    const nameBeforeStyle = window.getComputedStyle(name, '::before');
                    const currentTop = parseFloat(nameBeforeStyle.getPropertyValue('top'));
                    if (!isNaN(currentTop)) {
                        name.style.setProperty('--name-top', (currentTop * 0.95) + 'px');
                    }
                }
            }
        }

        function hideLoadingOverlay() {
            loadingOverlay.style.opacity = '0';
            loadingText.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                startTypingEffect(descriptions);
                setupMusicPlayer();
                playFirstSong();
            }, 500);
        }

        async function setupMusicPlayer() {
            const playPauseBtn = document.getElementById('play-pause-btn');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            const progressBar = document.getElementById('progress-bar');
            const currentTimeEl = document.getElementById('current-time');
            const totalDurationEl = document.getElementById('total-duration');
            const titleEl = document.getElementById('current-song-title');
            const authorEl = document.getElementById('current-song-author');
        
            let songs = window.preloadedSongs || [];
            if (songs.length === 0) {
                const musicPlayerBox = document.getElementById('music-player');
                if (musicPlayerBox) {
                    musicPlayerBox.style.display = 'none';
                }
                return;
            }
        
            const volume = Math.min(Math.max(config.volume || 50, 1), 100) / 100;
        
            let currentIndex = 0;
            let audio = songs[currentIndex].audio;
            let isPlaying = false;
            let isSeeking = false;
        
            if (!audio) {
                return;
            }
        
            audio.volume = volume;
        
            progressBar.min = 0;
            progressBar.max = 100;
            progressBar.step = 0.01;
        
            let animationFrameId;
        
            function updateUI() {
                if (songs[currentIndex].name) {
                    titleEl.textContent = songs[currentIndex].name;
                } else {
                    titleEl.textContent = `Song ${currentIndex + 1}`;
                }
        
                if (songs[currentIndex].author) {
                    authorEl.textContent = songs[currentIndex].author;
                } else {
                    authorEl.textContent = 'Unbekannter Künstler';
                }
            }
        
            function switchSong(index) {
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                    removeAudioEventListeners(audio);
                }
                currentIndex = index;
                audio = songs[currentIndex].audio;
                audio.volume = volume;
                updateUI();
                addAudioEventListeners(audio);
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        
                audio.play().then(() => {
                    isPlaying = true;
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    animateProgress();
                }).catch((error) => {
                    console.error(`Error playing song: ${songs[currentIndex].path}`, error);
                });
            }
        
            function addAudioEventListeners(audioObj) {
                if (!audioObj) return;
                audioObj.addEventListener('ended', onSongEnded);
                audioObj.addEventListener('play', onPlay);
                audioObj.addEventListener('pause', onPause);
            }
        
            function removeAudioEventListeners(audioObj) {
                if (!audioObj) return;
                audioObj.removeEventListener('ended', onSongEnded);
                audioObj.removeEventListener('play', onPlay);
                audioObj.removeEventListener('pause', onPause);
            }
        
            function animateProgress() {
                if (isPlaying && audio.duration) {
                    const progress = (audio.currentTime / audio.duration) * 100;
                    progressBar.value = progress;
                    currentTimeEl.textContent = formatTime(audio.currentTime);
                    totalDurationEl.textContent = formatTime(audio.duration);
        
                    progressBar.style.background = `linear-gradient(to right, #a29bfe ${progress}%, #dfe6e9 ${progress}%)`;
        
                    animationFrameId = requestAnimationFrame(animateProgress);
                }
            }
        
            function onSongEnded() {
                const nextIndex = (currentIndex + 1) % songs.length;
                switchSong(nextIndex);
            }
        
            function onPlay() {
                isPlaying = true;
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                animateProgress();
            }
        
            function onPause() {
                isPlaying = false;
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                cancelAnimationFrame(animationFrameId);
            }
        
            playPauseBtn.addEventListener('click', () => {
                if (!audio) return;
                if (isPlaying) {
                    audio.pause();
                } else {
                    audio.play().catch((error) => {
                        console.error(`Error playing song: ${songs[currentIndex].path}`, error);
                    });
                }
            });
        
            prevBtn.addEventListener('click', () => {
                if (songs.length === 0) return;
        
                if (audio.currentTime > 3) {
                    audio.currentTime = 0;
                } else {
                    const newIndex = (currentIndex - 1 + songs.length) % songs.length;
                    switchSong(newIndex);
                }
            });
        
            nextBtn.addEventListener('click', () => {
                if (songs.length === 0) return;
                const newIndex = (currentIndex + 1) % songs.length;
                switchSong(newIndex);
            });
        
            progressBar.addEventListener('mousedown', () => {
                isSeeking = true;
            });
            progressBar.addEventListener('touchstart', () => {
                isSeeking = true;
            });
        
            progressBar.addEventListener('mouseup', () => {
                isSeeking = false;
            });
            progressBar.addEventListener('touchend', () => {
                isSeeking = false;
            });
        
            progressBar.addEventListener('input', () => {
                if (audio.duration) {
                    const seekTime = (progressBar.value / 100) * audio.duration;
                    audio.currentTime = seekTime;
                    currentTimeEl.textContent = formatTime(audio.currentTime);
                }
            });
        
            window.addEventListener('keydown', (event) => {
                if (event.target.tagName.toLowerCase() === 'input') return;
        
                switch (event.code) {
                    case 'Space':
                    case 'MediaPlayPause':
                        event.preventDefault();
                        playPauseBtn.click();
                        break;
                    case 'ArrowLeft':
                    case 'MediaPreviousTrack':
                        prevBtn.click();
                        break;
                    case 'ArrowRight':
                    case 'MediaNextTrack':
                        nextBtn.click();
                        break;
                    default:
                        break;
                }
            });
        
            function formatTime(seconds) {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }
        
            updateUI();
            addAudioEventListeners(audio);
        }

        function playFirstSong() {
            const songs = window.preloadedSongs || [];
            if (songs.length === 0) return;
            const firstSong = songs[0];
            if (firstSong.audio) {
                firstSong.audio.play().then(() => {
                    const playPauseBtn = document.getElementById('play-pause-btn');
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                }).catch((error) => {
                    console.error(`Error playing first song: ${firstSong.path}`, error);
                });
            }
        }

        loadContent();
    } catch (error) {
        loadingText.textContent = "Fehler beim Laden der Inhalte.";
        console.error(error);
    }
});
