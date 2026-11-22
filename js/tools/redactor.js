/**
 * ============================================================================
 * Tool 5: Privacy Redactor / Blur & Censor Tool
 * 100% Client-Side Interactive HTML5 Canvas Redaction Studio
 * ============================================================================
 */

import { loadImage, canvasToBlob, downloadBlob, formatBytes } from '../utils/image-engine.js';

export class RedactorTool {
  constructor(app) {
    this.app = app;
    this.currentImage = null; // { img, width, height, file }
    this.style = 'blur'; // 'blur', 'mosaic', 'blackout'
    this.intensity = 12; // 4 to 32
    this.exportFormat = 'image/png'; // 'image/png' or 'image/jpeg'
    this.history = []; // Array of ImageData snapshots
    this.maxHistory = 20;

    // Drawing drag state
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;

    this.initDOMElements();
    this.bindEvents();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-redact');
    this.dropzone = document.getElementById('redact-dropzone');
    this.fileInput = document.getElementById('redact-file-input');
    this.workspace = document.getElementById('redact-workspace');

    // Canvas elements
    this.viewport = document.getElementById('redact-viewport');
    this.canvasWrapper = document.getElementById('redact-canvas-wrapper');
    this.canvas = document.getElementById('redact-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.selectionRect = document.getElementById('redact-selection-rect');

    // Controls
    this.styleBtns = document.querySelectorAll('.redact-style-btn');
    this.intensitySlider = document.getElementById('redact-intensity-slider');
    this.intensityVal = document.getElementById('redact-intensity-val');
    this.formatSelect = document.getElementById('redact-format-select');

    // Action buttons
    this.undoBtn = document.getElementById('redact-undo-btn');
    this.resetBtn = document.getElementById('redact-reset-btn');
    this.changePhotoBtn = document.getElementById('redact-change-photo-btn');
    this.downloadBtn = document.getElementById('redact-download-btn');
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
        this.loadFile(e.dataTransfer.files[0]);
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.loadFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    if (this.changePhotoBtn) {
      this.changePhotoBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    // Style buttons
    this.styleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.styleBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.style = btn.dataset.style;
      });
    });

    // Intensity slider
    this.intensitySlider.addEventListener('input', (e) => {
      this.intensity = parseInt(e.target.value, 10);
      this.intensityVal.textContent = `${this.intensity}px`;
    });

    // Format select
    if (this.formatSelect) {
      this.formatSelect.addEventListener('change', (e) => {
        this.exportFormat = e.target.value;
      });
    }

    // Undo & Reset
    this.undoBtn.addEventListener('click', () => this.undo());
    this.resetBtn.addEventListener('click', () => this.resetImage());
    this.downloadBtn.addEventListener('click', () => this.downloadCleanImage());

    // Interactive Drawing on Canvas Wrapper
    this.canvasWrapper.addEventListener('mousedown', (e) => this.startSelection(e));
    window.addEventListener('mousemove', (e) => {
      if (this.isDrawing) this.updateSelection(e);
    });
    window.addEventListener('mouseup', (e) => {
      if (this.isDrawing) this.endSelection(e);
    });

    // Touch support for mobile / tablets
    this.canvasWrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.startSelection(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isDrawing && e.touches.length === 1) {
        e.preventDefault();
        this.updateSelection(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (this.isDrawing) {
        this.endSelection(e.changedTouches ? e.changedTouches[0] : null);
      }
    });
  }

  async loadFile(file) {
    if (!file.type.startsWith('image/')) {
      this.app.showToast('Please upload an image file (PNG, JPG, WebP)', 'error');
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

      this.dropzone.style.display = 'none';
      this.workspace.style.display = 'flex';

      this.resetImage();
      setTimeout(() => {
        if (this.workspace) this.workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      this.app.showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      console.error('Redactor image load error:', err);
      this.app.showToast(`Could not load image: ${err.message}`, 'error');
    }
  }

  resetImage() {
    if (!this.currentImage) return;

    this.canvas.width = this.currentImage.width;
    this.canvas.height = this.currentImage.height;
    this.ctx.drawImage(this.currentImage.img, 0, 0);

    this.history = [];
    this.updateUndoButton();
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    return {
      canvasX: Math.max(0, Math.min(this.canvas.width, canvasX)),
      canvasY: Math.max(0, Math.min(this.canvas.height, canvasY)),
      viewportX: e.clientX - rect.left,
      viewportY: e.clientY - rect.top
    };
  }

  startSelection(e) {
    if (!this.currentImage) return;
    this.isDrawing = true;

    const pos = this.getPointerPos(e);
    this.startX = pos.canvasX;
    this.startY = pos.canvasY;
    this.domStartX = pos.viewportX;
    this.domStartY = pos.viewportY;

    this.selectionRect.style.display = 'block';
    this.selectionRect.style.left = `${this.domStartX}px`;
    this.selectionRect.style.top = `${this.domStartY}px`;
    this.selectionRect.style.width = '0px';
    this.selectionRect.style.height = '0px';
  }

  updateSelection(e) {
    if (!this.isDrawing) return;
    const pos = this.getPointerPos(e);

    const minX = Math.min(this.domStartX, pos.viewportX);
    const minY = Math.min(this.domStartY, pos.viewportY);
    const w = Math.abs(pos.viewportX - this.domStartX);
    const h = Math.abs(pos.viewportY - this.domStartY);

    this.selectionRect.style.left = `${minX}px`;
    this.selectionRect.style.top = `${minY}px`;
    this.selectionRect.style.width = `${w}px`;
    this.selectionRect.style.height = `${h}px`;
  }

  endSelection(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.selectionRect.style.display = 'none';

    let endX = this.startX;
    let endY = this.startY;

    if (e) {
      const pos = this.getPointerPos(e);
      endX = pos.canvasX;
      endY = pos.canvasY;
    }

    const rectX = Math.round(Math.min(this.startX, endX));
    const rectY = Math.round(Math.min(this.startY, endY));
    const rectW = Math.round(Math.abs(endX - this.startX));
    const rectH = Math.round(Math.abs(endY - this.startY));

    // Minimum area to avoid accidental tiny clicks
    if (rectW < 4 || rectH < 4) return;

    // Save snapshot for undo
    this.pushHistory();

    // Apply redaction
    this.applyRedaction(rectX, rectY, rectW, rectH);
  }

  pushHistory() {
    if (this.history.length >= this.maxHistory) {
      this.history.shift();
    }
    const snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(snapshot);
    this.updateUndoButton();
  }

  undo() {
    if (this.history.length === 0) return;
    const previous = this.history.pop();
    this.ctx.putImageData(previous, 0, 0);
    this.updateUndoButton();
    this.app.showToast('Undid last redaction', 'info', 1500);
  }

  updateUndoButton() {
    this.undoBtn.disabled = this.history.length === 0;
  }

  applyRedaction(x, y, w, h) {
    const ctx = this.ctx;

    if (this.style === 'blackout') {
      // Solid black censor bar
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, w, h);
    } else if (this.style === 'mosaic') {
      // Pixelate / Mosaic effect
      const block = Math.max(4, this.intensity);
      const smallW = Math.max(1, Math.floor(w / block));
      const smallH = Math.max(1, Math.floor(h / block));

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = smallW;
      tempCanvas.height = smallH;
      const tempCtx = tempCanvas.getContext('2d');

      tempCtx.drawImage(this.canvas, x, y, w, h, 0, 0, smallW, smallH);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, x, y, w, h);
      ctx.imageSmoothingEnabled = true;
    } else {
      // Gaussian Blur effect
      const blurRadius = Math.max(4, this.intensity);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.filter = `blur(${blurRadius}px)`;
      // Redraw canvas with blur inside the clipped region
      ctx.drawImage(this.canvas, 0, 0);
      ctx.restore();
    }
  }

  async downloadCleanImage() {
    if (!this.currentImage) return;

    try {
      const mime = this.exportFormat || 'image/png';
      const quality = mime === 'image/jpeg' ? 0.95 : 1.0;
      const blob = await canvasToBlob(this.canvas, mime, quality);

      const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
      const baseName = this.currentImage.file.name.substring(0, this.currentImage.file.name.lastIndexOf('.')) || 'redacted-image';
      const filename = `${baseName}-redacted.${ext}`;

      downloadBlob(blob, filename);
      this.app.showToast(`Downloaded clean redacted image (${formatBytes(blob.size)})!`, 'success');
    } catch (err) {
      console.error('Redacted download error:', err);
      this.app.showToast(`Export failed: ${err.message}`, 'error');
    }
  }
}
