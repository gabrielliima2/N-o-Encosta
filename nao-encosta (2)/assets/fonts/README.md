# assets/fonts/

O jogo usa a fonte **Baloo 2** (Google Fonts, licença Open Font License —
gratuita para qualquer uso, inclusive comercial). Ela é arredondada, forte e
bem legível — perfeita para o estilo cartoon/casual do "Não Encosta!".

Hoje ela é carregada assim (veja `<head>` do `index.html`):

```html
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&display=swap" rel="stylesheet">
```

Isso funciona perfeitamente enquanto o jogo é aberto com internet (inclusive
no navegador do celular). **Se a internet cair, ou quando o jogo for
empacotado como app Android/iOS (sem acesso à internet garantido), o CSS já
tem um fallback seguro** — a fonte cai automaticamente para uma fonte
arredondada do próprio sistema (`ui-rounded`, `-apple-system`, etc.), então
nada quebra visualmente, só perde um pouco do "charme".

## Para deixar 100% offline (recomendado antes de publicar o app)

1. Baixe os arquivos `.woff2` da Baloo 2 em https://fonts.google.com/specimen/Baloo+2
   (peso 600 e 800) e coloque-os aqui, nesta pasta, com estes nomes:
   - `Baloo2-SemiBold.woff2` (peso 600)
   - `Baloo2-ExtraBold.woff2` (peso 800)
2. No topo do `style.css`, adicione:
   ```css
   @font-face {
     font-family: 'Baloo 2';
     src: url('assets/fonts/Baloo2-SemiBold.woff2') format('woff2');
     font-weight: 600;
     font-display: swap;
   }
   @font-face {
     font-family: 'Baloo 2';
     src: url('assets/fonts/Baloo2-ExtraBold.woff2') format('woff2');
     font-weight: 800;
     font-display: swap;
   }
   ```
3. Remova as duas linhas `<link>` do Google Fonts no `index.html`.

Nada mais precisa mudar — o resto do CSS já referencia `'Baloo 2'` no
`font-family`, então a troca é transparente.
