# SonoLuz - Visualizador Audiovisual Reativo

Um visualizador audiovisual interativo que transforma vídeos do YouTube em experiências visuais dinâmicas e reativas às batidas, volumes e frequências da música.

## Funcionalidades

- **Integração com YouTube**: Reproduz qualquer vídeo do YouTube, extraindo seu áudio para análise em tempo real
- **Análise de Áudio Avançada**: Utiliza FFT (Fast Fourier Transform) para detectar batidas, volumes e frequências específicas
- **Efeitos Visuais Reativos**: Três modos visuais de alta qualidade que respondem dinamicamente à música:
  - **Explosão Estelar**: Partículas e linhas que explodem do centro em resposta às batidas e médios
  - **Circular**: Círculos concêntricos que pulsam e mudam de tamanho baseados no espectro de frequência
  - **Caleidoscópio**: Padrões geométricos em constante evolução que reagewm às nuances da música
- **Interface Minimalista**: Design clean e moderno com foco na experiência visual
- **Sequência de Introdução**: Animação de abertura impactante que inicia a experiência visual

## Como Usar

1. Abra o aplicativo em um navegador
2. Cole o URL de um vídeo do YouTube na tela inicial
3. Clique em "Carregar" para iniciar o processamento
4. Quando o vídeo estiver pronto, clique no botão "Play"
5. Selecione diferentes efeitos visuais no menu dropdown
6. Para trocar de vídeo, clique no ícone de link

## Requisitos Técnicos

- Navegador com suporte a Web Audio API e YouTube API
- Conexão à internet para carregar vídeos do YouTube
- Navegadores recomendados: Opera GX, Chrome, Firefox, Edge (versões recentes)

## Tecnologias Utilizadas

- **Web Audio API**: Para análise do espectro sonoro em tempo real
- **Canvas API**: Para renderização dos efeitos visuais
- **YouTube IFrame API**: Para integração com vídeos do YouTube
- **Bootstrap 5**: Para a interface de usuário responsiva
- **JavaScript Moderno**: Programação orientada a eventos e objetos

## Estrutura do Projeto

- `index.html`: Documento HTML principal com a interface do usuário
- `styles.css`: Estilos e animações da aplicação
- `app.js`: Controlador principal que gerencia integração com YouTube e loop de animação
- `visualEffects.js`: Implementação dos efeitos visuais e suas reações ao áudio

## Como Funciona

O visualizador se conecta à API do YouTube para extrair o áudio dos vídeos. Os dados são processados através de um analisador FFT que decompõe o sinal em diferentes bandas de frequência. A aplicação detecta especificamente:

- **Graves e Batidas**: Usando análise de frequências baixas (0-10%)
- **Médios e Instrumentos**: Usando análise de frequências médias (10-50%)
- **Agudos e Detalhes**: Usando análise de frequências altas (50-100%)

Esses dados são mapeados para diferentes propriedades visuais como tamanho, cor, movimento e opacidade, criando uma experiência sinestésica onde a música literalmente ganha forma visual.

## Limitações

- Devido a políticas de segurança dos navegadores, pode ser necessária interação do usuário para iniciar a reprodução de áudio
- A extração de áudio do YouTube está sujeita a limitações da API e políticas da plataforma
- O desempenho visual pode variar dependendo da capacidade do dispositivo

## Desenvolvimento Futuro

- Suporte para playlists do YouTube
- Mais efeitos visuais personalizáveis
- Filtros de cor e tema
- Opção para gravação e compartilhamento das visualizações
- Suporte para outras plataformas de streaming de música

---

Desenvolvido como um projeto de visualização audiovisual. Use fones de ouvido para uma experiência completa! 