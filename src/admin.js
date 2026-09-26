import { VALUE } from './shared.js';

export class GrabbleAdmin {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === '/test-runs' && (req.method === 'GET' || req.method === 'POST')) {
      const configured = String(this.env.TBLIVE_REGISTRY_TOKEN || '');
      if (!configured || req.headers.get('authorization') !== 'Bearer ' + configured) return Response.json({ error: 'UNAUTHORISED' }, { status: 401 });
      if (req.method === 'POST') {
        const x = await req.json();
        const required = ['gameId', 'gameName', 'runId', 'workflow', 'branch', 'commitSha', 'runUrl', 'status', 'startedAt', 'completedAt', 'contractVersion'];
        if (required.some(key => !x[key]) || !['success', 'failure', 'cancelled'].includes(x.status)) return Response.json({ error: 'INVALID_TEST_RUN' }, { status: 400 });
        const key = 'test-run:' + String(x.gameId) + ':' + String(x.runId);
        await this.state.storage.put(key, { ...x, receivedAt: Date.now() });
        return Response.json({ ok: true });
      }
      const entries = await this.state.storage.list({ prefix: 'test-run:' });
      const runs = [...entries.values()].sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
      return Response.json({ runs, latestByGame: Object.fromEntries(runs.reduce((map, run) => map.has(run.gameId) ? map : map.set(run.gameId, run), new Map())) });
    }
    if (u.pathname === '/config' && req.method === 'GET') return Response.json({ dictionaryProvider: (await this.state.storage.get('config:dictionaryProvider')) || 'datamuse' });
    if (u.pathname === '/config' && req.method === 'POST') {
      let x = {}; try { x = await req.json(); } catch {}
      const dictionaryProvider = x.dictionaryProvider === 'dictionaryapi' ? 'dictionaryapi' : 'datamuse';
      await this.state.storage.put('config:dictionaryProvider', dictionaryProvider);
      return Response.json({ ok: true, dictionaryProvider });
    }
    if (u.pathname.startsWith('/datamuse/') && req.method === 'GET') return this.datamuse(decodeURIComponent(u.pathname.slice('/datamuse/'.length)).trim().toLowerCase());
    if (u.pathname.startsWith('/dictionary/') && req.method === 'GET') return this.dictionary(decodeURIComponent(u.pathname.slice('/dictionary/'.length)).toLowerCase());
    if (u.pathname === '/register' && req.method === 'POST') {
      const x = await req.json();
      if (!x.code) return new Response('missing code', { status: 400 });
      await this.state.storage.put('room:' + x.code, { gameId: x.gameId || 'grabble', gameName: x.gameName || 'Grabble', code: x.code, mode: x.mode || 'single', phase: x.phase || 'lobby', players: Number(x.players || 0), createdAt: Number(x.createdAt || Date.now()), updatedAt: Date.now() });
      return Response.json({ ok: true });
    }
    if (u.pathname === '/games' && req.method === 'GET') return Response.json({ games: [{ id: 'grabble', name: 'Grabble', status: 'online', capabilities: ['dictionary', 'room-kill', 'hostless-tv', 'html-surfaces'] }] });
    if (u.pathname === '/rooms') {
      const entries = await this.state.storage.list({ prefix: 'room:' });
      return Response.json({ rooms: [...entries.values()].sort((a, b) => b.updatedAt - a.updatedAt) });
    }
    if (u.pathname.startsWith('/unregister/') && req.method === 'POST') {
      await this.state.storage.delete('room:' + decodeURIComponent(u.pathname.slice('/unregister/'.length)).toUpperCase());
      return Response.json({ ok: true });
    }
    if (u.pathname.startsWith('/kill/') && req.method === 'POST') {
      const code = u.pathname.split('/').pop().toUpperCase();
      await this.env.ROOMS.get(this.env.ROOMS.idFromName(code)).fetch('https://room/admin/kill', { method: 'POST' });
      await this.state.storage.delete('room:' + code);
      return Response.json({ ok: true });
    }
    if (u.pathname === '/kill-all' && req.method === 'POST') {
      const entries = await this.state.storage.list({ prefix: 'room:' });
      for (const [key, room] of entries) { await this.env.ROOMS.get(this.env.ROOMS.idFromName(String(room.code).toUpperCase())).fetch('https://room/admin/kill', { method: 'POST' }); await this.state.storage.delete(key); }
      return Response.json({ ok: true });
    }
    return new Response('not found', { status: 404 });
  }
  async datamuse(word) {
    const started = Date.now(), score = valid => valid ? [...word].reduce((n, ch) => n + (VALUE[ch] || 0), 0) : 0;
    if (!/^[a-z]{3,}$/.test(word)) return Response.json({ name: 'Datamuse', word, valid: false, score: 0, cached: false, source: 'Datamuse', latencyMs: Date.now() - started });
    const key = 'datamuse:' + word, cached = await this.state.storage.get(key);
    if (cached && cached.expiresAt > Date.now()) return Response.json({ name: 'Datamuse', word, valid: cached.valid, score: score(cached.valid), cached: true, source: 'Datamuse', latencyMs: Date.now() - started });
    try {
      const response = await fetch('https://api.datamuse.com/words?sp=' + encodeURIComponent(word) + '&max=10', { headers: { accept: 'application/json' } });
      if (response.ok) { const list = await response.json(), valid = Array.isArray(list) && list.some(item => String(item?.word || '').toLowerCase() === word && !word.includes(' ')); await this.state.storage.put(key, { valid, expiresAt: Date.now() + (valid ? 30 : 1) * 86400000 }); return Response.json({ name: 'Datamuse', word, valid, score: score(valid), cached: false, source: 'Datamuse', status: response.status, latencyMs: Date.now() - started }); }
    } catch {}
    return Response.json({ name: 'Datamuse', word, valid: null, score: null, cached: false, source: 'Datamuse', latencyMs: Date.now() - started });
  }
  async dictionary(word) {
    if (!/^[a-z]{3,}$/.test(word)) return Response.json({ valid: false });
    const key = 'dictionary:' + word, cached = await this.state.storage.get(key);
    if (cached && cached.expiresAt > Date.now()) return Response.json({ valid: cached.valid });
    try { const response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word)); if (response.ok || response.status === 404) { const valid = response.ok; await this.state.storage.put(key, { valid, expiresAt: Date.now() + (valid ? 30 : 1) * 86400000 }); return Response.json({ valid }); } } catch {}
    return Response.json({ valid: null });
  }
}
