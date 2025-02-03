const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Particle class to represent each particle in the firework
class Particle {
    constructor(x, y, color, velocityX, velocityY, size, lifetime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.size = size;
        this.lifetime = lifetime;
    }

    // Update particle position and decrease lifetime
    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.lifetime--;
        this.velocityY += 0.05; // gravity effect
    }

    // Draw the particle
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// Firework class to create and manage fireworks
class Firework {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.exploded = false;
        this.particles = [];
        this.velocityY = -3; // Chậm hơn, tốc độ di chuyển của pháo hoa
        this.velocityX = 0;
        this.createParticles();
    }

    // Create particles for the firework explosion
    createParticles() {
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#FFFF33'];
        const particleCount = 50; // Giảm số lượng hạt pháo
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 5 + 2;
            const velocityX = Math.cos(angle) * velocity;
            const velocityY = Math.sin(angle) * velocity;
            const size = Math.random() * 3 + 1;
            const lifetime = Math.random() * 50 + 50;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(this.x, this.y, color, velocityX, velocityY, size, lifetime));
        }
    }

    // Update and draw all particles
    update() {
        if (this.y <= canvas.height / 3 && !this.exploded) { this.exploded = true; // Explode when the rocket reaches the peak this.createParticles(); } if (!this.exploded) { this.y += this.velocityY; // Rise upwards } // Update particles after explosion this.particles.forEach((particle, index) => {
            particle.update();
            particle.draw();
            if (particle.lifetime <= 0) { this.particles.splice(index, 1); } }); } // Draw the rocket if it hasn't exploded yet draw() { if (!this.exploded) { ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; // White color for the rocket ctx.fill(); } } } // Array to hold all fireworks const fireworks = []; // Create a new firework at random positions function createFirework() { const x = Math.random() * canvas.width; const y = canvas.height; fireworks.push(new Firework(x, y)); } // Animation loop function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); fireworks.forEach(firework => {
    firework.update();
    firework.draw();
});
requestAnimationFrame(animate);
}

// Create a firework every 1000ms (1s)
setInterval(createFirework, 1000);

// Start the animation
animate();