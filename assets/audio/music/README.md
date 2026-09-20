# assets/audio/music/

Música de fundo POR MUNDO. Assim como os outros áudios do jogo, **nenhum
arquivo real está incluído** — mas o jogo já funciona sem eles: cada mundo
toca um pequeno tema sintetizado (escala/tempo/timbre próprios, gerados na
hora via Web Audio) até que você coloque o `.mp3` correspondente aqui.

Nomes esperados (veja `js/audio.js`, `MUSIC_FILES`):

| Arquivo                    | Mundo                    | Sugestão de clima                  |
|-----------------------------|---------------------------|--------------------------------------|
| `music_menu.mp3`            | Menu principal            | Acolhedora, convidativa              |
| `music_world_1.mp3`         | Céu Azul                  | Alegre, leve, energética             |
| `music_world_2.mp3`         | Pôr do Sol                | Relaxada, aventureira                |
| `music_world_3.mp3`         | Noite Estrelada           | Misteriosa, contida                  |
| `music_world_4.mp3`         | Tempestade                | Intensa, tensa                       |
| `music_world_5.mp3`         | Vulcão                    | Energética, ritmo forte              |
| `music_world_6.mp3`         | Fundo do Mar              | Etérea, sensação de exploração       |
| `music_world_7.mp3`         | Espaço Sideral            | Futurista, misteriosa                |
| `music_world_secret.mp3`    | Mundos secretos (8, 9, 10)| Bem diferente de tudo o resto        |

Todas devem ser royalty-free/licenciadas para uso no jogo — por exemplo
faixas CC0 de opengameart.org, incompetech.com (licença Creative Commons
com atribuição) ou composições próprias. Formato `.mp3`, curtas e
loopáveis (o jogo já toca em `loop: true`).

A troca de música entre mundos já tem fade-out/fade-in automático — ver
`AudioManager.setWorldMusic()` em `js/audio.js`. Basta colocar os arquivos
aqui com esses nomes exatos; nada mais precisa mudar.
