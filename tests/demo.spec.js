// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Demo interaction test — mirrors the intended user journey through the
 * W Series Sports Walkman microsite:
 *   1. Land on hero carousel
 *   2. Scroll to W Series section → change headphone colour
 *   3. Scroll to trigger physics release → watch headphones fall into water
 *   4. Continue to New Depths panel → confirm submersion
 */

test.describe('W Series Sports Walkman — demo interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for Box2D to initialise (world.js appends the debug footer when ready)
    await page.waitForSelector('#physics-debug', { timeout: 8_000 });
  });

  // ─── 1. Hero section ────────────────────────────────────────────────────────
  test('hero carousel is visible on load', async ({ page }) => {
    await expect(page.locator('#promoScene')).toBeVisible();
    await expect(page.locator('#promoScene .carousel')).toBeVisible();
    // Pagination dots should be present (one per slide)
    const dots = page.locator('#promoScene .pagination li');
    await expect(dots).toHaveCount(2);
  });

  // ─── 2. First section — W Series product panel ──────────────────────────────
  test('scroll to W Series section and change headphone colour', async ({ page }) => {
    const waterScene = page.locator('#waterScene');

    // Scroll the waterScene section into view
    await waterScene.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // All four colour buttons should be present
    const colorButtons = page.locator('#waterScene .colors button');
    await expect(colorButtons).toHaveCount(4);

    // Click the pink button
    const pinkBtn = page.locator('#waterScene .colors button[data-color="pink"]');
    await pinkBtn.click();

    // Button gains 'selected' class
    await expect(pinkBtn).toHaveClass(/selected/);

    // #world-box background switches to the pink image
    const worldBox = page.locator('#world-box');
    const bgImage = await worldBox.evaluate((el) => el.style.backgroundImage);
    expect(bgImage).toMatch(/NWZW273SB_pink/);

    // Switch back to black to leave a clean state for subsequent tests
    await page.locator('#waterScene .colors button[data-color="black"]').click();
  });

  // ─── 3. Scroll to waterline → physics release → headphones fall ─────────────
  test('headphones are released and fall when waterline crosses viewport midpoint', async ({ page }) => {
    const debugFooter = page.locator('#physics-debug');
    const worldBox = page.locator('#world-box');

    // Physics should start frozen
    await expect(debugFooter).toContainText('frozen');

    // Scroll until the waterline reaches the viewport midpoint (release threshold)
    await page.evaluate(() => {
      const ws = document.getElementById('waterScene');
      const wsPx = ws.offsetHeight - 819 + 100; // mirrors WATER_PX in world.js
      const releaseY = ws.offsetTop + wsPx - window.innerHeight / 2;
      window.scrollTo({ top: releaseY + 20, behavior: 'instant' });
    });

    // Gravity should flip to 'down' within a short window
    await expect(debugFooter).toContainText('down', { timeout: 4_000 });

    // Record the headphone box top position right after release
    const topBefore = await worldBox.evaluate((el) => parseFloat(el.style.top) || 0);

    // Wait for Box2D to step the simulation — box should have moved downward
    await page.waitForTimeout(1_500);
    const topAfter = await worldBox.evaluate((el) => parseFloat(el.style.top) || 0);

    expect(topAfter).toBeGreaterThan(topBefore);
  });

  // ─── 4. Full journey — fall into pool, reach New Depths panel ───────────────
  test('headphones submerge and New Depths panel is reached', async ({ page }) => {
    const debugFooter = page.locator('#physics-debug');

    // Trigger release
    await page.evaluate(() => {
      const ws = document.getElementById('waterScene');
      const wsPx = ws.offsetHeight - 819 + 100;
      const releaseY = ws.offsetTop + wsPx - window.innerHeight / 2;
      window.scrollTo({ top: releaseY + 20, behavior: 'instant' });
    });
    await expect(debugFooter).toContainText('down', { timeout: 4_000 });

    // Let the headphones fall long enough to fully submerge
    // (top of box crosses the waterline in Box2D coordinates)
    await expect(async () => {
      const text = await debugFooter.textContent();
      expect(text).toMatch(/SUBMERGED\s+true/);
    }).toPass({ timeout: 15_000, intervals: [500] });

    // Scroll to the New Depths (water-panel) section
    await page.evaluate(() => {
      const waterPanel = document.querySelector('#waterScene .water-panel');
      if (waterPanel) waterPanel.scrollIntoView({ behavior: 'instant' });
    });

    // New Depths heading should be visible
    const newDepthsHeading = page.locator('#waterScene .water-panel h1');
    await expect(newDepthsHeading).toBeVisible();
    await expect(newDepthsHeading).toContainText('New Depths');
  });

  // ─── 5. Scroll back up resets gravity to 'up' ───────────────────────────────
  test('scrolling back above the release threshold flips gravity to up', async ({ page }) => {
    const debugFooter = page.locator('#physics-debug');

    // Release first
    await page.evaluate(() => {
      const ws = document.getElementById('waterScene');
      const wsPx = ws.offsetHeight - 819 + 100;
      const releaseY = ws.offsetTop + wsPx - window.innerHeight / 2;
      window.scrollTo({ top: releaseY + 20, behavior: 'instant' });
    });
    await expect(debugFooter).toContainText('down', { timeout: 4_000 });

    // Scroll back above the release threshold
    await page.evaluate(() => {
      const ws = document.getElementById('waterScene');
      const wsPx = ws.offsetHeight - 819 + 100;
      const releaseY = ws.offsetTop + wsPx - window.innerHeight / 2;
      window.scrollTo({ top: releaseY - 50, behavior: 'instant' });
    });

    await expect(debugFooter).toContainText('up', { timeout: 4_000 });
  });
});
