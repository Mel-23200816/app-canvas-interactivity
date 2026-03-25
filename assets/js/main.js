(function() {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    
    // Elementos del DOM
    const levelSlider = document.getElementById("level-slider");
    const levelDisplay = document.getElementById("level-display");
    const circleCountDisplay = document.getElementById("circle-count");
    const progressText = document.getElementById("progress-text");
    const progressBar = document.getElementById("progress-bar");
    const statsList = document.getElementById("level-stats-list");

    // Variables de estado del juego
    let maxLevels = parseInt(levelSlider.value);      
    let currentLevel = 1;   
    let totalCircles = maxLevels * 10;
    let eliminatedCount = 0;
    let statsPerLevel = {}; 
    
    let activeBubbles = [];     
    let explodingBubbles = [];  
    let animationId;
    
    let mouseX = -100;
    let mouseY = -100;

    function getRandomRGB() {
        return `rgb(${Math.floor(Math.random()*200 + 55)}, ${Math.floor(Math.random()*200 + 55)}, ${Math.floor(Math.random()*200 + 55)})`;
    }

    class Bubble {
        constructor(level) {
            this.radius = Math.random() * 15 + 15;
            this.posX = Math.random() * (canvas.width - this.radius * 2) + this.radius;
            this.posY = canvas.height + this.radius + (Math.random() * 400); 
            this.color = getRandomRGB();
            this.speedY = (1 + (level * 0.6)) + (Math.random() * 0.5); 
            this.angle = Math.random() * Math.PI * 2;
            this.hasHoverChangedColor = false;
        }

        draw(context) {
            context.beginPath();
            context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false);
            context.fillStyle = this.color;
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "rgba(255,255,255,0.6)";
            context.stroke();
            context.closePath();
        }

        update(context) {
            this.posY -= this.speedY;
            this.posX += Math.sin(this.angle) * 1.5;
            this.angle += 0.04;
            this.draw(context);
        }

        checkHover(mx, my) {
            let dx = mx - this.posX;
            let dy = my - this.posY;
            if (Math.sqrt(dx * dx + dy * dy) < this.radius) {
                if (!this.hasHoverChangedColor) {
                    this.color = getRandomRGB(); 
                    this.hasHoverChangedColor = true;
                }
            } else {
                this.hasHoverChangedColor = false;
            }
        }

        checkClick(mx, my) {
            let dx = mx - this.posX;
            let dy = my - this.posY;
            // Damos 8 píxeles extra de "hitbox" para que el clic se sienta más permisivo e inmediato
            return Math.sqrt(dx * dx + dy * dy) < (this.radius + 8); 
        }
    }

    class Explosion {
        constructor(x, y, radius, color) {
            this.x = x; this.y = y; this.radius = radius; this.color = color; this.opacity = 1;
        }
        draw(context) {
            context.save();
            context.globalAlpha = this.opacity;
            context.beginPath();
            context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            context.lineWidth = 3; context.strokeStyle = this.color; context.stroke();
            context.closePath(); context.restore();
        }
        update(context) {
            this.radius += 3; this.opacity -= 0.05;
            if (this.opacity < 0) this.opacity = 0;
            this.draw(context);
        }
    }

    function updateUI() {
        levelDisplay.textContent = `${currentLevel} / ${maxLevels}`;
        circleCountDisplay.textContent = totalCircles;
        
        let percentage = totalCircles === 0 ? 0 : (eliminatedCount / totalCircles) * 100;
        let pctFormatted = Math.round(percentage);
        
        progressText.textContent = `${eliminatedCount} / ${totalCircles} (${pctFormatted}%)`;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${pctFormatted}%`;
        progressBar.setAttribute('aria-valuenow', percentage);

        statsList.innerHTML = ''; 
        for (let i = 1; i <= maxLevels; i++) {
            let count = statsPerLevel[i] || 0; 
            let lvlPercentage = (count / 10) * 100; 
            let isCurrent = (i === currentLevel) ? 'fw-bold text-info' : 'text-white opacity-75';
            
            let li = document.createElement('li');
            li.className = `list-group-item bg-transparent border-0 px-0 py-1 ${isCurrent}`;
            li.innerHTML = `
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.85rem;">
                    <span>Nivel ${i}</span>
                    <span>${count}/10 (${Math.round(lvlPercentage)}%)</span>
                </div>
                <div class="progress" style="height: 4px; background-color: rgba(255,255,255,0.1);">
                    <div class="progress-bar bg-${i === currentLevel ? 'info' : 'light'}" role="progressbar" style="width: ${lvlPercentage}%"></div>
                </div>
            `;
            statsList.appendChild(li);
        }
    }

    function spawnWave() {
        activeBubbles = [];
        for (let i = 0; i < 10; i++) activeBubbles.push(new Bubble(currentLevel));
        updateUI();
    }

    function initGame() {
        maxLevels = parseInt(levelSlider.value);
        totalCircles = maxLevels * 10; 
        currentLevel = 1;
        eliminatedCount = 0;
        explodingBubbles = [];
        
        statsPerLevel = {};
        for(let i = 1; i <= maxLevels; i++) statsPerLevel[i] = 0;
        
        spawnWave();
        if (animationId) cancelAnimationFrame(animationId);
        animate();
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = activeBubbles.length - 1; i >= 0; i--) {
            let b = activeBubbles[i];
            b.checkHover(mouseX, mouseY);
            b.update(ctx);
            if (b.posY + b.radius < 0) activeBubbles.splice(i, 1);
        }

        for (let i = explodingBubbles.length - 1; i >= 0; i--) {
            let ex = explodingBubbles[i];
            ex.update(ctx);
            if (ex.opacity <= 0) explodingBubbles.splice(i, 1);
        }

        if (activeBubbles.length === 0) {
            if (currentLevel < maxLevels) {
                currentLevel++; 
                spawnWave();    
            }
        }
    }

    // Función unificada para obtener coordenadas exactas del puntero
    function getPointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    canvas.addEventListener('pointermove', (e) => {
        const pos = getPointerPos(e);
        mouseX = pos.x;
        mouseY = pos.y;
    });

    canvas.addEventListener('pointerleave', () => { mouseX = -100; mouseY = -100; });

    // Usamos pointerdown para que registre el clic/toque al instante exacto de presionar
    canvas.addEventListener('pointerdown', (e) => {
        const pos = getPointerPos(e);

        for (let i = activeBubbles.length - 1; i >= 0; i--) {
            if (activeBubbles[i].checkClick(pos.x, pos.y)) {
                let b = activeBubbles[i];
                explodingBubbles.push(new Explosion(b.posX, b.posY, b.radius, b.color));
                activeBubbles.splice(i, 1);
                
                eliminatedCount++;
                statsPerLevel[currentLevel]++; 
                updateUI();
                break; 
            }
        }
    });

    levelSlider.addEventListener('input', initGame);
    initGame();
})();