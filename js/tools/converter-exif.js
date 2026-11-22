/**
 * ============================================================================
 * Tool 2: Format Converter & EXIF Stripper Studio
 * ============================================================================
 */

import {
  loadImage,
  formatBytes,
  calculateSavings,
  extractExif,
  stripExifAndExport,
  downloadBlob,
  downloadZip
} from '../utils/image-engine.js';

export class ConverterExifTool {
  constructor(app) {
    this.app = app;
    this.files = []; // Array of { id, file, imgData, exifData, resultBlob, savings, status, error }

    // Settings
    this.targetFormat = 'image/webp'; // 'image/webp', 'image/jpeg', 'image/png'
    this.quality = 0.90;
    this.bgColor = '#ffffff'; // Fill for transparency when converting to JPEG
    this.stripExif = true;
    this.isProcessing = false;
    this.debounceTimer = null;

    this.initDOMElements();
    this.bindEvents();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-convert');
    this.dropzone = document.getElementById('converter-dropzone');
    this.fileInput = document.getElementById('converter-file-input');

    // Controls
    this.formatSelect = document.getElementById('converter-target-format');
    this.qualityGroup = document.getElementById('converter-quality-group');
    this.qualitySlider = document.getElementById('converter-quality-slider');
    this.qualityValBadge = document.getElementById('converter-quality-val');
    this.bgFillGroup = document.getElementById('converter-bg-fill-group');
    this.bgColorPicker = document.getElementById('converter-bg-color-picker');
    this.bgSwatches = document.querySelectorAll('.bg-swatch-btn');
    this.stripExifSwitch = document.getElementById('converter-strip-exif-switch');

    // Batch actions & stats
    this.batchActionsBar = document.getElementById('converter-batch-actions');
    this.batchCountBadge = document.getElementById('converter-batch-count');
    this.batchSavingsBadge = document.getElementById('converter-batch-savings');
    this.convertAllBtn = document.getElementById('converter-convert-all-btn');
    this.downloadZipBtn = document.getElementById('converter-download-zip-btn');
    this.clearAllBtn = document.getElementById('converter-clear-all-btn');

    // Cards grid & empty state
    this.cardsContainer = document.getElementById('converter-cards-grid');
    this.emptyState = document.getElementById('converter-empty-state');

    // EXIF modal
    this.modalBackdrop = document.getElementById('exif-modal-backdrop');
    this.modalCloseBtn = document.getElementById('exif-modal-close');
    this.modalTitle = document.getElementById('exif-modal-title');
    this.modalTableBody = document.getElementById('exif-modal-tbody');
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
        e.target.value = '';
      }
    });

    // Format selection
    this.formatSelect.addEventListener('change', (e) => {
      this.targetFormat = e.target.value;
      const isPng = this.targetFormat === 'image/png';
      const isJpeg = this.targetFormat === 'image/jpeg';

      // PNG is lossless, so hide quality slider
      this.qualityGroup.style.display = isPng ? 'none' : 'flex';
      // Background fill color is only strictly required for JPEG
      this.bgFillGroup.style.display = isJpeg ? 'flex' : 'none';

      this.triggerDebouncedBatchProcess();
    });

    // Quality slider
    this.qualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.quality = val / 100;
      this.qualityValBadge.textContent = `${val}%`;
      this.triggerDebouncedBatchProcess();
    });

    // Color Swatches
    this.bgSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        this.bgSwatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.dataset.color;
        this.bgColor = color;
        this.bgColorPicker.value = color;
        this.triggerDebouncedBatchProcess();
      });
    });

    this.bgColorPicker.addEventListener('input', (e) => {
      this.bgColor = e.target.value;
      this.bgSwatches.forEach((s) => s.classList.remove('active'));
      this.triggerDebouncedBatchProcess();
    });

    // Strip EXIF switch
    this.stripExifSwitch.addEventListener('change', (e) => {
      this.stripExif = e.target.checked;
      this.triggerDebouncedBatchProcess();
    });

    // Batch buttons
    this.convertAllBtn.addEventListener('click', () => this.processAll());
    this.downloadZipBtn.addEventListener('click', () => this.downloadAllZip());
    this.clearAllBtn.addEventListener('click', () => this.clearAll());

    // Modal close
    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => this.closeExifModal());
    }
    if (this.modalBackdrop) {
      this.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.modalBackdrop) this.closeExifModal();
      });
    }
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
      const fileId = 'conv_' + Math.random().toString(36).substring(2, 9);
      try {
        const [imgData, exifData] = await Promise.all([
          loadImage(file),
          extractExif(file)
        ]);

        this.files.push({
          id: fileId,
          file,
          imgData,
          exifData,
          resultBlob: null,
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
    this.convertAllBtn.disabled = true;
    this.convertAllBtn.innerHTML = `
      <svg class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      Converting...
    `;

    for (const item of this.files) {
      item.status = 'processing';
      this.updateCardStatus(item);

      try {
        await this.processItem(item);
        item.status = 'done';
      } catch (err) {
        console.error(`Conversion failed for ${item.file.name}:`, err);
        item.status = 'error';
        item.error = err.message;
      }
      this.updateCard(item);
    }

    this.isProcessing = false;
    this.convertAllBtn.disabled = false;
    this.convertAllBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
        <path d="M16 21h5v-5"></path>
      </svg>
      Re-convert all
    `;
    this.updateBatchStats();
  }

  async processItem(item) {
    const { imgData } = item;
    const bgFill = this.targetFormat === 'image/jpeg' ? this.bgColor : null;
    
    // Canvas redraw removes 100% of EXIF and metadata chunks
    const blob = await stripExifAndExport(
      imgData.img,
      this.targetFormat,
      this.targetFormat === 'image/png' ? 1.0 : this.quality,
      bgFill
    );

    item.resultBlob = blob;
    item.savings = calculateSavings(imgData.size, blob.size);
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
    card.id = `conv-card-${item.id}`;

    const thumbUrl = item.imgData.img.src;
    const origExt = this.getFileExt(item.file.name);
    const targetExt = this.getFormatLabel();
    const hasExifTags = item.exifData && item.exifData.hasExif;

    card.innerHTML = `
      <div class="card-preview-box">
        <img class="card-preview-img" src="${thumbUrl}" alt="${item.file.name}" loading="lazy" />
        <span class="card-badge-status badge-${item.status}">${this.getStatusLabel(item.status)}</span>
      </div>
      <div class="card-body">
        <div class="card-filename" title="${item.file.name}">${item.file.name}</div>
        <div class="card-meta-row">
          <span>${item.imgData.width} × ${item.imgData.height} px</span>
          <span class="badge" style="background:var(--accent-primary-subtle); color:var(--accent-primary); font-weight:700;">
            ${origExt} → ${targetExt}
          </span>
        </div>
        
        <div class="card-meta-row" style="margin-top:0.25rem;">
          <span class="exif-status-badge ${hasExifTags ? 'exif-status-found' : 'exif-status-stripped'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              ${hasExifTags ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' : '<polyline points="20 6 9 17 4 12"></polyline>'}
            </svg>
            ${hasExifTags ? 'Original EXIF Found' : 'Clean / No EXIF'}
          </span>
          <button class="btn btn-ghost btn-sm inspect-btn" style="padding:0.15rem 0.4rem; font-size:0.75rem;">
            Inspect
          </button>
        </div>

        <div class="card-size-comparison" id="conv-sizes-${item.id}">
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
    `;

    // Listeners
    const removeBtn = card.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => this.removeItem(item.id));

    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => this.downloadItem(item));

    const inspectBtn = card.querySelector('.inspect-btn');
    inspectBtn.addEventListener('click', () => this.openExifModal(item));

    return card;
  }

  updateCard(item) {
    const card = document.getElementById(`conv-card-${item.id}`);
    if (!card) return;

    const statusBadge = card.querySelector('.card-badge-status');
    if (statusBadge) {
      statusBadge.className = `card-badge-status badge-${item.status}`;
      statusBadge.textContent = this.getStatusLabel(item.status);
    }

    const sizesBox = card.querySelector(`#conv-sizes-${item.id}`);
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
  }

  updateCardStatus(item) {
    const card = document.getElementById(`conv-card-${item.id}`);
    if (!card) return;
    const statusBadge = card.querySelector('.card-badge-status');
    if (statusBadge) {
      statusBadge.className = `card-badge-status badge-${item.status}`;
      statusBadge.textContent = this.getStatusLabel(item.status);
    }
  }

  getStatusLabel(status) {
    switch (status) {
      case 'processing': return 'Converting...';
      case 'done': return 'Converted';
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
    this.files = this.files.filter((f) => f.id !== id);
    this.updateUI();
  }

  clearAll() {
    this.files = [];
    this.updateUI();
    this.app.showToast('Cleared all files', 'info');
  }

  downloadItem(item) {
    if (!item.resultBlob) return;
    const ext = this.getFormatExt();
    const originalBaseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
    const filename = `${originalBaseName}-clean.${ext}`;
    downloadBlob(item.resultBlob, filename);
    this.app.showToast(`Downloaded ${filename}`, 'success');
  }

  async downloadAllZip() {
    const readyItems = this.files.filter((f) => f.resultBlob);
    if (readyItems.length === 0) {
      this.app.showToast('No processed images ready to download', 'info');
      return;
    }

    const ext = this.getFormatExt();
    const zipFiles = readyItems.map((item) => {
      const originalBaseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
      return {
        name: `${originalBaseName}-clean.${ext}`,
        blob: item.resultBlob
      };
    });

    try {
      this.downloadZipBtn.disabled = true;
      this.downloadZipBtn.innerHTML = `Creating ZIP...`;

      await downloadZip(zipFiles, 'converted-images.zip');
      this.app.showToast('Downloaded ZIP archive with all converted images!', 'success');
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

  openExifModal(item) {
    this.modalTitle.textContent = `Metadata: ${item.file.name}`;
    const ed = item.exifData || {};

    let html = `
      <tr><th>File Name</th><td>${item.file.name}</td></tr>
      <tr><th>Original Size</th><td>${formatBytes(item.imgData.size)}</td></tr>
      <tr><th>Dimensions</th><td>${item.imgData.width} × ${item.imgData.height} px</td></tr>
      <tr><th>MIME Type</th><td>${item.file.type || 'image/jpeg'}</td></tr>
      <tr><th>Last Modified</th><td>${ed.lastModified || 'N/A'}</td></tr>
      <tr><th>Camera Make</th><td>${ed.make || 'None / Not Detected'}</td></tr>
      <tr><th>Camera Model</th><td>${ed.model || 'None / Not Detected'}</td></tr>
      <tr><th>Date / Time Taken</th><td>${ed.dateTime || 'None / Not Detected'}</td></tr>
      <tr><th>Software</th><td>${ed.software || 'None / Not Detected'}</td></tr>
      <tr><th>GPS Geolocation</th><td>
        ${ed.hasGps ? '<span style="color:var(--color-danger); font-weight:700;">⚠️ GPS Coordinates Present (Will be purged)</span>' : '<span style="color:var(--color-success); font-weight:600;">None Detected</span>'}
      </td></tr>
      <tr><th>Privacy Scrubbing</th><td>
        <span style="color:var(--color-success); font-weight:700;">
          ✓ Redrawn via Clean Canvas Pixel Buffer (100% of EXIF / GPS / device tags removed)
        </span>
      </td></tr>
    `;

    this.modalTableBody.innerHTML = html;
    this.modalBackdrop.classList.add('active');
  }

  closeExifModal() {
    this.modalBackdrop.classList.remove('active');
  }

  getFormatExt() {
    if (this.targetFormat === 'image/webp') return 'webp';
    if (this.targetFormat === 'image/png') return 'png';
    return 'jpg';
  }

  getFormatLabel() {
    if (this.targetFormat === 'image/webp') return 'WEBP';
    if (this.targetFormat === 'image/png') return 'PNG';
    return 'JPEG';
  }

  getFileExt(name) {
    const idx = name.lastIndexOf('.');
    return idx !== -1 ? name.substring(idx + 1).toUpperCase() : 'IMG';
  }
}
