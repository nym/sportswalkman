/**
 * Box2D simulation — headphones float in waterScene; fall / rise based on
 * scroll direction; playfully reset via reversed gravity when scrolling up.
 *
 * Gravity modes:
 *   float  – g = 0, gentle bob force keeps headphones hovering
 *   down   – g = +9.8 while scrolling down through/past section
 *   up     – g = –9.8 while scrolling up (headphones return to top)
 *
 * Physics: Box2dWeb 2.1 + b2BuoyancyController (New Depths panel = water zone)
 *          density 1.3 — electronics sink, high drag slows descent.
 */
(function () {
  'use strict';

  /* ── Box2D aliases ────────────────────────────────────────── */
  var b2Vec2               = Box2D.Common.Math.b2Vec2;
  var b2World              = Box2D.Dynamics.b2World;
  var b2BodyDef            = Box2D.Dynamics.b2BodyDef;
  var b2Body               = Box2D.Dynamics.b2Body;
  var b2FixtureDef         = Box2D.Dynamics.b2FixtureDef;
  var b2PolygonShape       = Box2D.Collision.Shapes.b2PolygonShape;
  var b2BuoyancyController = Box2D.Dynamics.Controllers.b2BuoyancyController;

  /* ── DOM refs ─────────────────────────────────────────────── */
  var container    = document.getElementById('world');
  var waveCanvas   = document.getElementById('world-waves');
  var boxDiv       = document.getElementById('world-box');
  var waterSection = document.getElementById('waterScene');
  if (!container || !waveCanvas || !boxDiv || !waterSection) return;

  /* ── debug overlay ────────────────────────────────────────── */
  var dbg = document.createElement('div');
  dbg.id = 'world-debug';
  dbg.style.cssText = [
    'position:fixed', 'top:12px', 'right:12px',
    'color:#ff69b4', 'font:bold 11px/1.6 monospace',
    'background:rgba(0,0,0,0.55)', 'padding:8px 12px',
    'border-radius:6px', 'pointer-events:none',
    'z-index:9999', 'white-space:pre'
  ].join(';');
  document.body.appendChild(dbg);

  /* ── physics constants ────────────────────────────────────── */
  var SCALE  = 30;
  var BOX_PX = 200;              // 200 px half-side → 400 px full side
  var BOX_HM = BOX_PX / SCALE;  // ≈ 6.667 m

  /* ── layout — measured from live DOM ─────────────────────── */
  var W_PX, H_PX, W, H, WATER_M, WATER_PX, SHADOW_PX, POOL_FLOOR_M, START_Y_M;

  function layout() {
    var waterPanel     = waterSection.querySelector('.water-panel');
    var top            = waterSection.offsetTop;
    var width          = waterSection.offsetWidth;
    var height         = waterSection.offsetHeight;
    var waterPanelTop  = waterPanel ? waterPanel.offsetTop   : height * 0.5;
    var waterPanelH    = waterPanel ? waterPanel.offsetHeight : height * 0.5;

    W_PX         = width;
    H_PX         = height;
    W            = W_PX  / SCALE;
    H            = H_PX  / SCALE;
    // Waterline = top of the blue pool background graphic + 100px
    WATER_PX     = height - 819 + 100;
    WATER_M      = WATER_PX / SCALE;
    // Floor = bottom of the New Depths water-panel
    POOL_FLOOR_M = (waterPanelTop + waterPanelH) / SCALE;
    SHADOW_PX    = waterPanelTop + waterPanelH - 40;
    // Starting centre y: box top aligned with the W Series h1 heading
    var h1 = waterSection.querySelector('.panel:not(.water-panel) h1');
    var h1Top = h1 ? h1.offsetTop : 74;
    START_Y_M = (h1Top + BOX_PX) / SCALE;

    container.style.top    = top + 'px';
    container.style.left   = waterSection.offsetLeft + 'px';
    container.style.width  = W_PX + 'px';
    container.style.height = H_PX + 'px';

    waveCanvas.width        = W_PX;
    waveCanvas.height       = H_PX;
    waveCanvas.style.width  = W_PX + 'px';
    waveCanvas.style.height = H_PX + 'px';
  }

  layout();
  window.addEventListener('resize', layout);

  /* ── Box2D world — frozen until user scrolls past left panel */
  var world = new b2World(new b2Vec2(0, 0), true);

  /* ── buoyancy controller — New Depths panel = water ─────── */
  var buoy         = new b2BuoyancyController();
  buoy.normal      = new b2Vec2(0, -1);
  buoy.offset      = -WATER_M;
  buoy.density     = 1.0;
  buoy.linearDrag  = 8;    // low enough to reach the pool floor
  buoy.angularDrag = 5;
  world.AddController(buoy);
  // b2BuoyancyController also exposes a `velocity` field (b2Vec2) that
  // simulates fluid current — bodies inside the water zone get dragged
  // toward this velocity.  A gentle horizontal flow adds realism:
  buoy.velocity    = new b2Vec2(0.3, 0);   // subtle rightward current

  // Other knobs already used above:
  //   normal      – surface plane normal (0,‑1 = horizontal surface)
  //   offset      – surface position along normal (negative = y downward)
  //   density     – fluid density (buoyant force ∝ fluidDensity − bodyDensity)
  //   linearDrag  – viscous drag on translation (higher = more sluggish)
  //   angularDrag – viscous drag on rotation
  //
  // That's the full API for b2BuoyancyController in Box2dWeb 2.1.
  // For richer water effects (e.g. variable density, splash particles)
  // you'd need custom force logic outside the controller.

  /* ── boundaries (floor, ceiling, walls) ──────────────────── */
  function staticBox(x, y, hw, hh) {
    var bd = new b2BodyDef();
    bd.position.Set(x, y);
    var body = world.CreateBody(bd);
    var fd = new b2FixtureDef();
    fd.shape = new b2PolygonShape();
    fd.shape.SetAsBox(hw, hh);
    body.CreateFixture(fd);
  }
  staticBox(W / 2,  POOL_FLOOR_M + 0.5, W / 2, 0.5);  // pool floor = bottom of New Depths panel
  staticBox(W / 2, -0.5,     W / 2, 0.5);  // ceiling (for reversed gravity)
  staticBox(-0.5,   H / 2,   0.5,   H / 2);
  staticBox(W + 0.5, H / 2,  0.5,   H / 2);

  /* ── dynamic body ─────────────────────────────────────────── */
  var bd       = new b2BodyDef();
  bd.type      = b2Body.b2_dynamicBody;
  // Top of box aligns with the W Series Sports Walkman h1 heading
  bd.position.Set(W / 2 + 180 / SCALE, START_Y_M);
  bd.angle     = 0.05;
  bd.linearDamping  = 0.9;
  bd.angularDamping = 0.9;
  bd.allowSleep     = false;  // always respond to gravity changes
  var square = world.CreateBody(bd);

  var fd = new b2FixtureDef();
  fd.shape = new b2PolygonShape();
  fd.shape.SetAsBox(BOX_HM, BOX_HM);
  fd.density     = 1.8;   // less buoyant — sinks more decisively
  fd.friction    = 0.3;
  fd.restitution = 0.05;
  square.CreateFixture(fd);
  buoy.AddBody(square);

  /* ── scroll-driven release + reset ───────────────────────── */
  // Headphones are frozen (g=0) until the user scrolls past the W Series
  // header/description panel. After that, gravity is always +9.8 (natural
  // fall). The only exception: scroll back up to promoScene after full
  // submersion → gravity flips to lift them back to the top.
  var lastScrollY      = window.scrollY;
  var gravityMode      = 'frozen';  // 'frozen' | 'down' | 'up'
  var hasBeenReleased  = false;
  var hasBeenSubmerged = false;

  // Release when the waterline reaches the vertical midpoint of the viewport
  function releaseThreshold() {
    return waterSection.offsetTop + WATER_PX - window.innerHeight / 2;
  }

  function setGravityMode(mode) {
    if (gravityMode === mode) return;
    gravityMode = mode;
    if (mode === 'up')   world.SetGravity(new b2Vec2(0, -80));
    else if (mode === 'down') world.SetGravity(new b2Vec2(0,  40);
    else                 world.SetGravity(new b2Vec2(0,  0));
  }

  window.addEventListener('scroll', function () {
    var sy    = window.scrollY;
    var delta = sy - lastScrollY;
    lastScrollY = sy;

    // Release once user scrolls past the W Series header + description
    if (!hasBeenReleased && sy > releaseThreshold()) {
      hasBeenReleased = true;
      setGravityMode('down');
      return;
    }

    if (!hasBeenReleased || Math.abs(delta) < 1) return;

    // Reset: scrolling up + already submerged + back to promo section
    // Gravity stays 'up' for as long as the user remains above waterSection;
    // flips back to 'down' only when they scroll down past that boundary.
    if (hasBeenSubmerged && sy <= waterSection.offsetTop) {
      setGravityMode('up');
    } else {
      setGravityMode('down');
    }
  }, { passive: true });

  /* ── canvas drawing ───────────────────────────────────────── */
  var ctx = waveCanvas.getContext('2d');

  function drawScene(t) {
    ctx.clearRect(0, 0, W_PX, H_PX);

    /* pool-floor shadow — tracks headphone x position */
    var shadowX = square.GetPosition().x * SCALE;
    var grd = ctx.createRadialGradient(shadowX, SHADOW_PX, 15, shadowX, SHADOW_PX, 180);
    grd.addColorStop(0, 'rgba(0, 20, 60, 0.32)');
    grd.addColorStop(1, 'rgba(0, 20, 60, 0)');
    ctx.beginPath();
    ctx.ellipse(shadowX, SHADOW_PX, 180, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    /* animated wave surface line */
    ctx.beginPath();
    ctx.moveTo(0, WATER_PX);
    for (var px = 0; px <= W_PX; px += 3) {
      var wy = WATER_PX
             + Math.sin(px / 80  + t * 2.2) * 8
             + Math.sin(px / 30  + t * 1.6) * 4
             + Math.sin(px / 14  + t * 3.0) * 2;
      ctx.lineTo(px, wy);
    }
    ctx.strokeStyle = 'rgba(0, 140, 210, 0.70)';
    ctx.lineWidth   = 2.5;
    ctx.stroke();
  }

  /* ── sync div to Box2D body ───────────────────────────────── */
  function syncBox() {
    var pos   = square.GetPosition();
    var angle = square.GetAngle();
    var side  = BOX_PX * 2;

    boxDiv.style.width     = side + 'px';
    boxDiv.style.height    = side + 'px';
    boxDiv.style.left      = (pos.x * SCALE - BOX_PX) + 'px';
    boxDiv.style.top       = (pos.y * SCALE - BOX_PX) + 'px';
    boxDiv.style.transform = 'rotate(' + angle + 'rad)';
  }

  /* ── color swap (called from main.js) ─────────────────────── */
  var imageMap = {
    black: 'images/NWZW273SB.webp',
    white: 'images/NWZW273SB_white.webp',
    pink:  'images/NWZW273SB_pink.webp',
    blue:  'images/NWZW273SB_blue.webp',
  };
  window.setHeadphoneColor = function (color) {
    boxDiv.style.backgroundImage = 'url(' + (imageMap[color] || imageMap.black) + ')';
  };

  /* ── animation loop ───────────────────────────────────────── */
  var STEP = 1 / 60;
  function tick() {
    var pos = square.GetPosition();

    // Track full submersion: top of box (pos.y - BOX_HM) has crossed waterline
    if (!hasBeenSubmerged && (pos.y - BOX_HM) > WATER_M) {
      hasBeenSubmerged = true;
    }
    // Reset once headphones return near the ceiling after gravity flip
    if (hasBeenSubmerged && gravityMode === 'up' && pos.y < BOX_HM + 2) {
      hasBeenSubmerged = false;
    }

    world.Step(STEP, 8, 3);
    world.ClearForces();

    var t = Date.now() / 1000;
    drawScene(t);
    syncBox();

    dbg.textContent = [
      'gravityMode      : ' + gravityMode,
      'hasBeenReleased  : ' + hasBeenReleased,
      'hasBeenSubmerged : ' + hasBeenSubmerged,
      'scrollY          : ' + Math.round(window.scrollY),
      'releaseThreshold : ' + Math.round(releaseThreshold()),
      'wsOffsetTop      : ' + waterSection.offsetTop,
      'gravity.y        : ' + world.GetGravity().y.toFixed(1),
    ].join('\n');

    requestAnimationFrame(tick);
  }

  tick();

}());
