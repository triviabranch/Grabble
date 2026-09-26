import { registryCall } from './shared.js';

async function makeRoom(env, mode, baseUrl) {
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  const controlToken = crypto.randomUUID() + crypto.randomUUID();
  const displayToken = crypto.randomUUID() + crypto.randomUUID();
  const init = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('https://room/init', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, mode, controlToken, displayToken }),
  });
  if (!init.ok) throw new Error('ROOM_INIT_' + init.status);
  await registryCall(env, '/register', { gameId: 'grabble', gameName: 'Grabble', roomId: code, roomCode: code, phase: 'lobby', mode, players: 0, createdAt: Date.now(), controlUrl: baseUrl + '/api/tblive/rooms/' + code + '/kill', capabilities: ['hostless-tv', 'room-kill', 'html-surfaces'] }).catch(() => null);
  return { code, controlToken, displayToken };
}

export default { async fetch(request, env) {
  const u = new URL(request.url), p = u.pathname.split('/').filter(Boolean);
  if (p[0] === 'api' && p[1] === 'tblive' && p[2] === 'rooms' && p[4] === 'kill' && request.method === 'POST') {
    const token = String(env.TBLIVE_REGISTRY_TOKEN || '');
    if (!token || request.headers.get('authorization') !== 'Bearer ' + token) return Response.json({ error: 'UNAUTHORISED' }, { status: 401 });
    const code = String(p[3] || '').toUpperCase();
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('https://room/admin/kill', { method: 'POST' });
  }
  if (p[0] === 'api' && p[1] === 'create' && request.method === 'POST') {
    let x = {}; try { x = await request.json(); } catch {}
    try { return Response.json(await makeRoom(env, x.mode === 'competition' ? 'competition' : 'single', u.origin)); }
    catch (error) { return Response.json({ error: 'Unable to create the room right now.', detail: String(error?.message || error) }, { status: 500 }); }
  }
  if (p[0] === 'api' && p[1] === 'admin' && p[2] === 'rooms' && request.method === 'GET') {
    const response = await env.ADMIN.get(env.ADMIN.idFromName('global')).fetch('https://admin/rooms'), data = await response.json();
    return Response.json({ rooms: (data.rooms || []).map(r => ({ ...r, gameId: 'grabble', gameName: 'Grabble', createdAt: r.createdAt, phase: r.phase || 'lobby', mode: r.mode || 'hosted' })) });
  }
  if (p[0] === 'api' && p[1] === 'admin' && p[2] === 'test-runs' && (request.method === 'GET' || request.method === 'POST')) return env.ADMIN.get(env.ADMIN.idFromName('global')).fetch('https://admin/test-runs', { method: request.method, headers: request.headers, body: request.method === 'POST' ? request.body : undefined });
  if (p[0] === 'api' && p[1] === 'admin' && p[2] === 'games' && request.method === 'GET') return Response.json({ games: [{ id: 'grabble', name: 'Grabble', status: 'online', rooms: 0, capabilities: ['dictionary', 'room-kill', 'hostless-tv', 'html-surfaces'] }] });
  if (p[0] === 'api' && p[1] === 'admin' && p[2] === 'config' && (request.method === 'GET' || request.method === 'POST')) return env.ADMIN.get(env.ADMIN.idFromName('global')).fetch('https://admin/config', { method: request.method, headers: request.headers, body: request.method === 'POST' ? request.body : undefined });
  if (p[0] === 'api' && p[1] === 'admin' && p[2] === 'compare' && request.method === 'GET') {
    const word = new URL(request.url).searchParams.get('word') || '', adminId = env.ADMIN.idFromName('global');
    const [dictionaryResponse, datamuseResponse] = await Promise.all([env.ADMIN.get(adminId).fetch('https://admin/dictionary/' + encodeURIComponent(word)), env.ADMIN.get(adminId).fetch('https://admin/datamuse/' + encodeURIComponent(word))]);
    const dictionary = await dictionaryResponse.json(), datamuse = await datamuseResponse.json();
    return Response.json({ word, results: [{ name: 'dictionaryapi.dev', ...dictionary }, { name: 'Datamuse', ...datamuse }] });
  }
  if (p[0] === 'api' && p[1] === 'admin' && p[2] === 'dictionary' && request.method === 'GET') {
    const word = new URL(request.url).searchParams.get('word') || '';
    return env.ADMIN.get(env.ADMIN.idFromName('global')).fetch('https://admin/dictionary/' + encodeURIComponent(word));
  }
  if (p[0] === 'api' && p[1] === 'admin' && p.length === 2) return env.ADMIN.get(env.ADMIN.idFromName('global')).fetch('https://admin/rooms');
  if (p[0] === 'ws' && p[1]) return env.ROOMS.get(env.ROOMS.idFromName(p[1].toUpperCase())).fetch(request);
  async function serveSurface(mode) {
    const asset = await env.ASSETS.fetch(new Request(new URL('/surfaces/' + mode + '.html', request.url), { method: 'GET', headers: request.headers }));
    if (asset.ok) return new Response(asset.body, asset);
    return new Response('Surface unavailable', { status: 500 });
  }
  if (p.length === 0) return serveSurface('home');
  if (p[0] === 'admin' && p.length === 1) return serveSurface('admin');
  if (p[0] === 'tv' && p.length === 1) return serveSurface('tv');
  if (['play', 'display', 'tv', 'host'].includes(p[0]) && p.length === 2) return serveSurface(p[0]);
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain;charset=UTF-8' } });
} };
