(function () {
  const pathParts = location.pathname.split("/").filter(Boolean),
    mode = pathParts[0] || "play",
    code = pathParts[1] || "",
    app = document.getElementById("app");
  let state,
    me,
    drag,
    ghost,
    clock,
    adminTimer,
    leaveTimer,
    previousState = null,
    leaving = false;
  let tvEntryStarted = false,
    tvEntryPhase = "idle";
  const esc = (s) => String(s ?? "");
  const logo = () => '<img src="/assets/grabble-wordmark.png" alt="Grabble">';
  const send = (x) => window.GrabbleTransport.send(x);
  const connect = (role, name) => window.GrabbleTransport.connect(role, name);
  function shell(x) {
    let root = app.querySelector("main.shell-" + mode),
      header;
    if (!root) {
      const back =
        mode === "tv"
          ? '<button class="tv-back" id="tv-back" type="button" aria-label="Back to TriviaBranch TV">← TriviaBranch</button>'
          : "";
      app.innerHTML =
        '<main class="shell shell-' +
        mode +
        '"><header class="brand">' +
        back +
        logo() +
        (mode === "tv"
          ? ""
          : "<small>" +
            ({
              play: "PLAYER",
              display: "DISPLAY",
              host: "HOST",
              admin: "ADMIN",
            }[mode] || "LIVE") +
            "</small>") +
        "</header></main>";
      root = app.querySelector("main.shell-" + mode);
      header = root.querySelector(":scope > .brand");
      document.getElementById("tv-back")?.addEventListener("click", () => {
        leaving = true;
        location.href = "https://tv.triviabranch.com";
      });
    } else header = root.querySelector(":scope > .brand");
    while (root.lastElementChild && root.lastElementChild !== header)
      root.removeChild(root.lastElementChild);
    root.insertAdjacentHTML("beforeend", x);
  }
  function entry(after) {
    if (mode === "play") {
      const r = document.createElement("div");
      r.className = "entry rules show";
      r.innerHTML =
        '<div class="entry-card">' +
        logo() +
        '<h2>How to play</h2><div class="rules-list"><div class="rule"><span class="rule-index">01</span><p>Grab a letter from the pool.</p></div><div class="rule"><span class="rule-index">02</span><p>Build the longest word before time runs out.</p></div><div class="rule"><span class="rule-index">03</span><p>You can only grab the next letter on your word.</p></div><div class="rule"><span class="rule-index">04</span><p>If you make a mistake or change your mind, release all your letters and start again.</p></div></div><button id="go">Continue</button></div>';
      document.body.append(r);
      r.querySelector("#go").onclick = () => {
        r.remove();
        after?.();
      };
    }
  }
  window.GrabbleTransport.configure({
    code,
    mode,
    getState: () => state,
    isLeaving: () => leaving,
    onHello: (message) => {
      me = message.playerId;
    },
    onLeft: () => {
      clearTimeout(leaveTimer);
      localStorage.removeItem("grabble-player-token");
      localStorage.removeItem("grabble-pending-join");
      location.href = "/";
    },
    onState: (message) => {
      previousState = state;
      state = message;
      if (!drag) render(previousState);
    },
  });
  const create = async (m) => {
    const response = await fetch("/api/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: m }),
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {}
    if (!response.ok || !payload?.code)
      throw new Error(payload?.error || "Room creation failed");
    return payload;
  };
  window.GrabbleCreate?.configure({
    shell,
    logo,
    create,
    mode,
    setLeaving: () => {
      leaving = true;
    },
  });
  function bonusText(b) {
    return b === "double-letter"
      ? "DL"
      : b === "triple-letter"
        ? "TL"
        : b === "double-word"
          ? "DW"
          : b === "triple-word"
            ? "TW"
            : "";
  }
  function tok(t, i, hidden = false) {
    const col = i % 6,
      row = Math.floor(i / 6),
      bonus =
        !hidden &&
        ["scoring", "results", "final"].includes(state?.phase) &&
        t.bonus
          ? '<span class="tile-bonus">' + bonusText(t.bonus) + "</span>"
          : "";
    return (
      '<div class="token ' +
      (hidden ? "covered " : "") +
      (t.letter === "*" ? "wild " : "") +
      (t.reservedBy ? "claimed " : "") +
      '" data-id="' +
      t.id +
      '" style="left:' +
      (10 + col * 16 + (row % 2) * 4) +
      "%;top:" +
      (14 + row * 17) +
      "%;--speed:" +
      (2.5 + (i % 4) * 0.5) +
      's">' +
      (hidden ? "" : t.letter === "*" ? "★" : esc(t.letter)) +
      bonus +
      "</div>"
    );
  }
  function lobby() {
    const join = location.origin + "/play/" + code,
      ready = state.players.length > 0,
      canStart = (mode === "host" || mode === "tv") && ready,
      roundLabel =
        state.totalRounds > 1
          ? "ROUND " + state.round + " OF " + state.totalRounds
          : "SINGLE ROUND";
    return (
      '<div class="display-stage"><div class="display-lobby"><div class="display-copy"><p class="eyebrow">' +
      roundLabel +
      "</p><h1>Join Game</h1><p>" +
      state.players.length +
      " player" +
      (state.players.length === 1 ? "" : "s") +
      ' joined</p><div class="display-drawings">' +
      (state.players.length
        ? state.players
            .map(
              (p) =>
                '<div class="display-drawing-card pending"><strong>' +
                esc(p.name) +
                '</strong><span class="player-presence">Joined</span></div>',
            )
            .join("")
        : '<div class="display-drawing-card pending"><strong>Waiting for players</strong><span class="player-presence">Share the QR code to join</span></div>') +
      '</div><div class="display-rules"><p class="eyebrow">HOW TO PLAY</p><div><b>01</b><span>Grab a letter from the pool.</span></div><div><b>02</b><span>Build the longest word before time runs out.</span></div><div><b>03</b><span>You can only grab the next letter on your word.</span></div><div><b>04</b><span>If you make a mistake or change your mind, release all your letters and start again.</span></div></div><div class="display-controls">' +
      (mode === "host" || mode === "tv"
        ? canStart
          ? '<button id="start" class="race-start-cta">Start game</button>'
          : ""
        : "<button disabled>Waiting for the host</button>") +
      (mode === "host"
        ? '<button class="secondary" id="open-display">Open display</button>'
        : "") +
      '</div></div><div class="display-qr"><img class="display-qr-logo" src="/assets/grabble-wordmark.png" alt="Grabble"><div class="display-qr-code" data-join-qr data-code="' +
      esc(code) +
      '" aria-label="Join Grabble room ' +
      esc(code) +
      '"></div><p><strong>' +
      esc(join) +
      "</strong></p>" +
      ((mode === "host" || mode === "tv") && !canStart
        ? '<span class="waiting-status">Waiting for Players</span>'
        : "") +
      "</div></div></div>"
    );
  }
  function playerLobby() {
    const ready = state.players.length > 0,
      canStart = state.ownerId === me || state.players.length === 1,
      roundLabel =
        state.totalRounds > 1
          ? "ROUND " + state.round + " OF " + state.totalRounds
          : "SINGLE ROUND";
    return (
      '<section class="mobile-lobby panel"><div class="mobile-lobby-head"><p class="eyebrow">' +
      roundLabel +
      '</p><h1>Join Game</h1><p class="mobile-room-code">Room <strong>' +
      esc(code) +
      '</strong></p><p class="mobile-player-count">' +
      state.players.length +
      " player" +
      (state.players.length === 1 ? "" : "s") +
      ' joined</p></div><div class="mobile-lobby-players">' +
      (ready
        ? state.players
            .map(
              (p) =>
                '<div class="mobile-player"><span class="mobile-player-dot"></span><strong>' +
                esc(p.name) +
                "</strong>" +
                (p.id === me ? "<small>YOU</small>" : "") +
                "</div>",
            )
            .join("")
        : '<p class="status">Waiting for players</p>') +
      '</div><div class="mobile-lobby-rules"><p class="eyebrow">HOW TO PLAY</p><div><b>01</b><span>Grab a letter from the pool.</span></div><div><b>02</b><span>Build the longest word before time runs out.</span></div><div><b>03</b><span>You can only grab the next letter on your word.</span></div><div><b>04</b><span>If you make a mistake or change your mind, release all your letters and start again.</span></div></div><div class="mobile-lobby-action">' +
      (canStart
        ? '<button id="start" class="race-start-cta">Start game</button>'
        : "<button disabled>Waiting for the creator</button>") +
      "</div></section>"
    );
  }
  function tvQr() {
    return (
      '<aside class="tv-join"><div class="display-qr-code" data-join-qr data-code="' +
      esc(code) +
      '" aria-label="Join Grabble room ' +
      esc(code) +
      '"></div><span>Scan to join</span></aside>'
    );
  }
  function paintJoinQr() {
    const node = document.querySelector("[data-join-qr]");
    if (!node || !window.TBLiveQR) return;
    try {
      TBLiveQR.renderJoinQr(
        TBLiveQR.buildJoinTarget({ origin: location.origin, code }),
        {
          container: node,
          size: 240,
          alt: "Scan to join Grabble room " + code,
          title: "Join Grabble",
        },
      );
    } catch {
      node.textContent = location.origin + "/play/" + code;
    }
  }
  function poolHtml(reveal = true, canStart = false, timerValue = null) {
    return (
      '<section class="pool ' +
      (reveal ? "" : "covered") +
      '" id="pool">' +
      (state.pool || []).map((t, i) => tok(t, i, !reveal)).join("") +
      (timerValue !== null
        ? '<div class="pool-timer timer">' + timerValue + "s</div>"
        : "") +
      (canStart
        ? '<button class="pool-start" id="start">Start round</button>'
        : "") +
      "</section>"
    );
  }
  function line(p) {
    let o = "",
      w = p?.word || "";
    for (let i = 0; i < Math.max(8, w.length + 1); i++)
      o +=
        '<span class="slot ' +
        (w[i] ? "filled" : "") +
        '">' +
        (w[i] ? esc(w[i]) : "") +
        "</span>";
    return o;
  }
  function uniquePlayers() {
    return state.players || [];
  }
  function scoreWordTiles(
    word,
    tiles = [],
    reveal = ["scoring", "results", "final"].includes(state?.phase),
  ) {
    const w = String(word || "");
    return w
      ? '<span class="score-word-tiles" aria-label="' +
          esc(w) +
          '">' +
          [...w]
            .map((x, i) => {
              const t = tiles[i] || {},
                label =
                  reveal && t.bonus
                    ? '<em class="tile-bonus">' + bonusText(t.bonus) + "</em>"
                    : "";
              return (
                '<i class="score-tile">' +
                esc(x === "*" ? "★" : x) +
                label +
                "</i>"
              );
            })
            .join("") +
          "</span>"
      : '<span class="score-word-tiles empty">—</span>';
  }
  function scores(reveal = false) {
    const list = uniquePlayers();
    list.sort((a, b) => {
      const av = a.score || 0,
        bv = b.score || 0;
      return reveal
        ? av - bv || (a.totalScore || 0) - (b.totalScore || 0)
        : (b.totalScore || 0) - (a.totalScore || 0);
    });
    return (
      '<div class="scoreboard ' +
      (reveal ? "reveal" : "") +
      '"><div class="score-header"><span></span><span>PLAYER</span><span>WORD</span><span>ROUND</span><strong>TOTAL</strong></div>' +
      list
        .map(
          (p, i) =>
            '<div class="score-row" style="--score-delay:' +
            (reveal ? i * 0.8 : 0) +
            's"><b>' +
            (i + 1) +
            "</b><strong>" +
            esc(p.name) +
            (p.id === me ? " · you" : "") +
            "</strong>" +
            scoreWordTiles(p.word) +
            '<span class="score-count round-score" data-score="' +
            (p.score || 0) +
            '">' +
            (reveal ? "0" : p.score || 0) +
            '</span><b class="score-count total-score" data-score="' +
            (p.totalScore || 0) +
            '">' +
            (p.totalScore || 0) +
            "</b></div>",
        )
        .join("") +
      "</div>"
    );
  }
  function players() {
    return (
      '<section class="players">' +
      uniquePlayers()
        .map(
          (p) =>
            '<div class="player"><strong>' +
            esc(p.name) +
            '</strong><div class="mini">' +
            [...(p.word || "")]
              .map((x) => "<i>" + esc(x === "*" ? "★" : x) + "</i>")
              .join("") +
            "</div><small>" +
            (p.word || "").length +
            " letters · " +
            (p.totalScore || 0) +
            " points</small></div>",
        )
        .join("") +
      "</section>"
    );
  }
  function gestureHand(p) {
    const g = (state.gestures || []).find(
      (x) => x.playerId === p.id && x.active,
    );
    return g
      ? '<span class="display-player-gesture" style="--gesture-color:' +
          gestureColor(p.id) +
          '"><span class="display-hand">☝</span> choosing</span>'
      : "";
  }
  function gestureColor(id) {
    const colors = [
      "#ff7a3d",
      "#73d5ff",
      "#f5dc62",
      "#a7f07d",
      "#d39cff",
      "#ff8eb7",
    ];
    let n = 0;
    for (const c of String(id || "")) n = (n + c.charCodeAt(0)) % colors.length;
    return colors[n];
  }
  function resultView() {
    const list = uniquePlayers()
      .slice()
      .sort(
        (a, b) =>
          (a.score || 0) - (b.score || 0) ||
          (a.totalScore || 0) - (b.totalScore || 0),
      );
    return (
      '<div class="result-stage"><div class="result-spaces">' +
      list
        .map(
          (p, i) =>
            '<article class="result-space" style="--score-delay:' +
            i * 0.8 +
            's"><strong>' +
            esc(p.name) +
            '</strong><div class="bigword">' +
            esc(p.word || "—") +
            '</div><span class="round-reveal" data-score="' +
            (p.score || 0) +
            '" data-validation="' +
            (p.validation || "") +
            '">0 points</span></article>',
        )
        .join("") +
      '</div><div class="panel results-panel cumulative-board pending"><p class="time-up">' +
      (state.phase === "final" ? "COMPETITION COMPLETE" : "TIME’S UP") +
      "</p><h2>" +
      (state.phase === "final" ? "Final leaderboard" : "Leaderboard") +
      "</h2>" +
      scores(false) +
      "</div></div>"
    );
  }
  function scoringView() {
    return (
      '<div class="display-stage scoring-stage"><section class="display-pool result-pool"><div class="display-pool-title">Letter cache</div>' +
      (state.pool || []).map((t, i) => tok(t, i, false)).join("") +
      '</section><div class="scoring-screen"><div><p class="eyebrow">TIME’S UP</p><h1>Scoring…</h1><p>Checking the room’s words</p></div></div></div>'
    );
  }
  function displayResultView() {
    const list = uniquePlayers()
        .slice()
        .sort(
          (a, b) =>
            (a.score || 0) - (b.score || 0) ||
            (a.totalScore || 0) - (b.totalScore || 0),
        ),
      actions =
        mode === "tv"
          ? state.phase === "final"
            ? '<div class="tv-result-actions"><button id="play-again">Play again</button><button class="secondary" id="tv-home">Back to TriviaBranch TV</button></div>'
            : '<div class="tv-result-actions"><button id="start">Next round</button></div>'
          : "";
    return (
      '<div class="display-result-stage"><img class="tv-result-logo" src="/assets/grabble-wordmark.png" alt="Grabble"><section class="display-pool result-pool"><div class="display-pool-title">Letter cache</div>' +
      (state.pool || []).map((t, i) => tok(t, i, false)).join("") +
      '</section><div class="result-spaces">' +
      list
        .map(
          (p, i) =>
            '<article class="result-space" style="--score-delay:' +
            i * 0.8 +
            's"><strong>' +
            esc(p.name) +
            '</strong><div class="bigword">' +
            esc(p.word || "—") +
            '</div><span class="round-reveal" data-score="' +
            (p.score || 0) +
            '" data-validation="' +
            (p.validation || "") +
            '">0 points</span></article>',
        )
        .join("") +
      '</div><div class="panel results-panel cumulative-board pending"><p class="time-up">TIME’S UP</p><h2>Leaderboard</h2>' +
      scores(false) +
      "</div>" +
      actions +
      "</div></div>"
    );
  }
  function animateResults() {
    const rows = [...document.querySelectorAll(".result-space")];
    rows.forEach((row) => {
      const reveal = row.querySelector(".round-reveal"),
        validation = reveal?.dataset.validation;
      if (validation === "unverified") {
        if (reveal) reveal.textContent = "Unverified";
        return;
      }
      const target = Number(reveal?.dataset.score || 0),
        delay =
          Number(
            (row.style.getPropertyValue("--score-delay") || "0s").replace(
              "s",
              "",
            ),
          ) || 0;
      setTimeout(
        () => {
          const started = performance.now(),
            duration = 650,
            tick = (now) => {
              const t = Math.min(1, (now - started) / duration),
                e = 1 - Math.pow(1 - t, 3),
                el = row.querySelector(".round-reveal");
              if (el) el.textContent = Math.round(target * e) + " points";
              if (t < 1) requestAnimationFrame(tick);
            };
          requestAnimationFrame(tick);
        },
        delay * 1000 + 300,
      );
    });
    setTimeout(
      () =>
        document
          .querySelector(".cumulative-board")
          ?.classList.remove("pending"),
      rows.length ? rows.length * 800 + 1100 : 0,
    );
  }
  function leaveHome() {
    if (leaving) return;
    leaving = true;
    const finish = () => {
      clearTimeout(leaveTimer);
      localStorage.removeItem("grabble-player-token");
      localStorage.removeItem("grabble-pending-join");
      location.href = "/";
    };
    if (window.GrabbleTransport.getSocket()?.readyState === 1) {
      leaveTimer = setTimeout(finish, 700);
      try {
        send({ type: "leave" });
      } catch {
        finish();
      }
    } else finish();
  }
  function animateTileFlights(previous) {
    if (
      !previous ||
      !state ||
      !(mode === "tv" || mode === "display") ||
      state.phase !== "running"
    )
      return;
    const old = new Map(
      (previous.players || []).map((p) => [p.id, p.word || ""]),
    );
    for (const p of state.players || []) {
      const before = old.get(p.id) || "",
        after = p.word || "";
      if (after.length <= before.length) continue;
      const from = document.querySelector(".display-pool"),
        to = document.querySelector(
          '[data-player-id="' + CSS.escape(p.id) + '"] .live-word',
        );
      if (!from || !to) continue;
      const a = from.getBoundingClientRect(),
        b = to.getBoundingClientRect(),
        tile = document.createElement("div");
      tile.className = "tile-flight";
      tile.textContent = after.slice(-1) === "*" ? "★" : after.slice(-1);
      tile.style.left = a.left + a.width / 2 - 21 + "px";
      tile.style.top = a.top + a.height / 2 - 21 + "px";
      document.body.appendChild(tile);
      tile
        .animate(
          [
            {
              left: a.left + a.width / 2 - 21 + "px",
              top: a.top + a.height / 2 - 21 + "px",
              transform: "scale(1.1) rotate(-8deg)",
            },
            {
              left: b.left + b.width / 2 - 21 + "px",
              top: b.top + b.height / 2 - 21 + "px",
              transform: "scale(.8) rotate(8deg)",
            },
          ],
          { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" },
        )
        .finished.then(() => tile.remove())
        .catch(() => tile.remove());
    }
  }
  function render(previous) {
    if (mode === "admin") {
      return admin();
    }
    if (!code) {
      if (mode === "tv") {
        return window.GrabbleCreate.tvHome();
      }
      if (mode === "host") {
        return window.GrabbleCreate.hostHome();
      }
      if (mode === "display") {
        shell(
          '<section class="center hero panel"><h1>Display needs a room code</h1><p>Open this screen from the host using <b>/display/ROOMCODE</b>.</p></section>',
        );
        return;
      }
      return window.GrabbleCreate.home();
    }
    if (mode === "tv" && code && tvEntryPhase === "idle") {
      tvEntryPhase = "lobby";
      connect("tv", "TV");
    }
    if (!state) {
      if (mode === "play") {
        let pending = null;
        try {
          pending = JSON.parse(
            localStorage.getItem("grabble-pending-join") || "null",
          );
        } catch {}
        if (pending && pending.code === code && pending.name) {
          localStorage.removeItem("grabble-pending-join");
          shell(
            '<section class="center hero panel"><h1>Joining the room</h1><p class="status">Room <b>' +
              esc(code) +
              "</b></p></section>",
          );
          entry(() => connect("play", pending.name));
          return;
        }
        shell(
          '<section class="center join-room-card panel"><div class="join-room-head"><p class="eyebrow">JOIN THIS GAME</p><h1>Join this room</h1><p>Enter your name to play.</p><span class="room-code-mini">' +
            esc(code) +
            '</span></div><div class="join-field"><input id="name" maxlength="18" placeholder="YOUR NAME" value="' +
            esc(localStorage.getItem("grabble-name") || "") +
            '"><button id="join">Join game</button></div></section>',
        );
        document.getElementById("join").onclick = () => {
          const n = document.getElementById("name").value.trim() || "Player";
          localStorage.setItem("grabble-name", n);
          shell(
            '<section class="center hero panel"><h1>Joining the room</h1><p class="status">Room <b>' +
              esc(code) +
              "</b></p></section>",
          );
          entry(() => connect("play", n));
        };
      } else {
        shell(
          '<section class="center hero panel"><h1>' +
            esc(code) +
            '</h1><p class="status">Connecting…</p></section>',
        );
        connect(
          mode === "host" ? "host" : mode === "tv" ? "tv" : "display",
          mode === "tv" ? "TV" : "Display",
        );
      }
      return;
    }
    const mine = state.players.find((p) => p.id === me) || { word: "" },
      time = state.endAt
        ? Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000))
        : 0,
      can =
        mode === "host" ||
        mode === "tv" ||
        (mode === "play" &&
          (state.players.length === 1 || state.ownerId === me));
    if (mode === "play" && state.phase === "lobby") {
      shell(playerLobby());
      document
        .getElementById("start")
        ?.addEventListener("click", () => send({ type: "start" }));
      return;
    }
    if (
      (mode === "tv" || mode === "display" || mode === "host") &&
      state.phase === "lobby"
    ) {
      shell(lobby());
      paintJoinQr();
      document
        .getElementById("start")
        ?.addEventListener("click", () => send({ type: "start" }));
      const display = document.getElementById("open-display");
      if (display)
        display.onclick = () =>
          window.open("/display/" + code, "_blank", "noopener");
      return;
    }
    let b =
      '<section class="center player-game"><div class="controls">' +
      (mode === "play"
        ? '<div class="play-round"><div class="timer play-timer ' +
          (state.phase === "running" ? "" : "is-hidden") +
          '">' +
          (state.phase === "running" ? time + "s" : "0s") +
          "</div>" +
          (state.phase === "scoring"
            ? '<div class="scoring-label">Scoring…</div>'
            : "") +
          "<small>Round " +
          state.round +
          " of " +
          state.totalRounds +
          "</small></div>"
        : '<div><div class="status">' +
          esc(state.message) +
          '</div><div class="timer">' +
          (state.phase === "running" || state.phase === "countdown"
            ? time + "s"
            : state.phase === "results"
              ? "RESULTS"
              : "READY") +
          "</div><small>Round " +
          state.round +
          " of " +
          state.totalRounds +
          "</small></div>");
    if (can && state.phase === "results")
      b += '<button id="start">Next round</button>';
    else if (can && state.phase === "final")
      b +=
        '<button id="play-again">Play again</button><button class="secondary" id="leave">Leave game</button>';
    if (mode === "host")
      b += '<button class="secondary" id="open-display">Open display</button>';
    b += "</div>";
    if (state.phase === "results" || state.phase === "final")
      b += mode === "play" ? resultView() : displayResultView();
    else if (mode === "play")
      b +=
        poolHtml(
          state.phase === "running",
          can && state.phase === "lobby",
          state.phase === "countdown" ? time : null,
        ) +
        '<div class="panel player-word-panel"><div class="word-card-head"><h2>Your word</h2><button class="release-x" id="release" aria-label="Reset word" title="Reset word">Reset</button></div><div class="wordline" id="wordline">' +
        line(mine) +
        "</div></div>";
    else if ((mode === "tv" || mode === "display") && state.phase === "lobby")
      b += lobby();
    else if (mode === "tv" || mode === "display") {
      if (state.phase === "countdown" || state.phase === "running")
        b +=
          '<div class="display-stage"><section class="display-pool ' +
          (state.phase === "running" ? "" : "covered") +
          '"><div class="display-pool-title">' +
          (state.phase === "countdown" ? "Get ready" : "Letter pool") +
          "</div>" +
          (state.pool || [])
            .map((t, i) => tok(t, i, state.phase !== "running"))
            .join("") +
          (state.phase === "countdown"
            ? '<div class="pool-timer timer">' + time + "s</div>"
            : "") +
          '</section><div class="corners" style="--rail-cols:' +
          Math.max(1, Math.ceil(uniquePlayers().length / 2)) +
          '">' +
          uniquePlayers()
            .map(
              (p, i) =>
                '<article class="corner ' +
                (i < Math.ceil(uniquePlayers().length / 2)
                  ? "rail-top"
                  : "rail-bottom") +
                '" data-player-id="' +
                esc(p.id) +
                '"><div class="display-player-head"><b>' +
                esc(p.name) +
                "</b>" +
                gestureHand(p) +
                '</div><small class="player-score-line"><span class="score-line-word">' +
                scoreWordTiles(p.word) +
                "</span><span>" +
                (p.word || "").length +
                " letters · " +
                (p.score || 0) +
                " this round · " +
                (p.totalScore || 0) +
                " total</span></small></article>",
            )
            .join("") +
          "</div></div>";
      else if (state.phase === "scoring") b += scoringView();
      else b += displayResultView();
    } else if (mode === "host" && state.phase === "lobby") b += lobby();
    else
      b +=
        poolHtml() +
        '<div class="panel"><h2>Players</h2>' +
        players() +
        "</div>";
    b += "</section>";
    shell(b);
    animateTileFlights(previous);
    if (state.phase === "results" || state.phase === "final") animateResults();
    if (can && document.getElementById("start"))
      document.getElementById("start").onclick = () => {
        if (state.phase === "lobby") send({ type: "start" });
        else if (state.phase === "results" && state.round < state.totalRounds)
          send({ type: "next" });
        else location.href = "/";
      };
    if (mode === "play" && state.phase === "final") {
      document
        .getElementById("play-again")
        ?.addEventListener("click", () => send({ type: "restart" }));
      document.getElementById("leave")?.addEventListener("click", leaveHome);
    }
    if (mode === "tv" && state.phase === "final") {
      document
        .querySelectorAll("#play-again")
        .forEach((button) =>
          button.addEventListener("click", () => send({ type: "restart" })),
        );
      document.querySelectorAll("#tv-home").forEach((button) =>
        button.addEventListener("click", () => {
          location.href = "https://tv.triviabranch.com";
        }),
      );
    }
    if (mode === "host") {
      const display = document.getElementById("open-display");
      if (display)
        display.onclick = () =>
          window.open("/display/" + code, "_blank", "noopener");
    }
    if (mode === "play" && state.phase === "running") dragWire();
    if (clock) clearInterval(clock);
    if (state.phase === "running" || state.phase === "countdown") {
      let expirySentAt = 0;
      clock = setInterval(() => {
        const remaining =
            state.phase === "countdown"
              ? Math.max(1, Math.ceil((state.endAt - Date.now()) / 1000))
              : Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000)),
          t =
            state.phase === "countdown"
              ? document.querySelector(".pool-timer") ||
                document.querySelector(".timer")
              : document.querySelector(".timer");
        if (remaining <= 0 && state.phase === "running") {
          if (!expirySentAt || Date.now() - expirySentAt > 1000) {
            send({ type: "sync" });
            expirySentAt = Date.now();
          }
          if (t) t.textContent = "Scoring…";
          return;
        }
        if (t) t.textContent = remaining + "s";
      }, 250);
    }
  }
  function animateScores() {
    document
      .querySelectorAll(".scoreboard.reveal .score-count")
      .forEach((el) => {
        const target = Number(el.dataset.score || 0),
          row = el.closest(".score-row"),
          delay =
            Number(
              (row?.style.getPropertyValue("--score-delay") || "0s").replace(
                "s",
                "",
              ),
            ) || 0;
        setTimeout(
          () => {
            const started = performance.now(),
              duration = 650;
            const tick = (now) => {
              const t = Math.min(1, (now - started) / duration),
                e = 1 - Math.pow(1 - t, 3);
              el.textContent =
                Math.round(target * e) +
                (el.classList.contains("round-score") ? " this round" : "");
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          },
          delay * 1000 + 300,
        );
      });
  }
  function dragWire() {
    const wildcardModal = (tokenId) => {
      const modal = document.createElement("div");
      modal.className = "wildcard-modal";
      modal.innerHTML =
        '<form class="wildcard-card"><p class="eyebrow">WILDCARD LETTER</p><h2>Choose its letter</h2><p>What letter should the ★ represent?</p><div class="wildcard-field"><input id="wildcard-letter" maxlength="1" inputmode="text" autocomplete="off" aria-label="Wildcard letter" required></div><div class="wildcard-actions"><button type="button" class="secondary" id="wildcard-cancel">Cancel</button><button type="submit">Use letter</button></div></form>';
      document.body.appendChild(modal);
      const form = modal.querySelector("form"),
        input = modal.querySelector("#wildcard-letter");
      input.addEventListener("input", () => {
        input.value = input.value
          .replace(/[^a-z]/gi, "")
          .slice(0, 1)
          .toUpperCase();
      });
      const close = (commit) => {
        if (commit && /^[A-Z]$/.test(input.value))
          send({ type: "commit", tokenId, letter: input.value });
        else send({ type: "cancel", tokenId });
        modal.remove();
      };
      form.onsubmit = (e) => {
        e.preventDefault();
        close(true);
      };
      modal.querySelector("#wildcard-cancel").onclick = () => close(false);
      modal.onclick = (e) => {
        if (e.target === modal) close(false);
      };
      input.focus();
    };
    let lastPointerSent = 0;
    const finish = (e) => {
      if (!drag) return;
      send({ type: "pointerEnd", tokenId: drag.id });
      const d = drag,
        hit = document.elementFromPoint(e.clientX, e.clientY),
        board = document.getElementById("wordline"),
        rect = board?.getBoundingClientRect(),
        ok =
          !!(hit && hit.closest("#wordline")) ||
          !!(
            rect &&
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
      if (ok && d.el.classList.contains("wild")) {
        const tokenId = d.id;
        d.el.classList.remove("dragging");
        ghost?.remove();
        drag = null;
        wildcardModal(tokenId);
        return;
      }
      send({ type: ok ? "commit" : "cancel", tokenId: d.id });
      d.el.classList.remove("dragging");
      ghost?.remove();
      drag = null;
    };
    document.querySelectorAll(".token:not(.claimed)").forEach((el) => {
      el.addEventListener("pointerdown", (e) => {
        if (!state || state.phase !== "running" || drag) return;
        e.preventDefault();
        drag = { id: el.dataset.id, el };
        el.classList.add("dragging");
        el.setPointerCapture?.(e.pointerId);
        send({ type: "reserve", tokenId: drag.id });
        send({ type: "pointer", tokenId: drag.id });
        ghost = el.cloneNode(true);
        ghost.style.position = "fixed";
        ghost.style.pointerEvents = "none";
        ghost.style.left = e.clientX + "px";
        ghost.style.top = e.clientY + "px";
        ghost.style.zIndex = 20;
        document.body.appendChild(ghost);
      });
    });
    document.onpointermove = (e) => {
      if (!drag) return;
      e.preventDefault();
      ghost.style.left = e.clientX + "px";
      ghost.style.top = e.clientY + "px";
      if (Date.now() - lastPointerSent > 90) {
        send({ type: "pointer", tokenId: drag.id });
        lastPointerSent = Date.now();
      }
    };
    window.onpointerup = finish;
    window.onpointercancel = () => {
      if (drag) {
        send({ type: "pointerEnd", tokenId: drag.id });
        send({ type: "cancel", tokenId: drag.id });
        drag.el.classList.remove("dragging");
        ghost?.remove();
        drag = null;
      }
    };
    const release = document.getElementById("release");
    if (release)
      release.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state?.phase === "running") send({ type: "releaseWord" });
      };
  }
  async function admin() {
    const [x, cfg] = await Promise.all([
      (await fetch("/api/admin", { cache: "no-store" })).json(),
      (await fetch("/api/admin/config", { cache: "no-store" })).json(),
    ]);
    shell(
      '<section class="center panel admin-panel"><div class="controls"><div><p class="eyebrow">GRABBLE ADMIN</p><h1>Admin</h1><p class="status">Dictionary controls and active transient TBLive sessions.</p></div><button id="refresh">Refresh</button></div><nav class="admin-tabs" role="tablist"><button class="admin-tab active" data-admin-tab="api" role="tab" aria-selected="true">Dictionary API</button><button class="admin-tab" data-admin-tab="rooms" role="tab" aria-selected="false">Live rooms</button></nav><section id="admin-tab-api" class="admin-tab-panel active" role="tabpanel"><section class="panel dictionary-config"><p class="eyebrow">LIVE DICTIONARY API</p><h2>Scoring provider</h2><p>Choose which cached API powers live word validation.</p><div class="config-row"><select id="dictionary-provider"><option value="datamuse">Datamuse</option><option value="dictionaryapi">dictionaryapi.dev</option></select><button id="save-dictionary-provider">Save provider</button><span id="dictionary-provider-status" aria-live="polite"></span></div></section><section class="panel dictionary-health"><p class="eyebrow">DICTIONARY COMPARISON</p><h2>Test a word across APIs</h2><p>One lookup, using the same server-side path that live scoring can use.</p><form id="dictionary-form" class="join"><input id="dictionary-word" maxlength="32" autocomplete="off" placeholder="Enter a word"><button type="submit">Compare APIs</button></form><div id="dictionary-result" class="dictionary-result" aria-live="polite">Try trains, title, rare, cleaners or a nonsense word.</div></section></section><section id="admin-tab-rooms" class="admin-tab-panel" role="tabpanel" hidden><div class="admin-list">' +
        (x.rooms.length
          ? x.rooms
              .map(
                (r) =>
                  '<div class="admin-room"><span><b>' +
                  esc(r.code) +
                  "</b><br><small>" +
                  esc(r.mode) +
                  " · " +
                  r.players +
                  " players · " +
                  new Date(r.lastSeen).toLocaleTimeString() +
                  '</small></span><button class="danger" data-kill="' +
                  r.code +
                  '">Kill</button></div>',
              )
              .join("")
          : "<p>No live rooms.</p>") +
        '</div></section><small class="admin-build">Build persistent-registry</small></section>',
    );
    document.querySelectorAll("[data-admin-tab]").forEach(
      (tab) =>
        (tab.onclick = () => {
          const target = tab.dataset.adminTab;
          document.querySelectorAll("[data-admin-tab]").forEach((x) => {
            const active = x === tab;
            x.classList.toggle("active", active);
            x.setAttribute("aria-selected", active ? "true" : "false");
          });
          document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
            const active = panel.id === "admin-tab-" + target;
            panel.classList.toggle("active", active);
            panel.hidden = !active;
          });
        }),
    );
    document.getElementById("refresh").onclick = admin;
    const provider = document.getElementById("dictionary-provider"),
      providerStatus = document.getElementById("dictionary-provider-status");
    provider.value = cfg.dictionaryProvider || "datamuse";
    document.getElementById("save-dictionary-provider").onclick = async () => {
      providerStatus.textContent = "Saving…";
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dictionaryProvider: provider.value }),
      });
      const saved = await response.json();
      providerStatus.textContent = saved.ok ? "Saved" : "Could not save";
    };
    document.getElementById("dictionary-form").onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById("dictionary-word"),
        result = document.getElementById("dictionary-result"),
        word = input.value.trim();
      if (!word) {
        input.focus();
        return;
      }
      result.textContent = "Checking APIs…";
      try {
        const response = await fetch(
            "/api/admin/compare?word=" + encodeURIComponent(word),
            { cache: "no-store" },
          ),
          data = await response.json();
        const rows = (data.results || [])
          .map(
            (item) =>
              "<tr><th>" +
              esc(item.name) +
              "</th><td>" +
              (item.valid === true
                ? "Valid"
                : item.valid === false
                  ? "Not found"
                  : "Unavailable") +
              "</td><td>" +
              (item.score == null ? "—" : item.score) +
              "</td><td>" +
              (item.latencyMs == null ? "—" : item.latencyMs + "ms") +
              "</td><td>" +
              (item.cached ? "cached" : "fresh") +
              (item.error ? " · " + esc(item.error) : "") +
              "</td></tr>",
          )
          .join("");
        result.innerHTML =
          "<strong>" +
          esc(data.word || word) +
          "</strong><table><thead><tr><th>API</th><th>Result</th><th>Score</th><th>Time</th><th>State</th></tr></thead><tbody>" +
          rows +
          "</tbody></table>";
      } catch {
        result.textContent =
          "The API comparison failed before a result was returned.";
      }
    };
    document.querySelectorAll("[data-kill]").forEach(
      (b) =>
        (b.onclick = async () => {
          await fetch("/api/admin/kill/" + b.dataset.kill, { method: "POST" });
          admin();
        }),
    );
    clearTimeout(adminTimer);
    adminTimer = setTimeout(admin, 30000);
  }
  render();
})();
