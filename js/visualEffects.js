class VisualEffects {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        
        // Dimensões do canvas
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Configuração dos efeitos
        this.currentMode = 'starburst'; // Modo padrão
        this.introSequenceActive = false;
        
        // Parâmetros de animação
        this.beatImpact = 0;
        this.guitarImpact = 0;
        this.hue = 0;
        this.volumeLevel = 0; // Nível de volume global para amplificar efeitos
        
        // Parâmetros para efeitos
        this.starburstParticles = [];
        this.circularSegments = 32;
        this.kaleidoscopeSegments = 8;
        this.kaleidoscopeRotation = 0;
        
        // Sincronização com áudio
        this.frequencyData = null;
        this.timeData = null;
        
        // Handler de redimensionamento
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    
    update(frequencyData, timeData) {
        this.frequencyData = frequencyData;
        this.timeData = timeData;
        
        // Atualizar parâmetros de animação
        this.hue = (this.hue + 0.5) % 360;
        
        // Diminuir gradualmente o impacto de batida/guitarra
        this.beatImpact *= 0.95;
        this.guitarImpact *= 0.95;
    }
    
    onBeat(intensity) {
        // Amplificar o impacto da batida para maior reatividade
        this.beatImpact = Math.min(1.0, intensity * 2.5);
    }
    
    onGuitar(energy, delta) {
        // Amplificar o impacto da guitarra para maior reatividade
        this.guitarImpact = Math.min(1.0, energy * 2.0);
    }
    
    render(time) {
        this.renderCanvas(time);
    }
    
    renderCanvas(time) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Se estiver na sequência inicial de abertura
        if (this.introSequenceActive) {
            this.renderIntroSequence(time);
            return;
        }
        
        // Renderização baseada no modo selecionado
        switch (this.currentMode) {
            case 'starburst':
                this.renderStarburstEffect(time);
                break;
            case 'circular':
                this.renderCircularEffect(time);
                break;
            case 'kaleidoscope':
                this.renderKaleidoscopeEffect(time);
                break;
            default:
                this.renderStarburstEffect(time);
        }
    }
    
    renderCircularEffect(time) {
        if (!this.frequencyData) return;
        
        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Obter médias das frequências para diferentes ranges
        const bassLevel = this.getAverageFrequency(0, 0.1);
        const midLevel = this.getAverageFrequency(0.1, 0.5);
        const highLevel = this.getAverageFrequency(0.5, 1.0);
        
        // Amplificar com o volume geral
        const amplifiedBass = bassLevel * (1 + this.volumeLevel * 2);
        const amplifiedMid = midLevel * (1 + this.volumeLevel * 1.5);
        const amplifiedHigh = highLevel * (1 + this.volumeLevel);
        
        // Número de círculos concêntricos baseado no nível de volume
        const numRings = 3 + Math.floor(this.volumeLevel * 3);
        
        // Desenhar círculos concêntricos que reagem ao áudio
        for (let ring = 0; ring < numRings; ring++) {
            // Tamanho base do anel + resposta ao baixo
            const ringRadius = (50 + ring * 60) * (1 + amplifiedBass * 0.5);
            
            // Criar segmentos do círculo que respondem a diferentes frequências
            ctx.lineWidth = 2 + amplifiedMid * 8;
            
            // Usar mais segmentos quando o volume for alto
            const segments = this.circularSegments + Math.floor(this.volumeLevel * 16);
            
            for (let i = 0; i < segments; i++) {
                const angleStart = (i / segments) * Math.PI * 2;
                const angleEnd = ((i + 1) / segments) * Math.PI * 2;
                
                // Mapear índice do segmento para índice na matriz de frequência
                const freqIndex = Math.floor((i / segments) * this.frequencyData.length);
                const freqValue = this.frequencyData[freqIndex] / 255.0;
                
                // Calcular raio dinâmico baseado na frequência e impactos
                const dynamicRadius = ringRadius + freqValue * 80 * (1 + this.beatImpact + this.volumeLevel);
                
                // Cor baseada na frequência, impacto da batida e volume
                const hue = (this.hue + ring * 30 + i * 10) % 360;
                const saturation = 70 + freqValue * 30;
                const lightness = 40 + freqValue * 20 + this.beatImpact * 40;
                
                ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                
                // Desenhar arco com distorção baseada na guitarra
                ctx.beginPath();
                ctx.arc(
                    centerX, 
                    centerY, 
                    dynamicRadius, 
                    angleStart + this.guitarImpact * Math.sin(time * 0.001), 
                    angleEnd + this.guitarImpact * Math.sin(time * 0.001)
                );
                ctx.stroke();
                
                // Adicionar destaques mais intensos nas batidas
                if (this.beatImpact > 0.3 && freqValue > 0.6) {
                    ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${this.beatImpact * 0.8})`;
                    ctx.lineWidth = 6 + this.beatImpact * 8;
                    ctx.beginPath();
                    ctx.arc(
                        centerX, 
                        centerY, 
                        dynamicRadius, 
                        angleStart, 
                        angleEnd
                    );
                    ctx.stroke();
                }
            }
        }
        
        // Adicionar círculo central que pulsa com a batida e o volume
        const pulseRadius = 40 * (1 + this.beatImpact * 2 + amplifiedBass);
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, pulseRadius
        );
        gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, ${0.8 + this.volumeLevel * 0.2})`);
        gradient.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderStarburstEffect(time) {
        if (!this.frequencyData) return;
        
        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Obter médias das frequências para diferentes ranges
        const bassLevel = this.getAverageFrequency(0, 0.1);
        const midLevel = this.getAverageFrequency(0.1, 0.5);
        const highLevel = this.getAverageFrequency(0.5, 1.0);
        
        // Adicionar novas partículas na batida e com base no volume
        if (this.beatImpact > 0.2 || bassLevel > 0.6) {
            // Número de partículas baseado na intensidade da batida e volume
            const impactFactor = Math.max(this.beatImpact, bassLevel * 0.8);
            const scaleFactor = 1 + this.volumeLevel * 2;
            const numNewParticles = Math.floor(impactFactor * 20 * scaleFactor);
            
            for (let i = 0; i < numNewParticles; i++) {
                const angle = Math.random() * Math.PI * 2;
                // Velocidade baseada no impacto e volume
                const speed = (3 + Math.random() * 7 * impactFactor) * (1 + this.volumeLevel);
                // Tamanho baseado no volume e batida
                const size = (3 + Math.random() * 6) * (1 + this.volumeLevel + this.beatImpact * 0.5);
                const life = 60 + Math.random() * 60 * (1 + this.volumeLevel);
                
                this.starburstParticles.push({
                    x: centerX,
                    y: centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: size,
                    life: life,
                    maxLife: life,
                    hue: (this.hue + Math.random() * 60) % 360,
                    opacity: 1.0
                });
            }
        }
        
        // Adicionar linhas na detecção de graves e médios
        if (this.guitarImpact > 0.2 || midLevel > 0.5) {
            const impactFactor = Math.max(this.guitarImpact, midLevel * 0.7);
            const numLines = Math.floor(impactFactor * 10 * (1 + this.volumeLevel));
            
            for (let i = 0; i < numLines; i++) {
                const angle = Math.random() * Math.PI * 2;
                // Comprimento baseado no impacto, frequências médias e volume
                const length = (50 + Math.random() * 150 * impactFactor) * (1 + this.volumeLevel);
                const thickness = (1 + Math.random() * 3) * (1 + this.volumeLevel * 0.5);
                const life = 40 + Math.random() * 40;
                
                this.starburstParticles.push({
                    x: centerX,
                    y: centerY,
                    angle: angle,
                    length: length,
                    thickness: thickness,
                    life: life,
                    maxLife: life,
                    hue: (this.hue + 120 + Math.random() * 60) % 360,
                    opacity: 0.8,
                    isLine: true
                });
            }
        }
        
        // Atualizar e renderizar todas as partículas starburst
        for (let i = this.starburstParticles.length - 1; i >= 0; i--) {
            const p = this.starburstParticles[i];
            p.life--;
            
            // Remover partículas mortas
            if (p.life <= 0) {
                this.starburstParticles.splice(i, 1);
                continue;
            }
            
            const lifeRatio = p.life / p.maxLife;
            p.opacity = lifeRatio * (0.8 + this.volumeLevel * 0.2);
            
            if (p.isLine) {
                // Atualizar linhas (efeito guitarra/médios)
                const endX = centerX + Math.cos(p.angle) * p.length;
                const endY = centerY + Math.sin(p.angle) * p.length;
                
                const gradient = ctx.createLinearGradient(centerX, centerY, endX, endY);
                gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${p.opacity})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
                
                ctx.lineWidth = p.thickness * lifeRatio * (1 + this.volumeLevel * 0.5);
                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            } else {
                // Atualizar partículas normais (efeito batida/graves)
                p.x += p.vx;
                p.y += p.vy;
                
                // Adicionar leve resistência do ar
                p.vx *= 0.99;
                p.vy *= 0.99;
                
                // Tamanho das partículas afetado pelo volume
                const currentSize = p.size * lifeRatio * (1 + this.volumeLevel * 0.3);
                
                ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.opacity})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Desenhar círculos concêntricos emanando do centro em batidas fortes e graves
        const impactFactor = Math.max(this.beatImpact, bassLevel * 0.8);
        if (impactFactor > 0.4) {
            for (let i = 0; i < 3; i++) {
                // Raio baseado no impacto e volume
                const radius = impactFactor * 250 * (i/3 + 0.5) * (1 + this.volumeLevel);
                ctx.lineWidth = 3 * impactFactor * (1 + this.volumeLevel * 0.5);
                ctx.strokeStyle = `hsla(${this.hue}, 100%, 70%, ${impactFactor * 0.5 * (1 - i/3)})`;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    
    renderKaleidoscopeEffect(time) {
        if (!this.frequencyData) return;
        
        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Limpar o canvas com um fundo mais escuro
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Obter médias das frequências para diferentes ranges
        const bassLevel = this.getAverageFrequency(0, 0.1);
        const midLevel = this.getAverageFrequency(0.1, 0.5);
        const highLevel = this.getAverageFrequency(0.5, 1.0);
        
        // Atualizar rotação baseada no impacto da guitarra e volume
        const rotationSpeed = 0.005 + this.guitarImpact * 0.02 + this.volumeLevel * 0.01 + midLevel * 0.01;
        this.kaleidoscopeRotation += rotationSpeed;
        
        // Calcular tamanho do segmento baseado em baixas frequências e volume
        const radius = Math.min(this.width, this.height) * 0.4 * (1 + bassLevel * 0.5 + this.volumeLevel * 0.3);
        
        // Número de segmentos baseado no volume e batidas
        const segments = this.kaleidoscopeSegments + Math.floor(this.volumeLevel * 4 + this.beatImpact * 4);
        
        // Desenhar cada segmento do caleidoscópio
        const segmentAngle = (Math.PI * 2) / segments;
        
        // Para cada segmento...
        for (let i = 0; i < segments; i++) {
            const angle = i * segmentAngle + this.kaleidoscopeRotation;
            
            // Salvar o contexto para cada segmento
            ctx.save();
            
            // Transladar para o centro e rotacionar para este segmento
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            
            // Número de "células" baseado no volume
            const cellCount = 10 + Math.floor(this.volumeLevel * 5);
            const segmentHeight = radius / cellCount;
            
            for (let j = 0; j < cellCount; j++) {
                // Obter frequências para diferentes partes do espectro
                const freqIndex = Math.floor((j / cellCount) * this.frequencyData.length * 0.8);
                const freqValue = this.frequencyData[freqIndex] / 255.0;
                
                // Calcular as dimensões do segmento com base no volume e frequência
                const y = j * segmentHeight;
                const widthFactor = 1 + this.volumeLevel + this.beatImpact * 0.5;
                const width = (30 + freqValue * 100) * widthFactor;
                const height = segmentHeight * 1.2; // Sobrepor levemente
                
                // Escolher cor baseada na frequência, batida e volume
                const hue = (this.hue + j * 15 + i * 30) % 360;
                const saturation = 80 + freqValue * 20;
                const brightness = 40 + freqValue * 30 + this.beatImpact * 20 + this.volumeLevel * 20;
                
                // Desenhar forma espelhada com transparência afetada pelo volume
                const opacity = 0.6 + freqValue * 0.4 + this.volumeLevel * 0.2;
                ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, ${opacity})`;
                
                // Desenhar formas em ambos os lados (espelhamento)
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.lineTo(width * 0.8, y + height);
                ctx.lineTo(0, y + height);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(-width, y);
                ctx.lineTo(-width * 0.8, y + height);
                ctx.lineTo(0, y + height);
                ctx.fill();
                
                // Adicionar destaques nas batidas fortes e baixas frequências
                if ((this.beatImpact > 0.5 || bassLevel > 0.6) && j % 3 === 0) {
                    const highlightSize = 10 * (this.beatImpact + bassLevel * 0.5) * (1 + this.volumeLevel * 0.5);
                    ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${this.beatImpact * 0.7 + bassLevel * 0.3})`;
                    
                    ctx.beginPath();
                    ctx.arc(width * 0.7, y + height/2, highlightSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.arc(-width * 0.7, y + height/2, highlightSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Restaurar o contexto após desenhar o segmento
            ctx.restore();
        }
        
        // Adicionar efeito central para impacto de guitarra e volume
        const centerImpact = Math.max(this.guitarImpact, midLevel * 0.7, this.volumeLevel * 0.5);
        if (centerImpact > 0.2) {
            const guitarRadius = (30 + centerImpact * 70) * (1 + this.volumeLevel * 0.5);
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, guitarRadius
            );
            gradient.addColorStop(0, `hsla(${(this.hue + 180) % 360}, 100%, 70%, ${centerImpact})`);
            gradient.addColorStop(1, `hsla(${(this.hue + 180) % 360}, 100%, 50%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, guitarRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderIntroSequence(time) {
        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Calcular fase da animação (0 a 1)
        const phase = Math.min(time / 3000, 1.0);
        
        if (phase >= 1.0) {
            this.introSequenceActive = false;
            return;
        }
        
        // Explosão inicial
        const radius = phase * Math.min(this.width, this.height) * 0.8;
        const alpha = 1.0 - phase;
        
        const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        grd.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grd.addColorStop(0.2, `hsla(${this.hue}, 100%, 70%, ${alpha * 0.8})`);
        grd.addColorStop(1, `hsla(${this.hue + 60}, 100%, 50%, 0)`);
        
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ondas de choque
        const numWaves = 3;
        for (let i = 0; i < numWaves; i++) {
            const wavePhase = phase - i * 0.2;
            
            if (wavePhase > 0 && wavePhase < 1.0) {
                const waveRadius = wavePhase * Math.min(this.width, this.height) * 0.7;
                const waveAlpha = 0.7 * (1.0 - wavePhase);
                const waveWidth = 10 * (1.0 - wavePhase);
                
                ctx.lineWidth = waveWidth;
                ctx.strokeStyle = `hsla(${this.hue + i * 30}, 100%, 70%, ${waveAlpha})`;
                ctx.beginPath();
                ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    
    // Método auxiliar para obter média de frequências em um range específico
    getAverageFrequency(startPercent, endPercent) {
        if (!this.frequencyData) return 0;
        
        const start = Math.floor(startPercent * this.frequencyData.length);
        const end = Math.floor(endPercent * this.frequencyData.length);
        let sum = 0;
        
        for (let i = start; i < end; i++) {
            sum += this.frequencyData[i] / 255.0;
        }
        
        return sum / (end - start);
    }
    
    startIntroSequence() {
        this.introSequenceActive = true;
        this.starburstParticles = [];
    }
    
    setMode(mode) {
        // Resetar efeitos específicos quando o modo muda
        if (mode === 'starburst' && this.currentMode !== 'starburst') {
            this.starburstParticles = [];
        }
        
        if (mode === 'kaleidoscope' && this.currentMode !== 'kaleidoscope') {
            this.kaleidoscopeRotation = 0;
        }
        
        this.currentMode = mode;
    }
}

// Exportar para uso global
window.VisualEffects = VisualEffects; 