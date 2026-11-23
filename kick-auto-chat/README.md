# Kick auto-chat (pontos dos streamers)

Manda uma mensagem de 5+ palavras no chat **só com a live no ar**, nos canais da Kick que você ativar,
no ritmo da regra de pontos de cada canal. Funciona no navegador do computador, com a aba da live aberta e você logado.

## Regra de pontos de cada canal
| Canal | Regra | Mensagem a cada | Pausa que não conta |
|---|---|---|---|
| gabepeixe | 1 Peixe 🐟 a cada 15 min escrevendo no chat | 8–10 min | mais de 15 min sem escrever |
| brabox | 5 pontos a cada 10 min | 6–8 min | mais de 10 min sem escrever |
| outros canais | 1 ponto a cada 15 min (padrão) | 8–10 min | mais de 15 min sem escrever |

O intervalo fica sempre abaixo da janela, com folga para o modo lento do chat e tentativas que falham.
Para mudar a regra de um canal, edite `REGRAS` no começo do script.

## Como ele garante os pontos (desde a 3.4)
- **Confere no chat:** depois de enviar, procura a frase na lista do chat. Só conta como enviada quando ela
  **aparece** (se o chat da página não deixar conferir, conta como antes: campo esvaziou = enviada).
- **Não apareceu? Manda outra em 40 s**, com outra frase. Se a de antes aparecer atrasada, ela conta e não manda de novo.
- **Prazo:** a próxima mensagem sai no máximo **2,5 min antes de fechar a janela** desde a última que apareceu
  (Brabox: até 7,5 min; Gabe: até 12,5 min), mesmo que o sorteio do intervalo caia mais tarde.
- **Frase presa no campo:** se a Kick não aceitou e a frase ficou no campo, ele limpa e tenta de novo
  (antes achava que era você digitando e parava de mandar).
- **Chat travado:** depois de 3 tentativas seguidas sem aparecer (ou se o campo do chat sumir), **recarrega a página**
  sozinho — no máximo 1 vez a cada 15 min.

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
  pela regra do canal (no Gabe aparece 🐟: 1 a cada 15 min; no Brabox: 5 a cada 10 min). O tempo só vale
  até a janela da regra depois da última mensagem (15 min no Gabe, 10 min no Brabox).
  Quando algo fez perder pontos aparece **"≈ 54 de 56"**: o segundo número é quanto daria sem as falhas.
- **✓ Apareceu no chat** — a última mensagem foi conferida na lista do chat.
- **⚠ Ocorrências hoje** — toque para ver o que fez perder (ou quase perder) pontos, com o horário:
  aba parada (Chrome congelou a aba ou o computador suspendeu), mensagem que não apareceu, a Kick não aceitou,
  página recarregada.
- **Última mensagem: há X min** — fica vermelho 3 min antes da janela (12 min no Gabe, 7 min no Brabox),
  por exemplo com o modo lento do chat ou você digitando no campo.
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

## Para não perder pontos
- **Chrome "dormindo" a aba (Economia de memória):** o Chrome descarta abas paradas (janela minimizada, aba
  sem som) e, enquanto isso, o script não roda. Quando você volta na aba, parece que a página atualizou.
  Resolva em **Chrome → Configurações → Desempenho → Sempre manter estes sites ativos → Adicionar → `kick.com`**.
  Desde a 3.3 o painel avisa quando isso aconteceu e quanto tempo a aba ficou parada.
- **Live no mudo:** aba **sem som** o Chrome congela ou descarta com mais facilidade. Deixe o volume da live
  **baixinho (1%)** em vez do mudo — o painel avisa (🔇) quando está no mudo.
- **Economia de energia do Chrome:** em **Chrome → Configurações → Desempenho**, desligue a **Economia de energia**
  (ou deixe só "com bateria fraca"): ela também congela abas em segundo plano.
- **PC em suspensão:** desligue a suspensão durante a live (Windows: Configurações → Sistema → Energia).
- **Abra as abas antes da live:** o script espera com a live offline e começa sozinho quando ela abrir.
- O script recarrega a página com a live **offline** (a cada ~5 min) e, com a live no ar, só quando o chat trava
  (3 mensagens seguidas sem aparecer ou o campo do chat sumiu), no máximo 1 vez a cada 15 min.

## Avisos em vermelho
- **O Chrome tinha "dormido" esta aba**: veja "Para não perder pontos" acima.
- **Versão ANTIGA nesta página**: apague as outras cópias no Tampermonkey.
- **Cópia antiga em outra aba/navegador**: no Chrome, Ctrl+Shift+A, digite `kick` e feche as outras abas.
- **Não achei o campo do chat**: confira se está logado e com o chat aberto.
- **🔇 Live no mudo**: deixe o volume em 1% em vez do mudo (o ✕ esconde o aviso para sempre).

Uso por conta e risco: automação de chat pode violar as regras da Kick e do sistema de pontos.
