// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Single combined runthrough — performs every step from demo.spec.js in one
 * continuous user journey and saves the recording to demos/runthrough/demo.webm.
 *
 * Run with: npx playwright test --config=playwright.demo.config.js
 */

test('full demo runthrough', async ({ page }, testInfo) => {
  // ─── 1. Land on hero ──────────────────────────────────────────────────────
  await page.goto('/');
  await page.waitForSelector('#physics-debug', { timeout: 8_000 });

  await expect(page.locator('#promoScene')).toBeVisible();
  await expect(page.locator('#promoScene .carousel')).toBeVisible();
  await page.waitForTimeout(1_500);

  // ─── 2. Scroll to W Series, cycle through colours ─────────────────────────
  const waterScene = page.locator('#waterScene');
  await waterScene.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  for (const color of ['white', 'pink', 'blue', 'black']) {
    const btn = page.locator(`#waterScene .colors button[data-color="${color}"]`);
    await btn.click();
    await expect(btn).toHaveClass(/selected/);
    await page.waitForTimeout(700);
  }

  // ─── 3. Scroll to release threshold — gravity flips down ──────────────────
  const debugFooter = page.locator('#physics-debug');

  await page.evaluate(() => {
    const ws = document.getElementById('waterScene');
    const wsPx = ws.offsetHeight - 819 + 100;
    const releaseY = ws.offsetTop + wsPx - window.innerHeight / 2;
    window.scrollTo({ top: releaseY + 20, behavior: 'instant' });
  });
  await expect(debugFooter).toContainText('down', { timeout: 4_000 });

  // ─── 4. Watch headphones fall and fully submerge ──────────────────────────
  await expect(async () => {
    const text = await debugFooter.textContent();
    expect(text).toMatch(/SUBMERGED\s+true/);
  }).toPass({ timeout: 15_000, intervals: [500] });

  await page.waitForTimeout(1_500);

  // ─── 5. Continue to New Depths panel ──────────────────────────────────────
  await page.evaluate(() => {
    const waterPanel = document.querySelector('#waterScene .water-panel');
    if (waterPanel) waterPanel.scrollIntoView({ behavior: 'instant' });
  });
  const newDepthsHeading = page.locator('#waterScene .water-panel h1');
  await expect(newDepthsHeading).toBeVisible();
  await expect(newDepthsHeading).toContainText('New Depths');

  // ─── 5b. Wait for headphones to settle (POS stops changing) ───────────────
  const readPos = async () => {
    const text = (await debugFooter.textContent()) || '';
    const m = text.match(/POS\s*\(([-\d.]+),\s*([-\d.]+)\)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
  };
  await expect(async () => {
    const a = await readPos();
    await page.waitForTimeout(500);
    const b = await readPos();
    expect(a && b).toBeTruthy();
    expect(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])).toBeLessThan(0.02);
  }).toPass({ timeout: 20_000, intervals: [500] });
  await page.waitForTimeout(800);

  // ─── 6. Scroll back up — gravity flips up ─────────────────────────────────
  await page.evaluate(() => {
    const ws = document.getElementById('waterScene');
    const wsPx = ws.offsetHeight - 819 + 100;
    const releaseY = ws.offsetTop + wsPx - window.innerHeight / 2;
    window.scrollTo({ top: releaseY - 50, behavior: 'instant' });
  });
  await expect(debugFooter).toContainText('up', { timeout: 4_000 });
  await page.waitForTimeout(2_500);

  // ─── 7. Save the video to demos/runthrough/demo.webm ──────────────────────
  const video = page.video();
  await page.close();
  if (video) {
    const outDir = path.resolve(__dirname, '..', 'demos', 'runthrough');
    fs.mkdirSync(outDir, { recursive: true });
    const target = path.join(outDir, 'demo.webm');
    await video.saveAs(target);
    await video.delete().catch(() => {});
    console.log(`\n🎬 Demo video saved to: ${target}\n`);
  }
});
