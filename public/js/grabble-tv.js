(function () {
  const s = window.GrabbleSurface;
  const common = window.GrabbleRoomCommon;
  s.configureCreate();
  document.getElementById("tv-back")?.addEventListener("click", () => {
    s.setLeaving();
    location.href = "https://tv.triviabranch.com";
  });
  const qr = () => {
    const node = document.querySelector("[data-join-qr]");
    if (!node || !window.TBLiveQR) return;
    window.TBLiveQR.renderJoinQr(window.TBLiveQR.buildJoinTarget({origin:location.origin,code:s.code}), {container:node,size:180,alt:"Scan to join Grabble room " + s.code,title:"Join Grabble"});
  };
  const lobby = (state) => {
    const canControl = state.controllerRole === "tv" && s.getConnectionRole() === "tv";
    return '<div class="display-stage"><div class="display-lobby"><div class="display-copy"><p class="eyebrow">ROOM ' + s.esc(s.code) + '</p><h1>Lobby</h1><p>' + state.players.length + " player" + (state.players.length === 1 ? "" : "s") + ' joined</p><div class="display-drawings">' + (state.players.length ? state.players.map(p => '<div class="display-drawing-card pending"><strong>' + s.esc(p.name) + '</strong><span class="player-presence">' + (p.isHost ? 'Host · ready to play' : 'Joined') + '</span></div>').join("") : '<div class="display-drawing-card pending"><strong>Waiting for players</strong><span class="player-presence">Share the QR code to join</span></div>') + '</div>' + common.rules() + '<div class="display-controls">' + (canControl && state.players.length ? '<button id="start" class="race-start-cta">Start game</button>' : "") + '</div></div><div class="display-qr"><img class="display-qr-logo" src="/assets/grabble-wordmark.png" alt="Grabble"><div class="display-qr-code" data-join-qr></div><p>Scan to join</p><p>Room code <strong>' + s.esc(s.code) + '</strong></p></div></div></div>';
  };
  const live = (state) => '<div class="display-stage">' + common.pool(state, state.phase === "running", state.phase === "countdown" ? Math.max(1,Math.ceil((state.endAt-Date.now())/1000)) : null) + '<div class="corners">' + (state.players || []).map(p => '<article class="corner" data-player-id="' + s.esc(p.id) + '"><div class="display-player-head"><b>' + s.esc(p.name) + '</b></div><small class="player-score-line"><span class="score-line-word">' + s.esc(p.word || "—") + "</span><span>" + (p.word || "").length + " letters · " + (p.totalScore || 0) + " total</span></small></article>").join("") + "</div></div>";
  const bind = (state) => {
    document.getElementById("start")?.addEventListener("click", () => window.GrabbleTransport.send({type:"start"}), {once:true});
  };
  const render = (state) => {
    if (state.phase === "lobby") { s.shell(lobby(state)); qr(); bind(state); return; }
    if (state.phase === "countdown" || state.phase === "running" || state.phase === "scoring") return s.shell(state.phase === "scoring" ? '<div class="display-stage scoring-stage"><section class="display-pool result-pool"><div class="display-pool-title">Letter cache</div></section><div class="scoring-screen"><div><p class="eyebrow">TIME’S UP</p><h1>Scoring…</h1></div></div></div>' : live(state));
    const canControl = state.controllerRole === "tv" && s.getConnectionRole() === "tv";
    const actions = canControl ? (state.phase === "final" ? '<div class="tv-result-actions"><button id="play-again">Play again</button><button class="secondary" id="tv-home">Back to TriviaBranch TV</button></div>' : '<div class="tv-result-actions"><button id="start">Next round</button></div>') : "";
    s.shell(common.results(state,s.getMe(),actions));
    document.getElementById("start")?.addEventListener("click", () => window.GrabbleTransport.send({type:"next"}), {once:true});
    document.getElementById("play-again")?.addEventListener("click", () => window.GrabbleTransport.send({type:"restart"}), {once:true});
    document.getElementById("tv-home")?.addEventListener("click", () => location.href="https://tv.triviabranch.com", {once:true});
  };
  const enter = () => {
    if (!s.code) window.GrabbleCreate.tvHome();
    else s.connect("tv", "TV", render);
  };
  if (new URLSearchParams(location.search).get("entry") === "portal") window.GrabbleCreate.opaqueSplash(enter);
  else enter();
})();
