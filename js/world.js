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

  /* ── physics constants ────────────────────────────────────── */
  var SCALE  = 30;
  var BOX_PX = 200;              // 200 px half-side → 400 px full side
  var BOX_HM = BOX_PX / SCALE;  // ≈ 6.667 m

  /* ── tunable physics params (driven by debug sliders) ───────── */
  var gravityMagnitude  = 9.8;
  var DEFAULT_LINEAR_DRAG = 8;

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
  var lastScrollY     = window.scrollY;
  var gravityMode     = 'frozen';  // 'frozen' | 'down' | 'up'
  var hasBeenReleased = false;
  var hasBeenSubmerged = false;

  // Release when the waterline reaches the vertical midpoint of the viewport
  function releaseThreshold() {
    return waterSection.offsetTop + WATER_PX - window.innerHeight / 2;
  }

  function setGravityMode(mode) {
    if (gravityMode === mode) return;
    gravityMode = mode;
    if (mode === 'up') {
      world.SetGravity(new b2Vec2(0, -gravityMagnitude));
      buoy.linearDrag = 0;  // no vertical resistance while rising
    } else if (mode === 'down') {
      world.SetGravity(new b2Vec2(0, gravityMagnitude));
      buoy.linearDrag = DEFAULT_LINEAR_DRAG;
    } else {
      world.SetGravity(new b2Vec2(0, 0));
      buoy.linearDrag = DEFAULT_LINEAR_DRAG;
    }
  }

  window.addEventListener('scroll', function () {
    var sy    = window.scrollY;
    var delta = sy - lastScrollY;
    lastScrollY = sy;

    // Release once user scrolls past the W Series header + description
    if (!hasBeenReleased && sy > releaseThreshold()) {
      hasBeenReleased = true;
      if (ctaEl && ctaEl.parentNode) ctaEl.parentNode.removeChild(ctaEl);
      setGravityMode('down');
      return;
    }

    if (!hasBeenReleased || Math.abs(delta) < 1) return;

    // Reset: scrolling up past the release point → lift headphones back up
    if (delta < 0 && sy < releaseThreshold()) {
      setGravityMode('up');
    } else {
      setGravityMode('down');
    }
  }, { passive: true });

  /* ── canvas drawing ───────────────────────────────────────── */
  var ctx = waveCanvas.getContext('2d');

  function drawScene(t) {
    ctx.clearRect(0, 0, W_PX, H_PX);

    /* pool-floor shadow — grows sharper/larger as headphones sink */
    var pos = square.GetPosition();
    var shadowX = pos.x * SCALE;
    var depth = Math.max(0, Math.min(1, (pos.y - WATER_M) / (POOL_FLOOR_M - WATER_M)));
    var shadowRx  = 80  + depth * 120;   // 80→200 px wide
    var shadowRy  = 12  + depth * 20;    // 12→32 px tall
    var shadowOp  = 0.08 + depth * 0.38; // 0.08→0.46 opacity
    var innerR    = 10  + depth * 20;    // inner glow tightens
    var outerR    = shadowRx;
    var grd = ctx.createRadialGradient(shadowX, SHADOW_PX, innerR, shadowX, SHADOW_PX, outerR);
    grd.addColorStop(0, 'rgba(0,20,60,' + shadowOp.toFixed(2) + ')');
    grd.addColorStop(1, 'rgba(0,20,60,0)');
    ctx.beginPath();
    ctx.ellipse(shadowX, SHADOW_PX, shadowRx, shadowRy, 0, 0, Math.PI * 2);
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

  /* ── debug overlay (bottom-right, large white text) ────────── */
  var creditHeader = document.createElement('div');
  creditHeader.style.cssText =
    'position:fixed;top:0;right:0;z-index:9999;' +
    'background:rgba(0,0,0,0.85);color:#fff;font:bold 14px/1.3 monospace;' +
    'padding:8px 16px 10px;pointer-events:auto;display:inline-block;' +
    'text-shadow:0 1px 3px rgba(0,0,0,0.6);border-bottom-left-radius:6px;' +
    'border-bottom:2px solid rgba(255,255,255,0.2);border-left:2px solid rgba(255,255,255,0.2);';
  var ctaStyle = document.createElement('style');
  ctaStyle.textContent = '@keyframes ctaPulse{0%,100%{opacity:0.9}50%{opacity:0.35}}';
  document.head.appendChild(ctaStyle);

  creditHeader.innerHTML =
    'Recreated by Tom Longson<br>' +
    '<a href="https://github.com/nym/sportswalkman/" target="_blank" ' +
    'style="color:#7cf;text-decoration:none;font-size:12px;">github.com/nym/sportswalkman/</a>';

  var ctaEl = document.createElement('div');
  ctaEl.style.cssText =
    'margin-top:6px;font-size:11px;opacity:0.9;letter-spacing:0.05em;' +
    'animation:ctaPulse 2s ease-in-out infinite;color:#ffd;';
  ctaEl.textContent = '\u2193 scroll to drop the headphones';
  creditHeader.appendChild(ctaEl);

  document.body.appendChild(creditHeader);

  var debugFooter = document.createElement('div');
  debugFooter.id = 'physics-debug';
  debugFooter.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
    'background:rgba(0,0,0,0.85);color:#fff;font:bold 14px/1.3 monospace;' +
    'padding:10px 28px 12px;pointer-events:auto;' +
    'text-shadow:0 1px 3px rgba(0,0,0,0.6);border-top:2px solid rgba(255,255,255,0.2);';

  var debugTitle = document.createElement('div');
  debugTitle.style.cssText =
    'font-size:13px;letter-spacing:0.18em;opacity:0.55;margin-bottom:6px;text-transform:uppercase;';
  debugTitle.textContent = 'HEADPHONE DEMO - ARCHIVE - WALKMAN MICROSITE, 2015';

  var debugStats = document.createElement('div');
  debugStats.style.cssText =
    'display:flex;gap:48px;flex-wrap:nowrap;align-items:baseline;white-space:nowrap;';

  /* ── slider row ──────────────────────────────────────────── */
  var sliderRow = document.createElement('div');
  sliderRow.style.cssText =
    'display:flex;gap:32px;align-items:center;margin-top:8px;flex-wrap:nowrap;white-space:nowrap;';

  function makeSlider(label, min, max, step, val, onChange) {
    var wrap = document.createElement('label');
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;';
    var name = document.createElement('span');
    name.style.cssText = 'opacity:0.6;letter-spacing:0.05em;';
    name.textContent = label;
    var input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max;
    input.step = step; input.value = val;
    input.style.cssText = 'width:90px;accent-color:#7cf;cursor:pointer;';
    var readout = document.createElement('span');
    readout.style.cssText = 'min-width:32px;text-align:right;';
    readout.textContent = val;
    input.addEventListener('input', function () {
      readout.textContent = parseFloat(input.value).toFixed(input.step < 1 ? 1 : 0);
      onChange(parseFloat(input.value));
    });
    wrap.appendChild(name);
    wrap.appendChild(input);
    wrap.appendChild(readout);
    sliderRow.appendChild(wrap);
    return input;
  }

  makeSlider('GRAVITY', 0, 30, 0.5, gravityMagnitude, function (v) {
    gravityMagnitude = v;
    if (gravityMode === 'down') world.SetGravity(new b2Vec2(0,  gravityMagnitude));
    if (gravityMode === 'up')   world.SetGravity(new b2Vec2(0, -gravityMagnitude));
  });
  makeSlider('BUOYANCY', 0, 3, 0.1, buoy.density, function (v) {
    buoy.density = v;
  });
  makeSlider('LINEAR DRAG', 0, 20, 0.5, DEFAULT_LINEAR_DRAG, function (v) {
    DEFAULT_LINEAR_DRAG = v;
    if (gravityMode !== 'up') buoy.linearDrag = v;
  });
  makeSlider('ANG DRAG', 0, 20, 0.5, buoy.angularDrag, function (v) {
    buoy.angularDrag = v;
  });

  debugFooter.appendChild(debugTitle);
  debugFooter.appendChild(debugStats);
  debugFooter.appendChild(sliderRow);
  document.body.appendChild(debugFooter);

  function makeStatEl() {
    var el = document.createElement('span');
    return el;
  }
  var statGravity   = makeStatEl();
  var statForce     = makeStatEl();
  var statPos       = makeStatEl();
  var statSubmerged = makeStatEl();
  [statGravity, statForce, statPos, statSubmerged].forEach(function (el) {
    debugStats.appendChild(el);
  });

  function updateDebug() {
    var pos  = square.GetPosition();
    var g    = world.GetGravity();
    var mass = square.GetMass();
    var fx   = g.x * mass;
    var fy   = g.y * mass;
    var fmag = Math.sqrt(fx * fx + fy * fy);
    var arrow;
    if (fmag < 0.01) {
      arrow = '\u25cb'; // ○ no force
    } else {
      var ang = Math.atan2(fy, fx) * 180 / Math.PI;
      if      (ang >  157.5 || ang <= -157.5) arrow = '\u2190'; // ←
      else if (ang >  112.5)                  arrow = '\u2199'; // ↙
      else if (ang >   67.5)                  arrow = '\u2193'; // ↓
      else if (ang >   22.5)                  arrow = '\u2198'; // ↘
      else if (ang >  -22.5)                  arrow = '\u2192'; // →
      else if (ang >  -67.5)                  arrow = '\u2197'; // ↗
      else if (ang > -112.5)                  arrow = '\u2191'; // ↑
      else                                    arrow = '\u2196'; // ↖
    }
    statGravity.textContent   = 'GRAVITY  ' + gravityMode + ' (' + g.x.toFixed(1) + ', ' + g.y.toFixed(1) + ')';
    statForce.textContent     = 'FORCE  ' + arrow + ' ' + fmag.toFixed(2) + ' N';
    statPos.textContent       = 'POS  (' + pos.x.toFixed(2) + ', ' + pos.y.toFixed(2) + ')';
    statSubmerged.textContent = 'SUBMERGED  ' + hasBeenSubmerged;
  }

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
    updateDebug();
    requestAnimationFrame(tick);
  }

  tick();

}());
