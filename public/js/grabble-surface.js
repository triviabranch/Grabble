(function () {
  const parts = location.pathname.split("/").filter(Boolean);
  const mode = parts[0] || "play";
  const code = parts[1] || "";
  const app = document.getElementById("app");
  let state = null;
  let me = null;
  let leaving = false;
  let leaveTimer = null;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (x) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[x]));
  const logo = () => '<img src="/assets/grabble-wordmark.png" alt="Grabble">';
  const shell = (body) => {
    let root = app.querySelector("main.shell-" + mode);
    if (!root) {
      const back = mode === "tv"
        ? '<button class="tv-back" id="tv-back" type="button" aria-label="Back to TriviaBranch TV">← TriviaBranch</button>'
        : "";
      const label = mode === "play" ? "PLAYER" : mode === "display" ? "DISPLAY" : mode === "host" ? "HOST" : "";
      app.innerHTML = '<main class="shell shell-' + mode + '"><header class="brand">' + back + logo() + (label ? "<small>" + label + "</small>" : "") + "</header></main>";
      root = app.querySelector("main.shell-" + mode);
      document.getElementById("tv-back")?.addEventListener("click", () => {
        leaving = true;
        location.href = "https://tv.triviabranch.com";
      });
    }
    const header = root.querySelector(":scope > .brand");
    while (root.lastElementChild && root.lastElementChild !== header) root.removeChild(root.lastElementChild);
    root.insertAdjacentHTML("beforeend", body);
  };
  const create = async (selectedMode) => {
    const response = await fetch("/api/create", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({mode: selectedMode}),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.code) throw new Error(payload?.error || "Room creation failed");
    return payload;
  };
  const configureCreate = () => window.GrabbleCreate?.configure({
    shell, logo, create, mode, setLeaving: () => { leaving = true; }
  });
  const connect = (role, name, onState) => {
    window.GrabbleTransport.configure({
      code,
      mode,
      getState: () => state,
      isLeaving: () => leaving,
      onHello: (message) => {
        me = message.playerId;
        window.GrabbleSurface.onHello?.(message);
      },
      onState: (message) => {
        const previous = state;
        state = message;
        onState?.(state, previous);
      },
      onLeft: () => {
        clearTimeout(leaveTimer);
        localStorage.removeItem("grabble-player-token:" + code);
        localStorage.removeItem("grabble-pending-join");
        location.href = "/";
      },
    });
    window.GrabbleTransport.connect(role, name);
  };
  const leave = () => {
    if (leaving) return;
    leaving = true;
    const finish = () => {
      clearTimeout(leaveTimer);
      localStorage.removeItem("grabble-player-token:" + code);
      localStorage.removeItem("grabble-pending-join");
      location.href = "/";
    };
    if (window.GrabbleTransport.getSocket()?.readyState === 1) {
      leaveTimer = setTimeout(finish, 700);
      window.GrabbleTransport.send({type:"leave"});
    } else finish();
  };
  window.GrabbleSurface = {
    mode, code, esc, logo, shell, create, configureCreate, connect, leave,
    getState: () => state, getMe: () => me,
    setState: (next) => { state = next; },
    getLeaving: () => leaving,
  };
})();