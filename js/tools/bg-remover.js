/**
 * ============================================================================
 * Tool 8: Background Remover & Backdrop Studio
 * 100% Client-Side Privacy: In-Browser Neural AI + Smart Color Keyer
 * Zero-Server, 100% Offline-Capable, Interactive Touch-Up & Backdrop Studio
 * ============================================================================
 */

import {
  loadImage,
  canvasToBlob,
  downloadBlob,
  formatBytes,
  drawImageOnCanvas
} from '../utils/image-engine.js';

let imglyRemoveBackground = null;

export class BackgroundRemoverTool {
  constructor(app) {
    this.app = app;
    this.currentImage = null; // { img, width, height, file, name }
    this.engineMode = 'ai'; // 'ai' or 'keyer'
    
    // Keyer State
    this.colorKeyTarget = { r: 255, g: 255, b: 255, hex: '#FFFFFF' };
    this.tolerance = 32; // 0 - 100
    this.feather = 4; // 0 - 20
    this.edgeInset = 0; // -5 to +5
    this.eyedropperActive = false;
    this.keyerContiguous = true; // Protects subject & face from being cut out
    this.lastSamplePoint = null;
    
    // Brush / Touch-Up State
    this.brushMode = 'none'; // 'none', 'restore', 'erase'
    this.brushSize = 28; // 6 to 120
    this.brushHardness = 0.75;
    this.isDrawing = false;
    this.history = []; // Mask snapshots for Undo
    this.maxHistory = 20;

    // Backdrop State
    this.backdropType = 'transparent'; // 'transparent', 'color', 'gradient', 'blur', 'image'
    this.backdropColor = '#FFFFFF';
    this.blurRadius = 16; // 0 to 30
    this.customBackdropImg = null;

    // AI Execution State
    this.isAiProcessing = false;

    // Offscreen Buffers
    this.origCanvas = document.createElement('canvas');
    this.origCtx = this.origCanvas.getContext('2d', { willReadFrequently: true });
    
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });

    this.initDOMElements();
    this.bindEvents();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-bg-remover');
    this.dropzone = document.getElementById('bgrem-dropzone');
    this.fileInput = document.getElementById('bgrem-file-input');
    this.workspace = document.getElementById('bgrem-workspace');

    // Canvas Stage
    this.viewport = document.getElementById('bgrem-viewport');
    this.canvasWrapper = document.getElementById('bgrem-canvas-wrapper');
    this.canvas = document.getElementById('bgrem-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.brushCursor = document.getElementById('bgrem-brush-cursor');

    // Mode Selector
    this.modeAiBtn = document.getElementById('bgrem-mode-ai-btn');
    this.modeKeyerBtn = document.getElementById('bgrem-mode-keyer-btn');
    this.sectionAi = document.getElementById('bgrem-section-ai');
    this.sectionKeyer = document.getElementById('bgrem-section-keyer');

    // AI Controls
    this.runAiBtn = document.getElementById('bgrem-run-ai-btn');
    this.aiProgressBox = document.getElementById('bgrem-ai-progress-box');
    this.aiProgressBar = document.getElementById('bgrem-ai-progress-bar');
    this.aiProgressText = document.getElementById('bgrem-ai-progress-text');

    // Keyer Controls
    this.toleranceSlider = document.getElementById('bgrem-tolerance-slider');
    this.toleranceVal = document.getElementById('bgrem-tolerance-val');
    this.featherSlider = document.getElementById('bgrem-feather-slider');
    this.featherVal = document.getElementById('bgrem-feather-val');
    this.edgeInsetSlider = document.getElementById('bgrem-edge-inset-slider');
    this.edgeInsetVal = document.getElementById('bgrem-edge-inset-val');
    this.eyedropperBtn = document.getElementById('bgrem-eyedropper-btn');
    this.keyColorPreview = document.getElementById('bgrem-key-color-preview');
    this.autoDetectColorBtn = document.getElementById('bgrem-auto-detect-btn');
    this.contiguousCheck = document.getElementById('bgrem-contiguous-check');

    // Touch-Up Brushes
    this.brushNoneBtn = document.getElementById('bgrem-brush-none-btn');
    this.brushRestoreBtn = document.getElementById('bgrem-brush-restore-btn');
    this.brushEraseBtn = document.getElementById('bgrem-brush-erase-btn');
    this.brushSizeSlider = document.getElementById('bgrem-brush-size-slider');
    this.brushSizeVal = document.getElementById('bgrem-brush-size-val');
    this.undoBtn = document.getElementById('bgrem-undo-btn');
    this.resetMaskBtn = document.getElementById('bgrem-reset-mask-btn');

    // Backdrop Stage Controls
    this.backdropBtns = document.querySelectorAll('.bgrem-backdrop-btn');
    this.colorPaletteWrap = document.getElementById('bgrem-color-palette-wrap');
    this.colorSwatches = document.querySelectorAll('.bgrem-color-swatch');
    this.customColorInput = document.getElementById('bgrem-custom-color-input');
    this.blurControlWrap = document.getElementById('bgrem-blur-control-wrap');
    this.blurSlider = document.getElementById('bgrem-blur-slider');
    this.blurVal = document.getElementById('bgrem-blur-val');
    this.customImgWrap = document.getElementById('bgrem-custom-img-wrap');
    this.customImgInput = document.getElementById('bgrem-custom-img-input');
    this.customImgUploadBtn = document.getElementById('bgrem-custom-img-upload-btn');

    // Actions & Compare
    this.compareBtn = document.getElementById('bgrem-compare-btn');
    this.changePhotoBtn = document.getElementById('bgrem-change-photo-btn');
    this.formatSelect = document.getElementById('bgrem-format-select');
    this.downloadBtn = document.getElementById('bgrem-download-btn');
    this.copyBtn = document.getElementById('bgrem-copy-btn');
    this.sendPassportBtn = document.getElementById('bgrem-send-passport-btn');
    this.metaResolution = document.getElementById('bgrem-meta-resolution');
    this.metaFilename = document.getElementById('bgrem-meta-filename');
  }

  bindEvents() {
    // Dropzone Events
    if (this.dropzone) {
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

      this.dropzone.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.loadFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    if (this.changePhotoBtn) {
      this.changePhotoBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    // Engine Mode Switching
    if (this.modeAiBtn && this.modeKeyerBtn) {
      this.modeAiBtn.addEventListener('click', () => this.switchEngineMode('ai'));
      this.modeKeyerBtn.addEventListener('click', () => this.switchEngineMode('keyer'));
    }

    // AI Run Button
    if (this.runAiBtn) {
      this.runAiBtn.addEventListener('click', () => this.executeAiCutout());
    }

    // Keyer Controls
    if (this.toleranceSlider) {
      this.toleranceSlider.addEventListener('input', (e) => {
        this.tolerance = parseInt(e.target.value, 10);
        if (this.toleranceVal) this.toleranceVal.textContent = `${this.tolerance}%`;
        this.updateKeyerMask();
      });
    }

    if (this.featherSlider) {
      this.featherSlider.addEventListener('input', (e) => {
        this.feather = parseInt(e.target.value, 10);
        if (this.featherVal) this.featherVal.textContent = `${this.feather}px`;
        this.updateKeyerMask();
      });
    }

    if (this.edgeInsetSlider) {
      this.edgeInsetSlider.addEventListener('input', (e) => {
        this.edgeInset = parseInt(e.target.value, 10);
        if (this.edgeInsetVal) {
          this.edgeInsetVal.textContent = this.edgeInset > 0 ? `+${this.edgeInset}px` : `${this.edgeInset}px`;
        }
        this.updateKeyerMask();
      });
    }

    if (this.eyedropperBtn) {
      this.eyedropperBtn.addEventListener('click', () => {
        this.toggleEyedropper();
      });
    }

    if (this.autoDetectColorBtn) {
      this.autoDetectColorBtn.addEventListener('click', () => {
        this.autoDetectBackgroundColor();
        this.updateKeyerMask();
        this.app.showToast('Auto-detected background color from corners', 'info', 2000);
      });
    }

    if (this.contiguousCheck) {
      this.contiguousCheck.addEventListener('change', (e) => {
        this.keyerContiguous = e.target.checked;
        this.updateKeyerMask();
        this.app.showToast(
          this.keyerContiguous ? 'Subject Protection Active (Border flood-fill)' : 'Global Color Key Active',
          'info',
          1800
        );
      });
    }

    // Touch-Up Brushes
    const brushBtns = [
      { el: this.brushNoneBtn, mode: 'none' },
      { el: this.brushRestoreBtn, mode: 'restore' },
      { el: this.brushEraseBtn, mode: 'erase' }
    ];

    brushBtns.forEach(({ el, mode }) => {
      if (el) {
        el.addEventListener('click', () => {
          brushBtns.forEach(b => b.el && b.el.classList.remove('active'));
          el.classList.add('active');
          this.setBrushMode(mode);
        });
      }
    });

    if (this.brushSizeSlider) {
      this.brushSizeSlider.addEventListener('input', (e) => {
        this.brushSize = parseInt(e.target.value, 10);
        if (this.brushSizeVal) this.brushSizeVal.textContent = `${this.brushSize}px`;
        this.updateBrushCursorSize();
      });
    }

    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => this.undo());
    }

    if (this.resetMaskBtn) {
      this.resetMaskBtn.addEventListener('click', () => {
        if (confirm('Reset all cutouts and brush touch-ups to original?')) {
          this.resetToOriginalMask();
        }
      });
    }

    // Backdrop Mode Switcher
    if (this.backdropBtns) {
      this.backdropBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          this.backdropBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const type = btn.getAttribute('data-backdrop');
          this.setBackdropType(type);
        });
      });
    }

    // Solid Color Swatches
    if (this.colorSwatches) {
      this.colorSwatches.forEach((swatch) => {
        swatch.addEventListener('click', () => {
          this.colorSwatches.forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          this.backdropColor = swatch.getAttribute('data-color');
          if (this.customColorInput) this.customColorInput.value = this.backdropColor;
          this.renderComposite();
        });
      });
    }

    if (this.customColorInput) {
      this.customColorInput.addEventListener('input', (e) => {
        this.backdropColor = e.target.value;
        this.colorSwatches.forEach(s => s.classList.remove('active'));
        this.renderComposite();
      });
    }

    if (this.blurSlider) {
      this.blurSlider.addEventListener('input', (e) => {
        this.blurRadius = parseInt(e.target.value, 10);
        if (this.blurVal) this.blurVal.textContent = `${this.blurRadius}px`;
        this.renderComposite();
      });
    }

    if (this.customImgUploadBtn && this.customImgInput) {
      this.customImgUploadBtn.addEventListener('click', () => {
        this.customImgInput.click();
      });

      this.customImgInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const loaded = await loadImage(e.target.files[0]);
            this.customBackdropImg = loaded.img;
            this.app.showToast('Loaded custom backdrop photo', 'success', 2200);
            this.renderComposite();
          } catch (err) {
            this.app.showToast('Failed to load custom backdrop: ' + err.message, 'error');
          }
          e.target.value = '';
        }
      });
    }

    // Canvas Interactive Events (Eyedropper & Brushes)
    this.bindCanvasInteraction();

    // Compare / View Original Button (Hold to view original)
    if (this.compareBtn) {
      const showOriginal = () => {
        if (!this.currentImage) return;
        this.ctx.drawImage(this.origCanvas, 0, 0, this.canvas.width, this.canvas.height);
      };
      const showCutout = () => {
        if (!this.currentImage) return;
        this.renderComposite();
      };

      this.compareBtn.addEventListener('mousedown', showOriginal);
      this.compareBtn.addEventListener('mouseup', showCutout);
      this.compareBtn.addEventListener('mouseleave', showCutout);
      this.compareBtn.addEventListener('touchstart', (e) => { e.preventDefault(); showOriginal(); });
      this.compareBtn.addEventListener('touchend', (e) => { e.preventDefault(); showCutout(); });
    }

    // Export & Action Buttons
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.downloadCutout());
    }

    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    if (this.sendPassportBtn) {
      this.sendPassportBtn.addEventListener('click', () => this.sendToPassportStudio());
    }
  }

  bindCanvasInteraction() {
    if (!this.canvas) return;

    const getCanvasCoords = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top) * scaleY),
        screenX: clientX,
        screenY: clientY
      };
    };

    // Pointer move for brush cursor and eyedropper
    const onMove = (e) => {
      if (!this.currentImage) return;
      const coords = getCanvasCoords(e);

      // Update brush cursor overlay position
      if (this.brushMode !== 'none' && this.brushCursor) {
        this.brushCursor.style.display = 'block';
        const rect = this.canvas.getBoundingClientRect();
        const displayScale = rect.width / this.canvas.width;
        const curDiam = Math.max(8, this.brushSize * 2 * displayScale);

        this.brushCursor.style.width = `${curDiam}px`;
        this.brushCursor.style.height = `${curDiam}px`;
        this.brushCursor.style.left = `${coords.screenX}px`;
        this.brushCursor.style.top = `${coords.screenY}px`;
      } else if (this.brushCursor) {
        this.brushCursor.style.display = 'none';
      }

      // Drawing stroke
      if (this.isDrawing && this.brushMode !== 'none') {
        this.applyBrushStroke(coords.x, coords.y);
      }
    };

    const onDown = (e) => {
      if (!this.currentImage) return;
      const coords = getCanvasCoords(e);

      // If eyedropper is active, sample color
      if (this.eyedropperActive) {
        this.sampleColorAt(coords.x, coords.y);
        this.toggleEyedropper(false);
        this.updateKeyerMask();
        return;
      }

      // If brush is active, start stroke
      if (this.brushMode !== 'none') {
        this.saveHistory();
        this.isDrawing = true;
        this.applyBrushStroke(coords.x, coords.y);
      }
    };

    const onUp = () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.renderComposite();
      }
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    this.canvas.addEventListener('touchmove', (e) => { onMove(e); }, { passive: false });
    this.canvas.addEventListener('touchstart', (e) => { onDown(e); }, { passive: false });
    window.addEventListener('touchend', onUp);

    this.canvas.addEventListener('mouseleave', () => {
      if (this.brushCursor) this.brushCursor.style.display = 'none';
    });
  }

  async loadFile(file) {
    if (!file) return;
    try {
      this.app.showToast('Loading image into background studio...', 'info', 1800);
      const loaded = await loadImage(file);
      this.loadImageData(loaded);
    } catch (err) {
      this.app.showToast('Could not load image: ' + err.message, 'error');
    }
  }

  loadImageData(loaded) {
    this.currentImage = loaded;

    // Show workspace, hide dropzone
    if (this.dropzone) this.dropzone.style.display = 'none';
    if (this.workspace) this.workspace.style.display = 'block';

    const w = loaded.width;
    const h = loaded.height;

    // Set buffer canvas sizes
    this.origCanvas.width = w;
    this.origCanvas.height = h;
    this.origCtx.clearRect(0, 0, w, h);
    this.origCtx.drawImage(loaded.img, 0, 0, w, h);

    this.maskCanvas.width = w;
    this.maskCanvas.height = h;

    this.canvas.width = w;
    this.canvas.height = h;

    // Update metadata labels
    if (this.metaResolution) this.metaResolution.textContent = `${w} × ${h} px`;
    if (this.metaFilename) this.metaFilename.textContent = loaded.name || 'image.png';

    // Auto-detect backdrop color for keyer
    this.autoDetectBackgroundColor();

    // Clear history stack
    this.history = [];
    if (this.undoBtn) this.undoBtn.disabled = true;

    // Initialize mask to fully opaque
    this.resetToOriginalMask();

    // If engine is AI, prompt or auto-run
    if (this.engineMode === 'ai') {
      this.executeAiCutout();
    } else {
      this.updateKeyerMask();
    }

    this.app.showToast(`Loaded ${w}×${h} image ready for cutout`, 'success', 2200);
  }

  switchEngineMode(mode) {
    this.engineMode = mode;
    if (this.modeAiBtn && this.modeKeyerBtn) {
      this.modeAiBtn.classList.toggle('active', mode === 'ai');
      this.modeKeyerBtn.classList.toggle('active', mode === 'keyer');
    }

    if (this.sectionAi) this.sectionAi.style.display = mode === 'ai' ? 'block' : 'none';
    if (this.sectionKeyer) this.sectionKeyer.style.display = mode === 'keyer' ? 'block' : 'none';

    if (mode === 'keyer' && this.currentImage) {
      this.updateKeyerMask();
    }
  }

  /**
   * Execute Neural AI Cutout via in-browser WebAssembly engine (@imgly/background-removal)
   */
  async executeAiCutout() {
    if (!this.currentImage) {
      this.app.showToast('Please upload an image first', 'info');
      return;
    }
    if (this.isAiProcessing) return;

    this.isAiProcessing = true;
    if (this.runAiBtn) this.runAiBtn.disabled = true;
    if (this.aiProgressBox) this.aiProgressBox.style.display = 'block';
    this.updateAiProgress(10, 'Initializing local AI neural engine...');

    try {
      // Dynamically import @imgly/background-removal from ESM CDN on-demand
      if (!imglyRemoveBackground) {
        this.updateAiProgress(20, 'Loading WebAssembly model packages...');
        try {
          const mod = await import('https://esm.sh/@imgly/background-removal');
          imglyRemoveBackground = mod.removeBackground || mod.default?.removeBackground || mod.default;
        } catch (e1) {
          console.warn('Failed esm.sh import, trying jsdelivr...', e1);
          const mod = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm');
          imglyRemoveBackground = mod.removeBackground || mod.default?.removeBackground || mod.default;
        }
      }

      if (typeof imglyRemoveBackground !== 'function') {
        throw new Error('AI background removal module could not be initialized in this browser.');
      }

      this.updateAiProgress(40, 'Neural segmentation in progress (100% private)...');

      // Ensure input is a valid Blob or File
      let inputSource = (this.currentImage && (this.currentImage.file || this.currentImage.blob)) || null;
      if (!inputSource || !(inputSource instanceof Blob)) {
        inputSource = await canvasToBlob(this.origCanvas, 'image/png');
      }

      // Call removeBackground with progress tracking
      const resultBlob = await imglyRemoveBackground(inputSource, {
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.min(95, Math.round((current / total) * 100));
            this.updateAiProgress(pct, `Processing ${key || 'segmentation'} (${pct}%)...`);
          }
        }
      });

      this.updateAiProgress(98, 'Extracting alpha precision mask...');

      // Load resulting transparent blob and transfer alpha channel into this.maskCanvas
      const aiImg = await loadImage(resultBlob);
      this.saveHistory();

      // Extract alpha channel directly from AI cutout image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(aiImg.img, 0, 0, tempCanvas.width, tempCanvas.height);
      const aiImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const aiPixels = aiImageData.data;

      // Fill mask: white where alpha > 0, transparent where alpha == 0
      const maskImageData = this.maskCtx.createImageData(tempCanvas.width, tempCanvas.height);
      const maskPixels = maskImageData.data;
      const len = aiPixels.length;

      for (let i = 0; i < len; i += 4) {
        const a = aiPixels[i + 3];
        maskPixels[i] = 255;
        maskPixels[i + 1] = 255;
        maskPixels[i + 2] = 255;
        maskPixels[i + 3] = a; // exact alpha value from AI
      }

      this.maskCtx.putImageData(maskImageData, 0, 0);

      this.updateAiProgress(100, 'Complete! Subject cutout ready.');
      setTimeout(() => {
        if (this.aiProgressBox) this.aiProgressBox.style.display = 'none';
      }, 1500);

      this.app.showToast('Background successfully removed with Neural AI!', 'success', 2800);
      this.renderComposite();
    } catch (err) {
      console.error('AI Cutout error:', err);
      if (this.aiProgressBox) this.aiProgressBox.style.display = 'none';
      this.app.showToast(
        'AI engine notice: Switched to Smart Chroma Keyer (' + (err.message || 'Offline mode') + ')',
        'info',
        4000
      );
      // Auto-fallback to Smart Keyer mode so user is never blocked
      this.switchEngineMode('keyer');
      this.updateKeyerMask();
    } finally {
      this.isAiProcessing = false;
      if (this.runAiBtn) this.runAiBtn.disabled = false;
    }
  }

  updateAiProgress(pct, message) {
    if (this.aiProgressBar) this.aiProgressBar.style.width = `${pct}%`;
    if (this.aiProgressText) this.aiProgressText.textContent = `${pct}% — ${message}`;
  }

  /**
   * Smart Chroma / Color Range Keyer (0ms, 100% Offline TypedArray Math)
   */
  autoDetectBackgroundColor() {
    if (!this.currentImage) return;
    const w = this.origCanvas.width;
    const h = this.origCanvas.height;
    const imgData = this.origCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Sample the four corners
    const samples = [
      { x: 4, y: 4 },
      { x: Math.max(0, w - 5), y: 4 },
      { x: 4, y: Math.max(0, h - 5) },
      { x: Math.max(0, w - 5), y: Math.max(0, h - 5) },
      { x: Math.round(w / 2), y: 4 }, // top center
      { x: 4, y: Math.round(h / 2) }  // left center
    ];

    let totalR = 0, totalG = 0, totalB = 0;
    samples.forEach(pt => {
      const idx = (pt.y * w + pt.x) * 4;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
    });

    const count = samples.length;
    const r = Math.round(totalR / count);
    const g = Math.round(totalG / count);
    const b = Math.round(totalB / count);

    this.colorKeyTarget = {
      r, g, b,
      hex: this.rgbToHex(r, g, b)
    };

    if (this.keyColorPreview) {
      this.keyColorPreview.style.backgroundColor = this.colorKeyTarget.hex;
      this.keyColorPreview.title = `Sampled: ${this.colorKeyTarget.hex} (RGB: ${r}, ${g}, ${b})`;
    }
  }

  sampleColorAt(x, y) {
    const w = this.origCanvas.width;
    const h = this.origCanvas.height;
    if (x < 0 || x >= w || y < 0 || y >= h) return;

    this.lastSamplePoint = { x, y };
    const pixel = this.origCtx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];

    this.colorKeyTarget = {
      r, g, b,
      hex: this.rgbToHex(r, g, b)
    };

    if (this.keyColorPreview) {
      this.keyColorPreview.style.backgroundColor = this.colorKeyTarget.hex;
      this.keyColorPreview.title = `Sampled: ${this.colorKeyTarget.hex} (RGB: ${r}, ${g}, ${b})`;
    }
    this.app.showToast(`Sampled background color: ${this.colorKeyTarget.hex}`, 'success', 2000);
  }

  toggleEyedropper(forceState) {
    this.eyedropperActive = typeof forceState === 'boolean' ? forceState : !this.eyedropperActive;
    if (this.eyedropperBtn) {
      this.eyedropperBtn.classList.toggle('active', this.eyedropperActive);
    }
    if (this.eyedropperActive) {
      this.setBrushMode('none');
      this.canvas.style.cursor = 'crosshair';
      this.app.showToast('Click anywhere on the background to sample color', 'info', 2500);
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  updateKeyerMask() {
    if (!this.currentImage) return;

    const w = this.origCanvas.width;
    const h = this.origCanvas.height;
    const srcData = this.origCtx.getImageData(0, 0, w, h);
    const src = srcData.data;

    const maskData = this.maskCtx.createImageData(w, h);
    const mask = maskData.data;

    const tr = this.colorKeyTarget.r;
    const tg = this.colorKeyTarget.g;
    const tb = this.colorKeyTarget.b;

    // Tolerance normalized to [0..441.67] Euclidean distance
    const maxDist = 441.67;
    const tolDist = (this.tolerance / 100) * maxDist;
    const featherDist = (this.feather / 20) * (tolDist * 0.7);
    const cutoffDist = tolDist + featherDist;
    const cutoffDistSq = cutoffDist * cutoffDist;

    const numPixels = w * h;

    if (this.keyerContiguous) {
      // BORDER-CONNECTED FLOOD-FILL:
      // Prevents keying out internal areas (e.g. face, eyes, teeth, clothes).
      // Only pixels connected to the image boundaries or sampled point are treated as background.
      const isBg = new Uint8Array(numPixels);
      const queue = new Int32Array(numPixels);
      let head = 0;
      let tail = 0;

      const isMatchingColor = (idx) => {
        const pi = idx * 4;
        const dr = src[pi] - tr;
        const dg = src[pi + 1] - tg;
        const db = src[pi + 2] - tb;
        return (dr * dr + dg * dg + db * db) <= cutoffDistSq;
      };

      // Seed from all four outer image borders
      for (let x = 0; x < w; x++) {
        const topIdx = x;
        if (isMatchingColor(topIdx) && isBg[topIdx] === 0) {
          isBg[topIdx] = 1;
          queue[tail++] = topIdx;
        }
        const btmIdx = (h - 1) * w + x;
        if (isMatchingColor(btmIdx) && isBg[btmIdx] === 0) {
          isBg[btmIdx] = 1;
          queue[tail++] = btmIdx;
        }
      }

      for (let y = 1; y < h - 1; y++) {
        const leftIdx = y * w;
        if (isMatchingColor(leftIdx) && isBg[leftIdx] === 0) {
          isBg[leftIdx] = 1;
          queue[tail++] = leftIdx;
        }
        const rightIdx = y * w + (w - 1);
        if (isMatchingColor(rightIdx) && isBg[rightIdx] === 0) {
          isBg[rightIdx] = 1;
          queue[tail++] = rightIdx;
        }
      }

      // If user clicked with eyedropper, seed from that coordinate as well
      if (this.lastSamplePoint) {
        const sx = Math.max(0, Math.min(w - 1, this.lastSamplePoint.x));
        const sy = Math.max(0, Math.min(h - 1, this.lastSamplePoint.y));
        const sIdx = sy * w + sx;
        if (isMatchingColor(sIdx) && isBg[sIdx] === 0) {
          isBg[sIdx] = 1;
          queue[tail++] = sIdx;
        }
      }

      // BFS flood-fill across connected background
      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = (curr / w) | 0;

        if (cy > 0) {
          const up = curr - w;
          if (isBg[up] === 0 && isMatchingColor(up)) {
            isBg[up] = 1;
            queue[tail++] = up;
          }
        }
        if (cy < h - 1) {
          const dn = curr + w;
          if (isBg[dn] === 0 && isMatchingColor(dn)) {
            isBg[dn] = 1;
            queue[tail++] = dn;
          }
        }
        if (cx > 0) {
          const lf = curr - 1;
          if (isBg[lf] === 0 && isMatchingColor(lf)) {
            isBg[lf] = 1;
            queue[tail++] = lf;
          }
        }
        if (cx < w - 1) {
          const rt = curr + 1;
          if (isBg[rt] === 0 && isMatchingColor(rt)) {
            isBg[rt] = 1;
            queue[tail++] = rt;
          }
        }
      }

      // Generate mask based on flood-fill result
      for (let i = 0; i < numPixels; i++) {
        const mi = i * 4;
        mask[mi] = 255;
        mask[mi + 1] = 255;
        mask[mi + 2] = 255;

        if (isBg[i] === 1) {
          // Connected to background: calculate alpha with feathering
          const dr = src[mi] - tr;
          const dg = src[mi + 1] - tg;
          const db = src[mi + 2] - tb;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);

          if (dist <= tolDist - featherDist) {
            mask[mi + 3] = 0; // Transparent
          } else if (dist < tolDist + featherDist && featherDist > 0) {
            const factor = (dist - (tolDist - featherDist)) / (featherDist * 2);
            mask[mi + 3] = Math.max(0, Math.min(255, Math.round(factor * 255)));
          } else {
            mask[mi + 3] = 255;
          }
        } else {
          // Inside subject (e.g. face, clothes, teeth) -> 100% OPAQUE FOREGROUND!
          mask[mi + 3] = 255;
        }
      }
    } else {
      // GLOBAL MODE (all matching pixels keyed)
      for (let i = 0; i < numPixels; i++) {
        const mi = i * 4;
        const r = src[mi];
        const g = src[mi + 1];
        const b = src[mi + 2];

        const dr = r - tr;
        const dg = g - tg;
        const db = b - tb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        mask[mi] = 255;
        mask[mi + 1] = 255;
        mask[mi + 2] = 255;

        if (dist <= tolDist - featherDist) {
          mask[mi + 3] = 0;
        } else if (dist < tolDist + featherDist && featherDist > 0) {
          const factor = (dist - (tolDist - featherDist)) / (featherDist * 2);
          mask[mi + 3] = Math.max(0, Math.min(255, Math.round(factor * 255)));
        } else {
          mask[mi + 3] = 255;
        }
      }
    }

    this.maskCtx.putImageData(maskData, 0, 0);
    this.renderComposite();
  }

  /**
   * Touch-Up Brushes (Restore & Erase)
   */
  setBrushMode(mode) {
    this.brushMode = mode;
    if (mode !== 'none') {
      this.toggleEyedropper(false);
      this.canvas.style.cursor = 'none';
      if (this.brushCursor) this.brushCursor.style.display = 'block';
      this.updateBrushCursorSize();
    } else {
      this.canvas.style.cursor = 'default';
      if (this.brushCursor) this.brushCursor.style.display = 'none';
    }
  }

  updateBrushCursorSize() {
    if (!this.brushCursor || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const displayScale = rect.width / this.canvas.width;
    const diam = Math.max(8, this.brushSize * 2 * displayScale);
    this.brushCursor.style.width = `${diam}px`;
    this.brushCursor.style.height = `${diam}px`;
  }

  applyBrushStroke(x, y) {
    const r = this.brushSize;
    this.maskCtx.save();

    if (this.brushMode === 'erase') {
      // Remove from mask (make transparent)
      this.maskCtx.globalCompositeOperation = 'destination-out';
      const grad = this.maskCtx.createRadialGradient(x, y, r * (1 - this.brushHardness), x, y, r);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.maskCtx.fillStyle = grad;
      this.maskCtx.beginPath();
      this.maskCtx.arc(x, y, r, 0, Math.PI * 2);
      this.maskCtx.fill();
    } else if (this.brushMode === 'restore') {
      // Add back to mask (restore original foreground)
      this.maskCtx.globalCompositeOperation = 'source-over';
      const grad = this.maskCtx.createRadialGradient(x, y, r * (1 - this.brushHardness), x, y, r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.maskCtx.fillStyle = grad;
      this.maskCtx.beginPath();
      this.maskCtx.arc(x, y, r, 0, Math.PI * 2);
      this.maskCtx.fill();
    }

    this.maskCtx.restore();
    this.renderComposite();
  }

  saveHistory() {
    const w = this.maskCanvas.width;
    const h = this.maskCanvas.height;
    if (this.history.length >= this.maxHistory) {
      this.history.shift();
    }
    this.history.push(this.maskCtx.getImageData(0, 0, w, h));
    if (this.undoBtn) this.undoBtn.disabled = false;
  }

  undo() {
    if (this.history.length === 0) return;
    const prev = this.history.pop();
    this.maskCtx.putImageData(prev, 0, 0);
    this.renderComposite();
    if (this.undoBtn) this.undoBtn.disabled = this.history.length === 0;
    this.app.showToast('Undid last mask action', 'info', 1500);
  }

  resetToOriginalMask() {
    const w = this.maskCanvas.width;
    const h = this.maskCanvas.height;
    this.maskCtx.fillStyle = '#FFFFFF';
    this.maskCtx.fillRect(0, 0, w, h);
    this.renderComposite();
  }

  /**
   * Backdrop Stage
   */
  setBackdropType(type) {
    this.backdropType = type;

    // Toggle controls visibility
    if (this.colorPaletteWrap) {
      this.colorPaletteWrap.style.display = type === 'color' ? 'flex' : 'none';
    }
    if (this.blurControlWrap) {
      this.blurControlWrap.style.display = type === 'blur' ? 'flex' : 'none';
    }
    if (this.customImgWrap) {
      this.customImgWrap.style.display = type === 'image' ? 'flex' : 'none';
    }

    // Toggle checkerboard CSS on viewport
    if (this.canvasWrapper) {
      if (type === 'transparent') {
        this.canvasWrapper.classList.add('bg-checkerboard');
      } else {
        this.canvasWrapper.classList.remove('bg-checkerboard');
      }
    }

    this.renderComposite();
  }

  /**
   * Master Rendering Pipeline: Backdrop + Cutout Subject
   */
  renderComposite() {
    if (!this.currentImage) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    // 1. Draw Selected Backdrop
    if (this.backdropType === 'color') {
      this.ctx.fillStyle = this.backdropColor || '#FFFFFF';
      this.ctx.fillRect(0, 0, w, h);
    } else if (this.backdropType === 'gradient') {
      const grad = this.ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(1, '#D8E2DC');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, w, h);
    } else if (this.backdropType === 'blur') {
      this.ctx.save();
      this.ctx.filter = `blur(${this.blurRadius}px)`;
      this.ctx.drawImage(this.origCanvas, -10, -10, w + 20, h + 20);
      this.ctx.restore();
    } else if (this.backdropType === 'image' && this.customBackdropImg) {
      // Draw custom background covering canvas
      this.ctx.save();
      const bw = this.customBackdropImg.width;
      const bh = this.customBackdropImg.height;
      const scale = Math.max(w / bw, h / bh);
      const dw = bw * scale;
      const dh = bh * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      this.ctx.drawImage(this.customBackdropImg, dx, dy, dw, dh);
      this.ctx.restore();
    }

    // 2. Composite Foreground Cutout using Mask
    const fgBuffer = document.createElement('canvas');
    fgBuffer.width = w;
    fgBuffer.height = h;
    const fgCtx = fgBuffer.getContext('2d');

    // Draw original image
    fgCtx.drawImage(this.origCanvas, 0, 0, w, h);

    // Apply alpha mask
    fgCtx.globalCompositeOperation = 'destination-in';
    fgCtx.drawImage(this.maskCanvas, 0, 0, w, h);

    // 3. Draw Cutout Subject onto Master Display Canvas
    this.ctx.drawImage(fgBuffer, 0, 0, w, h);
  }

  /**
   * Export Pipeline: PNG, WebP, JPEG & Clipboard
   */
  async downloadCutout() {
    if (!this.currentImage) return;

    const format = this.formatSelect ? this.formatSelect.value : 'image/png';
    const ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
    const quality = format === 'image/png' ? 1.0 : 0.94;

    try {
      this.app.showToast('Generating high-res export...', 'info', 1500);
      const blob = await canvasToBlob(this.canvas, format, quality);
      const baseName = (this.currentImage.name || 'image').replace(/\.[^/.]+$/, '');
      const filename = `${baseName}-cutout.${ext}`;

      downloadBlob(blob, filename);
      this.app.showToast(`Downloaded ${filename} (${formatBytes(blob.size)})`, 'success', 2800);
    } catch (err) {
      this.app.showToast('Export failed: ' + err.message, 'error');
    }
  }

  async copyToClipboard() {
    if (!this.currentImage) return;

    if (!navigator.clipboard || !window.ClipboardItem) {
      this.app.showToast('Clipboard image copying is not supported in this browser', 'error');
      return;
    }

    try {
      this.app.showToast('Copying transparent PNG to clipboard...', 'info', 1500);
      const blob = await canvasToBlob(this.canvas, 'image/png', 1.0);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      this.app.showToast('Copied cutout image to clipboard! Ready to paste.', 'success', 2800);
    } catch (err) {
      this.app.showToast('Could not copy image: ' + err.message, 'error');
    }
  }

  async sendToPassportStudio() {
    if (!this.currentImage) return;
    try {
      const blob = await canvasToBlob(this.canvas, 'image/png', 1.0);
      const file = new File([blob], `${this.currentImage.name || 'cutout'}-passport.png`, {
        type: 'image/png',
        lastModified: Date.now()
      });

      window.location.hash = '#passport';
      setTimeout(() => {
        if (this.app.passport) {
          this.app.passport.loadImage(file);
          this.app.showToast('Transferred cutout subject to Passport & ID Studio!', 'success', 2800);
        }
      }, 150);
    } catch (err) {
      this.app.showToast('Failed to transfer to Passport Studio: ' + err.message, 'error');
    }
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
}
