document.addEventListener('DOMContentLoaded', () => {
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
});

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
        description.textContent = data.description;
    })
    .catch(function (error) {
        console.error('Error loading config:', error);
});
