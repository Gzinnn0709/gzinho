// Kick auto-chat: manda uma mensagem a cada ~8 min (com variação aleatória).
// Uso: abra a live no kick.com (PC), aperte F12 > aba Console, cole tudo e Enter.
// Para parar: clique em "Parar" no painel ou recarregue a página.
(() => {
  if (window.__autoChat) { window.__autoChat.stop(); }

  // ====== CONFIGURAÇÃO ======
  const MINUTOS_BASE = 8;       // intervalo mínimo
  const VARIACAO_MIN = 2;       // + até 2 min aleatórios (parece menos robô)
  // Cada mensagem tem 5 palavras ou mais (regra dos pontos)
  const MENSAGENS = [
    "boa gabe essa foi demais",
    "salve chat tamo junto aqui hoje",
    "que jogada brabo demais mano kkkk",
    "tô assistindo aqui desde o começo",
    "essa live tá muito boa hoje",
    "kkkkk não acredito que isso aconteceu",
    "gabe você é muito monstro mesmo",
    "bora gabe vamos pra cima deles",
    "melhor live da kick com certeza",
    "aí sim agora a coisa ficou boa",
    "slk mano que momento foi esse",
    "chat tá muito animado hoje hein",
    "quero ver essa próxima partida aí",
    "essa foi pro clipe com certeza",
    "gabe manda um salve pra galera"
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

  const escolher = () => {
    let m;
    do { m = MENSAGENS[Math.floor(Math.random() * MENSAGENS.length)]; }
    while (m === ultima && MENSAGENS.length > 1);
    ultima = m;
    return m;
  };

  const enviar = () => {
    const input = acharInput();
    if (!input) { log("Não achei o campo do chat. Você está logado e com o chat aberto?"); return false; }
    if ((input.textContent || "").trim()) { log("Você está digitando, tento de novo em 30s"); setTimeout(enviar, 30000); return false; }
    const msg = escolher();
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
      if (vazio()) { enviadas++; log(`Enviado: "${msg}" (total: ${enviadas})`); return; }
      if (i >= tentativas.length) { log(`Digitei mas não consegui enviar: "${msg}"`); return; }
      try { tentativas[i](); } catch (e) {}
      setTimeout(() => tentar(i + 1), 700);
    };
    setTimeout(() => tentar(0), 400);
    return true;
  };

  const agendar = () => {
    const ms = (MINUTOS_BASE + Math.random() * VARIACAO_MIN) * 60 * 1000;
    proximo = Date.now() + ms;
    timer = setTimeout(() => { enviar(); agendar(); }, ms);
  };

  // Painel na tela
  const painel = document.createElement("div");
  painel.style.cssText = "position:fixed;bottom:16px;left:16px;z-index:999999;background:#111;color:#53fc18;" +
    "font:13px monospace;padding:10px 12px;border:1px solid #53fc18;border-radius:8px;max-width:280px";
  painel.innerHTML = '<b>Auto-chat ativo</b><div id="ac-tempo"></div><div id="ac-log" style="color:#aaa;margin:4px 0"></div>' +
    '<button id="ac-agora" style="margin-right:6px">Enviar agora</button><button id="ac-parar">Parar</button>';
  document.body.appendChild(painel);
  const log = t => { painel.querySelector("#ac-log").textContent = t; console.log("[auto-chat]", t); };

  tick = setInterval(() => {
    const s = Math.max(0, Math.round((proximo - Date.now()) / 1000));
    painel.querySelector("#ac-tempo").textContent = `Próxima em ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);

  const stop = () => { clearTimeout(timer); clearInterval(tick); painel.remove(); delete window.__autoChat; console.log("[auto-chat] parado"); };
  painel.querySelector("#ac-parar").onclick = stop;
  painel.querySelector("#ac-agora").onclick = () => enviar();

  window.__autoChat = { stop, enviar };
  enviar();   // manda uma já para testar
  agendar();
})();
