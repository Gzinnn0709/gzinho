# Kick auto-chat (pontos dos streamers)

Manda uma mensagem de 5+ palavras no chat a cada 8 a 10 minutos **só com a live no ar**, nos canais
da Kick que você ativar. Funciona no navegador do computador, com a aba da live aberta e você logado.

## Instalar (Tampermonkey — liga sozinho)
1. Instale a extensão **Tampermonkey** no Chrome.
2. Em `chrome://extensions`, abra **Detalhes** do Tampermonkey: **Acesso a sites → Em todos os sites**
   e ative **Permitir scripts do usuário** (ou o Modo do desenvolvedor).
3. Abra `kick-auto-chat.user.js` → botão **Raw** → **Instalar** (ou **Atualizar**).
4. Abra a live. O painel aparece no canto inferior esquerdo.

Ele se atualiza sozinho. Deixe **só uma** cópia instalada (Tampermonkey → Painel de opções) e **um computador só** em cada
live: outro PC com uma versão antiga aberta na página manda mensagem até com a live offline.

## O painel
- 🟢 **Ao vivo · próxima em X:XX** — contagem para a próxima mensagem. Offline: não manda nada.
- **Hoje / Valendo / ≈ pts** — mensagens do dia, tempo de live que está valendo ponto e a estimativa
  (no Gabe aparece 🐟). Regra dos Peixes: 1 a cada 15 min escrevendo no chat durante a live; uma pausa
  de mais de 15 min não conta. Por isso o script escreve a cada 8–10 min e só conta o tempo até 15 min
  depois da última mensagem.
- **Última mensagem: há X min** — fica vermelho perto de 15 min sem escrever (ex.: modo lento do chat
  ou você digitando no campo).
- **⏸ Pausar / ▶ Retomar** — para de mandar sem desligar (fica salvo mesmo recarregando a página).
- **✉ Enviar agora**, **🌐 Auto/PT/ES** (idioma das frases; Auto escolhe pelo chat), **🔔 Avisos**
  (notificação quando a live abrir), **–** minimiza.
- **Desativar aqui** — tira o canal da lista.

## Canais
Já vem ligado em `gabepeixe`, `brabox` e `orenatovicente`. Em qualquer outro canal aparece o botão
**🤖 Ativar auto-chat aqui** (o ✕ esconde o botão naquele canal). Se você trocar de canal na mesma aba,
o script para e não manda mensagem no canal errado.

## Frases
Português ou espanhol, com 5+ palavras, de acordo com o clima do chat (rindo, triste ou normal), sem
repetir as últimas 6 e às vezes com um emoji no fim.

## Avisos em vermelho
- **Versão ANTIGA nesta página**: apague as outras cópias no Tampermonkey.
- **Cópia antiga em outra aba/navegador**: no Chrome, Ctrl+Shift+A, digite `kick` e feche as outras abas.
- **Não achei o campo do chat**: confira se está logado e com o chat aberto.

Uso por conta e risco: automação de chat pode violar as regras da Kick e do sistema de pontos.
