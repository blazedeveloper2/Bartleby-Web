/* ═══════════════════════════════════════════════════════════
   SCANNER — the camera, a barcode out of it, and nothing else.

   The browser's own BarcodeDetector where it reads retail codes
   (Android Chrome); everywhere else, iPhone included, ZXing from
   assets/vendor/zxing, fetched the first time Scan is tapped. Both
   read the same frames from the same <video>, so the UI does not care
   which one is running.

   Only the retail formats are asked for (EAN-13/8, UPC-A/E): food
   packaging uses nothing else, and a narrower search reads faster.
   UPC-A comes back as its 13-digit EAN form, so a product scanned on
   either engine lands on one saved entry.

   Camera access needs a secure page: GitHub Pages and localhost both
   are, a LAN IP over plain http is not, which is what the "type the
   number" field is also for.
   ═══════════════════════════════════════════════════════════ */

const ZXING = new URL('../../assets/vendor/zxing/zxing.min.js?v=0.23.0', import.meta.url).href;
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
/* ms between decode attempts */
const TICK = 120;
/* Share of the frame's width and height the decoder reads, centred on the guide */
const CROP_W = 0.86, CROP_H = 0.5;

let el = null, video = null, stream = null, timer = null, busy = false, engine = null, onCode = null, zxLoad = null;

const status = msg => { const s = el?.querySelector('.sc-msg'); if (s) s.innerHTML = msg; };

/* UPC-A is EAN-13 with a leading zero; store everything in the 13-digit form. */
export const normalize = code => (/^\d{12}$/.test(code) ? '0' + code : code);
export const validCode = code => /^\d{8}$|^\d{12,14}$/.test(code);

function loadZxing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  zxLoad ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = ZXING;
    s.onload = () => res(window.ZXing);
    s.onerror = () => { zxLoad = null; rej(new Error('scanner library failed to load')); };
    document.head.appendChild(s);
  });
  return zxLoad;
}

async function makeEngine() {
  if ('BarcodeDetector' in window) {
    try {
      const have = await window.BarcodeDetector.getSupportedFormats();
      const use = FORMATS.filter(f => have.includes(f));
      if (use.includes('ean_13')) {
        const det = new window.BarcodeDetector({ formats: use });
        return async () => (await det.detect(video))[0]?.rawValue || null;
      }
    } catch {}
  }
  const Z = await loadZxing();
  const hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const reader = new Z.MultiFormatReader();
  reader.setHints(hints);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async () => {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;
    const sw = Math.round(vw * CROP_W), sh = Math.round(vh * CROP_H);
    const scale = Math.min(1, 900 / sw);
    canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale);
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
    try {
      const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
      return reader.decodeWithState(bmp).getText();
    } catch { return null; } finally { reader.reset(); }
  };
}

function found(code) {
  const cb = onCode;
  navigator.vibrate?.(40);
  close();
  cb?.(normalize(code));
}

async function tick() {
  if (busy || !engine || !video || video.readyState < 2) return;
  busy = true;
  try {
    const code = await engine();
    if (code && validCode(normalize(code))) found(code);
  } catch {} finally { busy = false; }
}

/* Open the scanner; onCode(code) gets the first valid barcode, typed or read. */
export async function openScanner(cb) {
  if (el) return;
  onCode = cb;
  el = document.createElement('div');
  el.className = 'sc-ov';
  el.innerHTML = `
    <video class="sc-video" playsinline muted autoplay></video>
    <div class="sc-shade"><div class="sc-frame"><i></i><i></i><i></i><i></i><b class="sc-line"></b></div></div>
    <div class="sc-top">
      <div class="sc-head"><span>Scan a barcode</span><button class="sc-x" data-sc="close" aria-label="Close">&times;</button></div>
      <form class="sc-type" data-sc="form">
        <input class="sc-in" inputmode="numeric" pattern="[0-9]*" maxlength="14" placeholder="Barcode number" aria-label="Barcode number" autocomplete="off">
        <button class="sc-go" type="submit">Go</button>
      </form>
    </div>
    <div class="sc-bot"><div class="sc-msg"></div></div>`;
  document.body.appendChild(el);
  video = el.querySelector('video');
  el.addEventListener('click', e => { if (e.target.closest('[data-sc="close"]')) close(); });
  el.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const v = el.querySelector('.sc-in').value.replace(/\D/g, '');
    if (validCode(normalize(v))) found(v);
    else status('Not a barcode number');
  });
  document.addEventListener('keydown', onKey);

  if (!navigator.mediaDevices?.getUserMedia) {
    status('No camera. Type the number.');
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (!el) { stream.getTracks().forEach(t => t.stop()); return; }
    video.srcObject = stream;
    await video.play().catch(() => {});
    status('');
    engine = await makeEngine();
    if (!el) return;
    timer = setInterval(tick, TICK);
  } catch (e) {
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    status(denied ? 'Camera blocked. Type the number.' : 'No camera. Type the number.');
  }
}

function onKey(e) { if (e.key === 'Escape') close(); }

/* Stop the camera and remove the scanner. */
export function close() {
  clearInterval(timer); timer = null;
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  document.removeEventListener('keydown', onKey);
  el?.remove(); el = null; video = null; engine = null; onCode = null; busy = false;
}
