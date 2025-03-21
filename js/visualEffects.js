/**
 * Classe responsável por gerenciar os efeitos visuais para o visualizador de áudio
 */
class VisualEffects {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        
        // Propriedades gerais
        this.mode = 'starburst'; // Modo padrão
        this.volumeLevel = 0;
        this.beatImpact = 0;
        this.guitarImpact = 0;
        
        // Propriedades para explosão estelar
        this.starburstParticles = [];
        
        // Propriedades para efeito circular
        this.circularSegments = 32;
        this.circularWidth = 0;
        
        // Propriedades para caleidoscópio
        this.kaleidoscopeSegments = 8;
        this.kaleidoscopeRotation = 0;
        
        // Ajustar o tamanho no resize do navegador
        window.addEventListener('resize', this.resize.bind(this));
    }
    
    // Redimensionar o canvas
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.maxRadius = Math.sqrt(this.centerX ** 2 + this.centerY ** 2);
    }
    
    // Definir modo de visualização
    setMode(mode) {
        this.mode = mode;
        
        // Limpar partículas ao mudar o modo
        if (mode === 'starburst') {
            this.starburstParticles = [];
        }
        
        // Reiniciar propriedades do caleidoscópio
        if (mode === 'kaleidoscope') {
            this.kaleidoscopeRotation = 0;
        }
    }
    
    // Atualizar dados de áudio
    update(frequencyData, timeData) {
        this.frequencyData = frequencyData;
        this.timeData = timeData;
        
        // Atualizar partículas para o efeito de explosão estelar
        if (this.mode === 'starburst') {
            this.updateStarburstParticles();
        }
    }
    
    // Responder a batidas (graves)
    onBeat(intensity) {
        this.beatImpact = Math.min(1.0, intensity * 1.5);
        
        // Adicionar partículas ao efeito de explosão estelar
        if (this.mode === 'starburst') {
            this.addStarburstParticles(intensity);
        }
        
        // Animação de impacto para o efeito circular
        if (this.mode === 'circular') {
            this.circularWidth = 30 * intensity;
        }
    }
    
    // Responder a impactos de guitarra (médios)
    onGuitar(energy, delta) {
        this.guitarImpact = delta;
        
        // Adicionar partículas menores para o efeito de explosão estelar
        if (this.mode === 'starburst' && delta > 0.6) {
            this.addStarburstParticles(delta / 2, 'guitar');
        }
        
        // Alterar rotação do caleidoscópio baseado na energia dos médios
        if (this.mode === 'kaleidoscope') {
            this.kaleidoscopeRotation += delta * 0.05;
        }
    }
    
    // Iniciar sequência de introdução
    startIntroSequence() {
        // Limpar partículas existentes
        this.starburstParticles = [];
        
        // Adicionar partículas iniciais
        if (this.mode === 'starburst') {
            this.addStarburstParticles(0.8);
        }
    }
    
    // Renderizar no canvas
    render(timestamp) {
        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Renderizar efeito baseado no modo atual
        switch (this.mode) {
            case 'starburst':
                this.renderStarburstEffect(timestamp);
                break;
            case 'circular':
                this.renderCircularEffect(timestamp);
                break;
            case 'kaleidoscope':
                this.renderKaleidoscopeEffect(timestamp);
                break;
        }
    }
    
    // Renderizar efeito circular
    renderCircularEffect(timestamp) {
        const ctx = this.ctx;
        const frequencyData = this.frequencyData;
        if (!frequencyData) return;
        
        // Calcular número de círculos baseado no volume
        const numCircles = 5 + Math.floor(this.volumeLevel * 10);
        const maxRadius = this.maxRadius * (0.8 + this.beatImpact * 0.2);
        
        // Gradiente radial para o fundo
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, maxRadius
        );
        gradient.addColorStop(0, `rgba(99, 102, 241, ${0.5 + this.volumeLevel * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        // Desenhar fundo
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Desenhar círculos concêntricos
        for (let i = 0; i < numCircles; i++) {
            // Calcular raio baseado no índice e no impacto de batida
            const radiusRatio = i / numCircles;
            const radius = maxRadius * radiusRatio * (0.8 + this.beatImpact * 0.2);
            
            // Obter a frequência correspondente para este círculo
            const freqIndex = Math.floor(radiusRatio * frequencyData.length / 2);
            const freqValue = frequencyData[freqIndex] / 255;
            
            // Calcular espessura da linha baseada na frequência
            const lineWidth = (1 + freqValue * 5) * (1 + this.volumeLevel * 3);
            
            // Calcular cor baseada na frequência
            const hue = (180 + freqIndex) % 360;
            const saturation = 80 + freqValue * 20;
            const lightness = 50 + freqValue * 20;
            const alpha = 0.6 + freqValue * 0.4;
            
            // Desenhar círculo
            ctx.beginPath();
            ctx.arc(
                this.centerX, 
                this.centerY, 
                radius + this.circularWidth * (1 - radiusRatio), 
                0, 
                Math.PI * 2
            );
            ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            
            // Efeito extra se houver impacto de guitarra
            if (this.guitarImpact > 0.6 && i % 2 === 0) {
                ctx.beginPath();
                ctx.arc(
                    this.centerX, 
                    this.centerY, 
                    radius * (1 + this.guitarImpact * 0.1), 
                    0, 
                    Math.PI * 2
                );
                ctx.strokeStyle = `hsla(${(hue + 180) % 360}, ${saturation}%, ${lightness}%, ${alpha * 0.7})`;
                ctx.lineWidth = lineWidth * 0.5;
                ctx.stroke();
            }
        }
        
        // Reduzir o impacto de batida gradualmente
        this.beatImpact *= 0.95;
        this.circularWidth *= 0.9;
    }
    
    // Renderizar efeito explosão estelar
    renderStarburstEffect(timestamp) {
        const ctx = this.ctx;
        
        // Fundo gradiente animado
        const bgGradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.maxRadius
        );
        
        const hue1 = (timestamp / 50) % 360;
        const hue2 = (hue1 + 60) % 360;
        
        bgGradient.addColorStop(0, `hsla(${hue1}, 70%, 5%, 1)`);
        bgGradient.addColorStop(1, `hsla(${hue2}, 80%, 10%, 0.8)`);
        
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Desenhar círculos de fundo pulsantes com menos operações
        if (this.beatImpact > 0.1) {
            ctx.beginPath();
            const radius = this.maxRadius * 0.5 * (1 + this.beatImpact * 0.5);
            const gradient = ctx.createRadialGradient(
                this.centerX, this.centerY, 0,
                this.centerX, this.centerY, radius
            );
            gradient.addColorStop(0, `hsla(${hue1}, 80%, 50%, ${this.beatImpact * 0.3})`);
            gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
            ctx.fillStyle = gradient;
            ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Desenhar partículas com glow
        ctx.globalCompositeOperation = 'lighter';
        
        // Limitar o número de operações de desenho para melhorar o desempenho
        const particlesToRender = this.starburstParticles.length > 200 ? 
            this.starburstParticles.slice(-200) : this.starburstParticles;
        
        particlesToRender.forEach(p => {
            ctx.beginPath();
            
            // Gradiente para cada partícula
            const gradient = ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, p.size * 2
            );
            
            // Extrair componentes da cor
            const colorMatch = p.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (colorMatch) {
                const [_, hue, sat, light] = colorMatch;
                
                // Cores mais brilhantes e vibrantes
                gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${p.life * 1.2})`);
                gradient.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
                
                // Fazer partículas maiores para melhor visibilidade
                const scaleFactor = 1.2 + this.volumeLevel * 1.5;
                ctx.fillStyle = gradient;
                ctx.arc(p.x, p.y, p.size * scaleFactor, 0, Math.PI * 2);
                ctx.fill();
                
                // Simplificar efeito - remover os detalhes extras para melhorar desempenho
                if (p.size > 3 && Math.random() > 0.7) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 0.7 * scaleFactor, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${hue}, ${sat}%, 95%, ${p.life * 0.9})`;
                    ctx.fill();
                }
            }
        });
        
        // Restaurar modo de composição
        ctx.globalCompositeOperation = 'source-over';
        
        // Desenhar linhas radiais nas batidas fortes (reduzir complexidade)
        if (this.beatImpact > 0.4) { // Aumentar threshold
            const numLines = Math.floor(4 + this.beatImpact * 8); // Reduzir número de linhas
            const maxLength = this.maxRadius * (0.2 + this.beatImpact * 0.8);
            
            for (let i = 0; i < numLines; i++) {
                const angle = (i / numLines) * Math.PI * 2;
                const length = maxLength * (0.5 + Math.random() * 0.5);
                
                const endX = this.centerX + Math.cos(angle) * length;
                const endY = this.centerY + Math.sin(angle) * length;
                
                // Simplificar gradiente para melhorar desempenho
                const hue = (hue1 + i * 30) % 360;
                ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${this.beatImpact})`;
                ctx.lineWidth = 2 + this.beatImpact * 3;
                
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.centerY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }
    
    // Adicionar partículas para o efeito explosão estelar
    addStarburstParticles(intensity, type = 'beat') {
        // Reduzir o número de partículas para melhorar o desempenho
        const count = type === 'beat' 
            ? Math.floor(15 + intensity * 60) 
            : Math.floor(5 + intensity * 20);
            
        const speedMultiplier = type === 'beat' ? 1.2 : 1.8;
        const sizeMultiplier = type === 'beat' ? 1.5 : 0.9;
        
        // Limitar o número máximo de partículas para evitar lentidão
        if (this.starburstParticles.length > 300) {
            this.starburstParticles = this.starburstParticles.slice(-200);
        }
        
        for (let i = 0; i < count; i++) {
            // Calcular direção aleatória
            const angle = Math.random() * Math.PI * 2;
            const speed = (2 + Math.random() * 6) * speedMultiplier * intensity;
            
            // Definir cor baseada no tipo (cores mais vibrantes)
            let hue, sat, light;
            if (type === 'beat') {
                hue = 180 + Math.random() * 60;
                sat = 90 + Math.random() * 10;
                light = 65 + Math.random() * 20;
            } else {
                hue = 280 + Math.random() * 60;
                sat = 95;
                light = 75;
            }
            
            // Adicionar partícula (maiores e mais lentas para aumentar visibilidade)
            this.starburstParticles.push({
                x: this.centerX,
                y: this.centerY,
                size: (2 + Math.random() * 4) * sizeMultiplier * intensity,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02, // Decaimento mais rápido
                color: `hsl(${hue}, ${sat}%, ${light}%)`
            });
        }
    }
    
    // Atualizar partículas para o efeito explosão estelar
    updateStarburstParticles() {
        // Remover partículas mortas
        this.starburstParticles = this.starburstParticles.filter(p => p.life > 0);
        
        // Atualizar posição e vida
        this.starburstParticles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.life -= p.decay;
            
            // Aplicar gravidade
            p.speedY += 0.05;
            
            // Reduzir velocidade (atrito)
            p.speedX *= 0.99;
            p.speedY *= 0.99;
        });
    }
    
    // Renderizar efeito caleidoscópio
    renderKaleidoscopeEffect(timestamp) {
        const ctx = this.ctx;
        if (!this.frequencyData) return;
        
        // Limpar canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Número de segmentos baseado no volume
        const segments = this.kaleidoscopeSegments + Math.floor(this.volumeLevel * 8);
        const angleStep = (Math.PI * 2) / segments;
        
        // Incrementar rotação baseado no guitarImpact
        this.kaleidoscopeRotation += 0.002 + this.guitarImpact * 0.01;
        
        // Ajustar o raio máximo baseado no impacto de batida
        const maxRadius = this.maxRadius * (0.7 + this.beatImpact * 0.3);
        
        // Desenhar cada segmento do caleidoscópio
        for (let i = 0; i < segments; i++) {
            // Calcular ângulo de início e fim
            const startAngle = i * angleStep + this.kaleidoscopeRotation;
            const endAngle = startAngle + angleStep;
            
            // Criar um gradiente para o segmento
            const gradient = ctx.createLinearGradient(
                this.centerX, this.centerY,
                this.centerX + Math.cos(startAngle) * maxRadius,
                this.centerY + Math.sin(startAngle) * maxRadius
            );
            
            // Calcular cores baseadas em frequências
            const freq1 = this.frequencyData[i % this.frequencyData.length] / 255;
            const freq2 = this.frequencyData[(i * 5) % this.frequencyData.length] / 255;
            
            const hue1 = (timestamp / 50 + i * 30) % 360;
            const hue2 = (hue1 + 180) % 360;
            
            gradient.addColorStop(0, `hsla(${hue1}, 100%, ${50 + freq1 * 30}%, ${0.7 + freq1 * 0.3})`);
            gradient.addColorStop(1, `hsla(${hue2}, 100%, ${50 + freq2 * 30}%, ${0.1 + freq2 * 0.3})`);
            
            // Desenhar o segmento do caleidoscópio
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.arc(this.centerX, this.centerY, maxRadius, startAngle, endAngle);
            ctx.closePath();
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Adicionar efeito de borda
            if (this.beatImpact > 0.2) {
                ctx.strokeStyle = `hsla(${hue1}, 100%, 70%, ${this.beatImpact})`;
                ctx.lineWidth = 2 * this.beatImpact;
                ctx.stroke();
            }
        }
        
        // Efeito central
        const centerRadius = 50 + this.volumeLevel * 100 + this.beatImpact * 50;
        const centerGradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, centerRadius
        );
        
        centerGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 + this.beatImpact * 0.2})`);
        centerGradient.addColorStop(0.5, `rgba(200, 220, 255, ${0.2 + this.volumeLevel * 0.3})`);
        centerGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, centerRadius, 0, Math.PI * 2);
        ctx.fillStyle = centerGradient;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        // Reduzir impacto de batida
        this.beatImpact *= 0.95;
    }

    // Atualiza os dados de áudio para os efeitos visuais
    updateAudioData(frequencyData, timeData) {
        this.frequencyData = frequencyData;
        this.timeData = timeData;
        
        // Inicializar valores se não existirem
        if (!this.volumeHistory) {
            this.volumeHistory = Array(10).fill(0);
        }
        
        // Processar apenas uma parte dos dados para melhorar desempenho
        if (frequencyData && frequencyData.length > 0) {
            // Calcular volume usando amostragem para melhorar desempenho
            let volume = 0;
            const step = Math.max(1, Math.floor(frequencyData.length / 32)); // Amostrar menos pontos
            let sampleCount = 0;
            
            for (let i = 0; i < frequencyData.length; i += step) {
                volume += frequencyData[i] / 255;
                sampleCount++;
            }
            
            volume = volume / sampleCount;
            
            // Atualizar histórico de volume
            this.volumeHistory.push(volume);
            this.volumeHistory.shift();
            
            // Calcular média móvel para suavizar
            this.volumeLevel = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length;
            
            // Detectar batidas em frequências baixas (graves)
            let bassEnergy = 0;
            for (let i = 0; i < Math.min(8, Math.floor(frequencyData.length / 16)); i++) {
                bassEnergy += frequencyData[i] / 255;
            }
            bassEnergy = bassEnergy / 8;
            
            // Detectar batidas em frequências médias (guitarra)
            let midEnergy = 0;
            const midStart = Math.floor(frequencyData.length / 8);
            const midEnd = Math.floor(frequencyData.length / 3);
            const midStep = Math.max(1, Math.floor((midEnd - midStart) / 8));
            
            for (let i = midStart; i < midEnd; i += midStep) {
                midEnergy += frequencyData[i] / 255;
            }
            midEnergy = midEnergy / 8;
            
            // Verificar impacto de batida (se há um pico significativo)
            if (bassEnergy > 0.6 && bassEnergy > this.lastBassEnergy * 1.3) {
                this.beatImpact = Math.min(1, bassEnergy * 1.2);
                this.addStarburstParticles(this.beatImpact, 'beat');
                
                // Afetar propriedades dos efeitos
                if (this.mode === 'circular') {
                    this.circularWidth = 20;
                }
            }
            
            // Verificar impacto de guitarra
            if (midEnergy > 0.55 && midEnergy > this.lastMidEnergy * 1.2) {
                this.guitarImpact = Math.min(1, midEnergy * 1.1);
                
                // Adicionar menos partículas para guitarras para não sobrecarregar
                if (Math.random() > 0.5) {
                    this.addStarburstParticles(this.guitarImpact * 0.8, 'guitar');
                }
            }
            
            // Atualizar valores anteriores
            this.lastBassEnergy = bassEnergy;
            this.lastMidEnergy = midEnergy;
        }
        
        // Atualizar propriedades específicas de cada efeito
        if (this.mode === 'kaleidoscope') {
            // Girar o caleidoscópio de acordo com o volume
            this.kaleidoscopeRotation += 0.01 + this.volumeLevel * 0.03;
        }
        
        // Atualizar partículas para o efeito starburst
        if (this.mode === 'starburst') {
            this.updateStarburstParticles();
        }
    }
}

// Exportar para uso global
window.VisualEffects = VisualEffects; 