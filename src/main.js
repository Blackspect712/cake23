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
// Determine frame path dynamically:
// Frames in the repository reside in 'public/frames/'.
// If running from a bundled dist where public/ is flattened, it automatically falls back to 'frames/'.
let currentBase = 'public/frames';

const getFramePath = (index, baseDir = currentBase) => {
  const filename = `ezgif-frame-${String(index).padStart(3, '0')}.jpg`;
  return `${baseDir}/${filename}`;
};

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
      img.src = getFramePath(i, currentBase);
      img.onload = () => {
        if (lastDrawnFrame === -1 || Math.round(currentFrame) === i) {
          drawFrame(Math.round(currentFrame));
        }
      };
      img.onerror = () => {
        // Automatic fallback between 'public/frames' and 'frames'
        if (!img.dataset.retried) {
          img.dataset.retried = 'true';
          const alternateBase = currentBase === 'frames' ? 'public/frames' : 'frames';
          currentBase = alternateBase;
          img.src = getFramePath(i, alternateBase);
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

  // Initialize Navigation Bar
  initNavbar();
}

// Navigation Bar Controller
function initNavbar() {
  const navbar = document.getElementById('main-navbar');
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileIcon = document.getElementById('mobile-menu-icon');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

  if (!navbar) return;

  // Toggle navbar background transparency on scroll
  function updateNavbarTransparency() {
    if (window.scrollY > 30) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  }

  window.addEventListener('scroll', updateNavbarTransparency, { passive: true });
  updateNavbarTransparency();

  // Mobile menu toggle
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = mobileBtn.getAttribute('aria-expanded') === 'true';
      mobileBtn.setAttribute('aria-expanded', !isExpanded);
      mobileMenu.classList.toggle('hidden');
      if (mobileIcon) {
        mobileIcon.textContent = !isExpanded ? 'close' : 'menu';
      }
    });

    // Close mobile menu on outside click
    document.addEventListener('click', (e) => {
      if (!mobileMenu.classList.contains('hidden') && !navbar.contains(e.target)) {
        mobileMenu.classList.add('hidden');
        mobileBtn.setAttribute('aria-expanded', 'false');
        if (mobileIcon) mobileIcon.textContent = 'menu';
      }
    });
  }

  // Smooth scroll handler for all internal anchor links in navbar
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        e.preventDefault();

        // Close mobile menu if open
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
          if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
          if (mobileIcon) mobileIcon.textContent = 'menu';
        }

        // Calculate offset position accounting for navbar
        const navbarHeight = navbar.offsetHeight || 80;
        const targetTop = targetElem.getBoundingClientRect().top + window.pageYOffset - navbarHeight + 10;

        window.scrollTo({
          top: targetId === '#scroll-animation-section' ? 0 : Math.max(0, targetTop),
          behavior: 'smooth'
        });
      }
    });
  });

  // Active section indicator
  const sections = [
    'scroll-animation-section',
    'about',
    'ingredients',
    'nutrition',
    'gallery',
    'reviews',
    'reserve'
  ].map((id) => document.getElementById(id)).filter(Boolean);

  function setActiveLink(activeId) {
    navLinks.forEach((link) => {
      const target = link.getAttribute('data-target') || (link.getAttribute('href') || '').replace('#', '');
      if (target === activeId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // High-precision scroll watcher for active menu highlighting
  function updateActiveSection() {
    const scrollPosition = window.scrollY + 140;
    let currentActive = 'scroll-animation-section';

    for (const section of sections) {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPosition >= top && scrollPosition < top + height) {
        currentActive = section.id;
        break;
      }
    }
    setActiveLink(currentActive);
  }

  window.addEventListener('scroll', updateActiveSection, { passive: true });
  updateActiveSection();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

