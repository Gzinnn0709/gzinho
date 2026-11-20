// Kick auto-chat 3.0 — manda uma mensagem a cada 8–10 min nos canais escolhidos, só com a live no ar.
// Instale pelo Tampermonkey (arquivo kick-auto-chat.user.js). Também funciona colado no Console (F12).
// No painel: pausar, mandar agora, idioma das frases, minimizar e desativar o canal.
(() => {
  "use strict";
  const VERSAO = "3.1";
  const T = window.__autoChatTeste || {};            // só para os testes automáticos (acelera os tempos)
  const tempo = (padrao, chave) => (T[chave] ?? padrao);

  // ======================= CONFIGURAÇÃO =======================
  const CANAIS_PADRAO = ["gabepeixe", "brabox", "orenatovicente"];
  const MINUTOS_BASE = 8, VARIACAO_MIN = 2;          // 8 a 10 minutos entre mensagens
  // Regra dos pontos (Peixes do Gabe): 1 a cada 15 min escrevendo no chat durante a live;
  // uma pausa de mais de 15 min não conta. O painel avisa antes de chegar nesse limite.
  const LIMITE_PAUSA_MS = tempo(15 * 60000, "limiteMs"), ALERTA_PAUSA_MS = tempo(12 * 60000, "alertaMs");
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
  const somarHoje = (canal, campo) => { const e = estatHoje(canal); e[campo] = (e[campo] || 0) + 1; gravar(`dia:${canal}:${hoje()}`, e); };

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
  const textoDoChat = () => {
    let el = acharInput(), txt = "";
    for (let i = 0; el && i < 15 && el.parentElement; i++) { el = el.parentElement; txt = el.innerText || ""; if (txt.length > 800) break; }
    return txt;
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
    #autochat .ac-num{display:flex;gap:12px;color:#a7b0c0;margin:4px 0}
    #autochat .ac-num b{color:#e7f5e4;font-variant-numeric:tabular-nums}
    #autochat .ac-log{color:#a7b0c0;margin:4px 0;min-height:18px;word-break:break-word}
    #autochat .ac-ult{color:#a7b0c0}
    #autochat .ac-ult.risco{color:#ff6b6b;font-weight:600}
    #autochat .ac-alerta{color:#ff6b6b;font-weight:600;margin:6px 0}
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
    let parado = false, timer = null, retry = null, tick = null, minuto = null, vigia = null;
    let proximo = 0, status = "carregando", checagensOff = 0, copiaFora = "", baseFora = null, semCampo = 0, aoVivoDesde = 0;
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
        <div class="ac-num"><span>Hoje: <b class="ac-msgs">0</b> msg</span><span>Valendo: <b class="ac-min">0h00</b></span><span>≈ <b class="ac-pts">0</b> <span class="ac-un">pts</span></span></div>
        <div class="ac-ult"></div>
        <div class="ac-log"></div>
        <div class="ac-alerta" data-al="antiga" hidden></div>
        <div class="ac-alerta" data-al="fora" hidden></div>
        <div class="ac-alerta" data-al="campo" hidden>⚠ Não achei o campo do chat: confira se você está logado na Kick e com o chat aberto.</div>
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
      const textos = { carregando: "Conferindo se a live está no ar…", aovivo: `🔴 Ao vivo · próxima em ${relogio()}`, offline: `Live offline · confere de novo em ${relogio()}`, pausado: "⏸ Pausado (não manda nada)" };
      $(".ac-st").textContent = textos[st] || st;
      $(".ac-mini").textContent = st === "pausado" ? "⏸" : st === "aovivo" ? relogio() : "off";
      const e = estatHoje(canal);
      $(".ac-msgs").textContent = e.msgs || 0;
      $(".ac-min").textContent = `${Math.floor((e.minutos || 0) / 60)}h${String((e.minutos || 0) % 60).padStart(2, "0")}`;
      $(".ac-pts").textContent = Math.floor((e.minutos || 0) / 15);
      $(".ac-un").textContent = canal === "gabepeixe" ? "🐟" : "pts";
      // tempo desde a última mensagem enviada: passar de 15 min com a live no ar perde o ponto
      const ult = ler(`ultimo:${canal}`, 0);
      const risco = st === "aovivo" && Date.now() - Math.max(ult, aoVivoDesde) > ALERTA_PAUSA_MS;   // conta a partir do início da live
      const ultEl = $(".ac-ult");
      ultEl.textContent = (ult ? `Última mensagem: há ${Math.floor((Date.now() - ult) / 60000)} min` : "Última mensagem: —") + (risco ? " ⚠ perto de 15 min sem escrever (a pausa não conta)" : "");
      ultEl.classList.toggle("risco", risco);
      $('[data-a="pausa"]').textContent = pausado() ? "▶ Retomar" : "⏸ Pausar";
      const id = idiomaEscolhido();
      $('[data-a="idioma"]').textContent = id === "auto" ? "🌐 Auto" : id === "es" ? "🌐 ES" : "🌐 PT";
      $('[data-al="antiga"]').hidden = !(copiaAntiga || painelAntigoNaTela());
      const fora = $('[data-al="fora"]');
      if (copiaFora) { fora.hidden = false; fora.textContent = `⚠ Uma cópia ANTIGA do auto-chat mandou "${copiaFora}" de OUTRA aba, navegador ou aparelho (não foi esta). No Chrome: Ctrl+Shift+A, digite "kick" e feche as outras abas da Kick.`; }
      $('[data-al="campo"]').hidden = semCampo < 3;
      $('[data-a="avisos"]').hidden = !window.Notification || Notification.permission === "granted";
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
      return f + emoji;
    };
    const tentarDepois = (ms) => {
      clearTimeout(retry);
      retry = setTimeout(async () => { if (!parado && !pausado() && await estaAoVivo(canal) && !parado) enviar(); }, ms);
    };
    const enviar = () => {
      if (parado) return false;
      if (slugAtual() !== canal) { log("Você saiu deste canal: não mandei nada."); return false; }   // trocou de canal na mesma aba
      const input = acharInput();
      if (!input) { semCampo++; log("Não achei o campo do chat."); return false; }
      semCampo = 0;
      if ((input.textContent || "").trim()) { log("Você está digitando: tento de novo em 30s"); tentarDepois(tempo(30000, "digitandoMs")); return false; }
      const txt = textoDoChat();
      let clima = "neutro", idioma = idiomaEscolhido();
      try { clima = climaDoChat(txt); } catch (e) {}
      if (idioma === "auto") { try { idioma = idiomaDoChat(txt); } catch (e) { idioma = "pt"; } }
      const msg = escolherFrase(clima, idioma);
      input.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, msg);
      const vazio = () => !(acharInput()?.textContent || "").trim();
      const apertarEnter = el => ["keydown", "keypress", "keyup"].forEach(t =>
        el.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true })));
      const tentativas = [
        () => apertarEnter(input),
        () => { const b = acharBotao(); if (b) b.click(); },
        () => { const b = acharBotao(); if (b) ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(t => b.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))); },
        () => { input.closest("form")?.requestSubmit?.(); }
      ];
      const tentar = (i) => {
        if (parado) return;
        if (vazio()) { somarHoje(canal, "msgs"); gravar(`ultimo:${canal}`, Date.now()); log(`Enviado [${idioma} · ${clima}]: "${msg}"`); atualizarPainel(); return; }
        if (i >= tentativas.length) { log("Não consegui enviar (modo lento?): tento de novo em 60s"); tentarDepois(tempo(60000, "falhaMs")); return; }
        try { tentativas[i](); } catch (e) {}
        setTimeout(() => tentar(i + 1), tempo(2500, "tentativaMs"));
      };
      setTimeout(() => tentar(0), tempo(400, "digitarMs"));
      return true;
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
      enviar();
      agendar(tempo((MINUTOS_BASE + Math.random() * VARIACAO_MIN) * 60000, "intervaloMs"));
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
      if (a === "agora") enviar();
      if (a === "idioma") { const ordem = ["auto", "pt", "es"]; gravar(`idioma:${canal}`, ordem[(ordem.indexOf(idiomaEscolhido()) + 1) % 3]); }
      if (a === "avisos" && window.Notification) Notification.requestPermission().then(atualizarPainel);
      if (a === "desativar") { gravar("canais", canaisAtivos().filter(c => c !== canal)); rotear(true); return; }
      atualizarPainel();
    });

    const encerrar = () => {
      parado = true;
      clearTimeout(timer); clearTimeout(retry); clearInterval(tick); clearInterval(minuto); clearInterval(vigia);
      painel.remove();
    };
    tick = setInterval(atualizarPainel, 1000);
    // minutos com a live no ar e o script ligado (para estimar os pontos do dia: 1 a cada 15 min)
    minuto = setInterval(() => {
      const ult = ler(`ultimo:${canal}`, 0);
      if (!parado && status === "aovivo" && !pausado() && slugAtual() === canal && ult && Date.now() - ult <= LIMITE_PAUSA_MS) { somarHoje(canal, "minutos"); atualizarPainel(); }
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
