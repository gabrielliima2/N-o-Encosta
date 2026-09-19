# assets/audio/

Esta pasta é onde o jogo procura os arquivos de áudio reais. **Nenhum arquivo
de música/efeito está incluído neste pacote** — eu não tenho como gerar ou
baixar arquivos de áudio prontos (e não usaria nada protegido por direitos
autorais mesmo que tivesse).

Enquanto os arquivos abaixo não existirem, o jogo **continua funcionando
normalmente**: `js/audio.js` detecta que o arquivo não carregou e usa
automaticamente um som/música sintetizados na hora via Web Audio API (os
mesmos "bips" que já existiam desde a Etapa 1/2). Ou seja, você pode testar
tudo agora mesmo, sem colocar nenhum arquivo aqui.

Quando quiser trocar pelos sons "de verdade", basta colocar arquivos com
EXATAMENTE estes nomes nesta pasta (formato .mp3, curtos, licenciados/royalty
-free ou compostos por você):

| Arquivo          | Uso                                      | Sugestão de duração |
|-------------------|-------------------------------------------|----------------------|
| `music.mp3`       | Música de fundo (toca em loop na partida) | 20–60s (loopável)    |
| `jump.mp3`        | Som do impulso/pulo                       | < 0.3s               |
| `coin.mp3`        | Coleta de moeda                           | < 0.3s               |
| `score.mp3`       | Passar por um obstáculo (ganhar ponto)    | < 0.3s               |
| `death.mp3`       | Colisão / Game Over                       | < 0.6s               |
| `click.mp3`       | Clique em botões                          | < 0.2s               |
| `countdown.mp3`   | Cada beep do "3, 2, 1"                    | < 0.3s               |
| `go.mp3`          | O "VAI!" do countdown                     | < 0.4s               |

Fontes royalty-free recomendadas (fora do projeto, escolha e baixe você
mesmo): freesound.org, opengameart.org, kenney.nl/assets (pacotes de SFX
gratuitos, licença CC0 — ótimos para jogos casuais como este), ou compor com
o synth already embutido no projeto (veja `AudioManager.playSFX` em
`js/audio.js`).

Não é necessário adicionar nada aqui agora — é só uma melhoria opcional
futura. O jogo já tem som completo funcionando sem esta pasta.
