/**
 * ============================================================================
 * Tool 6: Job Portal Signature Cleaner & Watermark Studio
 * 100% Client-Side Background Removal, Binarization & Watermark Engine
 * ============================================================================
 */

import {
  loadImage,
  canvasToBlob,
  targetKBBinarySearch,
  downloadBlob,
  formatBytes,
  drawImageOnCanvas
} from '../utils/image-engine.js';

export class SignatureMakerTool {
  constructor(app) {
    this.app = app;
    this.activeSubtab = 'cleaner'; // 'cleaner' or 'watermark'

    // Tab A: Signature Cleaner State
    this.sigInputMode = 'upload'; // 'upload' or 'draw'
    this.sigSourceImage = null; // { img, width, height, file }
    this.sigThreshold = 190;
    this.sigOutputFormat = 'image/png'; // 'image/png' (transparent) or 'image/jpeg' (white)
    this.sigInvert = false;
    this.sigTargetW = 300;
    this.sigTargetH = 80;
    this.sigMaxKB = 60;
    this.isDrawingPad = false;

    // Tab B: Watermark State
    this.wmSourceImage = null;
    this.wmType = 'text'; // 'text' or 'logo'
    this.wmText = 'CONFIDENTIAL';
    this.wmColor = '#ffffff';
    this.wmFontSize = 36;
    this.wmOpacity = 0.5;
    this.wmRotation = -45;
    this.wmPosition = 'tiled'; // 'tiled', 'center', 'bottom-right', 'top-right'
    this.wmLogoImage = null;
    this.wmLogoScale = 0.25;

    this.initDOMElements();
    this.bindEvents();
    this.initSignaturePad();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-signature');

    // Subtab switchers
    this.subtabCleanerBtn = document.getElementById('sig-subtab-cleaner');
    this.subtabWatermarkBtn = document.getElementById('sig-subtab-watermark');
    this.sectionCleaner = document.getElementById('sig-section-cleaner');
    this.sectionWatermark = document.getElementById('sig-section-watermark');

    // Tab A: Signature Cleaner Elements
    this.sigModeUploadBtn = document.getElementById('sig-mode-upload');
    this.sigModeDrawBtn = document.getElementById('sig-mode-draw');
    this.sigUploadArea = document.getElementById('sig-upload-area');
    this.sigDrawArea = document.getElementById('sig-draw-area');
    this.sigDropzone = document.getElementById('sig-dropzone');
    this.sigFileInput = document.getElementById('sig-file-input');

    this.padCanvas = document.getElementById('sig-pad-canvas');
    this.padCtx = this.padCanvas ? this.padCanvas.getContext('2d') : null;
    this.clearPadBtn = document.getElementById('sig-pad-clear-btn');
    this.padColorSelect = document.getElementById('sig-pad-color');
    this.padWidthSlider = document.getElementById('sig-pad-width');

    this.thresholdSlider = document.getElementById('sig-threshold-slider');
    this.thresholdVal = document.getElementById('sig-threshold-val');
    this.sigFormatSelect = document.getElementById('sig-format-select');
    this.invertToggle = document.getElementById('sig-invert-toggle');

    this.presetChips = document.querySelectorAll('.sig-preset-chip');
    this.customWidthInput = document.getElementById('sig-custom-width');
    this.customHeightInput = document.getElementById('sig-custom-height');
    this.customMaxKBInput = document.getElementById('sig-custom-maxkb');

    this.sigPreviewCanvas = document.getElementById('sig-preview-canvas');
    this.sigPreviewCtx = this.sigPreviewCanvas ? this.sigPreviewCanvas.getContext('2d') : null;
    this.sigMetaBadge = document.getElementById('sig-meta-badge');
    this.sigDownloadBtn = document.getElementById('sig-download-btn');

    // Tab B: Watermark Elements
    this.wmDropzone = document.getElementById('wm-dropzone');
    this.wmFileInput = document.getElementById('wm-file-input');
    this.wmWorkspace = document.getElementById('wm-workspace');
    this.wmCanvas = document.getElementById('wm-canvas');
    this.wmCtx = this.wmCanvas ? this.wmCanvas.getContext('2d') : null;

    this.wmTypeTextBtn = document.getElementById('wm-type-text');
    this.wmTypeLogoBtn = document.getElementById('wm-type-logo');
    this.wmTextGroup = document.getElementById('wm-text-group');
    this.wmLogoGroup = document.getElementById('wm-logo-group');

    this.wmTextInput = document.getElementById('wm-text-input');
    this.wmColorPicker = document.getElementById('wm-color-picker');
    this.wmFontSizeSlider = document.getElementById('wm-font-size-slider');
    this.wmFontSizeVal = document.getElementById('wm-font-size-val');
    this.wmOpacitySlider = document.getElementById('wm-opacity-slider');
    this.wmOpacityVal = document.getElementById('wm-opacity-val');
    this.wmRotationSlider = document.getElementById('wm-rotation-slider');
    this.wmRotationVal = document.getElementById('wm-rotation-val');
    this.wmPositionSelect = document.getElementById('wm-position-select');

    this.wmLogoFileInput = document.getElementById('wm-logo-file-input');
    this.wmLogoScaleSlider = document.getElementById('wm-logo-scale-slider');
    this.wmDownloadBtn = document.getElementById('wm-download-btn');
  }

  bindEvents() {
    // Subtab switching
    this.subtabCleanerBtn.addEventListener('click', () => this.switchSubtab('cleaner'));
    this.subtabWatermarkBtn.addEventListener('click', () => this.switchSubtab('watermark'));

    // --- Tab A: Signature Cleaner Events ---
    this.sigModeUploadBtn.addEventListener('click', () => this.setSigInputMode('upload'));
    this.sigModeDrawBtn.addEventListener('click', () => this.setSigInputMode('draw'));

    // Upload Dropzone
    this.sigDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.sigDropzone.classList.add('dragover');
    });
    this.sigDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.sigDropzone.classList.remove('dragover');
    });
    this.sigDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.sigDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadSignatureFile(e.dataTransfer.files[0]);
      }
    });

    this.sigFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.loadSignatureFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Threshold & Settings
    this.thresholdSlider.addEventListener('input', (e) => {
      this.sigThreshold = parseInt(e.target.value, 10);
      this.thresholdVal.textContent = this.sigThreshold;
      this.renderSignaturePreview();
    });

    this.sigFormatSelect.addEventListener('change', (e) => {
      this.sigOutputFormat = e.target.value;
      this.renderSignaturePreview();
    });

    this.invertToggle.addEventListener('change', (e) => {
      this.sigInvert = e.target.checked;
      this.renderSignaturePreview();
    });

    // Presets
    this.presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.presetChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const w = parseInt(chip.dataset.w, 10);
        const h = parseInt(chip.dataset.h, 10);
        const kb = parseInt(chip.dataset.kb, 10);
        this.sigTargetW = w;
        this.sigTargetH = h;
        this.sigMaxKB = kb;
        this.customWidthInput.value = w;
        this.customHeightInput.value = h;
        this.customMaxKBInput.value = kb;
        this.renderSignaturePreview();
      });
    });

    this.customWidthInput.addEventListener('input', (e) => {
      this.sigTargetW = parseInt(e.target.value, 10) || 300;
      this.renderSignaturePreview();
    });
    this.customHeightInput.addEventListener('input', (e) => {
      this.sigTargetH = parseInt(e.target.value, 10) || 80;
      this.renderSignaturePreview();
    });
    this.customMaxKBInput.addEventListener('input', (e) => {
      this.sigMaxKB = parseInt(e.target.value, 10) || 60;
    });

    this.sigDownloadBtn.addEventListener('click', () => this.downloadCleanSignature());

    // --- Tab B: Watermark Events ---
    this.wmDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.wmDropzone.classList.add('dragover');
    });
    this.wmDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.wmDropzone.classList.remove('dragover');
    });
    this.wmDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.wmDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadWatermarkSource(e.dataTransfer.files[0]);
      }
    });
    this.wmFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.loadWatermarkSource(e.target.files[0]);
        e.target.value = '';
      }
    });

    this.wmTypeTextBtn.addEventListener('click', () => this.setWatermarkType('text'));
    this.wmTypeLogoBtn.addEventListener('click', () => this.setWatermarkType('logo'));

    this.wmTextInput.addEventListener('input', (e) => {
      this.wmText = e.target.value;
      this.renderWatermark();
    });
    this.wmColorPicker.addEventListener('input', (e) => {
      this.wmColor = e.target.value;
      this.renderWatermark();
    });
    this.wmFontSizeSlider.addEventListener('input', (e) => {
      this.wmFontSize = parseInt(e.target.value, 10);
      this.wmFontSizeVal.textContent = `${this.wmFontSize}px`;
      this.renderWatermark();
    });
    this.wmOpacitySlider.addEventListener('input', (e) => {
      this.wmOpacity = parseInt(e.target.value, 10) / 100;
      this.wmOpacityVal.textContent = `${e.target.value}%`;
      this.renderWatermark();
    });
    this.wmRotationSlider.addEventListener('input', (e) => {
      this.wmRotation = parseInt(e.target.value, 10);
      this.wmRotationVal.textContent = `${this.wmRotation}°`;
      this.renderWatermark();
    });
    this.wmPositionSelect.addEventListener('change', (e) => {
      this.wmPosition = e.target.value;
      this.renderWatermark();
    });

    this.wmLogoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.loadLogoImage(e.target.files[0]);
      }
    });
    this.wmLogoScaleSlider.addEventListener('input', (e) => {
      this.wmLogoScale = parseInt(e.target.value, 10) / 100;
      this.renderWatermark();
    });

    this.wmDownloadBtn.addEventListener('click', () => this.downloadWatermarkedImage());
  }

  switchSubtab(tab) {
    this.activeSubtab = tab;
    this.subtabCleanerBtn.classList.toggle('active', tab === 'cleaner');
    this.subtabWatermarkBtn.classList.toggle('active', tab === 'watermark');
    this.sectionCleaner.style.display = tab === 'cleaner' ? 'block' : 'none';
    this.sectionWatermark.style.display = tab === 'watermark' ? 'block' : 'none';
  }

  setSigInputMode(mode) {
    this.sigInputMode = mode;
    this.sigModeUploadBtn.classList.toggle('active', mode === 'upload');
    this.sigModeDrawBtn.classList.toggle('active', mode === 'draw');
    this.sigUploadArea.style.display = mode === 'upload' ? 'block' : 'none';
    this.sigDrawArea.style.display = mode === 'draw' ? 'block' : 'none';

    if (mode === 'draw') {
      this.renderSignaturePreview();
    }
  }

  initSignaturePad() {
    if (!this.padCanvas) return;
    const canvas = this.padCanvas;
    const ctx = this.padCtx;

    // Resize pad
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = 220;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';

    const getPos = (e) => {
      const b = canvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      return {
        x: clientX - b.left,
        y: clientY - b.top
      };
    };

    const startDraw = (e) => {
      this.isDrawingPad = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawingPad) return;
      const pos = getPos(e);
      ctx.strokeStyle = this.padColorSelect.value || '#000000';
      ctx.lineWidth = parseInt(this.padWidthSlider.value, 10) || 3;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDraw = () => {
      if (this.isDrawingPad) {
        this.isDrawingPad = false;
        ctx.closePath();
        this.renderSignaturePreview();
      }
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDraw(e);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      draw(e);
    }, { passive: false });
    window.addEventListener('touchend', stopDraw);

    this.clearPadBtn.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.renderSignaturePreview();
      this.app.showToast('Signature pad cleared', 'info', 1500);
    });
  }

  async loadSignatureFile(file) {
    try {
      const imgData = await loadImage(file);
      this.sigSourceImage = {
        img: imgData.img,
        width: imgData.width,
        height: imgData.height,
        file
      };
      this.renderSignaturePreview();
      this.app.showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      this.app.showToast(`Failed to load signature: ${err.message}`, 'error');
    }
  }

  renderSignaturePreview() {
    let sourceCanvas = null;

    if (this.sigInputMode === 'draw') {
      sourceCanvas = this.padCanvas;
    } else if (this.sigSourceImage) {
      sourceCanvas = drawImageOnCanvas(
        this.sigSourceImage.img,
        this.sigSourceImage.width,
        this.sigSourceImage.height
      );
    }

    if (!sourceCanvas || !this.sigPreviewCanvas) return;

    const w = this.sigTargetW || 300;
    const h = this.sigTargetH || 80;

    // Scale to target dimensions
    const scaled = drawImageOnCanvas(sourceCanvas, w, h);
    const scaledCtx = scaled.getContext('2d');
    const imgData = scaledCtx.getImageData(0, 0, w, h);
    const d = imgData.data;

    const threshold = this.sigThreshold;
    const isPng = this.sigOutputFormat === 'image/png';
    const invert = this.sigInvert;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];

      // Luminance
      const lum = (r * 299 + g * 587 + b * 114) / 1000;

      const isBackground = invert ? lum < threshold : lum > threshold;

      if (isBackground || a < 30) {
        if (isPng) {
          d[i + 3] = 0; // transparent
        } else {
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 255;
          d[i + 3] = 255; // pure white
        }
      } else {
        // Deepen and sharpen ink color
        const inkFactor = lum / 255;
        d[i] = Math.round(r * 0.4);
        d[i + 1] = Math.round(g * 0.4);
        d[i + 2] = Math.round(b * 0.4);
        d[i + 3] = 255;
      }
    }

    this.sigPreviewCanvas.width = w;
    this.sigPreviewCanvas.height = h;
    this.sigPreviewCtx.clearRect(0, 0, w, h);
    this.sigPreviewCtx.putImageData(imgData, 0, 0);

    if (this.sigMetaBadge) {
      this.sigMetaBadge.textContent = `${w} × ${h} px · Target ≤ ${this.sigMaxKB} KB`;
    }
  }

  async downloadCleanSignature() {
    if (!this.sigPreviewCanvas) return;

    try {
      const mime = this.sigOutputFormat || 'image/png';
      const maxKB = this.sigMaxKB || 60;

      // Use target-KB binary search engine
      const result = await targetKBBinarySearch(this.sigPreviewCanvas, mime, maxKB, {
        initialWidth: this.sigTargetW,
        initialHeight: this.sigTargetH,
        bgColor: mime === 'image/jpeg' ? '#ffffff' : null
      });

      const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
      const filename = `signature-${result.width}x${result.height}.${ext}`;

      downloadBlob(result.blob, filename);
      this.app.showToast(`Downloaded clean signature (${formatBytes(result.blob.size)})!`, 'success');
    } catch (err) {
      console.error('Signature export error:', err);
      this.app.showToast(`Export failed: ${err.message}`, 'error');
    }
  }

  // --- Tab B: Watermark Methods ---
  async loadWatermarkSource(file) {
    try {
      const imgData = await loadImage(file);
      this.wmSourceImage = imgData;
      this.wmDropzone.style.display = 'none';
      this.wmWorkspace.style.display = 'grid';
      this.renderWatermark();
      this.app.showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      this.app.showToast(`Could not load image: ${err.message}`, 'error');
    }
  }

  async loadLogoImage(file) {
    try {
      const imgData = await loadImage(file);
      this.wmLogoImage = imgData;
      this.renderWatermark();
      this.app.showToast(`Loaded watermark logo: ${file.name}`, 'success');
    } catch (err) {
      this.app.showToast(`Could not load logo: ${err.message}`, 'error');
    }
  }

  setWatermarkType(type) {
    this.wmType = type;
    this.wmTypeTextBtn.classList.toggle('active', type === 'text');
    this.wmTypeLogoBtn.classList.toggle('active', type === 'logo');
    this.wmTextGroup.style.display = type === 'text' ? 'flex' : 'none';
    this.wmLogoGroup.style.display = type === 'logo' ? 'flex' : 'none';
    this.renderWatermark();
  }

  renderWatermark() {
    if (!this.wmSourceImage || !this.wmCanvas) return;

    const w = this.wmSourceImage.width;
    const h = this.wmSourceImage.height;
    this.wmCanvas.width = w;
    this.wmCanvas.height = h;

    const ctx = this.wmCtx;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.wmSourceImage.img, 0, 0);

    ctx.save();
    ctx.globalAlpha = this.wmOpacity;

    if (this.wmType === 'text') {
      const text = this.wmText || 'CONFIDENTIAL';
      ctx.fillStyle = this.wmColor;
      ctx.font = `bold ${this.wmFontSize}px Inter, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      if (this.wmPosition === 'tiled') {
        const textMetrics = ctx.measureText(text);
        const textW = textMetrics.width;
        const stepX = textW + 120;
        const stepY = this.wmFontSize + 100;

        ctx.rotate((this.wmRotation * Math.PI) / 180);

        for (let x = -w * 2; x < w * 2; x += stepX) {
          for (let y = -h * 2; y < h * 2; y += stepY) {
            ctx.fillText(text, x, y);
          }
        }
      } else {
        let posX = w / 2;
        let posY = h / 2;

        if (this.wmPosition === 'bottom-right') {
          posX = w - 140;
          posY = h - 60;
        } else if (this.wmPosition === 'top-right') {
          posX = w - 140;
          posY = 60;
        }

        ctx.translate(posX, posY);
        ctx.rotate((this.wmRotation * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
      }
    } else if (this.wmType === 'logo' && this.wmLogoImage) {
      const logo = this.wmLogoImage;
      const logoW = Math.round(w * this.wmLogoScale);
      const logoH = Math.round((logo.height / logo.width) * logoW);

      let x = (w - logoW) / 2;
      let y = (h - logoH) / 2;

      if (this.wmPosition === 'bottom-right') {
        x = w - logoW - 30;
        y = h - logoH - 30;
      } else if (this.wmPosition === 'top-right') {
        x = w - logoW - 30;
        y = 30;
      }

      ctx.drawImage(logo.img, x, y, logoW, logoH);
    }

    ctx.restore();
  }

  async downloadWatermarkedImage() {
    if (!this.wmCanvas) return;

    try {
      const blob = await canvasToBlob(this.wmCanvas, 'image/jpeg', 0.94);
      const baseName = this.wmSourceImage.file.name.substring(0, this.wmSourceImage.file.name.lastIndexOf('.')) || 'watermarked-image';
      const filename = `${baseName}-watermarked.jpg`;

      downloadBlob(blob, filename);
      this.app.showToast(`Downloaded watermarked image (${formatBytes(blob.size)})!`, 'success');
    } catch (err) {
      console.error('Watermark export error:', err);
      this.app.showToast(`Export failed: ${err.message}`, 'error');
    }
  }
}
