import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:8787';
const browser = await chromium.launch({ headless: true });
const tvContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const tv = await tvContext.newPage();
try {
  await tv.goto(base + '/tv', { waitUntil: 'networkidle' });
  await tv.getByRole('button', { name: 'Continue' }).click();
  await tv.getByRole('button', { name: 'Open lobby' }).click();
  await tv.waitForURL(url => new RegExp('^/tv/[A-Z0-9]{4}$').test(url.pathname));
  const code = new URL(tv.url()).pathname.split('/').pop();
  assert.match(code, /^[A-Z0-9]{4}$/);

  const player = await tvContext.newPage();
  await player.goto(base + '/play/' + code, { waitUntil: 'networkidle' });
  await player.locator('#name').fill('Ash');
  await player.getByRole('button', { name: 'Join game' }).click();
  await player.getByRole('button', { name: 'Continue' }).click();
  await tv.getByText('Ash', { exact: true }).waitFor();
  await tv.waitForTimeout(1000);
  await tv.locator('#start').click({ force: true });
  await tv.locator('.display-pool').waitFor({ state: 'visible', timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 34000));
  await tv.locator('.display-result-stage .time-up, .result-stage .time-up').first().waitFor({ state: 'visible', timeout: 10000 });
  await browser.close();
  console.log('TBLive 1.34 hostless browser flow passed');
} catch (error) {
  await browser.close();
  throw error;
}
