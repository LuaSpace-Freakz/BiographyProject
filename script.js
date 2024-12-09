document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const canvas = document.getElementById('background');
    const context = canvas.getContext('2d');

    const pointCount = 100;
    const maxDistance = 175;
    const repulsionDistance = 110;
    const maxSpeed = 2;
    const speed = 1.5;

    let mouseX = -100;
    let mouseY = -100;

    let descriptions = [];
    const descriptionContainer = document.getElementById('description');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = -100;
        mouseY = -100;
    });

    const points = [];

    for (let i = 0; i < pointCount; i++) {
        points.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed,
            connections: []
        });
    }

    function draw() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.beginPath();
        context.stroke();

        points.forEach((point, index) => {
            const dx = point.x - mouseX;
            const dy = point.y - mouseY;
            const distanceToMouse = Math.sqrt(dx * dx + dy * dy);

            if (distanceToMouse < repulsionDistance) {
                const angle = Math.atan2(dy, dx);
                const force = (repulsionDistance - distanceToMouse) / repulsionDistance;
                point.vx += Math.cos(angle) * force * 0.5;
                point.vy += Math.sin(angle) * force * 0.5;

                const currentSpeed = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
                if (currentSpeed > maxSpeed) {
                    point.vx *= maxSpeed / currentSpeed;
                    point.vy *= maxSpeed / currentSpeed;
                }
            } else {
                point.vx = point.vx + (Math.random() - 0.5) * speed * 0.1;
                point.vy = point.vy + (Math.random() - 0.5) * speed * 0.1;

                const currentSpeed = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
                if (currentSpeed > speed) {
                    point.vx *= speed / currentSpeed;
                    point.vy *= speed / currentSpeed;
                }
            }

            point.x += point.vx;
            point.y += point.vy;

            if (point.x < 0 || point.x > canvas.width) point.vx = -point.vx;
            if (point.y < 0 || point.y > canvas.height) point.vy = -point.vy;

            context.fillStyle = 'white';
            context.beginPath();
            context.arc(point.x, point.y, 2, 0, Math.PI * 2);
            context.fill();

            let closePoints = [];

            for (let i = index + 1; i < points.length; i++) {
                const other = points[i];
                const distance = Math.sqrt(
                    (point.x - other.x) ** 2 + (point.y - other.y) ** 2
                );

                if (distance < maxDistance) {
                    closePoints.push(other);
                    const alpha = Math.pow(1 - (distance / maxDistance), 3);
                    point.connections.push({
                        other,
                        alpha
                    });
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

                const fillAlpha = closePoints.reduce((acc, p) => acc + Math.pow(1 - (Math.sqrt((point.x - p.x) ** 2 + (point.y - p.y) ** 2) / maxDistance), 3), 0) / closePoints.length;
                context.fillStyle = `rgba(255, 255, 255, ${fillAlpha * 0.2})`;
                context.fill();
            }

            point.connections.forEach(conn => {
                context.strokeStyle = `rgba(255, 255, 255, ${conn.alpha * 0.5})`;
                context.beginPath();
                context.moveTo(point.x, point.y);
                context.lineTo(conn.other.x, conn.other.y);
                context.stroke();
            });

            point.connections = [];
        });

        requestAnimationFrame(draw);
    }

    draw();

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
        }, 100);
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
        const defaultFavicon = 'assets/default-favicon.png';

        for (let i = 1; i <= 7; i++) {
            const key = `socialprofile${i === 1 ? '' : i}`;
            const imageKey = `socialprofile${i === 1 ? '' : i}image`;

            if (data[key] && data[key].trim() !== '' && urlPattern.test(data[key])) {
                let url = data[key];
                let faviconUrl;

                if (data[imageKey] && data[imageKey].trim() !== '') {
                    faviconUrl = data[imageKey];
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
            const res = await fetch("./config.json");
            const data = await res.json();

            const songs = [];
            for (let i = 1; i <= 6; i++) {
                const songKey = `song${i}`;
                if (data[songKey] && data[songKey].trim() !== '') {
                    songs.push({
                        path: `assets/${data[songKey]}`,
                        name: data[`song${i}name`] || null,
                        author: data[`song${i}author`] || null,
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
                bannerImage.src = data.banner;
            });

            const avatarImage = document.getElementById('avatarImage');
            const avatarLoaded = new Promise((resolve, reject) => {
                avatarImage.onload = resolve;
                avatarImage.onerror = () => reject(new Error('Failed to load avatar image'));
                avatarImage.src = data.avatar;
            });

            const name = document.getElementById('name');
            name.setAttribute('data-name', data.name);

            descriptions = [];
            descriptionContainer.innerHTML = '';

            for (let i = 1; i <= 5; i++) {
                const key = `description${i === 1 ? '' : i}`;
                if (data[key] && data[key].trim() !== '') {
                    descriptions.push(data[key]);
                }
            }

            await fetchSocialProfiles(data);
            adjustForMobile();

            const style = document.createElement('style');
            style.type = 'text/css';
            const fontFace = `
                @font-face {
                    font-family: 'CustomFont';
                    src: url('${data.font}') format('opentype');
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

            loadingText.textContent = data.blurText || "Lade Inhalte...";

            const websiteIcon = document.getElementById('websiteIcon');
            websiteIcon.href = data.icon;

            await Promise.all([bannerLoaded, avatarLoaded]);

            loadingOverlay.style.cursor = 'pointer';
            loadingOverlay.addEventListener('click', hideLoadingOverlay);

        } catch (error) {
            loadingText.textContent = "Fehler beim Laden der Inhalte.";
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
            return;
        }

        let currentIndex = 0;
        let audio = songs[currentIndex].audio;
        let isPlaying = false;
        let isSeeking = false;

        if (!audio) {
            return;
        }

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
            updateUI();
            addAudioEventListeners(audio);
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';

            audio.play().then(() => {
                isPlaying = true;
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                animateProgress();
            }).catch(() => {});
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
                audio.play().catch(() => {});
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
            }).catch(() => {});
        }
    }

    loadContent();
});
