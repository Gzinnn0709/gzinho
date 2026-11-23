// Kick auto-chat 3.4 — manda uma mensagem de 6 a 10 min (conforme a regra de pontos de cada canal), só com a live no ar,
// confere se ela apareceu no chat e, se não apareceu, manda outra antes de fechar a janela de pontos.
// Instale pelo Tampermonkey (arquivo kick-auto-chat.user.js). Também funciona colado no Console (F12).
// No painel: pausar, mandar agora, idioma das frases, minimizar e desativar o canal.
(() => {
  "use strict";
  const VERSAO = "3.4";
  const T = window.__autoChatTeste || {};            // só para os testes automáticos (acelera os tempos)
  const tempo = (padrao, chave) => (T[chave] ?? padrao);

  // ======================= CONFIGURAÇÃO =======================
  const CANAIS_PADRAO = ["gabepeixe", "brabox", "orenatovicente"];
  // Regra de pontos de cada canal: X pontos a cada N minutos escrevendo no chat durante a live.
  // Uma pausa maior que N minutos não conta, então o intervalo entre mensagens fica sempre abaixo de N
  // (com folga para o modo lento do chat e tentativas que falham). O painel avisa antes de chegar no limite.
  const REGRAS = {
    gabepeixe: { pontos: 1, janela: 15, unidade: "🐟", intervalo: [8, 2] },   // 1 Peixe a cada 15 min: mensagem a cada 8–10 min
    brabox: { pontos: 5, janela: 10, unidade: "pts", intervalo: [6, 2] }        // 5 pontos a cada 10 min: mensagem a cada 6–8 min
  };
  const REGRA_PADRAO = { pontos: 1, janela: 15, unidade: "pts", intervalo: [8, 2] };
  const regraDe = (canal) => REGRAS[canal] || REGRA_PADRAO;
  // Frases com 5+ palavras. O script lê o clima do chat: rindo -> risada, triste -> triste, resto -> neutro
  const FRASES = {
    pt: {
      risada: [
        "kkkkk eu não aguento mais rir", "chat eu tô passando mal kkkkk", "isso aqui é melhor que novela",
        "minha mãe perguntou por que tô rindo", "alguém clipa isso pelo amor de deus", "eu vim só olhar e fiquei kkkk",
        "o roteirista dessa live tá de parabéns", "não era pra eu tá rindo disso", "rindo sozinho aqui igual doido kkkk",
        "o chat tá mais doido que a live", "tô aqui só pelo caos mesmo kkkk", "boa demais essa kkkkk morri aqui",
        "quem riu também levanta a mão", "melhor que qualquer filme de comédia"
      ],
      neutro: [
        "tô acompanhando aqui desde cedo hoje", "salve chat tamo junto aqui", "tamo junto até o final da live",
        "chat tá movimentado hoje hein", "acompanhando tudo aqui com atenção", "tô aqui firme e forte acompanhando",
        "chat alguém explica o que aconteceu", "eu juro que pisquei e perdi tudo", "parei tudo pra ver isso aqui",
        "isso merece ir pro clipe urgente", "nível de caos dessa live tá alto", "essa live faz mal pro coração"
      ],
      triste: [
        "força aí tamo junto com você", "sinto muito mesmo, muita força aí", "meus sentimentos, força pra todo mundo",
        "que momento pesado, tamo junto aqui", "força chat, momento difícil esse aí", "tamo junto nessa, muita força mesmo"
      ]
    },
    es: {
      risada: [
        "jajaja no puedo más de risa", "chat me estoy muriendo de risa", "esto es mejor que una novela",
        "mi mamá me preguntó por qué me río", "alguien clipee esto por favor ya", "vine a mirar un rato y me quedé",
        "el guionista de este stream es crack", "no debería reírme de esto jajaja", "me estoy riendo solo como loco",
        "el chat está más loco que el stream", "estoy acá solo por el caos jaja", "qué buena esa jajaja me mató",
        "el que se rió levante la mano", "mejor que cualquier película de comedia"
      ],
      neutro: [
        "estoy mirando desde temprano hoy acá", "saludos chat acá estamos firmes", "acá estamos hasta el final del stream",
        "el chat está movido hoy eh", "siguiendo todo con mucha atención acá", "acá firme y fuerte mirando todo",
        "chat alguien explica qué pasó recién", "juro que parpadeé y me perdí todo", "dejé todo para ver esto acá",
        "esto merece ir al clip ya", "el nivel de caos está alto hoy", "este stream le hace mal al corazón"
      ],
      triste: [
        "fuerza ahí estamos con vos", "lo siento mucho, mucha fuerza ahí", "mis condolencias, fuerza para todos",
        "momento pesado, acá estamos con vos", "fuerza chat, momento difícil este", "estamos juntos en esto, mucha fuerza"
      ]
    }
  };
  const EMOJIS = { risada: ["😂", "🤣"], neutro: ["🔥", "👏", "👊"], triste: ["🙏", "💙"] };
  const TODAS_FRASES = new Set(Object.values(FRASES).flatMap(l => Object.values(l).flat()));

  // ======================= ARMAZENAMENTO (no navegador) =======================
  const ler = (k, padrao) => { try { const v = localStorage.getItem("autochat:" + k); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem("autochat:" + k, JSON.stringify(v)); } catch (e) {} };
  const canaisAtivos = () => ler("canais", CANAIS_PADRAO);
  const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const estatHoje = (canal) => ler(`dia:${canal}:${hoje()}`, { msgs: 0, minutos: 0 });
  const somarHoje = (canal, campo, n = 1) => { const e = estatHoje(canal); e[campo] = (e[campo] || 0) + n; gravar(`dia:${canal}:${hoje()}`, e); };
  const hhmm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  // Ocorrências do dia: o que fez perder (ou quase perder) pontos, para mostrar no painel
  const ocorrHoje = (canal) => ler(`ocorr:${canal}:${hoje()}`, []);
  const registrar = (canal, texto) => {
    const l = ocorrHoje(canal);
    l.push({ h: hhmm(Date.now()), t: texto });
    while (l.length > 30) l.shift();
    gravar(`ocorr:${canal}:${hoje()}`, l);
    console.warn(`[auto-chat ${canal}] ${texto}`);
  };

  // ======================= PÁGINA DA KICK =======================
  const slugAtual = () => (location.pathname.split("/")[1] || "").toLowerCase();
  const acharInput = () =>
    document.querySelector('[data-testid="chat-input"]') ||
    document.querySelector('#chat-input-wrapper [contenteditable="true"]') ||
    document.querySelector('div[contenteditable="true"][data-lexical-editor="true"]') ||
    document.querySelector('div[contenteditable="true"]');
  const acharBotao = () =>
    document.querySelector("#send-message-button") ||
    document.querySelector('button[aria-label*="send" i], button[aria-label*="enviar" i]') ||
    document.querySelector('[data-testid="send-message-button"]') ||
    [...document.querySelectorAll("button")].find(b => /^(chat|enviar|send|bate-papo)$/i.test(b.textContent.trim()) && b.offsetParent);
  // texto das últimas mensagens do chat (sobe a partir do campo de digitar até achar a lista)
  const subirAteOChat = () => {
    let el = acharInput();
    for (let i = 0; el && i < 15 && el.parentElement; i++) { el = el.parentElement; if ((el.innerText || "").length > 800) break; }
    return el === acharInput() ? null : el;
  };
  const textoDoChat = () => { const el = subirAteOChat(); return el ? el.innerText || "" : ""; };
  // Para conferir se a mensagem saiu: a lista de mensagens (ids conhecidos da Kick ou subindo a partir do campo),
  // sem o painel do auto-chat (ele mostra a frase enviada) e sem o campo de digitar
  const containerDoChat = () =>
    document.querySelector('#chatroom-messages, #chat-messages, [data-testid="chat-messages"], [data-testid="chatroom-messages"]') || subirAteOChat();
  const textoSemPainel = (raiz) => {
    if (!raiz) return "";
    const pular = (el) => !el || !!el.closest("head, #autochat, #autochat-pilula, [contenteditable='true'], script, style");
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (pular(n.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const partes = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) partes.push(n.nodeValue);
    return partes.join("\n");
  };
  // texto corrido (a Kick pode quebrar a mensagem em pedaços: nome, emoji, link...)
  const contarNoChat = (frase) => textoSemPainel(containerDoChat()).replace(/\n/g, "").split(frase).length - 1;
  const assinaturaDoChat = () => { const t = textoSemPainel(containerDoChat()); return t.length + "|" + t.slice(-300); };
  // Live no mudo: aba sem som o Chrome pode congelar ou descartar em segundo plano
  // Live no mudo: a página tem mais de um <video> (player + prévia muda), e a Kick começa muda até você clicar.
  // Só está no mudo se TODOS os vídeos que estão tocando estão sem som. Com som em qualquer um, não avisa.
  const videoMudo = () => {
    const tocando = [...document.querySelectorAll("video")].filter(v => !v.paused && !v.ended && v.readyState >= 2 && v.duration !== 0);
    return tocando.length > 0 && tocando.every(v => v.muted || v.volume === 0);
  };
  // Faixa "OFFLINE" + "está off-line" na página do canal
  const offlineNaTela = () => {
    const folhas = [...document.querySelectorAll("span, div, p, h1, h2, h3")].filter(e => e.childElementCount === 0 && e.offsetParent);
    const selo = folhas.some(e => e.textContent.trim() === "OFFLINE");
    const frase = folhas.some(e => /(está off-?line|is offline|está desconectado)\s*$/i.test(e.textContent.trim()) && !e.closest("#chatroom, #chatroom-messages, [data-chat-entry], .chat-entry"));
    return selo && frase;
  };
  const estaAoVivo = async (canal) => {
    if (offlineNaTela()) return false;
    try {
      const r = await fetch(`/api/v2/channels/${canal}`, { credentials: "include" });
      if (!r.ok) return true;                        // não deu para conferir: segue
      const j = await r.json();
      if (!j || !("livestream" in j)) return true;
      return !!(j.livestream && j.livestream.is_live !== false);
    } catch (e) { return true; }
  };
  // Clima do chat (risada / triste / neutro) e idioma (pt / es)
  const climaDoChat = (txt) => {
    for (const f of TODAS_FRASES) txt = txt.split(f).join(" ");          // ignora as nossas
    txt = txt.slice(-2500);
    const conta = re => (txt.match(re) || []).length;
    const risos = conta(/k{4,}|(?:ha){3,}|(?:ja){3,}|(?:je){3,}|(?:rs){3,}|😂|🤣|kekw|lmao/gi);
    const tristeza = conta(/(^|:)\s*f\s*$|\brip\b|\bqepd\b|luto|triste|sentimentos|pêsames|condolencias|descanse em paz|descanse en paz|😢|💔|🕊/gim);
    if (tristeza >= 3 && tristeza >= risos) return "triste";
    if (risos >= 5) return "risada";
    return "neutro";
  };
  const idiomaDoChat = (txt) => {
    const t = " " + txt.toLowerCase().replace(/\s+/g, " ") + " ";
    const conta = (lista) => lista.reduce((n, w) => n + (t.split(w).length - 1), 0);
    const es = conta([" es ", " muy ", " pero ", "jaja", " gracias", " hola", " qué ", " bueno", " hermano", " eso ", " esto ", " tengo ", " puede", " ahora ", " también", " está bien", " vos "]);
    const pt = conta(["kkk", " não ", " muito ", " você ", " tá ", " mano ", " obrigad", " isso ", " esse ", " agora ", " também ", " tô ", " né ", " bora ", " tamo "]);
    return es >= 4 && es > pt * 1.5 ? "es" : "pt";
  };

  // ======================= CÓPIAS ANTIGAS DO SCRIPT =======================
  // Frases das versões antigas (até a 1.7), que mandavam mensagem até com a live offline
  const FRASES_ANTIGAS = new Set([
    "boa gabe essa foi demais", "salve chat tamo junto aqui hoje", "que jogada brabo demais mano kkkk",
    "tô assistindo aqui desde o começo", "essa live tá muito boa hoje", "kkkkk não acredito que isso aconteceu",
    "gabe você é muito monstro mesmo", "bora gabe vamos pra cima deles", "melhor live da kick com certeza",
    "aí sim agora a coisa ficou boa", "slk mano que momento foi esse", "chat tá muito animado hoje hein",
    "quero ver essa próxima partida aí", "essa foi pro clipe com certeza", "gabe manda um salve pra galera",
    "boa essa foi muito boa", "kkkkk essa foi muito engraçada", "tô assistindo aqui desde cedo", "essa live tá muito boa",
    "não acredito que isso aconteceu", "bora que bora vamos nessa", "aí sim agora ficou bom", "que momento foi esse mano",
    "chat tá animado hoje hein", "essa foi pro clipe hein", "manda um salve pra galera", "tamo junto até o final",
    "melhor parte da live até agora", "kkkk ri muito com essa"
  ].filter(f => !TODAS_FRASES.has(f)));
  let copiaAntiga = false;
  const limparMensagemAntiga = () => {
    const input = acharInput();
    if (!input || !FRASES_ANTIGAS.has((input.textContent || "").trim())) return;
    input.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    console.warn("[auto-chat] bloqueei uma mensagem da versão antiga do script");
  };
  const barrarCopiaAntiga = () => { copiaAntiga = true; [50, 200, 350].forEach(t => setTimeout(limparMensagemAntiga, t)); };
  // versões antigas ainda rodando nesta página: desliga
  const pararAntiga = (o) => { try { if (typeof o.parar === "function") o.parar(); else if (typeof o.stop === "function") o.stop(); } catch (e) {} };
  // painel de versão antiga (até a 2.4) ainda na tela
  const painelAntigoNaTela = () => [...document.body.children].some(x => x.id !== "autochat" && x.style && x.style.position === "fixed" && (x.textContent || "").trim().startsWith("Auto-chat ativo"));

  // ======================= ESTILO DO PAINEL =======================
  const css = document.createElement("style");
  css.textContent = `
    #autochat{position:fixed;left:16px;bottom:16px;z-index:999999;width:300px;max-width:calc(100vw - 32px);background:#0f1115;color:#e7f5e4;
      border:1px solid #53fc18;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.45);font:12.5px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    #autochat .ac-cab{display:flex;align-items:center;gap:8px;padding:9px 10px 6px 12px;cursor:default}
    #autochat .ac-pont{width:9px;height:9px;border-radius:50%;background:#64748b;flex:none}
    #autochat[data-st="aovivo"] .ac-pont{background:#53fc18;box-shadow:0 0 0 3px rgba(83,252,24,.2)}
    #autochat[data-st="pausado"] .ac-pont{background:#fbbf24}
    #autochat .ac-tit{font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #autochat .ac-ver{opacity:.5;font-weight:500;font-size:11px}
    #autochat button{font:inherit;cursor:pointer;border-radius:8px;border:1px solid #2a3140;background:#1a1f29;color:#e7f5e4;padding:5px 8px}
    #autochat button:hover{border-color:#53fc18}
    #autochat .ac-ico{width:26px;height:26px;padding:0;display:grid;place-items:center}
    #autochat .ac-corpo{padding:0 12px 10px}
    #autochat .ac-st{font-weight:600}
    #autochat .ac-num{display:flex;flex-wrap:wrap;gap:2px 12px;color:#a7b0c0;margin:4px 0}
    #autochat .ac-num > span{white-space:nowrap}
    #autochat .ac-num b{color:#e7f5e4;font-variant-numeric:tabular-nums}
    #autochat .ac-log{color:#a7b0c0;margin:4px 0;min-height:18px;word-break:break-word}
    #autochat .ac-ult{color:#a7b0c0}
    #autochat .ac-ult.risco{color:#ff6b6b;font-weight:600}
    #autochat .ac-alerta{color:#ff6b6b;font-weight:600;margin:6px 0}
    #autochat .ac-alerta .ac-x{float:right;margin:0 0 4px 6px;background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:0 4px}
    #autochat .ac-oc{margin:4px 0;color:#a7b0c0}
    #autochat .ac-oc summary{cursor:pointer;color:#fbbf24}
    #autochat .ac-oc ol{margin:4px 0 0;padding-left:18px;max-height:130px;overflow:auto}
    #autochat .ac-oc li{margin:2px 0}
    #autochat [hidden]{display:none !important}
    #autochat .ac-bts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    #autochat.min{width:auto;border-radius:999px;cursor:pointer}
    #autochat.min .ac-corpo,#autochat.min .ac-tit{display:none}
    #autochat .ac-mini{display:none;font-weight:700;font-variant-numeric:tabular-nums}
    #autochat.min .ac-mini{display:inline}
    #autochat-pilula{position:fixed;left:16px;bottom:16px;z-index:999998;display:flex;align-items:center;gap:6px;background:#0f1115;color:#e7f5e4;
      border:1px solid #2a3140;border-radius:999px;padding:6px 8px 6px 12px;font:12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.35)}
    #autochat-pilula button{font:inherit;cursor:pointer;border-radius:999px;border:1px solid #53fc18;background:transparent;color:#53fc18;padding:4px 10px}
    #autochat-pilula .x{border-color:#2a3140;color:#a7b0c0;padding:4px 8px}`;
  document.head.appendChild(css);

  // ======================= UM CANAL =======================
  function iniciarCanal(canal) {
    const regra = regraDe(canal);
    const LIMITE_PAUSA_MS = tempo(regra.janela * 60000, "limiteMs"), ALERTA_PAUSA_MS = tempo((regra.janela - 3) * 60000, "alertaMs");
    // Prazo: a próxima mensagem sai no máximo 2,5 min antes de completar a janela desde a última que APARECEU no chat
    // (folga para o Chrome atrasar o relógio de abas em segundo plano e para uma tentativa extra)
    const MARGEM_MS = tempo(150000, "margemMs");
    let parado = false, timer = null, tick = null, minuto = null, vigia = null;
    let proximo = 0, status = "carregando", checagensOff = 0, copiaFora = "", baseFora = null, semCampo = 0, aoVivoDesde = 0;
    let enviando = false, falhasSeguidas = 0, conferiuAlguma = false, pendente = null, ultimoTexto = "", pulsoLocal = Date.now();
    let mudoDesde = 0;
    // O Chrome (Economia de memória) "dorme" abas paradas: enquanto isso o script não roda e perde pontos.
    // Quando a aba volta, document.wasDiscarded é true; o pulso de cada minuto diz quanto tempo ficou parada.
    const pulsoAnterior = ler(`pulso:${canal}`, 0);
    const descartada = T.descartada ?? !!document.wasDiscarded;
    const minParada = pulsoAnterior ? Math.round((Date.now() - pulsoAnterior) / 60000) : 0;
    const recentes = ler(`recentes:${canal}`, []);
    const pausado = () => ler(`pausado:${canal}`, false);
    const idiomaEscolhido = () => ler(`idioma:${canal}`, "auto");

    // ---------- painel ----------
    const painel = document.createElement("div");
    painel.id = "autochat";
    painel.innerHTML = `
      <div class="ac-cab"><span class="ac-pont"></span><span class="ac-tit">🤖 Auto-chat · <span class="ac-canal"></span> <span class="ac-ver"></span></span><span class="ac-mini"></span>
        <button type="button" class="ac-ico" data-a="min" title="Minimizar">–</button></div>
      <div class="ac-corpo">
        <div class="ac-st"></div>
        <div class="ac-num"><span>Hoje: <b class="ac-msgs">0</b> msg</span><span>Valendo: <b class="ac-min">0h00</b></span><span>≈ <b class="ac-pts">0</b><span class="ac-poss"></span> <span class="ac-un">pts</span></span></div>
        <div class="ac-ult"></div>
        <div class="ac-log"></div>
        <div class="ac-alerta" data-al="antiga" hidden></div>
        <div class="ac-alerta" data-al="fora" hidden></div>
        <div class="ac-alerta" data-al="campo" hidden>⚠ Não achei o campo do chat: confira se você está logado na Kick e com o chat aberto.</div>
        <div class="ac-alerta" data-al="descartada" hidden></div>
        <div class="ac-alerta" data-al="mudo" hidden><button type="button" class="ac-x" data-a="fecharMudo" title="Não avisar de novo">✕</button>🔇 A live está no mudo: em segundo plano o Chrome pode congelar a aba e você perde pontos. Deixe o volume baixinho (1%) em vez do mudo.</div>
        <details class="ac-oc" hidden><summary>⚠ Ocorrências hoje: <b class="ac-noc">0</b></summary><ol class="ac-loc"></ol></details>
        <div class="ac-bts">
          <button type="button" data-a="pausa"></button>
          <button type="button" data-a="agora">✉ Enviar agora</button>
          <button type="button" data-a="idioma" title="Idioma das frases (Auto escolhe pelo chat)"></button>
          <button type="button" data-a="avisos" hidden>🔔 Avisos</button>
          <button type="button" data-a="desativar" title="Parar de mandar mensagens neste canal">Desativar aqui</button>
        </div>
      </div>`;
    const $ = (s) => painel.querySelector(s);
    $(".ac-canal").textContent = canal;
    $(".ac-ver").textContent = "v" + VERSAO;
    if (descartada) {
      const al = $('[data-al="descartada"]');
      const quanto = minParada >= 2 && minParada <= 720 ? ` (ficou ${minParada} min parada)` : "";
      al.innerHTML = `<button type="button" class="ac-x" data-a="fecharDesc" title="Fechar">✕</button>⚠ O Chrome tinha "dormido" esta aba para economizar memória${quanto}: nesse tempo não sai mensagem e perde pontos. Para evitar: Chrome → Configurações → Desempenho → Sempre manter estes sites ativos → Adicionar → kick.com`;
      al.hidden = false;
      registrar(canal, `o Chrome "dormiu" a aba${quanto} (Economia de memória)`);
    }
    $('[data-al="antiga"]').textContent = `⚠ Tem uma versão ANTIGA do auto-chat nesta página (ela manda mensagem até com a live offline; eu bloqueio quando consigo). Apague-a no Tampermonkey → Painel de opções e deixe só a ${VERSAO}.`;
    document.body.appendChild(painel);
    if (ler("minimizado", false)) painel.classList.add("min");
    const log = (t) => { $(".ac-log").textContent = t; console.log(`[auto-chat ${canal}]`, t); };

    const relogio = () => {
      const s = Math.max(0, Math.round((proximo - Date.now()) / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    };
    const atualizarPainel = () => {
      if (parado) return;
      const st = pausado() ? "pausado" : status;
      painel.dataset.st = st;
      const textos = { carregando: "Conferindo se a live está no ar…", aovivo: enviando ? "🔴 Ao vivo · conferindo se a mensagem apareceu no chat…" : `🔴 Ao vivo · próxima em ${relogio()}`, offline: `Live offline · confere de novo em ${relogio()}`, pausado: "⏸ Pausado (não manda nada)" };
      $(".ac-st").textContent = textos[st] || st;
      $(".ac-mini").textContent = st === "pausado" ? "⏸" : st === "aovivo" ? relogio() : "off";
      const e = estatHoje(canal);
      $(".ac-msgs").textContent = e.msgs || 0;
      $(".ac-min").textContent = `${Math.floor((e.minutos || 0) / 60)}h${String((e.minutos || 0) % 60).padStart(2, "0")}`;
      const pts = Math.floor((e.minutos || 0) / regra.janela) * regra.pontos;
      const possiveis = Math.floor(((e.aoVivo || 0) + (e.parado || 0)) / regra.janela) * regra.pontos;   // se nada tivesse falhado
      $(".ac-pts").textContent = pts;
      $(".ac-poss").textContent = possiveis > pts ? ` de ${possiveis}` : "";
      $(".ac-un").textContent = regra.unidade;
      // tempo desde a última mensagem enviada: passar da janela da regra com a live no ar perde os pontos
      const ult = ler(`ultimo:${canal}`, 0);
      const risco = st === "aovivo" && Date.now() - Math.max(ult, aoVivoDesde) > ALERTA_PAUSA_MS;   // conta a partir do início da live
      const ultEl = $(".ac-ult");
      ultEl.textContent = (ult ? `Última mensagem: há ${Math.floor((Date.now() - ult) / 60000)} min` : "Última mensagem: —") + (risco ? ` ⚠ perto de ${regra.janela} min sem escrever (a pausa não conta)` : "");
      ultEl.classList.toggle("risco", risco);
      $('[data-a="pausa"]').textContent = pausado() ? "▶ Retomar" : "⏸ Pausar";
      const id = idiomaEscolhido();
      $('[data-a="idioma"]').textContent = id === "auto" ? "🌐 Auto" : id === "es" ? "🌐 ES" : "🌐 PT";
      $('[data-al="antiga"]').hidden = !(copiaAntiga || painelAntigoNaTela());
      const fora = $('[data-al="fora"]');
      if (copiaFora) { fora.hidden = false; fora.textContent = `⚠ Uma cópia ANTIGA do auto-chat mandou "${copiaFora}" de OUTRA aba, navegador ou aparelho (não foi esta). No Chrome: Ctrl+Shift+A, digite "kick" e feche as outras abas da Kick.`; }
      $('[data-al="campo"]').hidden = semCampo < 3;
      $('[data-a="avisos"]').hidden = !window.Notification || Notification.permission === "granted";
      const mudoAgora = st === "aovivo" && videoMudo();
      mudoDesde = mudoAgora ? (mudoDesde || Date.now()) : 0;
      $('[data-al="mudo"]').hidden = !(mudoDesde && Date.now() - mudoDesde > tempo(4000, "mudoMs") && !ler("mudoOk", false));
      const oc = ocorrHoje(canal), det = $(".ac-oc");
      det.hidden = !oc.length;
      $(".ac-noc").textContent = oc.length;
      const chave = oc.length ? oc.length + oc[oc.length - 1].h + oc[oc.length - 1].t : "";
      if (det.dataset.k !== chave) {
        det.dataset.k = chave;
        const ol = $(".ac-loc"); ol.textContent = "";
        oc.slice(-8).reverse().forEach(o => { const li = document.createElement("li"); li.textContent = `${o.h} — ${o.t}`; ol.appendChild(li); });
      }
    };

    // ---------- escolher e enviar a frase ----------
    const escolherFrase = (clima, idioma) => {
      const lista = FRASES[idioma][clima] || FRASES[idioma].neutro;
      const livres = lista.filter(f => !recentes.includes(f));     // não repete as últimas 6
      const pool = livres.length ? livres : lista;
      const f = pool[Math.floor(Math.random() * pool.length)];
      recentes.push(f); while (recentes.length > 6) recentes.shift();
      gravar(`recentes:${canal}`, recentes);
      const emoji = Math.random() < 0.3 ? " " + EMOJIS[clima][Math.floor(Math.random() * EMOJIS[clima].length)] : "";
      return { frase: f, msg: f + emoji };
    };
    const esperar = (ms) => new Promise(r => setTimeout(r, ms));
    const ultimoOk = () => Math.max(ler(`ultimo:${canal}`, 0), aoVivoDesde);
    // frase nossa que ficou no campo (a Kick não aceitou): pode limpar, não é você digitando
    const ehNosso = (t) => !!t && (t === ultimoTexto || [...TODAS_FRASES].some(f => t === f || t.startsWith(f + " ")));
    const limparCampo = () => {
      const inp = acharInput(); if (!inp) return;
      inp.focus(); document.execCommand("selectAll", false, null); document.execCommand("delete", false, null);
    };
    // Recarrega a página quando o chat trava (campo sumiu ou mensagens seguidas não aparecem). No máximo 1 vez a cada 15 min.
    const recarregar = (motivo) => {
      if (Date.now() - ler(`recarga:${canal}`, 0) < tempo(15 * 60000, "recargaGuardaMs")) { log(`⚠ ${motivo} (já recarreguei há pouco)`); return false; }
      const t = (acharInput()?.textContent || "").trim();
      if (t && !ehNosso(t)) return false;                 // você está digitando: não recarrega
      gravar(`recarga:${canal}`, Date.now());
      registrar(canal, `recarreguei a página: ${motivo}`);
      if (T.semRecarregar) { window.__autoChatRecarregou = motivo; return true; }
      location.reload();
      return true;
    };
    const deuCerto = (msg, idioma, clima, conferida) => {
      somarHoje(canal, "msgs"); gravar(`ultimo:${canal}`, Date.now());
      falhasSeguidas = 0; pendente = null;
      if (conferida) conferiuAlguma = true;
      log(`${conferida ? "✓ Apareceu no chat" : "Enviado (não deu para conferir no chat)"} [${idioma} · ${clima}]: "${msg}"`);
      atualizarPainel();
    };
    const deuErrado = (motivo) => {
      falhasSeguidas++;
      somarHoje(canal, "falhas");
      registrar(canal, motivo);
      const espera = falhasSeguidas >= 3 ? tempo(120000, "retryLongoMs") : tempo(40000, "retryMs");
      log(`⚠ ${motivo}: mando outra em ${Math.round(espera / 1000)}s`);
      if (falhasSeguidas >= 3) recarregar(`${falhasSeguidas} tentativas seguidas sem a mensagem aparecer`);
      return espera;
    };
    // Escreve a frase, aperta Enter (ou o botão) e confere se ela apareceu na lista do chat.
    // Devolve { r: "ok" | "semconferir" | "falhou" | "digitando" | "semcampo" | "fora" | "ocupado" | "parado", espera }
    const enviar = async () => {
      if (parado || enviando) return { r: "ocupado" };
      if (slugAtual() !== canal) { log("Você saiu deste canal: não mandei nada."); return { r: "fora" }; }   // trocou de canal na mesma aba
      // a de antes, que não tinha aparecido, apareceu atrasada? então valeu
      if (pendente && contarNoChat(pendente.frase) > pendente.antes) { const p = pendente; deuCerto(p.msg, p.idioma, p.clima, true); return { r: "ok" }; }
      const input = acharInput();
      if (!input) {
        semCampo++; log("Não achei o campo do chat.");
        if (semCampo >= 3) recarregar("o campo do chat sumiu");
        return { r: "semcampo", espera: tempo(40000, "retryMs") };
      }
      semCampo = 0;
      const noCampo = (input.textContent || "").trim();
      if (noCampo) {
        if (!ehNosso(noCampo)) { log("Você está digitando: tento de novo em 30s"); return { r: "digitando", espera: tempo(30000, "digitandoMs") }; }
        limparCampo();                                      // sobrou uma frase nossa que não saiu
      }
      enviando = true;
      try {
        const txt = textoDoChat();
        let clima = "neutro", idioma = idiomaEscolhido();
        try { clima = climaDoChat(txt); } catch (e) {}
        if (idioma === "auto") { try { idioma = idiomaDoChat(txt); } catch (e) { idioma = "pt"; } }
        const { frase, msg } = escolherFrase(clima, idioma);
        ultimoTexto = msg;
        const antes = contarNoChat(frase), chatAntes = assinaturaDoChat();
        const campo = acharInput() || input;
        campo.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, msg);
        const vazio = () => !(acharInput()?.textContent || "").trim();
        const apertarEnter = el => ["keydown", "keypress", "keyup"].forEach(t =>
          el.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true })));
        const tentativas = [
          () => apertarEnter(acharInput() || campo),
          () => { const b = acharBotao(); if (b) b.click(); },
          () => { const b = acharBotao(); if (b) ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(t => b.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))); },
          () => { (acharInput() || campo).closest("form")?.requestSubmit?.(); }
        ];
        await esperar(tempo(400, "digitarMs"));
        for (let i = 0; i < tentativas.length && !vazio() && !parado; i++) {
          try { tentativas[i](); } catch (e) {}
          await esperar(tempo(2500, "tentativaMs"));
        }
        if (parado) return { r: "parado" };
        if (!vazio()) {
          limparCampo();                                    // não deixa a frase parada no campo
          return { r: "falhou", espera: deuErrado("a Kick não aceitou a mensagem (modo lento, chat restrito ou sem conexão?)") };
        }
        // saiu do campo: espera aparecer na lista do chat
        const ate = Date.now() + tempo(12000, "confirmarMs");
        do {
          if (contarNoChat(frase) > antes) { deuCerto(msg, idioma, clima, true); return { r: "ok" }; }
          await esperar(tempo(500, "conferirPassoMs"));
        } while (Date.now() < ate && !parado);
        if (parado) return { r: "parado" };
        // Não apareceu. Se dá para conferir nesta página (já apareceu outra antes, ou o chat está andando), foi falha mesmo.
        if (conferiuAlguma || assinaturaDoChat() !== chatAntes) {
          pendente = { frase, msg, idioma, clima, antes };    // se aparecer atrasada, ainda conta
          return { r: "falhou", espera: deuErrado("a mensagem não apareceu no chat") };
        }
        deuCerto(msg, idioma, clima, false);                // chat parado ou diferente: conta como enviada (o campo esvaziou)
        return { r: "semconferir" };
      } finally { enviando = false; }
    };
    // Próxima mensagem: sorteio do intervalo do canal, mas nunca depois do prazo
    const proximaNormal = () => {
      const sorteio = tempo((regra.intervalo[0] + Math.random() * regra.intervalo[1]) * 60000, "intervaloMs");
      const prazo = ultimoOk() + LIMITE_PAUSA_MS - MARGEM_MS - Date.now();
      return prazo < sorteio ? Math.max(tempo(20000, "minimoMs"), prazo) : sorteio;
    };
    const depoisDeEnviar = (res) => {
      if (parado || !res || ["ocupado", "parado", "fora"].includes(res.r)) return;
      agendar(res.r === "ok" || res.r === "semconferir" ? proximaNormal() : res.espera || tempo(40000, "retryMs"));
    };

    // ---------- ciclo: live no ar? manda e agenda a próxima ----------
    const chaveOff = `off:${canal}`;
    const avisar = (t) => {
      try { if (window.Notification && Notification.permission === "granted") new Notification(t); } catch (e) {}
      const titulo = document.title; let n = 0;
      const pisca = setInterval(() => { document.title = n++ % 2 ? titulo : "🔴 AO VIVO!"; if (n > 20) { clearInterval(pisca); document.title = titulo; } }, 1000);
    };
    const agendar = (ms) => { clearTimeout(timer); proximo = Date.now() + ms; timer = setTimeout(ciclo, ms); };
    const ciclo = async () => {
      if (parado) return;
      if (pausado()) { status = "pausado"; agendar(tempo(30000, "pausaMs")); return; }
      const aoVivo = await estaAoVivo(canal);
      if (parado) return;
      if (!aoVivo) {
        status = "offline"; gravar(chaveOff, true); checagensOff++;
        // a página do canal nem sempre se atualiza sozinha: recarrega a cada 5 checagens offline
        if (checagensOff >= 5 && !T.semRecarregar) { location.reload(); return; }
        log("Live offline: esperando começar.");
        agendar(tempo(60000, "offlineMs"));
        return;
      }
      if (ler(chaveOff, false)) { gravar(chaveOff, false); avisar(`${canal} abriu a live! Auto-chat ligado.`); }
      if (status !== "aovivo") aoVivoDesde = Date.now();
      status = "aovivo"; checagensOff = 0;
      agendar(tempo(60000, "seguroMs"));             // se o envio travar, o ciclo volta sozinho
      depoisDeEnviar(await enviar());
    };

    // ---------- cópia antiga fora desta aba: percebe pelo chat ----------
    const vigiarFora = () => {
      if (parado || !acharInput()) return;
      let n = 0, ultima = "";
      for (const linha of textoDoChat().split("\n")) {
        const l = linha.trim();
        for (const f of FRASES_ANTIGAS) if (l === f || l.endsWith(": " + f) || l.endsWith(":" + f)) { n++; ultima = f; }
      }
      if (baseFora !== null && n > baseFora) { copiaFora = ultima; console.warn("[auto-chat] cópia antiga em outra aba/navegador mandou:", ultima); }
      baseFora = n;
    };

    // ---------- botões ----------
    painel.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (!a) { if (painel.classList.contains("min")) { painel.classList.remove("min"); gravar("minimizado", false); } return; }
      e.stopPropagation();
      if (a === "min") { const m = !painel.classList.contains("min"); painel.classList.toggle("min", m); gravar("minimizado", m); }
      if (a === "pausa") { gravar(`pausado:${canal}`, !pausado()); log(pausado() ? "Pausado: não vai mandar nada até você retomar." : "Retomado."); if (!pausado()) agendar(500); }
      if (a === "agora") enviar().then(depoisDeEnviar);
      if (a === "idioma") { const ordem = ["auto", "pt", "es"]; gravar(`idioma:${canal}`, ordem[(ordem.indexOf(idiomaEscolhido()) + 1) % 3]); }
      if (a === "avisos" && window.Notification) Notification.requestPermission().then(atualizarPainel);
      if (a === "desativar") { gravar("canais", canaisAtivos().filter(c => c !== canal)); rotear(true); return; }
      if (a === "fecharDesc") { $('[data-al="descartada"]').hidden = true; return; }
      if (a === "fecharMudo") gravar("mudoOk", true);
      atualizarPainel();
    });

    // voltou de segundo plano / de congelada: se já passou da hora, manda agora
    const aoVoltar = () => { if (!parado && status === "aovivo" && !enviando && Date.now() > proximo) agendar(0); };
    document.addEventListener("visibilitychange", aoVoltar);
    document.addEventListener("resume", aoVoltar);
    const encerrar = () => {
      parado = true;
      clearTimeout(timer); clearInterval(tick); clearInterval(minuto); clearInterval(vigia);
      document.removeEventListener("visibilitychange", aoVoltar);
      document.removeEventListener("resume", aoVoltar);
      painel.remove();
    };
    tick = setInterval(atualizarPainel, 1000);
    // minutos com a live no ar e o script ligado (para estimar os pontos do dia pela regra do canal)
    gravar(`pulso:${canal}`, Date.now());
    minuto = setInterval(() => {
      if (parado) return;
      const agora = Date.now(), lacuna = agora - pulsoLocal;
      pulsoLocal = agora;
      gravar(`pulso:${canal}`, agora);                  // "estou rodando" (para medir quanto tempo a aba ficou parada)
      // o minuto atrasou muito: o Chrome congelou a aba ou o computador suspendeu (nesse tempo nada roda)
      if (lacuna > tempo(3 * 60000, "lacunaMs") && status === "aovivo") {
        const min = Math.round(lacuna / 60000);
        registrar(canal, `a aba ficou parada ${min} min (${hhmm(agora - lacuna)}–${hhmm(agora)}): Chrome congelou a aba ou o computador suspendeu`);
        somarHoje(canal, "parado", min);
      }
      if (status === "aovivo" && !pausado() && slugAtual() === canal) {
        somarHoje(canal, "aoVivo");                       // tempo de live com o script ligado (para "≈ X de Y")
        const ult = ler(`ultimo:${canal}`, 0);
        if (ult && agora - ult <= LIMITE_PAUSA_MS) somarHoje(canal, "minutos");
        atualizarPainel();
        if (!enviando && agora - proximo > tempo(90000, "atrasoMs")) agendar(0);   // o relógio do envio se perdeu
      }
    }, tempo(60000, "minutoMs"));
    setTimeout(() => { if (parado) return; vigiarFora(); vigia = setInterval(vigiarFora, 5000); }, tempo(15000, "vigiaMs"));
    log("Carregando…");
    atualizarPainel();
    agendar(tempo(8000, "inicioMs"));                // espera a página montar (faixa OFFLINE etc.)
    return { canal, encerrar, enviar };
  }

  // ======================= ROTEADOR =======================
  // A Kick troca de canal sem recarregar a página: a cada segundo confere o canal aberto.
  let atual = null, pilula = null;
  const tirarPilula = () => { if (pilula) { pilula.remove(); pilula = null; } };
  const mostrarPilula = (canal) => {
    if (pilula && pilula.dataset.canal === canal) return;
    tirarPilula();
    if (ler(`ignorar:${canal}`, false)) return;
    pilula = document.createElement("div");
    pilula.id = "autochat-pilula";
    pilula.dataset.canal = canal;
    pilula.innerHTML = `🤖 <button type="button" class="on">Ativar auto-chat aqui</button><button type="button" class="x" title="Não mostrar neste canal">✕</button>`;
    pilula.querySelector(".on").onclick = () => { gravar("canais", [...new Set([...canaisAtivos(), canal])]); tirarPilula(); rotear(true); };
    pilula.querySelector(".x").onclick = () => { gravar(`ignorar:${canal}`, true); tirarPilula(); };
    document.body.appendChild(pilula);
  };
  function rotear(forcar) {
    const canal = slugAtual();
    if (atual && (atual.canal !== canal || forcar)) { atual.encerrar(); atual = null; }
    if (!canal || !acharInput()) { if (!atual) tirarPilula(); return; }   // não é página de canal (ou o chat ainda não carregou)
    if (canaisAtivos().includes(canal)) { tirarPilula(); if (!atual) atual = iniciarCanal(canal); }
    else if (!atual) mostrarPilula(canal);
  }

  // ======================= CONVIVÊNCIA COM OUTRAS CÓPIAS =======================
  let roteador = null;
  const encerrarTudo = () => { clearInterval(roteador); if (atual) atual.encerrar(); atual = null; tirarPilula(); css.remove(); if (window.__autoChat === eu) delete window.__autoChat; };
  const eu = {
    versao: VERSAO,
    encerrar: encerrarTudo,                          // cópias 3.0+ usam este para trocar de versão
    parar: () => barrarCopiaAntiga(),                // as 2.3/2.4 chamam parar() ao começar: não desligam esta
    stop: () => barrarCopiaAntiga(),                 // as até 2.2 chamam stop() ao começar
    enviar: () => atual && atual.enviar()
  };
  const anterior = window.__autoChat;
  if (anterior) {
    if (typeof anterior.encerrar === "function") anterior.encerrar();
    else { pararAntiga(anterior); barrarCopiaAntiga(); }
  }
  window.__autoChat = eu;
  roteador = setInterval(() => {
    // cópia antiga que começou depois desta: desliga ela e volta a ser a cópia ativa
    if (window.__autoChat !== eu) {
      const outro = window.__autoChat;
      if (outro && typeof outro.encerrar === "function") { encerrarTudo(); return; }   // versão mais nova assumiu
      if (outro) { pararAntiga(outro); barrarCopiaAntiga(); }
      window.__autoChat = eu;
    }
    rotear(false);
  }, tempo(1000, "roteadorMs"));
  rotear(false);
})();
