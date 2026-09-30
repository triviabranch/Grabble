(function () {
  const s = window.GrabbleSurface, common = window.GrabbleRoomCommon;
  s.configureCreate();
  const render = (state) => {
    if (state.phase === "lobby") {
      const savedName = localStorage.getItem("grabble-host-name") || "";
      const canStart = state.players.length > 0;
      s.shell('<div class="display-stage"><div class="display-lobby"><div class="display-copy"><p class="eyebrow">HOST LOBBY</p><h1>Lobby</h1><p>' + state.players.length + ' players joined</p>' + common.rules() + '<div class="display-controls"><div class="host-play-row"><label class="sr-only" for="host-player-name">Your name</label><input id="host-player-name" maxlength="18" placeholder="Your name" autocomplete="name" value="' + s.esc(savedName) + '"><button class="secondary" id="play-on-phone">Join as player</button></div><button id="start" class="race-start-cta"' + (canStart ? "" : " disabled") + '>Start game</button><button class="secondary" id="open-display">Open display</button></div></div></div></div>');
      document.getElementById("start")?.addEventListener("click",()=>window.GrabbleTransport.send({type:"start"}),{once:true});
      document.getElementById("play-on-phone")?.addEventListener("click",()=>{ const name=(document.getElementById("host-player-name")?.value||"").trim(); if(!name){ document.getElementById("host-player-name")?.focus(); return; } localStorage.setItem("grabble-host-name",name); localStorage.setItem("grabble-pending-join",JSON.stringify({code:s.code,name,skipHowToPlay:true})); window.open("/play/"+s.code,"_blank","noopener"); },{once:true});
      document.getElementById("open-display")?.addEventListener("click",()=>window.open("/display/"+s.code+"?displayToken="+encodeURIComponent(localStorage.getItem("grabble-display-token:"+s.code)||""),"_blank","noopener"),{once:true});
    } else if (state.phase === "countdown" || state.phase === "running") s.shell('<div class="display-stage">' + common.pool(state,state.phase==="running",state.phase==="countdown"?3:null) + '</div>');
    else s.shell(common.results(state,s.getMe()));
  };
  if (!s.code) window.GrabbleCreate.hostHome();
  else s.connect("host","Host",render);
})();
