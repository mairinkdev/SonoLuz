// Variáveis globais
let youtubePlayer = null;
let audioContext = null;
let audioAnalyser = null;
let audioSource = null;
let frequencyData = null;
let timeData = null;
let animationId = null;
let videoId = null;
let isPlaying = false;
let visualEffects = null;
let startTimestamp = null;
let lastBeatTime = 0;
let beatsThreshold = 0.15;
let volumeSmoothed = 0;
let simulatedAudioData = false;  // Flag para indicar se estamos usando dados simulados
let playerVisible = false;      // Flag para controlar a visibilidade do player

// IDs de vídeos confiáveis (sem restrições conhecidas)
const DEFAULT_VIDEOS = [
    'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
    '9bZkp7q19f0', // PSY - Gangnam Style
    'kJQP7kiw5Fk', // Luis Fonsi - Despacito
    'OPf0YbXqDm0', // Mark Ronson - Uptown Funk
    'hT_nvWreIhg'  // OneRepublic - Counting Stars
];

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);

// Função de inicialização
function init() {
    console.log('Inicializando visualizador...');
    
    // Elementos da interface
    const canvas = document.getElementById('visualizer');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const youtubeUrlInputModal = document.getElementById('youtubeUrlModal');
    const loadBtn = document.getElementById('loadBtn');
    const loadBtnModal = document.getElementById('loadBtnModal');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const urlBtn = document.getElementById('urlBtn');
    const togglePlayerBtn = document.getElementById('togglePlayerBtn');
    const introOverlay = document.getElementById('introOverlay');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const playerClickTip = document.getElementById('playerClickTip');
    
    // Criar instância de efeitos visuais
    visualEffects = new VisualEffects(canvas);
    
    // Configurar interface
    disablePlaybackControls();
    initDropdown();
    
    // Definir "starburst" como efeito padrão
    visualEffects.setMode('starburst');
    
    // Adicionar algumas partículas iniciais para mostrar o efeito imediatamente
    visualEffects.addStarburstParticles(0.8);
    
    // Atualizar rótulo do dropdown
    document.querySelector('#effectBtn').innerHTML = 
        `<i class="bi bi-sliders me-1"></i>Explosão Estelar`;
    
    // Listeners para carregamento de URL
    loadBtn.addEventListener('click', () => loadYoutubeVideo(youtubeUrlInput.value));
    loadBtnModal.addEventListener('click', () => loadYoutubeVideo(youtubeUrlInputModal.value));
    
    // Listeners para controles de reprodução
    playBtn.addEventListener('click', startPlayback);
    pauseBtn.addEventListener('click', pausePlayback);
    
    // Listener para abrir modal
    urlBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('urlModal'));
        modal.show();
    });
    
    // Listener para toggle do player
    togglePlayerBtn.addEventListener('click', togglePlayerVisibility);
    
    // Listener para dica do player
    if (playerClickTip) {
        playerClickTip.addEventListener('click', () => {
            // Esconder a dica
            const playerOverlay = document.querySelector('.player-overlay');
            if (playerOverlay) {
                playerOverlay.style.opacity = '0';
                setTimeout(() => {
                    playerOverlay.style.display = 'none';
                }, 500);
            }
            
            // Após um clique no player, podemos tentar iniciar a reprodução
            setTimeout(() => {
                startPlayback();
            }, 1000);
        });
    }
    
    // Verificar periodicamente se o player está realmente reproduzindo
    setInterval(() => {
        if (youtubePlayer && youtubePlayer.getPlayerState) {
            const state = youtubePlayer.getPlayerState();
            isPlaying = (state === YT.PlayerState.PLAYING);
            
            // Forçar atualização das partículas mesmo se o player não estiver tocando
            if (!isPlaying && visualEffects) {
                // Simular uma batida fraca para manter o visual interessante
                visualEffects.onBeat(0.3);
                // Adicionar algumas partículas
                if (Math.random() > 0.7) {
                    visualEffects.addStarburstParticles(0.3);
                }
            }
        }
    }, 2000);
    
    // Iniciar loop de animação
    startAnimation();
    
    // Responsivo
    window.addEventListener('resize', () => visualEffects.resize());
    
    // Carregar vídeo padrão automaticamente (após 1.5 segundos)
    setTimeout(() => {
        carregarVideoAutomatico();
    }, 1500);
}

// Carregar um vídeo automático de exemplo
function carregarVideoAutomatico() {
    const videoIndex = Math.floor(Math.random() * DEFAULT_VIDEOS.length);
    const randomVideoId = DEFAULT_VIDEOS[videoIndex];
    
    // Atualizar campo de entrada para mostrar o que está sendo carregado
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    if (youtubeUrlInput) {
        youtubeUrlInput.value = `https://www.youtube.com/watch?v=${randomVideoId}`;
    }
    
    console.log(`Carregando vídeo padrão: ${randomVideoId}`);
    
    // Carregar o vídeo
    loadYoutubeVideoById(randomVideoId);
}

// Carregar vídeo por ID
function loadYoutubeVideoById(id) {
    if (!id) return;
    
    videoId = id;
    mostrarCarregamento();
    
    // Criar player do YouTube
    if (youtubePlayer) {
        youtubePlayer.loadVideoById(videoId);
    } else {
        youtubePlayer = new YT.Player('player', {
            height: '360',
            width: '640',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'autoplay': 0,
                'controls': 1,
                'enablejsapi': 1,
                'rel': 0,
                'showinfo': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    }
    
    // Mostrar temporariamente o player após carregamento
    setTimeout(() => {
        const playerContainer = document.getElementById('playerContainer');
        playerVisible = true;
        playerContainer.classList.add('visible');
        
        // Esconder após 5 segundos se não estiver tocando
        setTimeout(() => {
            if (!isPlaying) {
                playerVisible = false;
                playerContainer.classList.remove('visible');
            }
        }, 5000);
    }, 1000);
}

// Carregar vídeo do YouTube a partir do URL
function loadYoutubeVideo(url) {
    if (!url) {
        mostrarAlerta('Por favor, insira um URL válido do YouTube');
        return;
    }
    
    // Extrair ID do vídeo
    const id = extrairVideoId(url);
    
    if (!id) {
        mostrarAlerta('URL do YouTube inválido');
        return;
    }
    
    loadYoutubeVideoById(id);
}

// Extrair ID do vídeo do URL do YouTube
function extrairVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

// Quando o player estiver pronto
function onPlayerReady(event) {
    console.log('Player pronto');
    
    // Inicializar processamento de áudio
    iniciarProcessamentoAudio();
    
    // Habilitar controles
    enablePlaybackControls();
    
    // Atualizar interface
    ocultarCarregamento();
    atualizarTitulo();
    
    // Esconder overlay gradualmente
    const introOverlay = document.getElementById('introOverlay');
    introOverlay.style.opacity = 0;
    setTimeout(() => {
        introOverlay.style.display = 'none';
    }, 1000);
    
    // Tentar reproduzir automaticamente (pode ser bloqueado pelo navegador)
    try {
        // Ativar o áudio context (necessário devido a políticas dos navegadores)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        setTimeout(() => {
            startPlayback();
        }, 1500);
    } catch (e) {
        console.warn('Reprodução automática bloqueada pelo navegador:', e);
    }
}

// Quando o estado do player mudar
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayButton(true);
        
        // Esconder a dica de clique quando o vídeo começar a tocar
        const playerOverlay = document.querySelector('.player-overlay');
        if (playerOverlay) {
            playerOverlay.style.opacity = '0';
            setTimeout(() => {
                playerOverlay.style.display = 'none';
            }, 500);
        }
        
        console.log('Vídeo está tocando, atualizando dados de áudio simulados');
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        isPlaying = false;
        updatePlayButton(false);
    }
}

// Quando ocorrer erro no player
function onPlayerError(event) {
    console.error('Erro no player:', event.data);
    ocultarCarregamento();
    mostrarAlerta('Erro ao carregar vídeo. Verifique o URL ou tente outro vídeo.');
    disablePlaybackControls();
}

// Iniciar processamento de áudio
function iniciarProcessamentoAudio() {
    // Criar contexto de áudio se não existir
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    try {
        // Como não podemos acessar diretamente o áudio do YouTube devido a restrições CORS,
        // vamos configurar um analisador para processamento simulado baseado no estado do player

        // Configurar analisador
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 2048;
        audioAnalyser.smoothingTimeConstant = 0.8;
        audioAnalyser.connect(audioContext.destination);
        
        // Criar buffers para dados
        frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
        timeData = new Uint8Array(audioAnalyser.frequencyBinCount);
        
        // Como não podemos acessar o áudio diretamente do YouTube,
        // vamos usar dados simulados baseados no estado da reprodução
        simulatedAudioData = true;
        
        console.log('Processamento de áudio iniciado (modo simulado)');
    } catch (error) {
        console.error('Erro ao conectar áudio:', error);
    }
}

// Atualizar dados de áudio
function updateAudioData() {
    if (!audioAnalyser) return;
    
    // Simular dados de áudio, mesmo se não estiver reproduzindo para manter os efeitos visuais
    if (simulatedAudioData) {
        // Simular dados de áudio baseados no tempo atual do vídeo ou em um tempo simulado
        const currentTime = youtubePlayer && youtubePlayer.getPlayerState && 
                          youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING ?
                          youtubePlayer.getCurrentTime() : 
                          (Date.now() / 1000); // Usar tempo atual como fallback
        
        simulateAudioData(currentTime);
    } else {
        // Se não estiver reproduzindo, zerar os dados
        frequencyData.fill(0);
        timeData.fill(128); // Valor central para onda
    }
    
    // Calcular volume total
    let sum = 0;
    // Usar menos dados para melhorar desempenho - amostragem
    const step = 4; // Pular a cada 4 amostras
    for (let i = 0; i < frequencyData.length; i += step) {
        sum += frequencyData[i];
    }
    const instantVolume = sum / ((frequencyData.length / step) * 255); // Entre 0-1
    
    // Suavizar o volume para transições mais agradáveis
    volumeSmoothed = volumeSmoothed * 0.95 + instantVolume * 0.05;
    
    // Atualizar nível de volume nos efeitos visuais
    visualEffects.volumeLevel = volumeSmoothed;
    
    // Detectar batidas
    detectarBatidas(frequencyData);
    
    // Detectar guitarra/médios (menos frequentemente para poupar CPU)
    if (Date.now() % 2 === 0) { // Executar apenas em alguns frames
        detectarGuitarra(frequencyData);
    }
    
    // Atualizar efeitos visuais
    visualEffects.update(frequencyData, timeData);
}

// Simular dados de áudio baseados no tempo
function simulateAudioData(currentTime) {
    if (!frequencyData || !timeData) return;
    
    try {        
        // Verificar se estamos realmente reproduzindo
        const isActivelyPlaying = youtubePlayer && 
                               youtubePlayer.getPlayerState && 
                               youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING;
        
        // Usar parâmetros diferentes dependendo se o vídeo está tocando
        const intensityMultiplier = isActivelyPlaying ? 1.0 : 0.7;
        
        // Gerar dados simulados de frequência baseados no tempo atual
        for (let i = 0; i < frequencyData.length; i++) {
            // Frequências baixas (graves) - primeiros 10%
            if (i < frequencyData.length * 0.1) {
                // Pulsar em intervalos regulares (simulando batidas)
                const pulseFrequency = 1.2; // Batidas por segundo
                const pulsePhase = (currentTime * pulseFrequency) % 1;
                // Pulso mais forte e mais distinto
                const pulseValue = pulsePhase < 0.3 ? 255 * (1 - pulsePhase/0.3) * intensityMultiplier : 30;
                
                frequencyData[i] = Math.min(255, Math.max(0, 
                    pulseValue + Math.sin(i * 0.3 + currentTime * 3) * 40 * intensityMultiplier
                ));
            } 
            // Frequências médias (40%)
            else if (i < frequencyData.length * 0.5) {
                frequencyData[i] = Math.min(255, Math.max(0, 
                    140 * intensityMultiplier + 
                    Math.sin(i * 0.05 + currentTime * 4) * 70 * intensityMultiplier + 
                    Math.sin(i * 0.1 + currentTime * 2.5) * 60 * intensityMultiplier
                ));
            } 
            // Frequências altas (50% restantes)
            else {
                frequencyData[i] = Math.min(255, Math.max(0, 
                    120 * intensityMultiplier + 
                    Math.sin(i * 0.1 + currentTime * 6) * 50 * intensityMultiplier + 
                    Math.cos(i * 0.2 + currentTime * 4) * 40 * intensityMultiplier
                ));
            }
        }
        
        // Gerar dados simulados de forma de onda com maior amplitude
        for (let i = 0; i < timeData.length; i++) {
            timeData[i] = 128 + Math.sin(i * 0.01 + currentTime * 6) * 80 * 
                          (0.7 + 0.5 * Math.sin(currentTime * 1.2)) * intensityMultiplier;
        }
        
        // Forçar valores altos em certos momentos para simular batidas (menos frequente)
        if (Math.floor(currentTime * 2) % 2 === 0 && Math.random() > 0.5) {
            for (let i = 0; i < frequencyData.length * 0.1; i++) {
                frequencyData[i] = Math.min(255, frequencyData[i] * 1.5);
            }
        }
        
    } catch (e) {
        console.error("Erro ao simular dados:", e);
    }
}

// Detectar batidas (graves)
function detectarBatidas(frequencyData) {
    const now = Date.now();
    
    // Só detectar batidas a cada 100ms no mínimo (para evitar duplicatas)
    if (now - lastBeatTime < 100) return;
    
    // Calcular energia nas baixas frequências (graves)
    let bass = 0;
    const bassRange = Math.floor(frequencyData.length * 0.1); // Primeiros 10% são graves
    
    for (let i = 0; i < bassRange; i++) {
        bass += frequencyData[i];
    }
    bass = bass / (bassRange * 255); // Normalizar entre 0-1
    
    // Reduzir o threshold para detectar mais batidas
    beatsThreshold = 0.12;
    
    // Se passar do threshold, considerar como batida
    if (bass > beatsThreshold) {
        lastBeatTime = now;
        const intensity = Math.min(1.0, bass * 1.5); // Amplificar um pouco
        console.log('Batida detectada com intensidade:', intensity);
        visualEffects.onBeat(intensity);
        
        // Fazer botão de play pulsar nas batidas fortes
        if (intensity > 0.5) { // Reduzido para mais efeitos visuais
            const playBtn = document.getElementById('playBtn');
            playBtn.classList.add('pulse-button');
            setTimeout(() => {
                playBtn.classList.remove('pulse-button');
            }, 100);
        }
    }
}

// Detectar frequências médias (guitarra)
function detectarGuitarra(frequencyData) {
    // Calcular energia nas frequências médias
    let midEnergy = 0;
    const midStart = Math.floor(frequencyData.length * 0.1);
    const midEnd = Math.floor(frequencyData.length * 0.5);
    
    for (let i = midStart; i < midEnd; i++) {
        midEnergy += frequencyData[i];
    }
    midEnergy = midEnergy / ((midEnd - midStart) * 255); // Normalizar entre 0-1
    
    // Calcular delta (variação) de energia
    const delta = Math.min(1.0, midEnergy * 1.2); // Amplificar um pouco
    
    // Enviar para os efeitos visuais
    visualEffects.onGuitar(midEnergy, delta);
}

// Iniciar loop de animação
function startAnimation() {
    let lastFrame = 0;
    const targetFPS = 30; // Reduzir para 30 FPS para melhorar o desempenho
    const frameInterval = 1000 / targetFPS;
    
    function animate(timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        
        // Limitar a taxa de quadros para melhorar o desempenho
        const elapsed = timestamp - lastFrame;
        if (elapsed > frameInterval) {
            lastFrame = timestamp - (elapsed % frameInterval);
            
            // Atualizar dados de áudio
            updateAudioData();
            
            // Renderizar frame
            visualEffects.render(timestamp - startTimestamp);
        }
        
        // Continuar loop
        animationId = requestAnimationFrame(animate);
    }
    
    // Iniciar loop
    animationId = requestAnimationFrame(animate);
}

// Iniciar reprodução
function startPlayback() {
    if (!youtubePlayer) return;
    
    console.log('Iniciando reprodução...');
    
    // Tentar resumir o contexto de áudio se estiver suspenso
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumido com sucesso');
        }).catch(err => {
            console.error('Erro ao resumir AudioContext:', err);
        });
    }
    
    // Deixar o player visível durante a reprodução
    const playerContainer = document.getElementById('playerContainer');
    playerVisible = true;
    playerContainer.classList.add('visible');
    
    // Iniciar a reprodução com um pequeno atraso para garantir que a API está pronta
    setTimeout(() => {
        try {
            youtubePlayer.playVideo();
            console.log('Comando de play enviado ao player');
            
            // Verificar se realmente começou a tocar
            setTimeout(() => {
                if (youtubePlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
                    console.warn('Reprodução não iniciou automaticamente, tente clicar no player');
                    mostrarAlerta('Para iniciar a reprodução, clique primeiro no player do YouTube e depois no botão Play');
                }
            }, 2000);
        } catch (e) {
            console.error('Erro ao iniciar reprodução:', e);
            mostrarAlerta('Erro ao iniciar reprodução. Tente clicar diretamente no player do YouTube.');
        }
    }, 500);
    
    isPlaying = true;
    updatePlayButton(true);
    
    // Iniciar sequência de introdução
    visualEffects.startIntroSequence();
}

// Pausar reprodução
function pausePlayback() {
    if (!youtubePlayer) return;
    
    youtubePlayer.pauseVideo();
    isPlaying = false;
    updatePlayButton(false);
}

// Atualizar aparência do botão de reprodução
function updatePlayButton(isPlaying) {
    const playBtn = document.getElementById('playBtn');
    
    if (isPlaying) {
        playBtn.classList.remove('btn-success');
        playBtn.classList.add('btn-primary');
    } else {
        playBtn.classList.remove('btn-primary');
        playBtn.classList.add('btn-success');
    }
}

// Habilitar controles de reprodução
function enablePlaybackControls() {
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    playBtn.disabled = false;
    pauseBtn.disabled = false;
}

// Desabilitar controles de reprodução
function disablePlaybackControls() {
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    playBtn.disabled = true;
    pauseBtn.disabled = true;
}

// Inicializar dropdown com seletor de efeitos
function initDropdown() {
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const modeSelect = document.getElementById('modeSelect');
    
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const value = this.getAttribute('data-value');
            
            // Atualizar visualização
            visualEffects.setMode(value);
            
            // Atualizar dropdown
            dropdownToggle.innerHTML = `${this.innerHTML} <i class="fas fa-chevron-down ms-1"></i>`;
            
            // Atualizar select oculto
            modeSelect.value = value;
        });
    });
}

// Utilitários de interface
function mostrarCarregamento() {
    // Remover carregamento existente, se houver
    const loadingExistente = document.querySelector('.loading');
    if (loadingExistente) {
        document.body.removeChild(loadingExistente);
    }
    
    // Criar e adicionar novo indicador de carregamento
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading';
    loadingIndicator.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loadingIndicator);
}

function ocultarCarregamento() {
    const loadingIndicator = document.querySelector('.loading');
    if (loadingIndicator) {
        document.body.removeChild(loadingIndicator);
    }
}

function mostrarAlerta(mensagem) {
    alert(mensagem);
}

function atualizarTitulo() {
    // Atualizar título com o nome do vídeo atual
    try {
        const videoTitle = youtubePlayer.getVideoData().title;
        if (videoTitle) {
            // Atualizar apenas o elemento span dentro da navbar
            const titleElement = document.getElementById('videoTitle');
            if (titleElement) {
                titleElement.textContent = videoTitle.substring(0, 20) + (videoTitle.length > 20 ? '...' : '');
            }
        }
    } catch (e) {
        console.warn('Não foi possível obter o título do vídeo', e);
    }
}

// Toggle da visibilidade do player do YouTube
function togglePlayerVisibility() {
    const playerContainer = document.getElementById('playerContainer');
    playerVisible = !playerVisible;
    
    if (playerVisible) {
        playerContainer.classList.add('visible');
    } else {
        playerContainer.classList.remove('visible');
    }
}

// Inicializar YouTube API
function onYouTubeIframeAPIReady() {
    console.log('YouTube API pronta');
    
    // Se a API estiver pronta e nenhum vídeo foi carregado ainda,
    // podemos carregar o vídeo padrão
    if (!youtubePlayer) {
        carregarVideoAutomatico();
    }
} 