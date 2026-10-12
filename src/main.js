import './style.css';

// Unregister any stray service workers from other projects
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
}

// Configuration
const TOTAL_FRAMES = 240;
const FRAME_PATH = (index) => `/frames/ezgif-frame-${String(index).padStart(3, '0')}.jpg`;

// State
const images = new Array(TOTAL_FRAMES + 1);
let currentFrame = 1;
let targetFrame = 1;
let lastDrawnFrame = -1;

function init() {
  const canvas = document.getElementById('cake-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    lastDrawnFrame = -1;
    drawFrame(Math.round(currentFrame));
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });

  function getBestAvailableImage(frameIndex) {
    const clamped = Math.min(Math.max(frameIndex, 1), TOTAL_FRAMES);
    if (images[clamped] && images[clamped].complete && images[clamped].naturalWidth > 0) {
      return images[clamped];
    }
    // Find closest loaded frame
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = clamped - offset;
      if (prev >= 1 && images[prev]?.complete && images[prev].naturalWidth > 0) return images[prev];
      const next = clamped + offset;
      if (next <= TOTAL_FRAMES && images[next]?.complete && images[next].naturalWidth > 0) return images[next];
    }
    return null;
  }

  function drawFrame(frameIndex) {
    if (frameIndex === lastDrawnFrame) return;

    const img = getBestAvailableImage(frameIndex);
    if (!img) return;

    const imgWidth = img.naturalWidth || 1920;
    const imgHeight = img.naturalHeight || 1080;
    const imgRatio = imgWidth / imgHeight;
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const viewportRatio = canvasW / canvasH;

    let drawW, drawH, offsetX, offsetY;

    // Cover aspect ratio with centering
    if (viewportRatio > imgRatio) {
      drawW = canvasW;
      drawH = canvasW / imgRatio;
      offsetX = 0;
      offsetY = (canvasH - drawH) / 2;
    } else {
      drawH = canvasH;
      drawW = canvasH * imgRatio;
      offsetX = (canvasW - drawW) / 2;
      offsetY = 0;
    }

    ctx.fillStyle = '#080605';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    lastDrawnFrame = frameIndex;
  }

  // Preload all 240 frames into memory
  function preloadFrames() {
    resizeCanvas();

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = () => {
        if (i === 1 && lastDrawnFrame === -1) {
          drawFrame(1);
        }
      };
      images[i] = img;
    }
  }

  // Scroll calculation scoped to the animation wrapper
  function onScroll() {
    const wrapper = document.getElementById('scroll-animation-section');
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const maxScroll = wrapper.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    // As user scrolls down through the wrapper:
    // rect.top starts at 0 and goes down to -maxScroll
    const progress = Math.min(Math.max(-rect.top / maxScroll, 0), 1);
    targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

    // Fade out headline & subheadline by 30% of the scroll animation section
    const heroOverlay = document.getElementById('hero-title-overlay');
    if (heroOverlay) {
      const fadeLimit = 0.30;
      const fadeProgress = Math.min(Math.max(progress / fadeLimit, 0), 1);
      const opacity = 1 - fadeProgress;
      heroOverlay.style.opacity = opacity.toFixed(3);
      heroOverlay.style.transform = `translateY(${-fadeProgress * 40}px)`;
      heroOverlay.style.visibility = opacity <= 0.005 ? 'hidden' : 'visible';
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Silky 60/120Hz LERP loop
  function renderLoop() {
    currentFrame += (targetFrame - currentFrame) * 0.18;
    drawFrame(Math.round(currentFrame));
    requestAnimationFrame(renderLoop);
  }

  preloadFrames();
  onScroll();
  requestAnimationFrame(renderLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
