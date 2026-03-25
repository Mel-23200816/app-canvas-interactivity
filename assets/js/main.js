(function() {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    
    // Elementos del DOM para la UI
    const levelSlider = document.getElementById("level-slider");
    const levelDisplay = document.getElementById("level-display");
    const circleCountDisplay = document.getElementById("circle-count");
    const progressText = document.getElementById("progress-text");
    const progressBar = document.getElementById("progress-bar");

    // Variables de estado del juego
    let maxLevels = 1;      // Nivel máximo elegido en el slider
    let currentLevel = 1;   // Nivel que se está jugando actualmente
    let totalCircles = 10;
    let eliminatedCount = 0;
    
    let activeBubbles = [];     // Burbujas que están subiendo
    let explodingBubbles = [];  // Burbujas en animación de explosión
    let animationId;
    
    // Posición del mouse
    let mouseX = -100;
    let mouseY = -100;

    // Utilidad: Color aleatorio
    function getRandomRGB() {
        return `rgb(${Math.floor(Math.random()*200 + 55)}, ${Math.floor(Math.random()*200 + 55)}, ${Math.floor(Math.random()*200 + 55)})`;
    }

    // Clase para las burbujas vivas
    class Bubble {
        constructor(level) {
            this.radius = Math.random() * 15 + 15; // Radio entre 15 y 30
            this.posX = Math.random() * (canvas.width - this.radius * 2) + this.radius;
            
            // Inician debajo del canvas, esparcidas para que no salgan todas pegadas
            this.posY = canvas.height + this.radius + (Math.random() * 400); 
            this.color = getRandomRGB();
            
            // LA VELOCIDAD INCREMENTA POR NIVEL: Nivel 1 es lento, Nivel 10 es muy rápido
            this.speedY = (1 + (level * 0.6)) + (Math.random() * 0.5); 
            
            // Parámetros para el viaje aleatorio (deriva en el eje X)
            this.angle = Math.random() * Math.PI * 2;
            this.hasHoverChangedColor = false;
        }

        draw(context) {
            context.beginPath();
            context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false);
            context.fillStyle = this.color;
            context.fill();
            
            // Brillo blanco sutil en el borde
            context.lineWidth = 2;
            context.strokeStyle = "rgba(255,255,255,0.6)";
            context.stroke();
            context.closePath();
        }

        update(context) {
            // Movimiento hacia arriba
            this.posY -= this.speedY;
            
            // Viaje aleatorio tipo zigzag suave
            this.posX += Math.sin(this.angle) * 1.5;
            this.angle += 0.04;

            this.draw(context);
        }

        // Verifica si el mouse está encima
        checkHover(mx, my) {
            let dx = mx - this.posX;
            let dy = my - this.posY;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.radius) {
                if (!this.hasHoverChangedColor) {
                    this.color = getRandomRGB(); // Cambia de color
                    this.hasHoverChangedColor = true;
                }
            } else {
                this.hasHoverChangedColor = false;
            }
        }

        // Verifica si se hizo clic en ella
        checkClick(mx, my) {
            let dx = mx - this.posX;
            let dy = my - this.posY;
            return Math.sqrt(dx * dx + dy * dy) < this.radius;
        }
    }

    // Clase separada para manejar solo la animación visual de la explosión
    // Esto permite que el clic sea inmediato y no estorbe
    class Explosion {
        constructor(x, y, radius, color) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.color = color;
            this.opacity = 1;
        }
        
        draw(context) {
            context.save();
            context.globalAlpha = this.opacity;
            context.beginPath();
            context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            context.lineWidth = 3;
            context.strokeStyle = this.color;
            context.stroke();
            context.closePath();
            context.restore();
        }
        
        update(context) {
            this.radius += 3;       // Se expande de adentro hacia afuera
            this.opacity -= 0.05;   // Desaparece lentamente
            if (this.opacity < 0) this.opacity = 0;
            this.draw(context);
        }
    }

    // Actualiza los textos y la barra de progreso
    function updateUI() {
        levelDisplay.textContent = `${currentLevel} / ${maxLevels}`;
        circleCountDisplay.textContent = totalCircles;
        
        let percentage = totalCircles === 0 ? 0 : (eliminatedCount / totalCircles) * 100;
        let pctFormatted = Math.round(percentage);
        
        progressText.textContent = `${eliminatedCount} / ${totalCircles} (${pctFormatted}%)`;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${pctFormatted}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }

    // Genera una nueva oleada de 10 círculos para el nivel actual
    function spawnWave() {
        activeBubbles = [];
        for (let i = 0; i < 10; i++) {
            activeBubbles.push(new Bubble(currentLevel));
        }
        updateUI();
    }

    // Reinicia el juego completo al mover el slider
    function initGame() {
        maxLevels = parseInt(levelSlider.value);
        totalCircles = maxLevels * 10; // Total de círculos posibles en todo el juego
        currentLevel = 1;
        eliminatedCount = 0;
        explodingBubbles = [];
        
        spawnWave();
        
        if (animationId) cancelAnimationFrame(animationId);
        animate();
    }

    // Bucle de animación principal
    function animate() {
        animationId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Actualizar y dibujar burbujas activas
        for (let i = activeBubbles.length - 1; i >= 0; i--) {
            let b = activeBubbles[i];
            
            b.checkHover(mouseX, mouseY);
            b.update(ctx);
            
            // Si la burbuja se sale de la pantalla por arriba, se elimina (se escapó)
            if (b.posY + b.radius < 0) {
                activeBubbles.splice(i, 1);
            }
        }

        // 2. Actualizar y dibujar explosiones
        for (let i = explodingBubbles.length - 1; i >= 0; i--) {
            let ex = explodingBubbles[i];
            ex.update(ctx);
            // Limpiar cuando la animación termina
            if (ex.opacity <= 0) {
                explodingBubbles.splice(i, 1);
            }
        }

        // 3. Lógica de niveles: Si ya no hay burbujas activas en pantalla
        if (activeBubbles.length === 0) {
            if (currentLevel < maxLevels) {
                currentLevel++; // Pasamos al siguiente nivel
                spawnWave();    // Salen los siguientes 10
            } else {
                // El juego terminó para los niveles seleccionados
                // Mantiene el canvas vacío mostrando las explosiones finales
            }
        }
    }

    // Listeners del mouse para el Canvas
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        mouseX = (e.clientX - rect.left) * scaleX;
        mouseY = (e.clientY - rect.top) * scaleY;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = -100;
        mouseY = -100;
    });

    // Cambiado a "mousedown" para que reaccione instantáneamente al pulsar el botón
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        for (let i = activeBubbles.length - 1; i >= 0; i--) {
            if (activeBubbles[i].checkClick(clickX, clickY)) {
                let b = activeBubbles[i];
                
                // 1. Crear la animación de explosión en esa posición
                explodingBubbles.push(new Explosion(b.posX, b.posY, b.radius, b.color));
                
                // 2. Eliminarla inmediatamente del array de activas
                activeBubbles.splice(i, 1);
                
                // 3. Actualizar puntuación
                eliminatedCount++;
                updateUI();
                break; // Solo elimina una por clic
            }
        }
    });

    // Listener para el selector de niveles (reinicia el juego)
    levelSlider.addEventListener('input', initGame);

    // Iniciar todo
    initGame();
})();