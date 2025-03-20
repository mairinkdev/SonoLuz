class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.source = null;
        this.analyser = null;
        this.gainNode = null;
        this.audioBuffer = null;
        this.audioElement = null;
        this.isPlaying = false;
        this.isSetup = false;
        
        // Análise de áudio
        this.frequencyData = null;
        this.timeData = null;
        this.beatThreshold = 0.45;
        this.beatPeakDecay = 0.98;
        this.beatHoldFrames = 30;
        
        // Detecção de batida
        this.beatCutOff = 0;
        this.beatHold = 0;
        this.beatDetected = false;
        
        // Detecção de guitarra (faixas de frequência alta-média)
        this.guitarEnergyThreshold = 0.2;
        this.lastGuitarEnergy = 0;
        this.guitarDetected = false;
        
        // Callbacks
        this.onBeatCallback = null;
        this.onGuitarCallback = null;
        this.onAudioProcessCallback = null;
    }
    
    async setup() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.gainNode = this.audioContext.createGain();
            
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.85;
            
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.gainNode.connect(this.audioContext.destination);
            this.analyser.connect(this.gainNode);
            
            this.isSetup = true;
            console.log("Processador de áudio configurado com sucesso");
        } catch (error) {
            console.error("Erro ao configurar processador de áudio:", error);
        }
    }
    
    loadAudioFile(file) {
        return new Promise((resolve, reject) => {
            if (!this.isSetup) {
                this.setup().then(() => this._loadFile(file, resolve, reject));
            } else {
                this._loadFile(file, resolve, reject);
            }
        });
    }
    
    _loadFile(file, resolve, reject) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.createAudioElement(file);
                resolve();
            } catch (error) {
                console.error("Erro ao decodificar arquivo de áudio:", error);
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    }
    
    createAudioElement(file) {
        // Limpar elemento de áudio anterior se existir
        if (this.audioElement) {
            this.stop();
            URL.revokeObjectURL(this.audioElement.src);
        }
        
        this.audioElement = new Audio();
        this.audioElement.src = URL.createObjectURL(file);
        this.audioElement.onended = () => {
            this.isPlaying = false;
            console.log("Reprodução de áudio finalizada");
        };
        
        this.source = this.audioContext.createMediaElementSource(this.audioElement);
        this.source.connect(this.analyser);
    }
    
    play() {
        if (!this.audioElement || !this.isSetup) return;
        
        // Resumir contexto de áudio (necessário devido às políticas de interação do navegador)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Garantir que o elemento de áudio tem propriedades corretas
        if (this.audioElement.paused || this.audioElement.currentTime === 0) {
            this.audioElement.play()
                .then(() => {
                    console.log("Reprodução iniciada com sucesso");
                    this.isPlaying = true;
                    this.update();
                })
                .catch(error => {
                    console.error("Erro ao iniciar reprodução:", error);
                    
                    // Tentar novamente após interação do usuário em alguns navegadores
                    const playAfterInteraction = () => {
                        this.audioElement.play();
                        this.isPlaying = true;
                        this.update();
                        document.removeEventListener('click', playAfterInteraction);
                    };
                    
                    document.addEventListener('click', playAfterInteraction, {once: true});
                    alert("Clique na tela para iniciar a reprodução (política do navegador)");
                });
        } else {
            this.audioElement.play();
            this.isPlaying = true;
            this.update();
        }
    }
    
    pause() {
        if (!this.audioElement || !this.isPlaying) return;
        this.audioElement.pause();
        this.isPlaying = false;
    }
    
    stop() {
        if (!this.audioElement) return;
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
    }
    
    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }
    
    update() {
        if (!this.isPlaying) return;
        
        // Obter dados de frequência e tempo
        this.analyser.getByteFrequencyData(this.frequencyData);
        this.analyser.getByteTimeDomainData(this.timeData);
        
        // Detectar batida
        this.detectBeat();
        
        // Detectar presença de guitarra
        this.detectGuitar();
        
        // Chamar callback de processo de áudio
        if (this.onAudioProcessCallback) {
            this.onAudioProcessCallback(this.frequencyData, this.timeData);
        }
        
        // Continuar loop de atualização
        requestAnimationFrame(() => this.update());
    }
    
    detectBeat() {
        // Cálculo de energia na faixa de baixas frequências (batidas/bumbo)
        let lowFreqSum = 0;
        const lowFreqRange = Math.floor(this.analyser.frequencyBinCount * 0.1); // Primeiros 10% - frequências baixas
        
        for (let i = 0; i < lowFreqRange; i++) {
            lowFreqSum += this.frequencyData[i];
        }
        
        const lowFreqAverage = lowFreqSum / lowFreqRange / 255; // Normalizado entre 0-1
        
        // Algoritmo de detecção de batida com limiar dinâmico
        if (lowFreqAverage > this.beatCutOff && lowFreqAverage > this.beatThreshold) {
            this.beatDetected = true;
            this.beatCutOff = lowFreqAverage * 1.1;
            this.beatHold = this.beatHoldFrames;
            
            // Chamar callback de batida
            if (this.onBeatCallback) {
                this.onBeatCallback(lowFreqAverage);
            }
        } else {
            if (this.beatHold > 0) {
                this.beatHold--;
            } else {
                this.beatDetected = false;
                this.beatCutOff *= this.beatPeakDecay;
                this.beatCutOff = Math.max(this.beatThreshold, this.beatCutOff);
            }
        }
    }
    
    detectGuitar() {
        // Análise de faixas de frequência média-alta (onde guitarra é mais proeminente)
        // Tipicamente 500Hz a 5kHz
        const binStart = Math.floor(this.analyser.frequencyBinCount * 0.1); // ~500Hz
        const binEnd = Math.floor(this.analyser.frequencyBinCount * 0.5);   // ~5kHz
        
        let guitarSum = 0;
        for (let i = binStart; i < binEnd; i++) {
            guitarSum += this.frequencyData[i];
        }
        
        const guitarEnergy = guitarSum / (binEnd - binStart) / 255; // Normalizado entre 0-1
        
        // Detecção baseada em aumento súbito de energia nessas frequências
        const energyDelta = guitarEnergy - this.lastGuitarEnergy;
        this.lastGuitarEnergy = guitarEnergy;
        
        if (energyDelta > this.guitarEnergyThreshold && guitarEnergy > 0.3) {
            this.guitarDetected = true;
            
            // Chamar callback de guitarra
            if (this.onGuitarCallback) {
                this.onGuitarCallback(guitarEnergy, energyDelta);
            }
        } else {
            this.guitarDetected = false;
        }
    }
    
    onBeat(callback) {
        this.onBeatCallback = callback;
    }
    
    onGuitar(callback) {
        this.onGuitarCallback = callback;
    }
    
    onAudioProcess(callback) {
        this.onAudioProcessCallback = callback;
    }
    
    getFrequencyData() {
        return this.frequencyData;
    }
    
    getTimeData() {
        return this.timeData;
    }
    
    getCurrentTime() {
        return this.audioElement ? this.audioElement.currentTime : 0;
    }
    
    getDuration() {
        return this.audioElement ? this.audioElement.duration : 0;
    }
}

// Exportar para uso global
window.AudioProcessor = AudioProcessor; 