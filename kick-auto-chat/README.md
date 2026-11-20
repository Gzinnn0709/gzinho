# Kick auto-chat (pontos Gabepeixe)

Manda uma mensagem de 5+ palavras no chat das lives do Gabepeixe e do Brabox na Kick a cada 8–10 minutos.
Funciona só em navegador de computador, com a aba da live aberta e você logado.

## Opção 1 — Favorito (mais fácil, 1 clique)
1. Abra `favorito.txt`, clique no botão de copiar.
2. No Chrome, aperte **Ctrl+Shift+O** (gerenciador de favoritos) → ⋮ → **Adicionar novo favorito**.
3. Nome: `Auto-chat`. URL: cole o que copiou. Salve.
4. Na live do Gabepeixe, clique no favorito. Pronto.

## Opção 2 — Automático com Tampermonkey (liga sozinho)
1. Instale a extensão **Tampermonkey** no Chrome.
2. Em `chrome://extensions`, ative o **Modo do desenvolvedor** (necessário para scripts de usuário).
3. Abra `kick-auto-chat.user.js` → botão **Raw** → o Tampermonkey oferece instalar → **Instalar**.
4. Toda vez que abrir kick.com/gabepeixe o script liga sozinho.

## Opção 3 — Console
Na live, aperte **Ctrl+Shift+J** (Chrome/Edge), **Ctrl+Shift+K** (Firefox) ou **Cmd+Option+J** (Mac),
cole `kick-auto-chat.js` e Enter (se bloquear, digite `allow pasting` antes).

Um painel verde aparece no canto inferior esquerdo com a contagem e os botões **Enviar agora** / **Parar**.
Para trocar as frases, edite a lista `MENSAGENS` (mantenha 5+ palavras cada).

Uso por conta e risco: automação de chat pode violar as regras da Kick e do sistema de pontos.
