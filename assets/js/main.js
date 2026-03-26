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
    
    // Nuevos elementos para Game Over
    const gameOverScreen = document.getElementById("game-over-screen");
    const gameOverTitle = document.getElementById("game-over-title");
    const gameOverCount = document.getElementById("game-over-count");
    const gameOverPercentage = document.getElementById("game-over-percentage");
    const restartBtn = document.getElementById("restart-btn");

    // Variables de estado del juego
    let maxLevels = parseInt(levelSlider.value);      
    let currentLevel = 1;   
    let totalCircles = maxLevels * 10;
    let eliminatedCount = 0;
    let statsPerLevel = {}; 
    let isGameOver = false; // Variable de control
    
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
            let isCurrent = (i === currentLevel && !isGameOver) ? 'fw-bold text-info' : 'text-white opacity-75';
            
            let li = document.createElement('li');
            li.className = `list-group-item bg-transparent border-0 px-0 py-1 ${isCurrent}`;
            li.innerHTML = `
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.85rem;">
                    <span>Nivel ${i}</span>
                    <span>${count}/10 (${Math.round(lvlPercentage)}%)</span>
                </div>
                <div class="progress" style="height: 4px; background-color: rgba(255,255,255,0.1);">
                    <div class="progress-bar bg-${i === currentLevel && !isGameOver ? 'info' : 'light'}" role="progressbar" style="width: ${lvlPercentage}%"></div>
                </div>
            `;
            statsList.appendChild(li);
        }
    }

    // Muestra la ventana de resultados finales
    function showGameOver() {
        isGameOver = true;
        let percentage = totalCircles === 0 ? 0 : (eliminatedCount / totalCircles) * 100;
        let pctFormatted = Math.round(percentage);
        
        gameOverCount.textContent = `${eliminatedCount} / ${totalCircles}`;
        gameOverPercentage.textContent = `${pctFormatted}%`;
        
        // Reglas de victoria (>= 70%) o derrota (<= 69%)
        if (percentage >= 70) {
            gameOverTitle.textContent = "¡Ganaste!";
            gameOverTitle.className = "fw-bold mb-3 text-success";
        } else {
            gameOverTitle.textContent = "¡Perdiste!";
            gameOverTitle.className = "fw-bold mb-3 text-danger";
        }
        
        // Mostrar la ventana superpuesta
        gameOverScreen.classList.remove('d-none');
        updateUI(); // Para quitar el resaltado del nivel actual en el menú lateral
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
        isGameOver = false; // Resetear el estado
        
        explodingBubbles = [];
        gameOverScreen.classList.add('d-none'); // Ocultar la ventana de Game Over
        
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

        // Si ya no hay burbujas activas
        if (activeBubbles.length === 0) {
            if (currentLevel < maxLevels) {
                currentLevel++; 
                spawnWave();    
            } else if (!isGameOver && explodingBubbles.length === 0) {
                // Si llegamos al último nivel y terminaron las explosiones
                showGameOver();
            }
        }
    }

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
        if(isGameOver) return; // Desactivar hover si terminó
        const pos = getPointerPos(e);
        mouseX = pos.x;
        mouseY = pos.y;
    });

    canvas.addEventListener('pointerleave', () => { mouseX = -100; mouseY = -100; });

    canvas.addEventListener('pointerdown', (e) => {
        if(isGameOver) return; // Bloquear clics si el juego terminó
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

    // Listeners para iniciar/reiniciar
    levelSlider.addEventListener('input', initGame);
    restartBtn.addEventListener('click', initGame); // Botón "Volver A Iniciar"

    // Iniciar todo por primera vez
    initGame();
})();