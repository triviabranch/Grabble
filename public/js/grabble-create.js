(function () {
  let api = {};
  function configure(next) {
    api = next;
  }
  function openCreateFlow(surface) {
    const modal = document.createElement("div");
    modal.className = "setup-modal setup-modal-" + surface;
    const needsName = surface === "play";
    const singlePage = surface === "tv";
    modal.innerHTML =
      '<div class="setup-backdrop"></div><section class="setup-card" role="dialog" aria-modal="true" aria-labelledby="setup-title"><div class="setup-head setup-head-tv"><button class="setup-tv-back" id="setup-tv-back" type="button" aria-label="Back to TriviaBranch TV"><span aria-hidden="true">←</span> TriviaBranch</button>' +
      api.logo() +
      '<p class="setup-step-label" id="setup-step-label">SETUP · 1 OF ' +
      (singlePage ? "1" : "2") +
      '</p><div class="setup-progress" aria-label="Setup progress"><i class="active"></i>' +
      (singlePage ? "" : '<i></i>') +
      '</div></div><div class="setup-page active" data-page="0"><p class="setup-kicker">GAME FORMAT</p><h2 id="setup-title">Choose a format</h2><p>Select how many rounds to play.</p><div class="setup-options"><button class="setup-option selected" aria-pressed="true" data-mode="single"><strong>Single round</strong><small>One round.</small></button><button class="setup-option" aria-pressed="false" data-mode="competition"><strong>Competition</strong><small>Five rounds.</small></button></div>' +
      (singlePage
        ? '<div class="setup-page-actions"><button class="next" id="setup-next">Open lobby</button></div></div>'
        : '<div class="setup-page-actions"><button class="next" id="setup-next-first">Next</button></div></div><div class="setup-page" data-page="1"><p class="setup-kicker">LOBBY</p><h2>Open the lobby</h2><p><span id="setup-summary">Single round</span></p>') +
      (needsName
        ? '<div class="setup-field"><input id="name" maxlength="18" placeholder="YOUR NAME" autocomplete="name"></div>'
        : "") +
      (singlePage
        ? ""
        : '<div class="setup-footer"><button class="back" id="setup-back">Back</button><button class="next" id="setup-next">Open lobby</button></div></div>') +
      "</section>";
    document.body.append(modal);
    let page = 0,
      chosen = "single";
    const pages = [...modal.querySelectorAll(".setup-page")],
      dots = [...modal.querySelectorAll(".setup-progress i")],
      summary = modal.querySelector("#setup-summary"),
      stepLabel = modal.querySelector("#setup-step-label"),
      setPage = (n) => {
        page = n;
        pages.forEach((x, i) => x.classList.toggle("active", i === page));
        dots.forEach((x, i) => x.classList.toggle("active", i === page));
        if (stepLabel)
          stepLabel.textContent = "SETUP · " + (n + 1) + " OF " + pages.length;
        if (summary)
          summary.textContent =
            chosen === "competition" ? "Competition · 5 rounds" : "Single round";
      };
    modal.querySelectorAll("[data-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          chosen = b.dataset.mode;
          modal.querySelectorAll("[data-mode]").forEach((x) => {
            const selected = x === b;
            x.classList.toggle("selected", selected);
            x.setAttribute("aria-pressed", selected ? "true" : "false");
          });
        }),
    );
    modal.querySelector("#setup-next-first")?.addEventListener("click", () => {
      setPage(1);
      if (needsName) setTimeout(() => modal.querySelector("#name").focus(), 0);
    });
    modal.querySelector("#setup-back")?.addEventListener("click", () => setPage(0));
    modal
      .querySelector("#setup-tv-back")
      ?.addEventListener("click", () => modal.remove());
    modal.querySelector("#setup-next").onclick = async () => {
      const name = needsName
        ? modal.querySelector("#name").value.trim() || "Player"
        : "";
      if (needsName) localStorage.setItem("grabble-name", name);
      const btn = modal.querySelector("#setup-next");
      btn.disabled = true;
      btn.textContent = "Creating…";
      try {
        const x = await api.create(chosen);
        if (surface === "tv" && x.controlToken)
          localStorage.setItem("grabble-tv-token", x.controlToken);
        if (surface === "host" && x.controlToken)
          localStorage.setItem("grabble-host-token", x.controlToken);
        if (needsName)
          localStorage.setItem(
            "grabble-pending-join",
            JSON.stringify({ code: x.code, name }),
          );
        location.href =
          "/" + (surface === "play" ? "play" : surface) + "/" + x.code;
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "Open lobby";
        let note = modal.querySelector(".create-error");
        if (!note) {
          note = document.createElement("p");
          note.className = "status create-error";
          modal.querySelector(".setup-page.active").append(note);
        }
        note.textContent =
          e?.message || "Could not create the room. Try again.";
      }
    };
    modal.querySelector(".setup-backdrop").onclick = () => modal.remove();
  }
  function tvExplainer() {
    const modal = document.createElement("div");
    modal.className = "setup-modal tv-explainer-modal";
    modal.innerHTML =
      '<div class="setup-backdrop"></div><section class="setup-card tv-explainer-card" role="dialog" aria-modal="true" aria-labelledby="tv-explainer-title"><div class="setup-head">' +
      api.logo() +
      '</div><div class="setup-page active"><p class="eyebrow">HOW TO PLAY</p><h2 id="tv-explainer-title">Build the longest word</h2><p>Take letters from the pool. Make the longest word before time runs out.</p></div><div class="setup-footer"><span></span><button class="next" id="tv-explainer-next">Continue</button></div></section>';
    document.body.append(modal);
    modal.querySelector("#tv-explainer-next").onclick = () => {
      modal.remove();
      openCreateFlow("tv");
    };
    modal.querySelector(".setup-backdrop").onclick = () => modal.remove();
  }
  function tvHome() {
    api.shell('<section class="center tv-create-home" aria-label="Grabble TV setup"></section>');
    tvExplainer();
  }
  function home() {
    api.shell(
      '<section class="center home-hero"><div class="home-panel panel"><p class="home-kicker">BUILD YOUR WORD</p><h1>Build the longest word before time runs out.</h1><p class="home-copy">Grab letters from the pool, make your move and beat the room.</p><div class="home-actions"><button id="open-setup">Create a game</button><button class="secondary" id="open-join">Join a room</button></div></div></section>',
    );
    document.getElementById("open-setup").onclick = () =>
      openCreateFlow("play");
    document.getElementById("open-join").onclick = () => {
      const joinModal = document.createElement("div");
      joinModal.className = "setup-modal";
      joinModal.innerHTML =
        '<div class="setup-backdrop"></div><section class="setup-card join-modal-card" role="dialog" aria-modal="true" aria-labelledby="join-title"><div class="setup-head">' +
        api.logo() +
        '</div><div class="setup-page active"><p class="eyebrow">JOIN A ROOM</p><h2 id="join-title">Room code</h2><p>Enter the four-character code shown on the display.</p><div class="setup-field"><input id="room" maxlength="4" placeholder="ROOM CODE" autocomplete="off" inputmode="text"></div></div><div class="setup-footer"><button class="back" id="close-join">Cancel</button><button class="next" id="join">Join room</button></div></section>';
      document.body.append(joinModal);
      const close = () => joinModal.remove();
      joinModal.querySelector("#close-join").onclick = close;
      joinModal.querySelector(".setup-backdrop").onclick = close;
      joinModal.querySelector("#join").onclick = () => {
        const c = joinModal.querySelector("#room").value.trim().toUpperCase();
        if (/^[A-Z0-9]{4}$/.test(c)) location.href = "/play/" + c;
        else joinModal.querySelector("#room").focus();
      };
      joinModal.querySelector("#room").focus();
    };
  }
  function hostHome() {
    api.shell(
      '<section class="center hero panel"><p>Set up the room, then put the shared display on the TV.</p><button id="open-host-setup">Create host room</button></section>',
    );
    document.getElementById("open-host-setup").onclick = () =>
      openCreateFlow("host");
  }
  window.GrabbleCreate = { configure, tvHome, home, hostHome, openCreateFlow };
})();
