// ============================================================
// GIFT SETTINGS
// ============================================================
const GIFT = {
  recipient: "Nooby",

  // This value is hidden by the current index.html.
  primogems: "SECRET",

  message:
    "I know you like opening things, so obviously I couldn’t just give you your present normally.",

  claimMessage:
    "Your real birthday gift is waiting for you! 🎁",

  // MORE RIPPING!
  requiredTears: 10
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


// ============================================================
// TEXT
// ============================================================

document.getElementById("recipientName").textContent = GIFT.recipient;
document.getElementById("revealName").textContent = GIFT.recipient;

const amountElement = document.getElementById("primogemAmount");

if (amountElement) {
  amountElement.textContent = GIFT.primogems;
}

document.getElementById("birthdayMessage").textContent = GIFT.message;


// ============================================================
// TEARING STATE
// ============================================================

let drawing = false;

let completed = false;

let tearCount = 0;

let strokeDistance = 0;

let lastPoint = null;

let erasedEstimate = 0;

let resizeTimer = null;


// How long a swipe must be before it counts as a tear.
const MIN_STROKE_DISTANCE = 120;


// He needs to rip away about 58% of the paper too.
const TARGET_ERASE = 0.58;


// Smaller brush = more shredding required.
const BRUSH_BASE = 23;


// ============================================================
// AUDIO
// ============================================================

let audioContext = null;

let activeRipSource = null;

let activeRipGain = null;

let ripNoiseBuffer = null;


// AudioContext must normally be started by a user interaction.
function setupAudio() {

  if (audioContext) {

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return;
  }

  try {

    const AudioCtx =
      window.AudioContext ||
      window.webkitAudioContext;

    audioContext = new AudioCtx();

    createRipNoiseBuffer();

  } catch (error) {

    console.log("Audio unavailable.");

  }

}


// ============================================================
// CREATE PAPER NOISE
// ============================================================

function createRipNoiseBuffer() {

  if (!audioContext) return;

  const duration = 2;

  const buffer =
    audioContext.createBuffer(
      1,
      audioContext.sampleRate * duration,
      audioContext.sampleRate
    );

  const data =
    buffer.getChannelData(0);


  for (let i = 0; i < data.length; i++) {

    const noise =
      Math.random() * 2 - 1;

    // Random flutter makes it sound more like paper
    const flutter =
      Math.random() > 0.82 ? 1 : 0.35;

    data[i] =
      noise *
      flutter;

  }

  ripNoiseBuffer = buffer;

}


// ============================================================
// START CONTINUOUS RIP SOUND
// ============================================================

function startRipSound() {

  setupAudio();

  if (!audioContext || !ripNoiseBuffer) return;

  stopRipSound();


  const source =
    audioContext.createBufferSource();

  const filter =
    audioContext.createBiquadFilter();

  const gain =
    audioContext.createGain();


  source.buffer = ripNoiseBuffer;

  source.loop = true;


  // Emphasises papery mid/high frequencies
  filter.type = "bandpass";

  filter.frequency.value = 1700;

  filter.Q.value = 0.7;


  gain.gain.value = 0.045;


  source
    .connect(filter)
    .connect(gain)
    .connect(audioContext.destination);


  source.start();


  activeRipSource = source;
  activeRipGain = gain;

}


// ============================================================
// MODIFY RIP SOUND WHILE MOVING
// ============================================================

function updateRipSound(speed) {

  if (!audioContext) return;

  if (!activeRipGain) return;


  const volume =
    Math.min(
      0.13,
      0.035 + speed * 0.0015
    );


  activeRipGain.gain.setTargetAtTime(
    volume,
    audioContext.currentTime,
    0.025
  );

}


// ============================================================
// STOP RIP SOUND
// ============================================================

function stopRipSound() {

  if (!activeRipSource) return;


  try {

    activeRipSource.stop();

  } catch (_) {}


  activeRipSource = null;
  activeRipGain = null;

}


// ============================================================
// SHORT "SNAP" SOUND WHEN A TEAR COUNTS
// ============================================================

function playTearSnap() {

  setupAudio();

  if (!audioContext) return;


  const duration = 0.22;

  const buffer =
    audioContext.createBuffer(
      1,
      audioContext.sampleRate * duration,
      audioContext.sampleRate
    );


  const data =
    buffer.getChannelData(0);


  for (let i = 0; i < data.length; i++) {

    const progress =
      i / data.length;

    const decay =
      Math.pow(
        1 - progress,
        2.3
      );


    data[i] =
      (Math.random() * 2 - 1) *
      decay;

  }


  const source =
    audioContext.createBufferSource();

  const filter =
    audioContext.createBiquadFilter();

  const gain =
    audioContext.createGain();


  filter.type = "highpass";

  filter.frequency.value =
    1000 + Math.random() * 900;


  gain.gain.value = 0.13;


  source.buffer = buffer;


  source
    .connect(filter)
    .connect(gain)
    .connect(audioContext.destination);


  source.start();

}


// ============================================================
// REVEAL SOUND
// ============================================================

function playRevealSound() {

  setupAudio();

  if (!audioContext) return;


  const notes = [
    523.25,
    659.25,
    783.99,
    1046.5
  ];


  notes.forEach((frequency, index) => {

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();


    oscillator.type = "sine";

    oscillator.frequency.value =
      frequency;


    const start =
      audioContext.currentTime +
      index * 0.075;


    gain.gain.setValueAtTime(
      0,
      start
    );


    gain.gain.linearRampToValueAtTime(
      0.055,
      start + 0.02
    );


    gain.gain.exponentialRampToValueAtTime(
      0.001,
      start + 0.65
    );


    oscillator
      .connect(gain)
      .connect(audioContext.destination);


    oscillator.start(start);

    oscillator.stop(
      start + 0.68
    );

  });

}


// ============================================================
// CANVAS RESIZE
// ============================================================

function resizeCanvas() {

  if (completed) return;


  const rect =
    giftCard.getBoundingClientRect();


  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );


  canvas.width =
    Math.max(
      1,
      Math.round(rect.width * dpr)
    );


  canvas.height =
    Math.max(
      1,
      Math.round(rect.height * dpr)
    );


  canvas.style.width =
    `${rect.width}px`;


  canvas.style.height =
    `${rect.height}px`;


  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );


  drawWrappingPaper(
    rect.width,
    rect.height
  );


  updateUi();

}


// ============================================================
// DRAW WRAPPING PAPER
// ============================================================

function drawWrappingPaper(w, h) {

  ctx.globalCompositeOperation =
    "source-over";


  ctx.clearRect(
    0,
    0,
    w,
    h
  );


  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      w,
      h
    );


  gradient.addColorStop(
    0,
    "#ec5662"
  );


  gradient.addColorStop(
    0.48,
    "#d43c49"
  );


  gradient.addColorStop(
    1,
    "#a92035"
  );


  ctx.fillStyle =
    gradient;


  ctx.fillRect(
    0,
    0,
    w,
    h
  );


  // Wrapping pattern
  ctx.save();


  ctx.globalAlpha =
    0.16;


  ctx.strokeStyle =
    "#ffffff";


  ctx.lineWidth =
    2;


  const spacing =
    44;


  for (
    let x = -h;
    x < w + h;
    x += spacing
  ) {

    ctx.beginPath();

    ctx.moveTo(
      x,
      0
    );

    ctx.lineTo(
      x + h,
      h
    );

    ctx.stroke();

  }


  ctx.globalAlpha =
    0.1;


  ctx.fillStyle =
    "#ffffff";


  for (
    let y = 24;
    y < h;
    y += 72
  ) {

    for (
      let x = 20;
      x < w;
      x += 72
    ) {

      ctx.beginPath();

      ctx.arc(
        x + ((y / 72) % 2 ? 20 : 0),
        y,
        3,
        0,
        Math.PI * 2
      );

      ctx.fill();

    }

  }


  ctx.restore();


  // Edge shading
  const edge =
    ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.08,

      w / 2,
      h / 2,
      Math.max(w, h) * 0.75
    );


  edge.addColorStop(
    0.55,
    "rgba(0,0,0,0)"
  );


  edge.addColorStop(
    1,
    "rgba(50,0,10,.25)"
  );


  ctx.fillStyle =
    edge;


  ctx.fillRect(
    0,
    0,
    w,
    h
  );

}


// ============================================================
// POINTER POSITION
// ============================================================

function pointFromEvent(event) {

  const rect =
    canvas.getBoundingClientRect();


  return {

    x:
      event.clientX -
      rect.left,

    y:
      event.clientY -
      rect.top

  };

}


// ============================================================
// BEGIN TEAR
// ============================================================

function beginTear(event) {

  if (completed) return;


  event.preventDefault();


  setupAudio();


  drawing = true;

  strokeDistance = 0;


  lastPoint =
    pointFromEvent(event);


  canvas.setPointerCapture?.(
    event.pointerId
  );


  if (tearCount === 0) {

    giftCard.classList.add(
      "first-tear"
    );

  }


  startRipSound();


  eraseAt(
    lastPoint.x,
    lastPoint.y,
    true
  );

}


// ============================================================
// CONTINUE TEAR
// ============================================================

function continueTear(event) {

  if (
    !drawing ||
    completed
  ) return;


  event.preventDefault();


  const point =
    pointFromEvent(event);


  if (!lastPoint) {

    lastPoint = point;

    return;

  }


  const dx =
    point.x -
    lastPoint.x;


  const dy =
    point.y -
    lastPoint.y;


  const distance =
    Math.hypot(
      dx,
      dy
    );


  if (distance > 0) {

    strokeDistance +=
      distance;


    eraseLine(
      lastPoint.x,
      lastPoint.y,
      point.x,
      point.y
    );


    updateRipSound(
      distance
    );


    lastPoint =
      point;

  }

}


// ============================================================
// FINISH TEAR
// ============================================================

function finishTear(event) {

  if (
    !drawing ||
    completed
  ) return;


  event.preventDefault();


  drawing = false;


  stopRipSound();


  if (
    strokeDistance >=
    MIN_STROKE_DISTANCE
  ) {

    tearCount =
      Math.min(
        GIFT.requiredTears,
        tearCount + 1
      );


    playTearSnap();


    giftCard.classList.remove(
      "bump"
    );


    void giftCard.offsetWidth;


    giftCard.classList.add(
      "bump"
    );


    setTimeout(
      () =>
        giftCard.classList.remove(
          "bump"
        ),
      390
    );

  }


  strokeDistance = 0;

  lastPoint = null;


  erasedEstimate =
    measureErasedRatio();


  updateUi();

  checkComplete();

}


// ============================================================
// ERASE / RIP PAPER
// ============================================================

function eraseAt(x, y, initial = false) {

  const brush =
    Math.max(
      BRUSH_BASE,
      canvas.getBoundingClientRect().width *
      0.038
    );


  ctx.save();


  ctx.globalCompositeOperation =
    "destination-out";


  // Main rip hole
  const gradient =
    ctx.createRadialGradient(
      x,
      y,
      brush * 0.15,

      x,
      y,
      brush
    );


  gradient.addColorStop(
    0,
    "rgba(0,0,0,1)"
  );


  gradient.addColorStop(
    0.7,
    "rgba(0,0,0,.97)"
  );


  gradient.addColorStop(
    1,
    "rgba(0,0,0,0)"
  );


  ctx.fillStyle =
    gradient;


  ctx.beginPath();


  ctx.arc(
    x,
    y,
    brush,
    0,
    Math.PI * 2
  );


  ctx.fill();


  // Lots of ragged paper edges
  if (!initial) {

    for (
      let i = 0;
      i < 11;
      i++
    ) {

      const angle =
        Math.random() *
        Math.PI * 2;


      const radius =
        brush *
        (
          0.65 +
          Math.random() *
          0.55
        );


      const rx =
        x +
        Math.cos(angle) *
        radius;


      const ry =
        y +
        Math.sin(angle) *
        radius;


      const size =
        2 +
        Math.random() *
        5;


      ctx.beginPath();


      ctx.arc(
        rx,
        ry,
        size,
        0,
        Math.PI * 2
      );


      ctx.fill();

    }

  }


  ctx.restore();

}


// ============================================================
// DRAW A RIP LINE
// ============================================================

function eraseLine(
  x1,
  y1,
  x2,
  y2
) {

  const distance =
    Math.hypot(
      x2 - x1,
      y2 - y1
    );


  const steps =
    Math.max(
      1,
      Math.ceil(
        distance / 6
      )
    );


  for (
    let i = 0;
    i <= steps;
    i++
  ) {

    const t =
      i / steps;


    // Slight wobble makes the rip less perfectly smooth
    const wobbleX =
      (Math.random() - 0.5) *
      6;


    const wobbleY =
      (Math.random() - 0.5) *
      6;


    eraseAt(

      x1 +
      (x2 - x1) *
      t +
      wobbleX,

      y1 +
      (y2 - y1) *
      t +
      wobbleY,

      false

    );

  }

}


// ============================================================
// CHECK HOW MUCH PAPER IS GONE
// ============================================================

function measureErasedRatio() {

  const sampleWidth =
    120;


  const sampleHeight =
    Math.max(
      80,

      Math.round(
        sampleWidth *
        canvas.height /
        canvas.width
      )
    );


  const sample =
    document.createElement(
      "canvas"
    );


  sample.width =
    sampleWidth;


  sample.height =
    sampleHeight;


  const sampleContext =
    sample.getContext(
      "2d",
      {
        willReadFrequently: true
      }
    );


  sampleContext.clearRect(
    0,
    0,
    sampleWidth,
    sampleHeight
  );


  sampleContext.drawImage(
    canvas,
    0,
    0,
    sampleWidth,
    sampleHeight
  );


  const data =
    sampleContext
      .getImageData(
        0,
        0,
        sampleWidth,
        sampleHeight
      )
      .data;


  let erased = 0;

  let total = 0;


  for (
    let i = 3;
    i < data.length;
    i += 4
  ) {

    total++;


    if (
      data[i] < 80
    ) {

      erased++;

    }

  }


  return total
    ? erased / total
    : 0;

}


// ============================================================
// UI
// ============================================================

function updateUi() {

  const tearProgress =
    Math.min(
      1,
      tearCount /
      GIFT.requiredTears
    );


  const eraseProgress =
    Math.min(
      1,
      erasedEstimate /
      TARGET_ERASE
    );


  const overall =
    Math.min(
      tearProgress,
      eraseProgress
    );


  progressFill.style.width =
    `${Math.round(overall * 100)}%`;


  tearStatus.textContent =
    `Tears: ${tearCount} / ${GIFT.requiredTears}`;


  if (
    tearCount === 0
  ) {

    tearPrompt.textContent =
      "Grab the wrapping paper and start ripping!";

  }

  else if (
    tearCount <
    GIFT.requiredTears
  ) {

    const remaining =
      GIFT.requiredTears -
      tearCount;


    tearPrompt.textContent =
      `${remaining} more tear${remaining === 1 ? "" : "s"} — keep ripping!`;

  }

  else if (
    erasedEstimate <
    TARGET_ERASE
  ) {

    tearPrompt.textContent =
      "Almost there — rip off more wrapping paper!";

  }

  else {

    tearPrompt.textContent =
      "OPENING…";

  }

}


// ============================================================
// COMPLETE PRESENT
// ============================================================

function checkComplete() {

  if (completed) return;


  if (
    tearCount >=
    GIFT.requiredTears &&

    erasedEstimate >=
    TARGET_ERASE
  ) {

    completed = true;


    stopRipSound();


    progressFill.style.width =
      "100%";


    giftCard.classList.add(
      "complete"
    );


    tearUi.classList.add(
      "hidden"
    );


    hint.textContent =
      "YOU GOT IT OPEN!";


    canvas.style.pointerEvents =
      "none";


    playRevealSound();


    launchConfetti(
      140
    );


    setTimeout(
      () => {

        canvas.style.display =
          "none";

      },

      720
    );

  }

}


// ============================================================
// CONFETTI
// ============================================================

function launchConfetti(
  count = 100
) {

  const colours = [

    "#f4c95d",

    "#73dcff",

    "#ff6b79",

    "#b28cff",

    "#ffffff",

    "#72e4b2"

  ];


  for (
    let i = 0;
    i < count;
    i++
  ) {

    const piece =
      document.createElement(
        "span"
      );


    piece.className =
      "confetti";


    piece.style.left =
      `${Math.random() * 100}%`;


    piece.style.background =
      colours[
        Math.floor(
          Math.random() *
          colours.length
        )
      ];


    piece.style.setProperty(
      "--drift",
      `${-180 + Math.random() * 360}px`
    );


    piece.style.setProperty(
      "--spin",
      `${360 + Math.random() * 900}deg`
    );


    piece.style.setProperty(
      "--duration",
      `${2.7 + Math.random() * 2.4}s`
    );


    piece.style.animationDelay =
      `${Math.random() * 0.55}s`;


    confettiLayer.appendChild(
      piece
    );


    setTimeout(
      () => piece.remove(),
      6000
    );

  }

}


// ============================================================
// CLAIM BUTTON
// ============================================================

claimButton.addEventListener(
  "click",

  () => {

    claimResult.textContent =
      GIFT.claimMessage;


    launchConfetti(
      50
    );


    playRevealSound();

  }
);


// ============================================================
// POINTER EVENTS
// ============================================================

canvas.addEventListener(
  "pointerdown",
  beginTear
);


canvas.addEventListener(
  "pointermove",
  continueTear
);


canvas.addEventListener(
  "pointerup",
  finishTear
);


canvas.addEventListener(
  "pointercancel",
  finishTear
);


canvas.addEventListener(
  "pointerleave",

  event => {

    if (
      drawing &&
      event.buttons === 0
    ) {

      finishTear(event);

    }

  }
);


// Stop browser image/canvas dragging
canvas.addEventListener(
  "dragstart",

  event =>
    event.preventDefault()
);


// ============================================================
// WINDOW RESIZE
// ============================================================

window.addEventListener(
  "resize",

  () => {

    clearTimeout(
      resizeTimer
    );


    resizeTimer =
      setTimeout(
        resizeCanvas,
        180
      );

  }
);


// ============================================================
// START
// ============================================================

resizeCanvas();
