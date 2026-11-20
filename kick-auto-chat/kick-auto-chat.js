// Kick auto-chat: manda uma mensagem a cada ~8-10 min (com variação aleatória).
// Uso: abra a live no kick.com (PC), aperte F12 > aba Console, cole tudo e Enter.
// Para parar: clique em "Parar" no painel ou recarregue a página.
(() => {
  if (window.__autoChat) { window.__autoChat.stop(); }

  // ====== CONFIGURAÇÃO ======
  const MINUTOS_BASE = 8;       // intervalo mínimo
  const VARIACAO_MIN = 2;       // + até 2 min aleatórios (parece menos robô)
  // O script lê o clima do chat antes de mandar:
  //  - chat rindo (kkkk, 😂)        -> HUMOR
  //  - chat triste (F, luto, rip)   -> TRISTE (respeitosa)
  //  - qualquer outro caso          -> NEUTRAS
  // Todas com 5+ palavras.
  const HUMOR = [
    "kkkkk eu não aguento mais rir",
    "chat eu tô passando mal kkkkk",
    "isso aqui é melhor que novela",
    "minha mãe perguntou por que tô rindo",
    "alguém clipa isso pelo amor de deus",
    "eu vim só olhar e fiquei kkkk",
    "o roteirista dessa live tá de parabéns",
    "não era pra eu tá rindo disso",
    "rindo sozinho aqui igual doido kkkk",
    "o chat tá mais doido que a live",
    "tô aqui só pelo caos mesmo kkkk",
    "boa demais essa kkkkk morri aqui",
    "quem riu também levanta a mão",
    "melhor que qualquer filme de comédia"
  ];
  const NEUTRAS = [
    "tô acompanhando aqui desde cedo hoje",
    "salve chat tamo junto aqui",
    "tamo junto até o final da live",
    "chat tá movimentado hoje hein",
    "acompanhando tudo aqui com atenção",
    "tô aqui firme e forte acompanhando",
    "chat alguém explica o que aconteceu",
    "eu juro que pisquei e perdi tudo",
    "parei tudo pra ver isso aqui",
    "isso merece ir pro clipe urgente",
    "nível de caos dessa live tá alto",
    "essa live faz mal pro coração"
  ];
  const TRISTE = [
    "força aí tamo junto com você",
    "sinto muito mesmo, muita força aí",
    "meus sentimentos, força pra todo mundo",
    "que momento pesado, tamo junto aqui",
    "força chat, momento difícil esse aí",
    "tamo junto nessa, muita força mesmo"
  ];
  // ==========================

  let ultima = "";
  let timer = null, tick = null, proximo = 0, enviadas = 0;

  const acharInput = () =>
    document.querySelector('[data-testid="chat-input"]') ||
    document.querySelector('#chat-input-wrapper [contenteditable="true"]') ||
    document.querySelector('div[contenteditable="true"][data-lexical-editor="true"]') ||
    document.querySelector('div[contenteditable="true"]');

  const acharBotao = () =>
    document.querySelector('#send-message-button') ||
    document.querySelector('button[aria-label*="send" i], button[aria-label*="enviar" i]') ||
    document.querySelector('[data-testid="send-message-button"]') ||
    [...document.querySelectorAll("button")].find(b => /^(chat|enviar|send|bate-papo)$/i.test(b.textContent.trim()) && b.offsetParent);

  // Lê as últimas mensagens do chat e decide o clima
  const lerClima = input => {
    let el = input, txt = "";
    for (let i = 0; i < 15 && el.parentElement; i++) { el = el.parentElement; txt = el.innerText || ""; if (txt.length > 800) break; }
    for (const m of [...HUMOR, ...NEUTRAS, ...TRISTE]) txt = txt.split(m).join(" ");   // ignora as nossas
    txt = txt.slice(-2500);
    const conta = re => (txt.match(re) || []).length;
    const risos = conta(/k{4,}|(?:ha){3,}|(?:rs){3,}|😂|🤣|kekw|lmao/gi);
    const tristeza = conta(/(^|:)\s*f\s*$|\brip\b|luto|triste|sentimentos|pêsames|descanse em paz|😢|💔|🕊/gim);
    if (tristeza >= 3 && tristeza >= risos) return "triste";
    if (risos >= 5) return "risada";
    return "neutro";
  };
  const LISTAS = { risada: HUMOR, neutro: NEUTRAS, triste: TRISTE };
  const escolher = clima => {
    const lista = LISTAS[clima] || NEUTRAS;
    let m;
    do { m = lista[Math.floor(Math.random() * lista.length)]; }
    while (m === ultima && lista.length > 1);
    ultima = m;
    return m;
  };

  const enviar = () => {
    const input = acharInput();
    if (!input) { log("Não achei o campo do chat. Você está logado e com o chat aberto?"); return false; }
    if ((input.textContent || "").trim()) { log("Você está digitando, tento de novo em 30s"); setTimeout(enviar, 30000); return false; }
    let clima = "neutro";
    try { clima = lerClima(input); } catch (e) {}
    const msg = escolher(clima);
    input.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, msg);
    const vazio = () => !(acharInput()?.textContent || "").trim();
    const apertarEnter = el => ["keydown", "keypress", "keyup"].forEach(t =>
      el.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true })));
    // Tenta vários jeitos de enviar e confere se o campo esvaziou
    const tentativas = [
      () => apertarEnter(input),
      () => { const b = acharBotao(); if (b) b.click(); },
      () => { const b = acharBotao(); if (b) ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(t =>
              b.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))); },
      () => { input.closest("form")?.requestSubmit?.(); }
    ];
    const tentar = i => {
      if (vazio()) { enviadas++; log(`Enviado [${clima}]: "${msg}" (total: ${enviadas})`); return; }
      if (i >= tentativas.length) { log(`Não consegui enviar (modo lento?), tento de novo em 60s`); setTimeout(enviar, 60000); return; }
      try { tentativas[i](); } catch (e) {}
      setTimeout(() => tentar(i + 1), 2500);
    };
    setTimeout(() => tentar(0), 400);
    return true;
  };

  // Só manda mensagem com a live no ar; avisa quando a live começa
  const canal = location.pathname.split("/")[1] || "";
  // Faixa "OFFLINE" + "está off-line" na página do canal
  const offlineNaTela = () => {
    const folhas = [...document.querySelectorAll("span, div, p, h1, h2, h3")].filter(e => e.childElementCount === 0 && e.offsetParent);
    const selo = folhas.some(e => e.textContent.trim() === "OFFLINE");
    const frase = folhas.some(e => /(está off-?line|is offline)\s*$/i.test(e.textContent.trim()) && !e.closest("#chatroom, #chatroom-messages, [data-chat-entry], .chat-entry"));
    return selo && frase;
  };
  const estaAoVivo = async () => {
    if (offlineNaTela()) return false;
    try {
      const r = await fetch(`/api/v2/channels/${canal}`, { credentials: "include" });
      if (!r.ok) return true;
      const j = await r.json();
      if (!j || !("livestream" in j)) return true;
      return !!(j.livestream && j.livestream.is_live !== false);
    } catch (e) { return true; }
  };
  const avisar = t => {
    try { if (window.Notification && Notification.permission === "granted") new Notification(t); } catch (e) {}
    const titulo = document.title; let n = 0;
    const pisca = setInterval(() => { document.title = n++ % 2 ? titulo : "🔴 AO VIVO!"; if (n > 20) { clearInterval(pisca); document.title = titulo; } }, 1000);
  };
  const chaveOff = "autochat-offline-" + canal;
  const lerOff = () => { try { return sessionStorage.getItem(chaveOff) === "1"; } catch (e) { return false; } };
  const gravarOff = v => { try { v ? sessionStorage.setItem(chaveOff, "1") : sessionStorage.removeItem(chaveOff); } catch (e) {} };
  let checagensOff = 0;
  const ciclo = async () => {
    if (!(await estaAoVivo())) {
      gravarOff(true);
      checagensOff++;
      // a página do canal nem sempre se atualiza sozinha: recarrega a cada 5 min enquanto offline
      if (checagensOff >= 5) { location.reload(); return; }
      log("Live offline, esperando começar...");
      proximo = Date.now() + 60000;
      timer = setTimeout(ciclo, 60000);
      return;
    }
    if (lerOff()) { gravarOff(false); avisar(`${canal} abriu a live! Auto-chat ligado.`); }
    checagensOff = 0;
    enviar();
    agendar();
  };
  const agendar = () => {
    const ms = (MINUTOS_BASE + Math.random() * VARIACAO_MIN) * 60 * 1000;
    proximo = Date.now() + ms;
    timer = setTimeout(ciclo, ms);
  };

  // Painel na tela
  const painel = document.createElement("div");
  painel.style.cssText = "position:fixed;bottom:16px;left:16px;z-index:999999;background:#111;color:#53fc18;" +
    "font:13px monospace;padding:10px 12px;border:1px solid #53fc18;border-radius:8px;max-width:280px";
  painel.innerHTML = '<b>Auto-chat ativo: ' + (location.pathname.split('/')[1] || '') + '</b><div id="ac-tempo"></div><div id="ac-log" style="color:#aaa;margin:4px 0"></div>' +
    '<button id="ac-agora" style="margin-right:6px">Enviar agora</button><button id="ac-parar">Parar</button>' +
    '<button id="ac-avisos" style="margin-left:6px">Ativar avisos</button>';
  document.body.appendChild(painel);
  const log = t => { painel.querySelector("#ac-log").textContent = t; console.log("[auto-chat]", t); };

  tick = setInterval(() => {
    const s = Math.max(0, Math.round((proximo - Date.now()) / 1000));
    painel.querySelector("#ac-tempo").textContent = `Próxima em ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);

  const stop = () => { clearTimeout(timer); clearInterval(tick); painel.remove(); delete window.__autoChat; console.log("[auto-chat] parado"); };
  painel.querySelector("#ac-parar").onclick = stop;
  painel.querySelector("#ac-agora").onclick = () => enviar();
  const btnAvisos = painel.querySelector("#ac-avisos");
  if (!window.Notification || Notification.permission === "granted") btnAvisos.remove();
  else btnAvisos.onclick = () => Notification.requestPermission().then(p => { if (p === "granted") { btnAvisos.remove(); new Notification("Avisos ligados: vou te avisar quando a live abrir"); } });

  window.__autoChat = { stop, enviar };
  ciclo();   // se a live estiver no ar, já manda uma
})();
