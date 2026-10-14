/* ═══════════════════════════════════════════════════════════
   WORKOUT — ONE FINGER ON A 3D VIEW

   A sideways drag turns the figure; an up-and-down one scrolls the page,
   as it would anywhere else. Left to the browser (touch-action: pan-y)
   any drag that was not dead level started a scroll, and the browser then
   cancelled the turn half way: the figure stuck and the card jumped. So
   the views take every touch (touch-action: none in workout.css) and
   this decides instead, from the first few pixels of movement, then
   scrolls the page itself for a vertical drag and lets it coast on
   afterwards as a native scroll does. A mouse always turns.

     const lock = axisLock();
     down:  lock.down(e)
     move:  if (lock.move(e) !== 'turn') return;   // 'scroll' or still deciding
     up:    lock.up(e)       → true when it was a tap (nothing moved)
   ═══════════════════════════════════════════════════════════ */

const DECIDE = 7;   // px of movement before the direction is chosen

/* The nearest ancestor that scrolls vertically, or the page. */
function scrollerOf(el) {
  for (let n = el?.parentElement; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n;
  }
  return document.scrollingElement || document.documentElement;
}

export function axisLock() {
  let x0 = 0, y0 = 0, lastY = 0, lastT = 0, vel = 0, mode = null, sc = null, coast = 0;
  return {
    get mode() { return mode; },
    down(e) {
      cancelAnimationFrame(coast);
      x0 = e.clientX; y0 = lastY = e.clientY; lastT = e.timeStamp; vel = 0;
      mode = e.pointerType === 'touch' || e.pointerType === 'pen' ? null : 'turn';
      sc = null;
    },
    move(e) {
      if (mode === null) {
        const dx = Math.abs(e.clientX - x0), dy = Math.abs(e.clientY - y0);
        if (Math.max(dx, dy) < DECIDE) return null;
        mode = dx > dy * 0.9 ? 'turn' : 'scroll';
        if (mode === 'scroll') sc = scrollerOf(e.target);
      }
      if (mode === 'scroll') {
        const d = e.clientY - lastY, dt = Math.max(1, e.timeStamp - lastT);
        sc.scrollTop -= d;
        vel = 0.8 * (d / dt) + 0.2 * vel;   // px per ms, smoothed
        lastY = e.clientY; lastT = e.timeStamp;
      }
      return mode;
    },
    up() {
      const tap = mode === null;
      if (mode === 'scroll' && Math.abs(vel) > 0.05) {
        /* coast: the speed the finger left with, easing off */
        let v = vel, t = performance.now();
        const step = now => {
          const dt = now - t; t = now;
          sc.scrollTop -= v * dt;
          v *= Math.pow(0.996, dt);
          if (Math.abs(v) > 0.02) coast = requestAnimationFrame(step);
        };
        coast = requestAnimationFrame(step);
      }
      mode = null;
      return tap;
    },
  };
}
