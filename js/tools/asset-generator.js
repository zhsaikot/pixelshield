/**
 * ============================================================================
 * Tool 7: Favicon & Social Media Asset Generator
 * 100% Client-Side Icon Suite & Social Aspect Resizing Engine
 * ============================================================================
 */

import {
  loadImage,
  canvasToBlob,
  downloadBlob,
  downloadZip,
  formatBytes,
  drawImageOnCanvas
} from '../utils/image-engine.js';

const FAVICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png', label: '16 × 16 px', desc: 'Standard browser tab' },
  { size: 32, name: 'favicon-32x32.png', label: '32 × 32 px', desc: 'Retina tab & desktop' },
  { size: 48, name: 'favicon-48x48.png', label: '48 × 48 px', desc: 'Windows desktop shortcut' },
  { size: 180, name: 'apple-touch-icon.png', label: '180 × 180 px', desc: 'Apple iOS Home Screen' },
  { size: 512, name: 'android-chrome-512x512.png', label: '512 × 512 px', desc: 'PWA / Android Splash' }
];

const SOCIAL_PRESETS = {
  'instagram-square': { name: '1:1 Square (Instagram / Post)', width: 1080, height: 1080 },
  'story-reel': { name: '9:16 Story / Reel / TikTok', width: 1080, height: 1920 },
  'youtube-thumb': { name: '16:9 YouTube Thumbnail / X', width: 1280, height: 720 },
  'instagram-portrait': { name: '4:5 Instagram Portrait', width: 1080, height: 1350 }
};

export class AssetGeneratorTool {
  constructor(app) {
    this.app = app;
    this.activeSubtab = 'favicon'; // 'favicon' or 'social'

    // Favicon state
    this.faviconSource = null;
    this.generatedIcons = []; // Array of { size, name, blob, dataUrl }

    // Social state
    this.socialSource = null;
    this.socialPresetKey = 'instagram-square';
    this.socialFitMode = 'blur-pad'; // 'blur-pad' or 'center-crop'

    this.initDOMElements();
    this.bindEvents();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-assets');

    // Subtabs
    this.subtabFaviconBtn = document.getElementById('asset-subtab-favicon');
    this.subtabSocialBtn = document.getElementById('asset-subtab-social');
    this.sectionFavicon = document.getElementById('asset-section-favicon');
    this.sectionSocial = document.getElementById('asset-section-social');

    // Tab A: Favicon Elements
    this.faviconDropzone = document.getElementById('favicon-dropzone');
    this.faviconFileInput = document.getElementById('favicon-file-input');
    this.faviconWorkspace = document.getElementById('favicon-workspace');
    this.faviconGrid = document.getElementById('favicon-pack-grid');
    this.downloadZipBtn = document.getElementById('favicon-download-zip-btn');
    this.copySnippetBtn = document.getElementById('favicon-copy-snippet-btn');
    this.codeSnippet = document.getElementById('favicon-code-snippet');
    this.faviconChangePhotoBtn = document.getElementById('favicon-change-photo-btn');

    // Tab B: Social Elements
    this.socialDropzone = document.getElementById('social-dropzone');
    this.socialFileInput = document.getElementById('social-file-input');
    this.socialWorkspace = document.getElementById('social-workspace');
    this.socialPresetSelect = document.getElementById('social-preset-select');
    this.socialFitModeSelect = document.getElementById('social-fit-mode-select');
    this.socialCanvas = document.getElementById('social-preview-canvas');
    this.socialCtx = this.socialCanvas ? this.socialCanvas.getContext('2d') : null;
    this.socialDownloadBtn = document.getElementById('social-download-btn');
    this.socialChangePhotoBtn = document.getElementById('social-change-photo-btn');
  }

  bindEvents() {
    // Subtabs
    this.subtabFaviconBtn.addEventListener('click', () => this.switchSubtab('favicon'));
    this.subtabSocialBtn.addEventListener('click', () => this.switchSubtab('social'));

    // Favicon Dropzone
    this.faviconDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.faviconDropzone.classList.add('dragover');
    });
    this.faviconDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.faviconDropzone.classList.remove('dragover');
    });
    this.faviconDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.faviconDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadFaviconSource(e.dataTransfer.files[0]);
      }
    });
    this.faviconFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.loadFaviconSource(e.target.files[0]);
        e.target.value = '';
      }
    });

    if (this.faviconChangePhotoBtn) {
      this.faviconChangePhotoBtn.addEventListener('click', () => this.faviconFileInput.click());
    }

    this.downloadZipBtn.addEventListener('click', () => this.downloadFaviconZip());

    if (this.copySnippetBtn) {
      this.copySnippetBtn.addEventListener('click', () => this.copyHtmlSnippet());
    }

    // Social Dropzone
    this.socialDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.socialDropzone.classList.add('dragover');
    });
    this.socialDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.socialDropzone.classList.remove('dragover');
    });
    this.socialDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.socialDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadSocialSource(e.dataTransfer.files[0]);
      }
    });
    this.socialFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.loadSocialSource(e.target.files[0]);
        e.target.value = '';
      }
    });

    if (this.socialChangePhotoBtn) {
      this.socialChangePhotoBtn.addEventListener('click', () => this.socialFileInput.click());
    }

    this.socialPresetSelect.addEventListener('change', (e) => {
      this.socialPresetKey = e.target.value;
      this.renderSocialAsset();
    });

    this.socialFitModeSelect.addEventListener('change', (e) => {
      this.socialFitMode = e.target.value;
      this.renderSocialAsset();
    });

    this.socialDownloadBtn.addEventListener('click', () => this.downloadSocialAsset());
  }

  switchSubtab(tab) {
    this.activeSubtab = tab;
    this.subtabFaviconBtn.classList.toggle('active', tab === 'favicon');
    this.subtabSocialBtn.classList.toggle('active', tab === 'social');
    this.sectionFavicon.style.display = tab === 'favicon' ? 'block' : 'none';
    this.sectionSocial.style.display = tab === 'social' ? 'block' : 'none';
  }

  // --- Tab A: Favicon Suite ---
  async loadFaviconSource(file) {
    try {
      const imgData = await loadImage(file);
      this.faviconSource = imgData;
      this.faviconDropzone.style.display = 'none';
      this.faviconWorkspace.style.display = 'block';

      await this.generateFavicons();
      setTimeout(() => {
        if (this.faviconWorkspace) this.faviconWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      this.app.showToast(`Generated icon suite from ${file.name}`, 'success');
    } catch (err) {
      console.error('Favicon load error:', err);
      this.app.showToast(`Could not load logo: ${err.message}`, 'error');
    }
  }

  async generateFavicons() {
    if (!this.faviconSource) return;

    this.generatedIcons = [];
    this.faviconGrid.innerHTML = '';

    for (const spec of FAVICON_SIZES) {
      const canvas = drawImageOnCanvas(this.faviconSource.img, spec.size, spec.size);
      const blob = await canvasToBlob(canvas, 'image/png');
      const dataUrl = canvas.toDataURL('image/png');

      this.generatedIcons.push({
        size: spec.size,
        name: spec.name,
        blob,
        dataUrl
      });

      const card = document.createElement('div');
      card.className = 'favicon-item-card';
      card.innerHTML = `
        <div class="favicon-icon-preview">
          <img src="${dataUrl}" alt="${spec.name}" />
        </div>
        <div class="favicon-meta-label">${spec.label}</div>
        <div class="favicon-meta-sub">${spec.desc}</div>
        <button type="button" class="btn btn-sm btn-outline download-icon-btn" style="width:100%; margin-top:0.35rem; font-size:0.75rem;">
          Download
        </button>
      `;

      const downloadBtn = card.querySelector('.download-icon-btn');
      downloadBtn.addEventListener('click', () => {
        downloadBlob(blob, spec.name);
        this.app.showToast(`Downloaded ${spec.name}`, 'success');
      });

      this.faviconGrid.appendChild(card);
    }
  }

  async downloadFaviconZip() {
    if (this.generatedIcons.length === 0) return;

    try {
      this.downloadZipBtn.disabled = true;
      this.downloadZipBtn.innerHTML = `Creating ZIP...`;

      const items = this.generatedIcons.map((item) => ({
        name: item.name,
        blob: item.blob
      }));

      await downloadZip(items, 'favicon-suite.zip');
      this.app.showToast('Downloaded full favicon pack ZIP!', 'success');
    } catch (err) {
      console.error('ZIP error:', err);
      this.app.showToast(`ZIP download failed: ${err.message}`, 'error');
    } finally {
      this.downloadZipBtn.disabled = false;
      this.downloadZipBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download All as ZIP (.ico &amp; .png)
      `;
    }
  }

  copyHtmlSnippet() {
    if (!this.codeSnippet) return;
    const text = this.codeSnippet.textContent;
    navigator.clipboard.writeText(text).then(() => {
      this.app.showToast('Copied HTML snippet to clipboard!', 'success');
    }).catch(() => {
      this.app.showToast('Copy failed, please select and copy manually', 'info');
    });
  }

  // --- Tab B: Social Asset Crop & Blur-Pad ---
  async loadSocialSource(file) {
    try {
      const imgData = await loadImage(file);
      this.socialSource = imgData;
      this.socialDropzone.style.display = 'none';
      this.socialWorkspace.style.display = 'grid';

      this.renderSocialAsset();
      setTimeout(() => {
        if (this.socialWorkspace) this.socialWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      this.app.showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      this.app.showToast(`Could not load image: ${err.message}`, 'error');
    }
  }

  renderSocialAsset() {
    if (!this.socialSource || !this.socialCanvas) return;

    const preset = SOCIAL_PRESETS[this.socialPresetKey] || SOCIAL_PRESETS['instagram-square'];
    const canvasW = preset.width;
    const canvasH = preset.height;

    this.socialCanvas.width = canvasW;
    this.socialCanvas.height = canvasH;
    const ctx = this.socialCtx;

    ctx.clearRect(0, 0, canvasW, canvasH);

    const img = this.socialSource.img;
    const imgW = this.socialSource.width;
    const imgH = this.socialSource.height;
    const imgAspect = imgW / imgH;
    const canvasAspect = canvasW / canvasH;

    if (this.socialFitMode === 'center-crop') {
      // Scale to cover entire canvas, centered
      let drawW, drawH, drawX, drawY;

      if (imgAspect > canvasAspect) {
        drawH = canvasH;
        drawW = canvasH * imgAspect;
        drawX = (canvasW - drawW) / 2;
        drawY = 0;
      } else {
        drawW = canvasW;
        drawH = canvasW / imgAspect;
        drawX = 0;
        drawY = (canvasH - drawH) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Fit with Blurred Background
      // 1. Draw blurred background covering full canvas
      ctx.save();
      const bgScale = Math.max(canvasW / imgW, canvasH / imgH) * 1.15;
      const bgW = imgW * bgScale;
      const bgH = imgH * bgScale;
      const bgX = (canvasW - bgW) / 2;
      const bgY = (canvasH - bgH) / 2;

      ctx.filter = 'blur(40px) brightness(0.65)';
      ctx.drawImage(img, bgX, bgY, bgW, bgH);
      ctx.restore();

      // 2. Draw centered uncropped image with soft shadow
      let fgW, fgH, fgX, fgY;
      if (imgAspect > canvasAspect) {
        fgW = canvasW * 0.92;
        fgH = fgW / imgAspect;
      } else {
        fgH = canvasH * 0.92;
        fgW = fgH * imgAspect;
      }
      fgX = (canvasW - fgW) / 2;
      fgY = (canvasH - fgH) / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(img, fgX, fgY, fgW, fgH);
      ctx.restore();
    }
  }

  async downloadSocialAsset() {
    if (!this.socialCanvas) return;

    try {
      const blob = await canvasToBlob(this.socialCanvas, 'image/jpeg', 0.95);
      const filename = `social-${this.socialPresetKey}-${this.socialCanvas.width}x${this.socialCanvas.height}.jpg`;

      downloadBlob(blob, filename);
      this.app.showToast(`Downloaded ${filename} (${formatBytes(blob.size)})!`, 'success');
    } catch (err) {
      console.error('Social export error:', err);
      this.app.showToast(`Export failed: ${err.message}`, 'error');
    }
  }
}
