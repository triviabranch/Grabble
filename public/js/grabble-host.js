(function () {
  const s = window.GrabbleSurface;
  const common = window.GrabbleRoomCommon;
  s.configureCreate();

  const lobby = (state) => '<div class="display-stage"><div class="display-lobby"><div class="display-copy"><p class="eyebrow">ROOM ' + s.esc(s.code) + '</p><h1>Lobby</h1><p>' + state.players.length + ' player' + (state.players.length === 1 ? '' : 's') + ' in the room</p><div class="display-drawings">' + (state.players.length ? state.players.map((player) => '<div class="display-drawing-card pending"><strong>' + s.esc(player.name) + '</strong><span class="player-presence">' + (player.isHost ? 'Host · ready to play' : 'Joined') + '</span></div>').join('') : '<div class="display-drawing-card pending"><strong>Waiting for players</strong></div>') + '</div>' + common.rules() + '<div class="display-controls"><button id="start" class="race-start-cta">Start game</button><button id="play-on-phone" class="secondary">Join as a player</button><button id="open-display" class="secondary">Open display</button></div></div><aside class="display-qr"><img class="display-qr-logo" src="/assets/grabble-wordmark.png" alt="Grabble"><div class="display-qr-code" data-join-qr></div><p>Scan to join</p><p>Room code <strong>' + s.esc(s.code) + '</strong></p></aside></div></div>';

  const render = (state) => {
    if (state.phase === "lobby") {
      s.shell(lobby(state));
      const qr = document.querySelector("[data-join-qr]");
      if (qr && window.TBLiveQR) window.TBLiveQR.renderJoinQr(window.TBLiveQR.buildJoinTarget({ origin: location.origin, code: s.code }), { container: qr, size: 180, alt: "Scan to join Grabble room " + s.code, title: "Join Grabble" });
      document.getElementById("start")?.addEventListener("click", () => window.GrabbleTransport.send({ type: "start" }), { once: true });
      document.getElementById("play-on-phone")?.addEventListener("click", () => window.open("/play/" + s.code, "_blank", "noopener"), { once: true });
      document.getElementById("open-display")?.addEventListener("click", () => window.open("/display/" + s.code, "_blank", "noopener"), { once: true });
    } else if (state.phase === "countdown" || state.phase === "running") {
      s.shell('<div class="display-stage">' + common.pool(state, state.phase === "running", state.phase === "countdown" ? Math.max(1, Math.ceil((state.endAt - Date.now()) / 1000)) : null) + '</div>');
    } else {
      s.shell(common.results(state, s.getMe(), state.phase === "final" ? '<div class="tv-result-actions"><button id="play-again">Play again</button></div>' : '<div class="tv-result-actions"><button id="next-round">Next round</button></div>'));
      document.getElementById("next-round")?.addEventListener("click", () => window.GrabbleTransport.send({ type: "next" }), { once: true });
      document.getElementById("play-again")?.addEventListener("click", () => window.GrabbleTransport.send({ type: "restart" }), { once: true });
    }
  };

  if (!s.code) window.GrabbleCreate.hostHome();
  else s.connect("host", "Host", render);
})();
