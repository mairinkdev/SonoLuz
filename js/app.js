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
    const introOverlay = document.getElementById('introOverlay');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    // Criar instância de efeitos visuais
    visualEffects = new VisualEffects(canvas);
    
    // Configurar interface
    disablePlaybackControls();
    initDropdowns(dropdownItems);
    
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
    
    // Iniciar loop de animação
    startAnimation();
    
    // Responsivo
    window.addEventListener('resize', () => visualEffects.resize());
}

// Inicializar YouTube API
function onYouTubeIframeAPIReady() {
    console.log('YouTube API pronta');
}

// Carregar vídeo do YouTube
function loadYoutubeVideo(url) {
    if (!url) {
        mostrarAlerta('Por favor, insira um URL válido do YouTube');
        return;
    }
    
    // Extrair ID do vídeo
    videoId = extrairVideoId(url);
    
    if (!videoId) {
        mostrarAlerta('URL do YouTube inválido');
        return;
    }
    
    // Mostrar carregamento
    mostrarCarregamento();
    
    // Criar player do YouTube (invisível)
    if (youtubePlayer) {
        youtubePlayer.loadVideoById(videoId);
    } else {
        youtubePlayer = new YT.Player('player', {
            height: '0',
            width: '0',
            videoId: videoId,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    }
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
}

// Quando o estado do player mudar
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayButton(true);
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
    
    // Conectar ao vídeo do YouTube usando um elemento de áudio intermediário
    const videoElement = document.createElement('video');
    videoElement.src = `https://www.youtube.com/watch?v=${videoId}`;
    videoElement.crossOrigin = 'anonymous';
    
    // Criar nós de análise
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 2048;
    audioAnalyser.smoothingTimeConstant = 0.8;
    
    // Conectar fonte
    try {
        // Obter áudio do elemento do YouTube
        const youtubeElement = youtubePlayer.getIframe();
        audioSource = audioContext.createMediaElementSource(youtubeElement);
        audioSource.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);
        
        // Criar buffers para dados
        frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
        timeData = new Uint8Array(audioAnalyser.frequencyBinCount);
        
        console.log('Processamento de áudio iniciado');
    } catch (error) {
        console.error('Erro ao conectar áudio:', error);
        // Fallback: usar AudioContext sem conexão direta (só disponível em alguns navegadores)
        audioAnalyser.connect(audioContext.destination);
        frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
        timeData = new Uint8Array(audioAnalyser.frequencyBinCount);
    }
}

// Atualizar dados de áudio
function updateAudioData() {
    if (!audioAnalyser) return;
    
    audioAnalyser.getByteFrequencyData(frequencyData);
    audioAnalyser.getByteTimeDomainData(timeData);
    
    // Calcular volume total
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        sum += frequencyData[i];
    }
    const instantVolume = sum / (frequencyData.length * 255); // Entre 0-1
    
    // Suavizar o volume para transições mais agradáveis
    volumeSmoothed = volumeSmoothed * 0.95 + instantVolume * 0.05;
    
    // Atualizar nível de volume nos efeitos visuais
    visualEffects.volumeLevel = volumeSmoothed;
    
    // Detectar batidas
    detectarBatidas(frequencyData);
    
    // Detectar guitarra/médios
    detectarGuitarra(frequencyData);
    
    // Atualizar efeitos visuais
    visualEffects.update(frequencyData, timeData);
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
    
    // Se passar do threshold, considerar como batida
    if (bass > beatsThreshold) {
        lastBeatTime = now;
        const intensity = Math.min(1.0, bass * 1.5); // Amplificar um pouco
        visualEffects.onBeat(intensity);
        
        // Fazer botão de play pulsar nas batidas fortes
        if (intensity > 0.7) {
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
    function animate(timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        
        // Atualizar dados de áudio
        updateAudioData();
        
        // Renderizar frame
        visualEffects.render(timestamp - startTimestamp);
        
        // Continuar loop
        animationId = requestAnimationFrame(animate);
    }
    
    // Iniciar loop
    animationId = requestAnimationFrame(animate);
}

// Iniciar reprodução
function startPlayback() {
    if (!youtubePlayer) return;
    
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    youtubePlayer.playVideo();
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

// Inicializar dropdown de efeitos
function initDropdowns(dropdownItems) {
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedMode = e.target.getAttribute('data-value');
            
            // Atualizar rótulo do dropdown
            document.querySelector('#effectBtn').innerHTML = 
                `<i class="bi bi-sliders me-1"></i>${e.target.textContent}`;
            
            // Atualizar visual mode
            document.getElementById('visualMode').value = selectedMode;
            
            // Aplicar o modo
            visualEffects.setMode(selectedMode);
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
            // Atualizar navbar brand
            const navbarBrand = document.querySelector('.navbar-brand');
            navbarBrand.innerHTML = `<i class="bi bi-music-note-beamed me-2"></i>${videoTitle.substring(0, 20)}${videoTitle.length > 20 ? '...' : ''}`;
        }
    } catch (e) {
        console.warn('Não foi possível obter o título do vídeo', e);
    }
} 