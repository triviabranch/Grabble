/* Shared room transport. Surface rendering stays in grabble-client.js. */
(function () {
  let config = {},
    socket = null,
    queuedAction = null;
  const configure = (next) => {
    config = next || {};
  };
  const send = (action) => {
    if (socket?.readyState === 1) socket.send(JSON.stringify(action));
    else if (action.type === "start" || action.type === "next")
      queuedAction = action;
  };
  const connect = (role, name) => {
    const code = config.code || "",
      mode = config.mode || "play";
    const playerToken =
      role === "play" ? localStorage.getItem("grabble-player-token") || "" : "";
    const controlToken =
      role === "tv"
        ? localStorage.getItem("grabble-tv-token") || ""
        : role === "host"
          ? localStorage.getItem("grabble-host-token") || ""
          : "";
    socket = new WebSocket(
      (location.protocol === "https:" ? "wss" : "ws") +
        "://" +
        location.host +
        "/ws/" +
        code +
        "?role=" +
        role +
        "&name=" +
        encodeURIComponent(name || "") +
        "&playerToken=" +
        encodeURIComponent(playerToken) +
        "&controlToken=" +
        encodeURIComponent(controlToken),
    );
    socket.onopen = () => {
      if (queuedAction) {
        socket.send(JSON.stringify(queuedAction));
        queuedAction = null;
      }
    };
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === "hello") {
        config.onHello?.(message, role);
        if (role === "play" && message.playerToken)
          localStorage.setItem("grabble-player-token", message.playerToken);
      }
      if (message.type === "left") {
        config.onLeft?.();
        return;
      }
      if (message.type === "state") config.onState?.(message);
    };
    socket.onclose = () => {
      const current = config.getState?.();
      if (
        !config.isLeaving?.() &&
        mode === "play" &&
        code &&
        current?.phase !== "final" &&
        current?.phase !== "closed"
      )
        setTimeout(
          () =>
            connect(
              "play",
              name || localStorage.getItem("grabble-name") || "Player",
            ),
          500,
        );
    };
  };
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      config.mode === "play" &&
      config.code &&
      (!socket || socket.readyState > 1)
    )
      connect("play", localStorage.getItem("grabble-name") || "Player");
  });
  window.GrabbleTransport = {
    configure,
    connect,
    send,
    getSocket: () => socket,
  };
})();
