/**
 * ============================================================================
 * Tool 4: Multi-Image to PDF Studio
 * 100% Client-Side PDF document generator using jsPDF
 * ============================================================================
 */

import { loadImage, formatBytes, downloadBlob } from '../utils/image-engine.js';

export class ImageToPdfTool {
  constructor(app) {
    this.app = app;
    this.pages = []; // Array of { id, file, imgData, thumbUrl }
    this.pageSize = 'a4'; // 'a4', 'letter', 'fit'
    this.orientation = 'portrait'; // 'portrait', 'landscape', 'auto'
    this.marginMM = 0; // 0, 10, 20
    this.quality = 0.85; // 0.5 - 1.0
    this.pdfFilename = 'combined-document.pdf';
    this.isGenerating = false;
    this.draggedIndex = null;

    this.initDOMElements();
    this.bindEvents();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-img-to-pdf');
    this.dropzone = document.getElementById('pdf-dropzone');
    this.fileInput = document.getElementById('pdf-file-input');

    // Settings
    this.pageSizeSelect = document.getElementById('pdf-page-size');
    this.orientationSelect = document.getElementById('pdf-orientation');
    this.marginSelect = document.getElementById('pdf-margin');
    this.qualitySlider = document.getElementById('pdf-quality-slider');
    this.qualityVal = document.getElementById('pdf-quality-val');
    this.filenameInput = document.getElementById('pdf-filename-input');

    // Actions & Grid
    this.batchActionsBar = document.getElementById('pdf-batch-actions');
    this.pageCountBadge = document.getElementById('pdf-page-count');
    this.generatePdfBtn = document.getElementById('pdf-generate-btn');
    this.clearAllBtn = document.getElementById('pdf-clear-all-btn');
    this.pagesGrid = document.getElementById('pdf-pages-grid');
    this.emptyState = document.getElementById('pdf-empty-state');
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
        this.handleFiles(Array.from(e.dataTransfer.files));
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    });

    // Settings
    this.pageSizeSelect.addEventListener('change', (e) => {
      this.pageSize = e.target.value;
    });

    this.orientationSelect.addEventListener('change', (e) => {
      this.orientation = e.target.value;
    });

    this.marginSelect.addEventListener('change', (e) => {
      this.marginMM = parseInt(e.target.value, 10) || 0;
    });

    this.qualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.quality = val / 100;
      this.qualityVal.textContent = `${val}%`;
    });

    if (this.filenameInput) {
      this.filenameInput.addEventListener('input', (e) => {
        let name = e.target.value.trim();
        if (!name.endsWith('.pdf')) name += '.pdf';
        this.pdfFilename = name;
      });
    }

    // Actions
    this.generatePdfBtn.addEventListener('click', () => this.generatePDF());
    this.clearAllBtn.addEventListener('click', () => this.clearAll());
  }

  async handleFiles(files) {
    const validImages = files.filter((f) => f.type.startsWith('image/'));
    const invalidCount = files.length - validImages.length;

    if (invalidCount > 0) {
      this.app.showToast(`${invalidCount} non-image file(s) skipped`, 'info');
    }

    if (validImages.length === 0) return;

    let addedCount = 0;
    for (const file of validImages) {
      try {
        const imgData = await loadImage(file);
        const id = 'pdf_page_' + Math.random().toString(36).substring(2, 9);
        this.pages.push({
          id,
          file,
          imgData,
          thumbUrl: imgData.thumbUrl || imgData.objectUrl || imgData.img.src
        });
        addedCount++;
      } catch (err) {
        console.error('Page load error:', err);
        this.app.showToast(`Could not load ${file.name}`, 'error');
      }
    }

    if (addedCount > 0) {
      this.app.showToast(`Added ${addedCount} page${addedCount > 1 ? 's' : ''}`, 'success');
      this.renderPages();
      setTimeout(() => {
        const target = this.batchActionsBar || this.pagesGrid;
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }

  renderPages() {
    const hasPages = this.pages.length > 0;
    this.emptyState.style.display = hasPages ? 'none' : 'flex';
    this.batchActionsBar.style.display = hasPages ? 'flex' : 'none';
    this.pagesGrid.style.display = hasPages ? 'grid' : 'none';

    if (!hasPages) {
      this.pagesGrid.innerHTML = '';
      return;
    }

    this.pagesGrid.innerHTML = '';
    this.pages.forEach((page, index) => {
      const card = this.createPageCard(page, index);
      this.pagesGrid.appendChild(card);
    });

    this.pageCountBadge.textContent = `${this.pages.length} page${this.pages.length !== 1 ? 's' : ''}`;
  }

  createPageCard(page, index) {
    const card = document.createElement('div');
    card.className = 'pdf-page-card';
    card.id = `pdf-card-${page.id}`;
    card.draggable = true;

    card.innerHTML = `
      <div class="pdf-thumb-box">
        <img src="${page.thumbUrl}" alt="Page ${index + 1}" />
        <span class="pdf-page-badge">Page ${index + 1}</span>
      </div>
      <div class="pdf-page-meta">
        <div class="pdf-page-name" title="${page.file.name}">${page.file.name}</div>
        <div style="font-size:0.72rem; color:var(--text-muted); display:flex; justify-content:space-between;">
          <span>${page.imgData.width} × ${page.imgData.height} px</span>
          <span>${formatBytes(page.file.size)}</span>
        </div>
        <div class="pdf-page-actions">
          <div style="display:flex; gap:0.25rem;">
            <button type="button" class="btn-icon move-left-btn" title="Move page earlier" ${index === 0 ? 'disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button type="button" class="btn-icon move-right-btn" title="Move page later" ${index === this.pages.length - 1 ? 'disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          <button type="button" class="btn-icon remove-page-btn" title="Remove page" style="color:var(--color-danger);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Button Listeners
    const moveLeft = card.querySelector('.move-left-btn');
    moveLeft.addEventListener('click', () => this.movePage(index, -1));

    const moveRight = card.querySelector('.move-right-btn');
    moveRight.addEventListener('click', () => this.movePage(index, 1));

    const removeBtn = card.querySelector('.remove-page-btn');
    removeBtn.addEventListener('click', () => this.removePage(index));

    // HTML5 Drag & Drop Reordering
    card.addEventListener('dragstart', (e) => {
      this.draggedIndex = index;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      this.draggedIndex = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        const item = this.pages.splice(this.draggedIndex, 1)[0];
        this.pages.splice(index, 0, item);
        this.renderPages();
      }
    });

    return card;
  }

  movePage(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= this.pages.length) return;
    const temp = this.pages[index];
    this.pages[index] = this.pages[target];
    this.pages[target] = temp;
    this.renderPages();
  }

  removePage(index) {
    const [removed] = this.pages.splice(index, 1);
    if (removed && removed.imgData && removed.imgData.objectUrl) {
      URL.revokeObjectURL(removed.imgData.objectUrl);
    }
    this.renderPages();
  }

  clearAll() {
    this.pages.forEach((p) => {
      if (p.imgData && p.imgData.objectUrl) {
        URL.revokeObjectURL(p.imgData.objectUrl);
      }
    });
    this.pages = [];
    this.renderPages();
    this.app.showToast('Cleared all pages', 'info');
  }

  async generatePDF() {
    if (this.pages.length === 0 || this.isGenerating) {
      this.app.showToast('Add at least one image to create a PDF', 'info');
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      this.app.showToast('PDF library loading error. Check internet connection.', 'error');
      return;
    }

    this.isGenerating = true;
    this.generatePdfBtn.disabled = true;
    this.generatePdfBtn.innerHTML = `
      <svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      Generating PDF...
    `;

    try {
      const { jsPDF } = window.jspdf;
      let pdf = null;

      for (let i = 0; i < this.pages.length; i++) {
        const page = this.pages[i];
        const img = page.imgData.img;
        const imgW = page.imgData.width;
        const imgH = page.imgData.height;
        const aspect = imgW / imgH;

        // Determine Page Dimensions (in mm)
        let pageW, pageH, orientation;

        if (this.pageSize === 'fit') {
          // Fit page to image exact aspect ratio
          const maxDimMM = 297;
          if (aspect >= 1) {
            pageW = maxDimMM;
            pageH = maxDimMM / aspect;
            orientation = 'landscape';
          } else {
            pageH = maxDimMM;
            pageW = maxDimMM * aspect;
            orientation = 'portrait';
          }
        } else if (this.pageSize === 'letter') {
          pageW = 215.9;
          pageH = 279.4;
          orientation = this.orientation === 'auto' ? (aspect > 1 ? 'landscape' : 'portrait') : this.orientation;
          if (orientation === 'landscape') {
            [pageW, pageH] = [pageH, pageW];
          }
        } else {
          // A4 default
          pageW = 210;
          pageH = 297;
          orientation = this.orientation === 'auto' ? (aspect > 1 ? 'landscape' : 'portrait') : this.orientation;
          if (orientation === 'landscape') {
            [pageW, pageH] = [pageH, pageW];
          }
        }

        if (i === 0) {
          pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: this.pageSize === 'fit' ? [pageW, pageH] : (this.pageSize === 'letter' ? 'letter' : 'a4')
          });
        } else {
          pdf.addPage(
            this.pageSize === 'fit' ? [pageW, pageH] : (this.pageSize === 'letter' ? 'letter' : 'a4'),
            orientation
          );
        }

        // Calculate Printable Area with margins
        const margin = this.marginMM;
        const printableW = pageW - margin * 2;
        const printableH = pageH - margin * 2;

        let drawW = printableW;
        let drawH = printableW / aspect;

        if (drawH > printableH) {
          drawH = printableH;
          drawW = printableH * aspect;
        }

        // Center on page
        const posX = margin + (printableW - drawW) / 2;
        const posY = margin + (printableH - drawH) / 2;

        // Compress image onto offscreen canvas to optimize PDF file size
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(imgW, 2400);
        canvas.height = Math.round(canvas.width / aspect);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgDataUrl = canvas.toDataURL('image/jpeg', this.quality);
        pdf.addImage(imgDataUrl, 'JPEG', posX, posY, drawW, drawH, undefined, 'FAST');
      }

      const filename = this.pdfFilename || 'combined-document.pdf';
      pdf.save(filename);
      this.app.showToast(`Generated & downloaded ${filename}!`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      this.app.showToast(`PDF generation failed: ${err.message}`, 'error');
    } finally {
      this.isGenerating = false;
      this.generatePdfBtn.disabled = false;
      this.generatePdfBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Generate &amp; Download PDF
      `;
    }
  }
}
