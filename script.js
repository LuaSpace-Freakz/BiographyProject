document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const canvas = document.getElementById('background');
    const context = canvas.getContext('2d');

    const pointCount = 100;
    const maxDistance = 175;
    const repulsionDistance = 110;
    const maxSpeed = 2;
    const speed = 1;

    let mouseX = -100; 
    let mouseY = -100;

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
            connections: [],
            originalSpeed: { vx: 1, vy: 1 }
        });
    }

    function draw() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        context.beginPath();
        context.arc(mouseX, mouseY, repulsionDistance, 0, Math.PI * 2);
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
                const speedMultiplier = 1;
                point.vx = point.vx * speedMultiplier + (Math.random() - 0.5) * speed * (1 - speedMultiplier);
                point.vy = point.vy * speedMultiplier + (Math.random() - 0.5) * speed * (1 - speedMultiplier);

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
                    point.connections.push({ other, alpha });
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

    function startTypingEffect(descriptions, index = 0) {
        if (index < descriptions.length) {
            const p = document.createElement('p');
            p.classList.add('typing');
            description.appendChild(p);
            typeEffect(p, descriptions[index], () => {
                startTypingEffect(descriptions, index + 1);
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
    
        const urlPattern = new RegExp('^(https?:\\/\\/)?'+ 
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ 
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+@]*)*'+
            '(\\?[;&a-z\\d%_.~+=-]*)?'+
            '(\\#[-a-z\\d_]*)?$','i'); 
    
        const socialLinks = [];
    
        for (let i = 1; i <= 7; i++) {
            const key = `socialprofile${i === 1 ? '' : i}`;
            if (data[key] && data[key].trim() !== '' && urlPattern.test(data[key])) {
                let url = data[key];
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'http://' + url;
                }
    
                const faviconUrl = `https://api.faviconkit.com/${new URL(url).hostname}/64`;
    
                try {
                    await loadImage(faviconUrl);
                    const a = document.createElement('a');
                    a.href = data[key];
                    a.target = "_blank"; 
                    a.style.backgroundImage = `url(${faviconUrl})`;
                    a.style.backgroundSize = 'cover';
                    socialMediaContainer.appendChild(a);
                    socialLinks.push(a); 
                } catch (error) {
                    console.error('Favicon not found for:', url);
                }
            } else {
                console.error('Invalid URL:', data[key]);
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

    function loadContent() {
        fetch("./config.json")
            .then(function (res) {
                return res.json();
            })
            .then(function (data) {
                const bannerImage = document.getElementById('bannerImage');
                bannerImage.src = data.banner;
    
                const avatarImage = document.getElementById('avatarImage');
                avatarImage.src = data.avatar;
    
                const name = document.getElementById('name');
                name.setAttribute('data-name', data.name);
    
                const description = document.getElementById('description');
                description.innerHTML = ''; 
    
                const descriptions = [];
                for (let i = 1; i <= 5; i++) {
                    const key = `description${i === 1 ? '' : i}`;
                    if (data[key] && data[key].trim() !== '') {
                        descriptions.push(data[key]);
                    }
                }
    
                fetchSocialProfiles(data).then(() => {
                    adjustForMobile();
                });    
    
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
    
                if (data.blurText) {
                    loadingText.textContent = data.blurText;
                }
    
                const websiteIcon = document.getElementById('websiteIcon');
                websiteIcon.href = data.icon;
    
                startTypingEffect(descriptions);
    
                loadingOverlay.addEventListener('click', () => {
                    loadingOverlay.style.opacity = '0';
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                    }, 500);
                });
            })
            .catch(function (error) {
                console.error('Error loading config:', error);
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
                        } else {
                            console.error(`Invalid dimensions for ${social}`); 
                        }
                    });
                } else {
                    console.log("No social links found");
                }
            }

            const description = document.getElementById('description');
            if (description) {
                const currentFontSize = parseFloat(window.getComputedStyle(description).fontSize);
                if (!isNaN(currentFontSize)) {
                    description.style.fontSize = (currentFontSize * 1.4) + 'px';
                } else {
                    console.error(`Invalid font size for #description`);
                }
            }

            const name = document.getElementById('name');
            if (name) {
                const currentPaddingTop = parseFloat(window.getComputedStyle(name).paddingTop);
                const currentPaddingBottom = parseFloat(window.getComputedStyle(name).paddingBottom);
                name.style.paddingTop = (currentPaddingTop + 10) + 'px';
                name.style.paddingBottom = (currentPaddingBottom + 10) + 'px';
    
                const currentTop = parseFloat(window.getComputedStyle(name, '::before').top);
                if (!isNaN(currentTop)) {
                    name.style.setProperty('--name-top', (currentTop * 0.95) + 'px');
                } else {
                    console.error(`Invalid top value for #name::before`);
                }
            }    
        }
    }
    
    
    window.addEventListener('load', () => {
        loadContent();
        adjustForMobile();
        loadingOverlay.style.opacity = '1';
        loadingText.style.opacity = '1';
    });    
});
