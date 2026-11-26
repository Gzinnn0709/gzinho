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
Trava anti-spam: duas mensagens **nunca** saem a menos de 1 minuto uma da outra (bem abaixo dos 6–10 min normais) —
é só um limite de segurança para nenhum erro virar enxurrada; o botão "✉ Enviar agora" é manual e não passa por ela.
Para mudar a regra de um canal, edite `REGRAS` no começo do script.

## Como ele garante os pontos
- **Conta pelo sinal certo:** a mensagem conta como enviada quando a Kick **aceita** — ou seja, quando a frase
  **sai do campo de digitar**. Esse é o mesmo sinal que vale o ponto. A conferência no chat é só um **rótulo extra**
  (✓ Apareceu no chat): em live cheia o chat voa e a frase some rápido, então **não achar no chat nunca é tratado
  como falha** (senão geraria mensagem repetida e recarga à toa).
- **A Kick não aceitou?** (a frase ficou presa no campo — modo lento, chat restrito, sem conexão) ele **limpa o campo
  e tenta de novo** em 40 s, com outra frase. Depois de 3 vezes assim, **recarrega a página** sozinho (no máximo 1x a cada 15 min).
- **Prazo:** a próxima mensagem sai no máximo **2,5 min antes de fechar a janela** desde a última enviada
  (Brabox: até 7,5 min; Gabe: até 12,5 min), mesmo que o sorteio do intervalo caia mais tarde.

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
  aba parada (Chrome congelou a aba ou o computador suspendeu), timeout da Kick, modo lento, a Kick não aceitou a mensagem, página recarregada.
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
Palavras curtas de **hype** (ex.: "kishow", "muito brabo", "top demais", "kkkk", "gg") que **ninguém
responde nem interpreta torto** — nada de pergunta, "chat alguém explica", nem frase que puxa conversa.
Em português ou espanhol conforme o chat (rindo, triste/respeito ou normal), sem repetir as últimas 6
e às vezes com um emoji no fim. Para trocar as palavras, edite `FRASES` no começo do script.

## Emotes
Os emotes vêm **desligados por padrão**, porque mandar emote junto pela automação às vezes trava o envio na Kick
(a Kick abre um menuzinho de emote que "engole" o Enter e a mensagem fica presa no campo). Só as palavras já
funcionam de forma confiável.

Se quiser testar emotes, clique em **😶 Sem emote** no painel para ligar (vira **😃 Emotes (N)**): o script aprende
sozinho os emotes que aparecem no chat do canal e manda um junto com a frase. Se um envio com emote falhar, a
próxima mensagem vai **sem** emote sozinho, para nunca travar o envio. Para emotes específicos (ex.: de inscrito),
edite `EMOTES_MANUAIS` no começo do script no formato `"id:nome"`.


## Para não perder pontos
- **Chrome "dormindo" a aba (Economia de memória):** o Chrome descarta abas paradas (janela minimizada, aba
  sem som) e, enquanto isso, o script não roda. Quando você volta na aba, parece que a página atualizou.
  Resolva em **Chrome → Configurações → Desempenho → Sempre manter estes sites ativos → Adicionar → `kick.com`**.
  Desde a 3.3 o painel avisa quando isso aconteceu e quanto tempo a aba ficou parada.
- **Live no mudo:** aba **sem som** o Chrome congela ou descarta com mais facilidade. Deixe o volume da live
  **baixinho (1%)** em vez do mudo — o painel avisa (🔇) quando está no mudo.
- **Economia de energia do Chrome:** em **Chrome → Configurações → Desempenho**, desligue a **Economia de energia**
  (ou deixe só "com bateria fraca"): ela também congela abas em segundo plano.
- **Timeout da Kick:** se você levar timeout (a Kick te silencia por uns segundos, geralmente por mandar rápido
  demais), o script **reconhece, espera o tempo acabar e volta sozinho** — não fica martelando nem recarrega à toa.
  Aparece em "Ocorrências hoje" e no painel ("⏳ Em timeout · volta em…").
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
