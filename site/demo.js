/* ============================================================
   JotModel — hero mini-canvas demo
   Dependency-free. Adapted from the design-system reference demo.
   It "builds" a small model the way the product does: two entity
   cards type in their fields, then a neutral relationship line draws
   between them.

   Performance & a11y:
   - rAF-driven; pauses when the tab is hidden or the figure is offscreen
   - honors prefers-reduced-motion (renders the finished model, no motion)
   - re-renders the relationship line on theme change (it reads --jm-rel)
   ============================================================ */
(function () {
  'use strict';

  var stage = document.getElementById('stage');
  var svg = document.getElementById('rels');
  if (!stage || !svg) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- the model we build, declaratively ------------------------------
  // pos is a fraction of the stage box so it scales with width.
  var MODEL = {
    users: {
      name: 'users', color: 'c-teal', pos: { x: 0.06, y: 0.10 },
      fields: [
        { n: 'id', t: 'pk', pk: true },
        { n: 'email', t: 'email' },
        { n: 'created at', t: 'timestamp' },
      ],
    },
    orders: {
      name: 'orders', color: 'c-violet', pos: { x: 0.50, y: 0.50 },
      fields: [
        { n: 'id', t: 'pk', pk: true },
        { n: 'user id', t: 'fk' },
        { n: 'amount', t: 'number' },
        { n: 'order date', t: 'date' },
      ],
    },
  };

  var nodes = {}; // name -> { el, body, def, rendered:[fieldEls] }
  var built = false;
  var timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function after(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function relColor() {
    // --jm-rel always resolves once tokens.css is loaded; currentColor is a theme-safe fallback
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--jm-rel').trim() || 'currentColor';
  }

  function px(frac, axis) {
    return Math.round(frac * (axis === 'x' ? stage.clientWidth : stage.clientHeight));
  }

  // ---- build the (empty) cards ---------------------------------------
  function makeCard(def) {
    var el = document.createElement('div');
    el.className = 'd-ent';
    el.style.left = px(def.pos.x, 'x') + 'px';
    el.style.top = px(def.pos.y, 'y') + 'px';

    var h = document.createElement('div');
    h.className = 'd-h';
    var nm = document.createElement('span');
    nm.className = 'd-nm';
    var dot = document.createElement('span');
    dot.className = 'd-dot';
    h.appendChild(nm); h.appendChild(dot);

    var b = document.createElement('div');
    b.className = 'd-b';

    el.appendChild(h); el.appendChild(b);
    stage.appendChild(el);
    return { el: el, name: nm, body: b, def: def };
  }

  function addFieldRow(node, field) {
    var row = document.createElement('div');
    row.className = 'd-row';
    var fn = document.createElement('span');
    fn.className = 'd-fn' + (field.pk ? ' pk' : '');
    fn.textContent = field.n;
    var ty = document.createElement('span');
    ty.className = 'd-ty';
    ty.textContent = field.t;
    ty.style.opacity = '0';
    row.appendChild(fn); row.appendChild(ty);
    node.body.appendChild(row);
    after(reduceMotion ? 0 : 120, function () {
      ty.style.transition = 'opacity ' + (reduceMotion ? '0ms' : '180ms') + ' ease';
      ty.style.opacity = '1';
    });
  }

  // type a string into an element, char by char, then call done()
  function typeInto(elText, text, speed, done) {
    if (reduceMotion) { elText.node.textContent = text; done && done(); return; }
    var i = 0;
    var caret = document.createElement('span');
    caret.className = 'd-caret';
    elText.node.textContent = '';
    elText.node.appendChild(caret);
    (function tick() {
      if (i >= text.length) {
        elText.node.textContent = text; // drop the caret
        done && done();
        return;
      }
      caret.insertAdjacentText('beforebegin', text.charAt(i));
      i++;
      after(speed, tick);
    })();
  }

  // ---- relationship line ---------------------------------------------
  function rectOf(node) {
    var d = node.def;
    return {
      x: px(d.pos.x, 'x'),
      y: px(d.pos.y, 'y'),
      w: node.el.offsetWidth,
      h: node.el.offsetHeight,
    };
  }
  function anchor(a, b) {
    var ca = rectOf(a), cb = rectOf(b);
    var acx = ca.x + ca.w / 2, bcx = cb.x + cb.w / 2;
    var right = bcx > acx;
    var ay = ca.y + Math.max(20, Math.min(ca.h - 20, (cb.y + cb.h / 2) - ca.y));
    return { x: right ? ca.x + ca.w : ca.x, y: ay, side: right ? 1 : -1 };
  }
  function drawRelationship(progress) {
    var from = nodes.users, to = nodes.orders;
    if (!from || !to) { svg.innerHTML = ''; return; }
    var col = relColor();
    var a = anchor(from, to), b = anchor(to, from);
    var mx = (a.x + b.x) / 2;
    var d = 'M' + a.x + ' ' + a.y + ' C ' + mx + ' ' + a.y + ', ' + mx + ' ' + b.y + ', ' + b.x + ' ' + b.y;

    var path = '<path d="' + d + '" stroke="' + col + '" stroke-width="2" fill="none" stroke-linecap="round"';
    if (progress != null && progress < 1) {
      // approximate length for the draw-on effect
      var len = Math.hypot(b.x - a.x, b.y - a.y) + 80;
      path += ' stroke-dasharray="' + len + '" stroke-dashoffset="' + (len * (1 - progress)) + '"';
    }
    path += '/>';

    svg.innerHTML = path;
  }

  // ---- the build sequence --------------------------------------------
  function buildModel(animate) {
    clearTimers();
    stage.querySelectorAll('.d-ent').forEach(function (n) { n.remove(); });
    nodes = {};
    svg.innerHTML = '';

    nodes.users = makeCard(MODEL.users);
    nodes.orders = makeCard(MODEL.orders);

    if (!animate) {
      // finished state, no motion
      ['users', 'orders'].forEach(function (k) {
        var node = nodes[k];
        node.name.textContent = node.def.name;
        node.el.classList.add(node.def.color);
        node.def.fields.forEach(function (f) {
          var row = document.createElement('div');
          row.className = 'd-row';
          var fn = document.createElement('span');
          fn.className = 'd-fn' + (f.pk ? ' pk' : '');
          fn.textContent = f.n;
          var ty = document.createElement('span');
          ty.className = 'd-ty'; ty.textContent = f.t;
          row.appendChild(fn); row.appendChild(ty);
          node.body.appendChild(row);
        });
      });
      drawRelationship(1);
      built = true;
      return;
    }

    var t = 0;            // running cursor in ms
    var step = 110;       // per-character type speed
    var fieldGap = 130;   // pause between fields

    function buildCard(node, onDone) {
      // type the name
      after(t, function () {
        typeInto({ node: node.name }, node.def.name, step, function () {
          node.el.classList.add(node.def.color); // color-code lands after naming
        });
      });
      t += node.def.name.length * step + 260;
      // type each field
      node.def.fields.forEach(function (f) {
        after(t, function () { addFieldRow(node, f); });
        t += fieldGap;
      });
      t += 220;
      after(t, function () { onDone && onDone(); });
    }

    buildCard(nodes.users, function () {
      // draw the relationship after both cards exist
    });
    // small gap, then the second card
    t += 200;
    buildCard(nodes.orders);

    // animate the relationship draw at the end
    var drawStart = t + 120;
    after(drawStart, function () {
      var dur = 520;
      var t0 = null;
      (function frame(ts) {
        if (t0 == null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        drawRelationship(p);
        if (p < 1) requestAnimationFrame(frame);
        else { drawRelationship(1); built = true; }
      })();
    });
  }

  // ---- run / pause orchestration -------------------------------------
  var started = false;

  function start() {
    if (started) return;
    started = true;
    buildModel(!reduceMotion);
  }

  function replay() {
    started = false;
    start();
  }

  // keep the relationship line correct on theme flips & resizes
  function rerenderStatic() {
    if (built) drawRelationship(1);
  }
  window.addEventListener('jm-theme-change', rerenderStatic);

  var resizeRAF = null;
  window.addEventListener('resize', function () {
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(function () {
      // reposition cards to the new box and redraw the line
      ['users', 'orders'].forEach(function (k) {
        var node = nodes[k];
        if (!node) return;
        node.el.style.left = px(node.def.pos.x, 'x') + 'px';
        node.el.style.top = px(node.def.pos.y, 'y') + 'px';
      });
      rerenderStatic();
    });
  });

  // pause/replay when hidden or scrolled away
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimers(); }
    else if (!started) { start(); }
  });

  // only start when the figure scrolls into view
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { start(); io.disconnect(); }
      });
    }, { threshold: 0.25 });
    io.observe(stage);
  } else {
    start();
  }

  // Replay button
  var replayBtn = document.getElementById('demo-replay');
  if (replayBtn) replayBtn.addEventListener('click', replay);
})();
