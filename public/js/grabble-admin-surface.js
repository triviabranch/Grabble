(function () {
  const s = window.GrabbleSurface;
  window.GrabbleAdmin.configure({shell: s.shell, esc: s.esc});
  window.GrabbleAdmin.render();
})();