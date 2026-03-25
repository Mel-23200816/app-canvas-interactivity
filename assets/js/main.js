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
    let circlesArray = [];
    let animationId;
    let level = 1;
    let totalCircles = 10;
    let eliminatedCount = 0;
    
    // Posición del mouse
    let mouseX = -100;
    let mouseY = -100;

    // Utilidad: Color aleatorio
    function getRandomRGB() {
        return `rgb(${Math.floor(Math.random()*200 + 55)}, ${Math.floor(Math.random()*200 + 55)}, ${Math.floor(Math.random()*200 + 55)})`;
    }

    class Bubble {
        constructor(currentLevel) {
            this.radius = Math.random() * 15 + 15; // Radio entre 15 y 30
            this.posX = Math.random() * (canvas.width - this.radius * 2) + this.radius;
            
            // Inician progresivamente debajo del canvas
            this.posY = canvas.height + this.radius + (Math.random() * canvas.height * 1.5); 
            this.color = getRandomRGB();
            
            // La velocidad vertical aumenta con el nivel
            this.speedY = (0.5 + (currentLevel * 0.4)) + Math.random() * 0.5; 
            
            // Parámetros para el viaje aleatorio (deriva en el eje X)
            this.angle = Math.random() * Math.PI * 2;
            this.wanderSpeed = Math.random() * 1.5 - 0.75; // Velocidad de oscilación

            // Estados de interacción
            this.isExploding = false;
            this.explosionRadius = this.radius;
            this.opacity = 1;
            this.hasHoverChangedColor = false;
        }

        draw(context) {
            context.save();
            context.globalAlpha = this.opacity;
            context.beginPath();
            
            if (this.isExploding) {
                // Efecto de explosión de adentro hacia afuera (solo borde)
                context.arc(this.posX, this.posY, this.explosionRadius, 0, Math.PI * 2, false);
                context.lineWidth = 3;
                context.strokeStyle = this.color;
                context.stroke();
            } else {
                // Dibujado normal
                context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false);
                context.fillStyle = this.color;
                context.fill();
                
                // Brillo blanco sutil en el borde
                context.lineWidth = 2;
                context.strokeStyle = "rgba(255,255,255,0.6)";
                context.stroke();
            }
            context.closePath();
            context.restore();
        }

        update(context) {
            if (this.isExploding) {
                // Lógica de explosión: crece y se desvanece
                this.explosionRadius += 3;
                this.opacity -= 0.04;
                if (this.opacity < 0) this.opacity = 0;
            } else {
                // Movimiento hacia arriba
                this.posY -= this.speedY;
                
                // Viaje aleatorio tipo zigzag suave
                this.posX += Math.sin(this.angle) * 1.5;
                this.angle += 0.03;

                // Si se sale por arriba sin ser eliminada, reaparece abajo para no perderla
                if (this.posY + this.radius < 0) {
                    this.posY = canvas.height + this.radius;
                    this.posX = Math.random() * (canvas.width - this.radius * 2) + this.radius;
                    this.hasHoverChangedColor = false; // Resetear color al reaparecer
                }
            }
            this.draw(context);
        }

        // Verifica si el mouse está encima
        checkHover(mx, my) {
            if (this.isExploding) return;
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

        // Verifica si se le hizo clic
        checkClick(mx, my) {
            if (this.isExploding) return false;
            let dx = mx - this.posX;
            let dy = my - this.posY;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.radius) {
                this.isExploding = true;
                return true;
            }
            return false;
        }
    }

    // Actualiza los textos y la barra de progreso
    function updateUI() {
        levelDisplay.textContent = level;
        circleCountDisplay.textContent = totalCircles;
        
        let percentage = (eliminatedCount / totalCircles) * 100;
        let pctFormatted = Math.round(percentage);
        
        progressText.textContent = `${eliminatedCount} / ${totalCircles} (${pctFormatted}%)`;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${pctFormatted}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }

    // Reinicia el juego según el nivel seleccionado
    function initGame() {
        level = parseInt(levelSlider.value);
        totalCircles = level * 10;
        eliminatedCount = 0;
        circlesArray = [];
        
        updateUI();

        for (let i = 0; i < totalCircles; i++) {
            circlesArray.push(new Bubble(level));
        }
    }

    // Bucle de animación principal
    function animate() {
        animationId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = circlesArray.length - 1; i >= 0; i--) {
            let b = circlesArray[i];
            
            b.checkHover(mouseX, mouseY);
            b.update(ctx);
            
            // Limpiar del array si la explosión terminó
            if (b.isExploding && b.opacity <= 0) {
                circlesArray.splice(i, 1);
            }
        }
    }

    // Listeners del mouse para el Canvas
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        // Ajustar coordenadas considerando el tamaño real renderizado
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        mouseX = (e.clientX - rect.left) * scaleX;
        mouseY = (e.clientY - rect.top) * scaleY;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = -100;
        mouseY = -100;
    });

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Recorrer de forma inversa para explotar la burbuja que está "encima" visualmente
        for (let i = circlesArray.length - 1; i >= 0; i--) {
            if (circlesArray[i].checkClick(clickX, clickY)) {
                eliminatedCount++;
                updateUI();
                break; // Solo elimina una por clic
            }
        }
    });

    // Listener para el selector de niveles
    levelSlider.addEventListener('input', () => {
        cancelAnimationFrame(animationId);
        initGame();
        animate();
    });

    // Iniciar todo
    initGame();
    animate();
})();