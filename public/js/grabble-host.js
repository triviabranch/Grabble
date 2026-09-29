(function () {
  const s = window.GrabbleSurface, common = window.GrabbleRoomCommon;
  s.configureCreate();
  const render = (state) => {
    if (state.phase === "lobby") {
      s.shell('<div class="display-stage"><div class="display-lobby"><div class="display-copy"><p class="eyebrow">HOST LOBBY</p><h1>Join Game</h1><p>' + state.players.length + ' players joined</p>' + common.rules() + '<div class="display-controls"><button id="start" class="race-start-cta">Start game</button><button class="secondary" id="play-on-phone">Play Now</button><button class="secondary" id="open-display">Open display</button></div></div></div></div>');
      document.getElementById("start")?.addEventListener("click",()=>window.GrabbleTransport.send({type:"start"}),{once:true});
      document.getElementById("play-on-phone")?.addEventListener("click",()=>window.open("/play/"+s.code,"_blank","noopener"),{once:true});
      document.getElementById("open-display")?.addEventListener("click",()=>window.open("/display/"+s.code+"?displayToken="+encodeURIComponent(localStorage.getItem("grabble-display-token:"+s.code)||""),"_blank","noopener"),{once:true});
    } else if (state.phase === "countdown" || state.phase === "running") s.shell('<div class="display-stage">' + common.pool(state,state.phase==="running",state.phase==="countdown"?3:null) + '</div>');
    else s.shell(common.results(state,s.getMe()));
  };
  if (!s.code) window.GrabbleCreate.hostHome();
  else s.connect("host","Host",render);
})();
