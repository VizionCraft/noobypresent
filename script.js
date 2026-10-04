// ============================================================
// EASY CUSTOMISATION
// Change these values before uploading if you want.
// ============================================================
const GIFT = {
  recipient: "Nooby",
  primogems: "6,480",
  message: "I know you like opening things, so obviously I couldn’t just give you your present normally.",
  claimMessage: "Your real birthday gift is waiting for you! 🎁",
  requiredTears: 6
};
// ============================================================

const canvas = document.getElementById("paperCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const giftCard = document.getElementById("giftCard");
const progressFill = document.getElementById("progressFill");
const tearStatus = document.getElementById("tearStatus");
const tearPrompt = document.getElementById("tearPrompt");
const tearUi = document.getElementById("tearUi");
const hint = document.getElementById("hint");
const claimButton = document.getElementById("claimButton");
const claimResult = document.getElementById("claimResult");
const confettiLayer = document.getElementById("confettiLayer");

document.getElementById("recipientName").textContent = GIFT.recipient;
document.getElementById("revealName").textContent = GIFT.recipient;
document.getElementById("primogemAmount").textContent = GIFT.primogems;
document.getElementById("birthdayMessage").textContent = GIFT.message;

let drawing = false;
let completed = false;
let tearCount = 0;
let strokeDistance = 0;
let lastPoint = null;
let erasedEstimate = 0;
let resizeTimer = null;

const MIN_STROKE_DISTANCE = 90;
const TARGET_ERASE = 0.50;
const BRUSH_BASE = 38;

function resizeCanvas() {
  if (completed) return;

  const rect = giftCard.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWrappingPaper(rect.width, rect.height);
  updateUi();
}

function drawWrappingPaper(w, h) {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  // Base paper
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#ec5662");
  grad.addColorStop(0.48, "#d43c49");
  grad.addColorStop(1, "#a92035");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle diagonal wrapping pattern
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  const spacing = 44;
  for (let x = -h; x < w + h; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#ffffff";
  for (let y = 24; y < h; y += 72) {
    for (let x = 20; x < w; x += 72) {
      ctx.beginPath();
      ctx.arc(x + ((y / 72) % 2 ? 20 : 0), y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Edge shading
  const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w,h) * .08, w / 2, h / 2, Math.max(w,h) * .75);
  edge.addColorStop(.55, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(50,0,10,.25)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function beginTear(event) {
  if (completed) return;
  event.preventDefault();

  drawing = true;
  strokeDistance = 0;
  lastPoint = pointFromEvent(event);
  canvas.setPointerCapture?.(event.pointerId);

  if (tearCount === 0) {
    giftCard.classList.add("first-tear");
    giftCard.classList.add("bump");
    setTimeout(() => giftCard.classList.remove("bump"), 400);
    playRipSound(0.055);
  }

  eraseAt(lastPoint.x, lastPoint.y, true);
}

function continueTear(event) {
  if (!drawing || completed) return;
  event.preventDefault();

  const point = pointFromEvent(event);
  if (!lastPoint) {
    lastPoint = point;
    return;
  }

  const dx = point.x - lastPoint.x;
  const dy = point.y - lastPoint.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    strokeDistance += dist;
    eraseLine(lastPoint.x, lastPoint.y, point.x, point.y);
    lastPoint = point;
  }
}

function finishTear(event) {
  if (!drawing || completed) return;
  event.preventDefault();

  drawing = false;

  if (strokeDistance >= MIN_STROKE_DISTANCE) {
    tearCount = Math.min(GIFT.requiredTears, tearCount + 1);
    playRipSound(0.035 + Math.min(tearCount, 5) * 0.006);

    giftCard.classList.remove("bump");
    void giftCard.offsetWidth;
    giftCard.classList.add("bump");
    setTimeout(() => giftCard.classList.remove("bump"), 390);
  }

  strokeDistance = 0;
  lastPoint = null;

  erasedEstimate = measureErasedRatio();
  updateUi();
  checkComplete();
}

function eraseAt(x, y, initial = false) {
  const brush = Math.max(BRUSH_BASE, canvas.getBoundingClientRect().width * 0.072);

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";

  // Main hole
  const gradient = ctx.createRadialGradient(x, y, brush * .2, x, y, brush);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(.72, "rgba(0,0,0,.95)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, brush, 0, Math.PI * 2);
  ctx.fill();

  // Ragged "paper fibres" around the tear
  if (!initial) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = brush * (.72 + Math.random() * .32);
      const rx = x + Math.cos(angle) * radius;
      const ry = y + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.arc(rx, ry, 3 + Math.random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function eraseLine(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 8));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    eraseAt(
      x1 + (x2 - x1) * t,
      y1 + (y2 - y1) * t,
      false
    );
  }
}

function measureErasedRatio() {
  // Sample down to keep this fast on phones.
  const sampleW = 120;
  const sampleH = Math.max(80, Math.round(sampleW * canvas.height / canvas.width));
  const sample = document.createElement("canvas");
  sample.width = sampleW;
  sample.height = sampleH;
  const sctx = sample.getContext("2d", { willReadFrequently: true });

  sctx.clearRect(0, 0, sampleW, sampleH);
  sctx.drawImage(canvas, 0, 0, sampleW, sampleH);

  const data = sctx.getImageData(0, 0, sampleW, sampleH).data;
  let erased = 0;
  let total = 0;

  for (let i = 3; i < data.length; i += 4) {
    total++;
    if (data[i] < 80) erased++;
  }

  return total ? erased / total : 0;
}

function updateUi() {
  const tearProgress = Math.min(1, tearCount / GIFT.requiredTears);
  const eraseProgress = Math.min(1, erasedEstimate / TARGET_ERASE);

  // Require BOTH repeated tearing and enough actual paper removal.
  const overall = Math.min(tearProgress, eraseProgress);
  progressFill.style.width = `${Math.round(overall * 100)}%`;
  tearStatus.textContent = `Tears: ${tearCount} / ${GIFT.requiredTears}`;

  if (tearCount === 0) {
    tearPrompt.textContent = "Drag across the present to tear the paper";
  } else if (tearCount < GIFT.requiredTears) {
    const left = GIFT.requiredTears - tearCount;
    tearPrompt.textContent = `${left} more good tear${left === 1 ? "" : "s"}… keep going!`;
  } else if (erasedEstimate < TARGET_ERASE) {
    tearPrompt.textContent = "You tore it enough times — now rip off more paper!";
  } else {
    tearPrompt.textContent = "OPENING…";
  }
}

function checkComplete() {
  if (completed) return;

  if (tearCount >= GIFT.requiredTears && erasedEstimate >= TARGET_ERASE) {
    completed = true;
    progressFill.style.width = "100%";
    giftCard.classList.add("complete");
    tearUi.classList.add("hidden");
    hint.textContent = "You got it open!";
    canvas.style.pointerEvents = "none";

    playRevealSound();
    launchConfetti(120);

    setTimeout(() => {
      canvas.style.display = "none";
    }, 720);
  }
}

function launchConfetti(count = 90) {
  const colours = ["#f4c95d", "#73dcff", "#ff6b79", "#b28cff", "#ffffff", "#72e4b2"];

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colours[Math.floor(Math.random() * colours.length)];
    piece.style.setProperty("--drift", `${-160 + Math.random() * 320}px`);
    piece.style.setProperty("--spin", `${360 + Math.random() * 900}deg`);
    piece.style.setProperty("--duration", `${2.7 + Math.random() * 2.2}s`);
    piece.style.animationDelay = `${Math.random() * .55}s`;

    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 6000);
  }
}

function playRipSound(volume = .05) {
  // Tiny generated paper-ish noise. No audio files needed.
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audio = new AudioCtx();
    const duration = .12;
    const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const decay = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    filter.type = "bandpass";
    filter.frequency.value = 1600 + Math.random() * 900;
    filter.Q.value = .7;
    gain.gain.value = volume;

    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();

    source.onended = () => audio.close();
  } catch (_) {}
}

function playRevealSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audio = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, index) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;
      const start = audio.currentTime + index * .07;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.05, start + .02);
      gain.gain.exponentialRampToValueAtTime(.001, start + .55);

      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + .58);
    });

    setTimeout(() => audio.close(), 1200);
  } catch (_) {}
}

claimButton.addEventListener("click", () => {
  claimResult.textContent = GIFT.claimMessage;
  launchConfetti(45);
  playRevealSound();
});

canvas.addEventListener("pointerdown", beginTear);
canvas.addEventListener("pointermove", continueTear);
canvas.addEventListener("pointerup", finishTear);
canvas.addEventListener("pointercancel", finishTear);
canvas.addEventListener("pointerleave", (event) => {
  if (drawing && event.buttons === 0) finishTear(event);
});

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeCanvas, 180);
});

// Prevent dragging the canvas itself on some browsers.
canvas.addEventListener("dragstart", (event) => event.preventDefault());

resizeCanvas();
