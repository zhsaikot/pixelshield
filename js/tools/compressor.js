/**
 * ============================================================================
 * Tool 1: Smart Compressor & Target-KB Studio
 * ============================================================================
 */

import {
  loadImage,
  formatBytes,
  calculateSavings,
  targetKBBinarySearch,
  drawImageOnCanvas,
  canvasToBlob,
  downloadBlob,
  downloadZip
} from '../utils/image-engine.js';

export class CompressorTool {
  constructor(app) {
    this.app = app;
    this.files = []; // Array of { id, file, imgData, resultBlob, resultWidth, resultHeight, savings, status, error }
    this.mode = 'quality'; // 'quality' or 'target-kb'
    
    // Settings state
    this.quality = 0.80; // 10% - 100%
    this.targetKB = 100;
    this.outputFormat = 'image/jpeg'; // 'image/jpeg', 'image/webp', 'auto'
    this.maxWidth = '';
    this.maxHeight = '';
    this.aspectRatioLocked = true;
    this.isProcessing = false;
    this.debounceTimer = null;

    this.initDOMElements();
    this.bindEvents();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-compress');
    this.dropzone = document.getElementById('compressor-dropzone');
    this.fileInput = document.getElementById('compressor-file-input');
    
    // Mode switcher buttons
    this.modeQualityBtn = document.getElementById('compressor-mode-quality');
    this.modeTargetBtn = document.getElementById('compressor-mode-target');
    this.qualityControlsSection = document.getElementById('compressor-quality-controls');
    this.targetControlsSection = document.getElementById('compressor-target-controls');

    // Quality controls
    this.qualitySlider = document.getElementById('compressor-quality-slider');
    this.qualityValBadge = document.getElementById('compressor-quality-val');
    this.formatSelect = document.getElementById('compressor-format-select');
    this.maxWidthInput = document.getElementById('compressor-max-width');
    this.maxHeightInput = document.getElementById('compressor-max-height');
    this.aspectLockBtn = document.getElementById('compressor-aspect-lock-btn');

    // Target KB controls
    this.targetKBInput = document.getElementById('compressor-target-kb-input');
    this.targetChips = document.querySelectorAll('.target-kb-chip');

    // Batch actions & stats
    this.batchActionsBar = document.getElementById('compressor-batch-actions');
    this.batchCountBadge = document.getElementById('compressor-batch-count');
    this.batchSavingsBadge = document.getElementById('compressor-batch-savings');
    this.compressAllBtn = document.getElementById('compressor-compress-all-btn');
    this.downloadZipBtn = document.getElementById('compressor-download-zip-btn');
    this.clearAllBtn = document.getElementById('compressor-clear-all-btn');
    this.renamePrefixInput = document.getElementById('compressor-rename-prefix');

    // Cards list & empty state
    this.cardsContainer = document.getElementById('compressor-cards-grid');
    this.emptyState = document.getElementById('compressor-empty-state');

    // Compare modal elements
    this.compareModal = document.getElementById('compare-modal-backdrop');
    this.compareCloseBtn = document.getElementById('compare-modal-close');
    this.compareSliderContainer = document.getElementById('compare-slider-container');
    this.compareLayerBefore = document.getElementById('compare-layer-before');
    this.compareImgBefore = document.getElementById('compare-img-before');
    this.compareImgAfter = document.getElementById('compare-img-after');
    this.compareDividerHandle = document.getElementById('compare-divider-handle');
    this.compareTagBefore = document.getElementById('compare-tag-before');
    this.compareTagAfter = document.getElementById('compare-tag-after');
    this.isComparing = false;
  }

  bindEvents() {
    // Dropzone drag & drop
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
        this.handleFiles(Array.from(e.dataTransfer.files));
      }
    });

    // File input change
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFiles(Array.from(e.target.files));
        e.target.value = ''; // reset so same files can be re-selected
      }
    });

    // Mode switching
    this.modeQualityBtn.addEventListener('click', () => this.setMode('quality'));
    this.modeTargetBtn.addEventListener('click', () => this.setMode('target-kb'));

    // Quality slider
    this.qualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.quality = val / 100;
      this.qualityValBadge.textContent = `${val}%`;
      this.triggerDebouncedBatchProcess();
    });

    // Format selector
    this.formatSelect.addEventListener('change', (e) => {
      this.outputFormat = e.target.value;
      this.triggerDebouncedBatchProcess();
    });

    // Dimension inputs
    this.maxWidthInput.addEventListener('input', (e) => {
      this.maxWidth = e.target.value ? parseInt(e.target.value, 10) : '';
      this.triggerDebouncedBatchProcess();
    });

    this.maxHeightInput.addEventListener('input', (e) => {
      this.maxHeight = e.target.value ? parseInt(e.target.value, 10) : '';
      this.triggerDebouncedBatchProcess();
    });

    // Aspect ratio lock toggle
    if (this.aspectLockBtn) {
      this.aspectLockBtn.addEventListener('click', () => {
        this.aspectRatioLocked = !this.aspectRatioLocked;
        this.aspectLockBtn.classList.toggle('active', this.aspectRatioLocked);
        this.aspectLockBtn.title = this.aspectRatioLocked ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked';
      });
    }

    // Target KB input
    this.targetKBInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (val && val > 0) {
        this.targetKB = val;
        this.updateActiveChip(val);
        this.triggerDebouncedBatchProcess();
      }
    });

    // Target KB preset chips
    this.targetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const kb = parseInt(chip.dataset.kb, 10);
        this.targetKB = kb;
        this.targetKBInput.value = kb;
        this.updateActiveChip(kb);
        this.triggerDebouncedBatchProcess();
      });
    });

    // Batch Action Buttons
    this.compressAllBtn.addEventListener('click', () => this.processAll());
    this.downloadZipBtn.addEventListener('click', () => this.downloadAllZip());
    this.clearAllBtn.addEventListener('click', () => this.clearAll());

    // Compare Modal Events
    if (this.compareCloseBtn) {
      this.compareCloseBtn.addEventListener('click', () => this.closeCompareModal());
    }
    if (this.compareModal) {
      this.compareModal.addEventListener('click', (e) => {
        if (e.target === this.compareModal) this.closeCompareModal();
      });
    }

    if (this.compareSliderContainer) {
      const updateSplit = (clientX) => {
        const rect = this.compareSliderContainer.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const pct = (offsetX / rect.width) * 100;
        this.compareLayerBefore.style.width = `${pct}%`;
        this.compareDividerHandle.style.left = `${pct}%`;
      };

      this.compareSliderContainer.addEventListener('mousedown', (e) => {
        this.isComparing = true;
        updateSplit(e.clientX);
      });
      window.addEventListener('mousemove', (e) => {
        if (this.isComparing) updateSplit(e.clientX);
      });
      window.addEventListener('mouseup', () => {
        this.isComparing = false;
      });

      this.compareSliderContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.isComparing = true;
          updateSplit(e.touches[0].clientX);
        }
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (this.isComparing && e.touches.length === 1) {
          updateSplit(e.touches[0].clientX);
        }
      }, { passive: true });
      window.addEventListener('touchend', () => {
        this.isComparing = false;
      });
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'quality') {
      this.modeQualityBtn.classList.add('active');
      this.modeTargetBtn.classList.remove('active');
      this.qualityControlsSection.style.display = 'grid';
      this.targetControlsSection.style.display = 'none';
    } else {
      this.modeTargetBtn.classList.add('active');
      this.modeQualityBtn.classList.remove('active');
      this.qualityControlsSection.style.display = 'none';
      this.targetControlsSection.style.display = 'grid';
    }
    this.triggerDebouncedBatchProcess();
  }

  updateActiveChip(kb) {
    this.targetChips.forEach((chip) => {
      const chipKB = parseInt(chip.dataset.kb, 10);
      chip.classList.toggle('active', chipKB === kb);
    });
  }

  async handleFiles(fileList) {
    const validImages = fileList.filter((f) => f.type.startsWith('image/'));
    const invalidCount = fileList.length - validImages.length;

    if (invalidCount > 0) {
      this.app.showToast(`${invalidCount} non-image file(s) skipped`, 'info');
    }

    if (validImages.length === 0) return;

    let loadedCount = 0;
    for (const file of validImages) {
      const fileId = 'comp_' + Math.random().toString(36).substring(2, 9);
      try {
        const imgData = await loadImage(file);
        this.files.push({
          id: fileId,
          file,
          imgData,
          resultBlob: null,
          resultWidth: imgData.width,
          resultHeight: imgData.height,
          savings: null,
          status: 'pending',
          error: null
        });
        loadedCount++;
      } catch (err) {
        console.error('File load error:', err);
        this.app.showToast(`Could not load ${file.name}: ${err.message}`, 'error');
      }
    }

    if (loadedCount > 0) {
      this.app.showToast(`Added ${loadedCount} image${loadedCount > 1 ? 's' : ''}`, 'success');
      this.updateUI();
      this.processAll();
    }
  }

  triggerDebouncedBatchProcess() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processAll();
    }, 350);
  }

  async processAll() {
    if (this.files.length === 0 || this.isProcessing) return;
    this.isProcessing = true;
    this.compressAllBtn.disabled = true;
    this.compressAllBtn.innerHTML = `
      <svg class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      Compressing...
    `;

    for (const item of this.files) {
      item.status = 'processing';
      this.updateCardStatus(item);

      try {
        await this.processItem(item);
        item.status = 'done';
      } catch (err) {
        console.error(`Compression failed for ${item.file.name}:`, err);
        item.status = 'error';
        item.error = err.message;
      }
      this.updateCard(item);
    }

    this.isProcessing = false;
    this.compressAllBtn.disabled = false;
    this.compressAllBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
        <path d="M16 21h5v-5"></path>
      </svg>
      Re-compress all
    `;
    this.updateBatchStats();
  }

  async processItem(item) {
    const { imgData } = item;
    let targetMime = this.outputFormat;
    if (targetMime === 'auto') {
      targetMime = imgData.type === 'image/png' ? 'image/png' : 'image/jpeg';
    }

    // Determine target dimensions
    let targetW = imgData.width;
    let targetH = imgData.height;

    if (this.maxWidth && this.maxWidth < targetW) {
      const scale = this.maxWidth / targetW;
      targetW = Math.round(this.maxWidth);
      if (this.aspectRatioLocked) {
        targetH = Math.round(targetH * scale);
      }
    }

    if (this.maxHeight && this.maxHeight < targetH) {
      const scale = this.maxHeight / targetH;
      targetH = Math.round(this.maxHeight);
      if (this.aspectRatioLocked && !this.maxWidth) {
        targetW = Math.round(targetW * scale);
      }
    }

    if (this.mode === 'target-kb') {
      // Use Target-KB Binary Search Engine
      const result = await targetKBBinarySearch(imgData.img, targetMime, this.targetKB, {
        initialWidth: targetW,
        initialHeight: targetH,
        bgColor: targetMime === 'image/jpeg' ? '#ffffff' : null
      });

      item.resultBlob = result.blob;
      item.resultWidth = result.width;
      item.resultHeight = result.height;
      item.savings = calculateSavings(imgData.size, result.blob.size);
    } else {
      // Quality & Resize Mode
      const canvas = drawImageOnCanvas(imgData.img, targetW, targetH, targetMime === 'image/jpeg' ? '#ffffff' : null);
      const blob = await canvasToBlob(canvas, targetMime, this.quality);

      item.resultBlob = blob;
      item.resultWidth = targetW;
      item.resultHeight = targetH;
      item.savings = calculateSavings(imgData.size, blob.size);
    }
  }

  updateUI() {
    const hasFiles = this.files.length > 0;
    this.emptyState.style.display = hasFiles ? 'none' : 'flex';
    this.batchActionsBar.style.display = hasFiles ? 'flex' : 'none';
    this.cardsContainer.style.display = hasFiles ? 'grid' : 'none';

    if (!hasFiles) {
      this.cardsContainer.innerHTML = '';
      return;
    }

    // Render cards
    this.cardsContainer.innerHTML = '';
    this.files.forEach((item) => {
      const cardEl = this.createCardElement(item);
      this.cardsContainer.appendChild(cardEl);
    });

    this.updateBatchStats();
  }

  createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `card-${item.id}`;

    // Thumbnail URL from source image
    const thumbUrl = item.imgData.thumbUrl || item.imgData.objectUrl || item.imgData.img.src;

    card.innerHTML = `
      <div class="card-preview-box">
        <img class="card-preview-img" src="${thumbUrl}" alt="${item.file.name}" />
        <span class="card-badge-status badge-${item.status}">${this.getStatusLabel(item.status)}</span>
      </div>
      <div class="card-body">
        <div class="card-filename" title="${item.file.name}">${item.file.name}</div>
        <div class="card-meta-row">
          <span>${item.imgData.width} × ${item.imgData.height} px</span>
          <span class="file-ext">${this.getFileExt(item.file.name)}</span>
        </div>
        <div class="card-size-comparison" id="sizes-${item.id}">
          <div class="size-values">
            <span class="size-original">${formatBytes(item.imgData.size)}</span>
            <span class="size-arrow">→</span>
            <span class="size-result">${item.resultBlob ? formatBytes(item.resultBlob.size) : '...'}</span>
          </div>
          <span class="savings-badge ${item.savings && !item.savings.isReduction ? 'negative' : ''}">
            ${item.savings ? item.savings.label : '0%'}
          </span>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-danger-ghost remove-btn" title="Remove image">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Remove
          </button>
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-sm btn-outline compare-btn" ${!item.resultBlob ? 'disabled' : ''} title="Compare visual quality">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Compare
            </button>
            <button class="btn btn-sm btn-primary download-btn" ${!item.resultBlob ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    `;

    // Event listeners for card buttons
    const removeBtn = card.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => this.removeItem(item.id));

    const compareBtn = card.querySelector('.compare-btn');
    compareBtn.addEventListener('click', () => this.openCompareModal(item));

    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => this.downloadItem(item));

    return card;
  }

  updateCard(item) {
    const card = document.getElementById(`card-${item.id}`);
    if (!card) return;

    const statusBadge = card.querySelector('.card-badge-status');
    if (statusBadge) {
      statusBadge.className = `card-badge-status badge-${item.status}`;
      statusBadge.textContent = this.getStatusLabel(item.status);
    }

    const sizesBox = card.querySelector(`#sizes-${item.id}`);
    if (sizesBox && item.resultBlob) {
      sizesBox.innerHTML = `
        <div class="size-values">
          <span class="size-original">${formatBytes(item.imgData.size)}</span>
          <span class="size-arrow">→</span>
          <span class="size-result">${formatBytes(item.resultBlob.size)}</span>
        </div>
        <span class="savings-badge ${item.savings && !item.savings.isReduction ? 'negative' : ''}">
          ${item.savings ? item.savings.label : '0%'}
        </span>
      `;
    }

    const downloadBtn = card.querySelector('.download-btn');
    if (downloadBtn) {
      downloadBtn.disabled = !item.resultBlob || item.status === 'error';
    }

    const compareBtn = card.querySelector('.compare-btn');
    if (compareBtn) {
      compareBtn.disabled = !item.resultBlob || item.status === 'error';
    }
  }

  updateCardStatus(item) {
    const card = document.getElementById(`card-${item.id}`);
    if (!card) return;
    const statusBadge = card.querySelector('.card-badge-status');
    if (statusBadge) {
      statusBadge.className = `card-badge-status badge-${item.status}`;
      statusBadge.textContent = this.getStatusLabel(item.status);
    }
  }

  getStatusLabel(status) {
    switch (status) {
      case 'processing': return 'Processing...';
      case 'done': return 'Ready';
      case 'error': return 'Failed';
      default: return 'Queued';
    }
  }

  updateBatchStats() {
    this.batchCountBadge.textContent = `${this.files.length} file${this.files.length !== 1 ? 's' : ''}`;

    let totalOrig = 0;
    let totalResult = 0;
    let completedCount = 0;

    for (const f of this.files) {
      if (f.resultBlob) {
        totalOrig += f.imgData.size;
        totalResult += f.resultBlob.size;
        completedCount++;
      }
    }

    if (completedCount > 0 && totalOrig > 0) {
      const overallSavings = calculateSavings(totalOrig, totalResult);
      this.batchSavingsBadge.textContent = `${formatBytes(totalOrig)} → ${formatBytes(totalResult)} (${overallSavings.label})`;
      this.downloadZipBtn.disabled = false;
    } else {
      this.batchSavingsBadge.textContent = '';
      this.downloadZipBtn.disabled = true;
    }
  }

  removeItem(id) {
    const item = this.files.find((f) => f.id === id);
    if (item && item.imgData && item.imgData.objectUrl) {
      URL.revokeObjectURL(item.imgData.objectUrl);
    }
    this.files = this.files.filter((f) => f.id !== id);
    this.updateUI();
  }

  clearAll() {
    this.files.forEach((item) => {
      if (item.imgData && item.imgData.objectUrl) {
        URL.revokeObjectURL(item.imgData.objectUrl);
      }
    });
    this.files = [];
    this.updateUI();
    this.app.showToast('Cleared all files', 'info');
  }

  downloadItem(item) {
    if (!item.resultBlob) return;
    const ext = this.getOutputExtension();
    const originalBaseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
    const filename = `${originalBaseName}-compressed.${ext}`;
    downloadBlob(item.resultBlob, filename);
    this.app.showToast(`Downloaded ${filename}`, 'success');
  }

  openCompareModal(item) {
    if (!item.resultBlob || !this.compareModal) return;

    const origUrl = item.imgData.objectUrl || item.imgData.img.src;
    const compUrl = URL.createObjectURL(item.resultBlob);

    this.compareImgBefore.src = origUrl;
    this.compareImgAfter.src = compUrl;

    if (this.compareTagBefore) {
      this.compareTagBefore.textContent = `Original (${formatBytes(item.imgData.size)})`;
    }
    if (this.compareTagAfter) {
      this.compareTagAfter.textContent = `Compressed (${formatBytes(item.resultBlob.size)} · ${item.savings ? item.savings.label : ''})`;
    }

    // Reset split to 50%
    if (this.compareLayerBefore) this.compareLayerBefore.style.width = '50%';
    if (this.compareDividerHandle) this.compareDividerHandle.style.left = '50%';

    this.compareModal.classList.add('active');
  }

  closeCompareModal() {
    if (!this.compareModal) return;
    this.compareModal.classList.remove('active');
    if (this.compareImgAfter.src && this.compareImgAfter.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.compareImgAfter.src);
    }
    this.compareImgBefore.src = '';
    this.compareImgAfter.src = '';
  }

  async downloadAllZip() {
    const readyItems = this.files.filter((f) => f.resultBlob);
    if (readyItems.length === 0) {
      this.app.showToast('No processed images ready to download', 'info');
      return;
    }

    const ext = this.getOutputExtension();
    const prefix = this.renamePrefixInput ? this.renamePrefixInput.value.trim() : '';

    const zipFiles = readyItems.map((item, idx) => {
      let filename;
      if (prefix) {
        filename = `${prefix}-${String(idx + 1).padStart(2, '0')}.${ext}`;
      } else {
        const originalBaseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
        filename = `${originalBaseName}-compressed.${ext}`;
      }
      return {
        name: filename,
        blob: item.resultBlob
      };
    });

    try {
      this.downloadZipBtn.disabled = true;
      this.downloadZipBtn.innerHTML = `Creating ZIP...`;

      await downloadZip(zipFiles, 'compressed-images.zip');
      this.app.showToast('Downloaded ZIP archive with all compressed images!', 'success');
    } catch (err) {
      console.error('ZIP creation error:', err);
      this.app.showToast(`ZIP export failed: ${err.message}`, 'error');
    } finally {
      this.downloadZipBtn.disabled = false;
      this.downloadZipBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download all as ZIP
      `;
    }
  }

  getOutputExtension() {
    if (this.outputFormat === 'image/webp') return 'webp';
    if (this.outputFormat === 'image/png') return 'png';
    return 'jpg';
  }

  getFileExt(name) {
    const idx = name.lastIndexOf('.');
    return idx !== -1 ? name.substring(idx + 1).toUpperCase() : 'IMG';
  }
}
