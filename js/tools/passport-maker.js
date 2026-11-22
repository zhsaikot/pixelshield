/**
 * ============================================================================
 * Tool 3: ID & Passport Photo Studio & Sheet Maker
 * ============================================================================
 */

import {
  loadImage,
  canvasToBlob,
  downloadBlob,
  formatBytes
} from '../utils/image-engine.js';

// Standard 300 DPI Presets
const PRESETS = {
  'passport-35-45': {
    id: 'passport-35-45',
    name: '35 × 45 mm (Standard Passport / Schengen / UK / Global)',
    widthMM: 35,
    heightMM: 45,
    pixelWidth: 413,
    pixelHeight: 531,
    aspectRatio: 35 / 45
  },
  'visa-2-2': {
    id: 'visa-2-2',
    name: '2 × 2 inch (US Passport & Visa / India Visa)',
    widthMM: 50.8,
    heightMM: 50.8,
    pixelWidth: 600,
    pixelHeight: 600,
    aspectRatio: 1.0
  },
  'portal-300-300': {
    id: 'portal-300-300',
    name: '300 × 300 px (Digital Portal / Profile / Application)',
    widthMM: 25.4,
    heightMM: 25.4,
    pixelWidth: 300,
    pixelHeight: 300,
    aspectRatio: 1.0
  },
  'japan-35-35': {
    id: 'japan-35-35',
    name: '35 × 35 mm (Japan / Asian ID)',
    widthMM: 35,
    heightMM: 35,
    pixelWidth: 413,
    pixelHeight: 413,
    aspectRatio: 1.0
  },
  'canada-50-70': {
    id: 'canada-50-70',
    name: '50 × 70 mm (Canadian Passport)',
    widthMM: 50,
    heightMM: 70,
    pixelWidth: 591,
    pixelHeight: 827,
    aspectRatio: 50 / 70
  }
};

// Sheet Paper Presets (300 DPI)
const SHEET_PRESETS = {
  '4x6': {
    name: '4 × 6 inch (10 × 15 cm)',
    widthPx: 1800,
    heightPx: 1200
  },
  'a4': {
    name: 'A4 (210 × 297 mm)',
    widthPx: 2480,
    heightPx: 3508
  },
  '5x7': {
    name: '5 × 7 inch (13 × 18 cm)',
    widthPx: 2100,
    heightPx: 1500
  }
};

export class PassportMakerTool {
  constructor(app) {
    this.app = app;
    this.currentImage = null; // { img, width, height, file }
    this.currentPresetKey = 'passport-35-45';
    this.currentPreset = PRESETS['passport-35-45'];

    // Interactive Transform State
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.rotation = 0; // -45 to +45 deg
    this.flipH = false;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Studio Options
    this.showGuides = true;
    this.bgColor = '#ffffff'; // 'original', '#ffffff', '#f3f4f6', '#cbe3f7'
    this.sheetPaperKey = '4x6';
    this.sheetCutGuides = true;
    this.sheetMarginMM = 5; // mm margin between photos
    this.exportFormat = 'image/jpeg'; // 'image/jpeg' or 'image/png'

    this.initDOMElements();
    this.bindEvents();
    this.initDefaultCanvas();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-passport');
    this.dropzone = document.getElementById('passport-dropzone');
    this.fileInput = document.getElementById('passport-file-input');
    this.workspace = document.getElementById('passport-workspace');

    // Canvas Viewport
    this.canvasContainer = document.getElementById('passport-canvas-container');
    this.canvas = document.getElementById('passport-editor-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Preset & Options
    this.presetSelect = document.getElementById('passport-preset-select');
    this.zoomSlider = document.getElementById('passport-zoom-slider');
    this.zoomValBadge = document.getElementById('passport-zoom-val');
    this.rotateSlider = document.getElementById('passport-rotate-slider');
    this.rotateValBadge = document.getElementById('passport-rotate-val');
    this.resetTransformBtn = document.getElementById('passport-reset-btn');
    this.guidesToggle = document.getElementById('passport-guides-toggle');
    this.flipBtn = document.getElementById('passport-flip-btn');

    // Background color swatches
    this.bgSwatches = document.querySelectorAll('.passport-bg-swatch');

    // Sheet layout controls
    this.sheetPaperSelect = document.getElementById('passport-sheet-paper');
    this.sheetCutGuidesToggle = document.getElementById('passport-cut-guides-toggle');
    this.sheetCanvas = document.getElementById('passport-sheet-canvas');
    this.sheetCtx = this.sheetCanvas.getContext('2d');
    this.sheetCountBadge = document.getElementById('passport-sheet-count-badge');

    // Download buttons
    this.downloadSingleBtn = document.getElementById('passport-download-single-btn');
    this.downloadSheetBtn = document.getElementById('passport-download-sheet-btn');
    this.changePhotoBtn = document.getElementById('passport-change-photo-btn');
  }

  bindEvents() {
    // Dropzone
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('dragover');
    });

    this.dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('dragover');
    });

    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadSourceFile(e.dataTransfer.files[0]);
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.loadSourceFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    if (this.changePhotoBtn) {
      this.changePhotoBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    // Preset selector
    this.presetSelect.addEventListener('change', (e) => {
      this.currentPresetKey = e.target.value;
      this.currentPreset = PRESETS[this.currentPresetKey] || PRESETS['passport-35-45'];
      this.fitImageToTargetAspect();
      this.render();
      this.renderSheet();
    });

    // Zoom slider
    this.zoomSlider.addEventListener('input', (e) => {
      this.zoom = parseFloat(e.target.value);
      this.zoomValBadge.textContent = `${Math.round(this.zoom * 100)}%`;
      this.render();
      this.renderSheet();
    });

    // Rotate slider
    this.rotateSlider.addEventListener('input', (e) => {
      this.rotation = parseInt(e.target.value, 10);
      this.rotateValBadge.textContent = `${this.rotation}°`;
      this.render();
      this.renderSheet();
    });

    // Flip horizontally
    if (this.flipBtn) {
      this.flipBtn.addEventListener('click', () => {
        this.flipH = !this.flipH;
        this.flipBtn.classList.toggle('active', this.flipH);
        this.render();
        this.renderSheet();
      });
    }

    // Reset button
    this.resetTransformBtn.addEventListener('click', () => {
      this.resetTransform();
    });

    // Guides toggle
    this.guidesToggle.addEventListener('change', (e) => {
      this.showGuides = e.target.checked;
      this.render();
    });

    // Background color selection
    this.bgSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        this.bgSwatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        this.bgColor = swatch.dataset.color;
        this.render();
        this.renderSheet();
      });
    });

    // Sheet paper selection
    this.sheetPaperSelect.addEventListener('change', (e) => {
      this.sheetPaperKey = e.target.value;
      this.renderSheet();
    });

    // Cut guides toggle
    this.sheetCutGuidesToggle.addEventListener('change', (e) => {
      this.sheetCutGuides = e.target.checked;
      this.renderSheet();
    });

    // Interactive Drag / Pan on Canvas Viewport
    this.canvasContainer.addEventListener('mousedown', (e) => this.startDrag(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) this.onDrag(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => this.endDrag());

    // Touch support for mobile devices
    this.canvasContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        e.preventDefault();
        this.onDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => this.endDrag());

    // Mouse wheel zoom
    this.canvasContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this.zoom = Math.max(0.5, Math.min(3.0, this.zoom + delta));
      this.zoomSlider.value = this.zoom.toFixed(2);
      this.zoomValBadge.textContent = `${Math.round(this.zoom * 100)}%`;
      this.render();
      this.renderSheet();
    }, { passive: false });

    // Download buttons
    this.downloadSingleBtn.addEventListener('click', () => this.downloadSinglePhoto());
    this.downloadSheetBtn.addEventListener('click', () => this.downloadPrintSheet());
  }

  startDrag(clientX, clientY) {
    if (!this.currentImage) return;
    this.isDragging = true;
    this.canvasContainer.classList.add('is-dragging');
    this.dragStartX = clientX - this.panX;
    this.dragStartY = clientY - this.panY;
  }

  onDrag(clientX, clientY) {
    if (!this.isDragging) return;
    this.panX = clientX - this.dragStartX;
    this.panY = clientY - this.dragStartY;
    this.render();
  }

  endDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvasContainer.classList.remove('is-dragging');
      this.renderSheet();
    }
  }

  initDefaultCanvas() {
    this.canvas.width = this.currentPreset.pixelWidth;
    this.canvas.height = this.currentPreset.pixelHeight;
    this.render();
  }

  async loadSourceFile(file) {
    if (!file.type.startsWith('image/')) {
      this.app.showToast('Please upload an image file (JPEG, PNG, WebP)', 'error');
      return;
    }

    try {
      const imgData = await loadImage(file);
      this.currentImage = {
        img: imgData.img,
        width: imgData.width,
        height: imgData.height,
        file
      };

      // Show workspace, hide initial dropzone
      this.dropzone.style.display = 'none';
      this.workspace.style.display = 'grid';

      this.resetTransform();
      setTimeout(() => {
        if (this.workspace) this.workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      this.app.showToast(`Loaded portrait: ${file.name}`, 'success');
    } catch (err) {
      console.error('Portrait load error:', err);
      this.app.showToast(`Could not load image: ${err.message}`, 'error');
    }
  }

  resetTransform() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.rotation = 0;
    this.flipH = false;

    if (this.zoomSlider) this.zoomSlider.value = '1.0';
    if (this.zoomValBadge) this.zoomValBadge.textContent = '100%';
    if (this.rotateSlider) this.rotateSlider.value = '0';
    if (this.rotateValBadge) this.rotateValBadge.textContent = '0°';
    if (this.flipBtn) this.flipBtn.classList.remove('active');

    this.fitImageToTargetAspect();
    this.render();
    this.renderSheet();
  }

  fitImageToTargetAspect() {
    if (!this.currentImage) return;
    // Set target canvas pixel dimensions from preset
    this.canvas.width = this.currentPreset.pixelWidth;
    this.canvas.height = this.currentPreset.pixelHeight;

    const img = this.currentImage;
    const targetW = this.canvas.width;
    const targetH = this.canvas.height;

    // Scale so image covers canvas
    const scaleX = targetW / img.width;
    const scaleY = targetH / img.height;
    const coverScale = Math.max(scaleX, scaleY);

    this.baseScale = coverScale;
    this.panX = 0;
    this.panY = 0;
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // 1. Background Fill
    if (this.bgColor && this.bgColor !== 'original') {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Draw Image if loaded
    if (this.currentImage) {
      ctx.save();
      // Center origin for transforms
      ctx.translate(w / 2 + this.panX, h / 2 + this.panY);
      ctx.rotate((this.rotation * Math.PI) / 180);
      if (this.flipH) {
        ctx.scale(-1, 1);
      }

      const scale = (this.baseScale || 1.0) * this.zoom;
      const drawW = this.currentImage.width * scale;
      const drawH = this.currentImage.height * scale;

      ctx.drawImage(
        this.currentImage.img,
        -drawW / 2,
        -drawH / 2,
        drawW,
        drawH
      );

      ctx.restore();
    } else {
      // Placeholder illustration
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a portrait photo to begin', w / 2, h / 2);
    }

    // 3. Biometric Guide Overlay (ICAO / Passport standard overlay)
    if (this.showGuides && this.currentImage) {
      this.drawBiometricGuides(ctx, w, h);
    }
  }

  drawBiometricGuides(ctx, w, h) {
    ctx.save();

    // Center vertical guideline (Pine-Blue tint)
    ctx.strokeStyle = 'rgba(83, 128, 131, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Biometric Face Oval Guide (Crown to Chin envelope - Jungle Teal)
    // In standard passport photos, the head (crown of hair to bottom of chin)
    // should measure between 70% and 80% of the total height.
    const ovalCenterX = w / 2;
    const ovalCenterY = h * 0.48; // Face center slightly above geometric center
    const radiusX = w * 0.30;
    const radiusY = h * 0.36;

    ctx.strokeStyle = 'rgba(42, 127, 98, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(ovalCenterX, ovalCenterY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Eye-level guideline (approx 56% - 60% from bottom / 40%-44% from top)
    const eyeY = h * 0.42;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(w * 0.15, eyeY);
    ctx.lineTo(w * 0.85, eyeY);
    ctx.stroke();

    // Chin level guideline
    const chinY = h * 0.80;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.beginPath();
    ctx.moveTo(w * 0.25, chinY);
    ctx.lineTo(w * 0.75, chinY);
    ctx.stroke();

    // Labels
    ctx.setLineDash([]);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.fillText('Eye Level', w * 0.87, eyeY + 3);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.fillText('Chin Line', w * 0.77, chinY + 3);

    ctx.restore();
  }

  /**
   * Render the printable tiled sheet on an offscreen or preview canvas
   */
  renderSheet() {
    if (!this.currentImage) return;

    const paper = SHEET_PRESETS[this.sheetPaperKey] || SHEET_PRESETS['4x6'];
    const sheetW = paper.widthPx;
    const sheetH = paper.heightPx;

    this.sheetCanvas.width = sheetW;
    this.sheetCanvas.height = sheetH;
    const sCtx = this.sheetCtx;

    // Clean white photo paper background
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(0, 0, sheetW, sheetH);

    // Render a clean single photo (without guidelines) to a virtual canvas
    const singleCanvas = document.createElement('canvas');
    singleCanvas.width = this.currentPreset.pixelWidth;
    singleCanvas.height = this.currentPreset.pixelHeight;
    const sPhotoCtx = singleCanvas.getContext('2d');

    // Background fill
    if (this.bgColor && this.bgColor !== 'original') {
      sPhotoCtx.fillStyle = this.bgColor;
      sPhotoCtx.fillRect(0, 0, singleCanvas.width, singleCanvas.height);
    } else {
      sPhotoCtx.fillStyle = '#ffffff';
      sPhotoCtx.fillRect(0, 0, singleCanvas.width, singleCanvas.height);
    }

    // Draw transformed image
    sPhotoCtx.save();
    sPhotoCtx.translate(singleCanvas.width / 2 + this.panX, singleCanvas.height / 2 + this.panY);
    sPhotoCtx.rotate((this.rotation * Math.PI) / 180);
    if (this.flipH) {
      sPhotoCtx.scale(-1, 1);
    }
    const scale = (this.baseScale || 1.0) * this.zoom;
    const drawW = this.currentImage.width * scale;
    const drawH = this.currentImage.height * scale;
    sPhotoCtx.drawImage(this.currentImage.img, -drawW / 2, -drawH / 2, drawW, drawH);
    sPhotoCtx.restore();

    // Tile calculations with spacing and margins
    const photoW = singleCanvas.width;
    const photoH = singleCanvas.height;
    const gapPx = Math.round((this.sheetMarginMM * 300) / 25.4); // mm to 300 DPI pixels

    const cols = Math.floor((sheetW - gapPx) / (photoW + gapPx));
    const rows = Math.floor((sheetH - gapPx) / (photoH + gapPx));
    const totalCopies = cols * rows;

    // Center the grid on the sheet
    const totalGridW = cols * photoW + (cols - 1) * gapPx;
    const totalGridH = rows * photoH + (rows - 1) * gapPx;
    const startX = Math.round((sheetW - totalGridW) / 2);
    const startY = Math.round((sheetH - totalGridH) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (photoW + gapPx);
        const y = startY + r * (photoH + gapPx);

        // Draw photo
        sCtx.drawImage(singleCanvas, x, y, photoW, photoH);

        // Optional cut-guide border
        if (this.sheetCutGuides) {
          sCtx.save();
          sCtx.strokeStyle = '#cbd5e1';
          sCtx.lineWidth = 1.5;
          sCtx.strokeRect(x, y, photoW, photoH);

          // Corner tick marks for precision cutting
          sCtx.strokeStyle = '#94a3b8';
          const tickLen = 12;
          // Top-left
          sCtx.beginPath();
          sCtx.moveTo(x - tickLen, y); sCtx.lineTo(x, y);
          sCtx.moveTo(x, y - tickLen); sCtx.lineTo(x, y);
          // Top-right
          sCtx.moveTo(x + photoW, y); sCtx.lineTo(x + photoW + tickLen, y);
          sCtx.moveTo(x + photoW, y - tickLen); sCtx.lineTo(x + photoW, y);
          // Bottom-left
          sCtx.moveTo(x - tickLen, y + photoH); sCtx.lineTo(x, y + photoH);
          sCtx.moveTo(x, y + photoH); sCtx.lineTo(x, y + photoH + tickLen);
          // Bottom-right
          sCtx.moveTo(x + photoW, y + photoH); sCtx.lineTo(x + photoW + tickLen, y + photoH);
          sCtx.moveTo(x + photoW, y + photoH); sCtx.lineTo(x + photoW, y + photoH + tickLen);
          sCtx.stroke();
          sCtx.restore();
        }
      }
    }

    if (this.sheetCountBadge) {
      this.sheetCountBadge.textContent = `${totalCopies} photos on ${paper.name}`;
    }
  }

  async downloadSinglePhoto() {
    if (!this.currentImage) {
      this.app.showToast('Please upload an image first', 'info');
      return;
    }

    // Render clean photo without guidelines
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.currentPreset.pixelWidth;
    exportCanvas.height = this.currentPreset.pixelHeight;
    const ctx = exportCanvas.getContext('2d');

    if (this.bgColor && this.bgColor !== 'original') {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    ctx.save();
    ctx.translate(exportCanvas.width / 2 + this.panX, exportCanvas.height / 2 + this.panY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    if (this.flipH) ctx.scale(-1, 1);

    const scale = (this.baseScale || 1.0) * this.zoom;
    const drawW = this.currentImage.width * scale;
    const drawH = this.currentImage.height * scale;
    ctx.drawImage(this.currentImage.img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const blob = await canvasToBlob(exportCanvas, 'image/jpeg', 0.96);
    const filename = `id-photo-${this.currentPresetKey}-${exportCanvas.width}x${exportCanvas.height}.jpg`;
    downloadBlob(blob, filename);
    this.app.showToast(`Downloaded Single Photo (${formatBytes(blob.size)})`, 'success');
  }

  async downloadPrintSheet() {
    if (!this.currentImage) {
      this.app.showToast('Please upload an image first', 'info');
      return;
    }

    this.renderSheet();
    const blob = await canvasToBlob(this.sheetCanvas, 'image/jpeg', 0.95);
    const filename = `print-sheet-${this.sheetPaperKey}-${this.currentPresetKey}-300dpi.jpg`;
    downloadBlob(blob, filename);
    this.app.showToast(`Downloaded Printable Sheet (${formatBytes(blob.size)})`, 'success');
  }
}
