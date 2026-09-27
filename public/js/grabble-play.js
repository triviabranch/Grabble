(function () {
  const s = window.GrabbleSurface;
  s.configureCreate();
  window.GrabblePlayer.configure({
    getState: () => s.getState(),
    send: (message) => window.GrabbleTransport.send(message),
  });
  const entry = (after) => {
    const modal = document.createElement("div");
    modal.className = "entry rules show";
    modal.innerHTML = '<div class="entry-card">' + s.logo() + '<h2>How to play</h2><div class="rules-list"><div class="rule"><span class="rule-index">01</span><p>Grab a letter from the pool.</p></div><div class="rule"><span class="rule-index">02</span><p>Build the longest word before time runs out.</p></div><div class="rule"><span class="rule-index">03</span><p>You can only grab the next letter on your word.</p></div><div class="rule"><span class="rule-index">04</span><p>If you make a mistake or change your mind, release all your letters and start again.</p></div></div><button id="go">Continue</button></div>';
    document.body.append(modal);
    modal.querySelector("#go").onclick = () => { modal.remove(); after?.(); };
  };
  const lobby = (state, me) => '<section class="mobile-lobby panel"><div class="mobile-lobby-head"><p class="eyebrow">' + (state.totalRounds > 1 ? "ROUND " + state.round + " OF " + state.totalRounds : "SINGLE ROUND") + '</p><h1>Join Game</h1><p class="mobile-room-code">Room <strong>' + s.esc(s.code) + '</strong></p><p class="mobile-player-count">' + state.players.length + " player" + (state.players.length === 1 ? "" : "s") + ' joined</p></div><div class="mobile-lobby-players">' + (state.players.length ? state.players.map(p => '<div class="mobile-player"><span class="mobile-player-dot"></span><strong>' + s.esc(p.name) + "</strong>" + (p.id === me ? "<small>YOU</small>" : "") + "</div>").join("") : '<p class="status">Waiting for players</p>') + '</div>' + window.GrabbleRoomCommon.rules().replace("display-rules","mobile-lobby-rules") + '<div class="mobile-lobby-action">' + ((state.ownerId === me || state.players.length === 1) ? '<button id="start" class="race-start-cta">Start game</button>' : "<button disabled>Waiting for the creator</button>") + "</div></section>";
  const game = (state, me) => '<section class="center player-game"><div class="controls"><div class="play-round"><div class="timer play-timer">' + (state.phase === "running" ? Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000)) + "s" : "READY") + '</div><small>Round ' + state.round + " of " + state.totalRounds + '</small></div></div>' + (state.phase === "results" || state.phase === "final" ? window.GrabbleRoomCommon.results(state,me) : '<section class="pool">' + (state.pool || []).map((t,i) => '<div class="token ' + (t.letter === "*" ? "wild" : "") + '" data-id="' + s.esc(t.id) + '">' + (state.phase === "running" ? (t.letter === "*" ? "★" : s.esc(t.letter)) : "") + "</div>").join("") + '</section><div class="panel player-word-panel"><div class="word-card-head"><h2>Your word</h2><button class="release-x" id="release" aria-label="Reset word">Reset</button></div><div class="wordline" id="wordline"></div></div>') + "</section>";
  const join = () => {
    s.shell('<section class="center join-room-card panel"><div class="join-room-head"><p class="eyebrow">JOIN THIS GAME</p><h1>Join this room</h1><p>Enter your name to play.</p><span class="room-code-mini">' + s.esc(s.code) + '</span></div><div class="join-field"><input id="name" maxlength="18" placeholder="YOUR NAME"><button id="join">Join game</button></div></section>');
    document.getElementById("join").onclick = () => {
      const name = document.getElementById("name").value.trim() || "Player";
      localStorage.setItem("grabble-name:" + s.code, name);
      s.shell('<section class="center hero panel"><h1>Joining the room</h1><p class="status">Room <b>' + s.esc(s.code) + "</b></p></section>");
      entry(() => s.connect("play", name, (next) => render(next)));
    };
  };
  const render = (state) => {
    const me = s.getMe();
    if (state.phase === "lobby") {
      s.shell(lobby(state, me));
      document.getElementById("start")?.addEventListener("click", () => window.GrabbleTransport.send({type:"start"}), {once:true});
      return;
    }
    s.shell(game(state, me));
    if (state.phase === "running") {
      window.GrabblePlayer.bind();
      document.getElementById("release")?.addEventListener("click", () => window.GrabblePlayer.reset(), {once:true});
    }
  };
  const boot = () => {
    if (!s.code) return window.GrabbleCreate.home();
    let pending = null;
    try { pending = JSON.parse(localStorage.getItem("grabble-pending-join") || "null"); } catch {}
    if (pending && pending.code === s.code && pending.name) {
      localStorage.removeItem("grabble-pending-join");
      s.shell('<section class="center hero panel"><h1>Joining the room</h1><p class="status">Room <b>' + s.esc(s.code) + "</b></p></section>");
      entry(() => s.connect("play", pending.name, (next) => render(next)));
    } else join();
  };
  boot();
})();