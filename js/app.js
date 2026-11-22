/**
 * ============================================================================
 * App Controller - Privacy Image & Document Studio
 * ============================================================================
 */

import { CompressorTool } from './tools/compressor.js';
import { ConverterExifTool } from './tools/converter-exif.js';
import { PassportMakerTool } from './tools/passport-maker.js';
import { ImageToPdfTool } from './tools/image-to-pdf.js';
import { RedactorTool } from './tools/redactor.js';
import { SignatureMakerTool } from './tools/signature-maker.js';
import { AssetGeneratorTool } from './tools/asset-generator.js';

class App {
  constructor() {
    this.currentTheme = localStorage.getItem('pixelshield_theme') || localStorage.getItem('pixelsafe_theme') || this.getSystemThemePreference();
    this.activeTab = 'compress';

    this.initTheme();
    this.initNavigation();
    this.initToastSystem();
    this.initTools();
    this.bindGlobalEvents();
  }

  getSystemThemePreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    this.updateThemeButtonIcon(themeBtn);

    themeBtn.addEventListener('click', () => {
      this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', this.currentTheme);
      localStorage.setItem('pixelshield_theme', this.currentTheme);
      this.updateThemeButtonIcon(themeBtn);
      this.showToast(`Switched to ${this.currentTheme} mode`, 'info', 2000);
    });
  }

  updateThemeButtonIcon(button) {
    if (!button) return;
    const isDark = this.currentTheme === 'dark';
    button.innerHTML = isDark
      ? `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `
      : `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    button.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  }

  initNavigation() {
    this.tabButtons = document.querySelectorAll('.nav-tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');

    // Tab button click handlers
    this.tabButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = btn.getAttribute('data-tab');
        window.location.hash = `#${targetTab}`;
      });
    });

    // Hash change handler
    window.addEventListener('hashchange', () => this.handleHashChange());

    // Initial hash routing
    this.handleHashChange();
  }

  handleHashChange() {
    const rawHash = window.location.hash.replace('#', '').toLowerCase();
    const validTabs = ['compress', 'convert', 'passport', 'img-to-pdf', 'redact', 'signature', 'assets'];
    const activeTab = validTabs.includes(rawHash) ? rawHash : 'compress';

    this.switchTab(activeTab);
  }

  switchTab(tabKey) {
    this.activeTab = tabKey;

    // Update buttons
    this.tabButtons.forEach((btn) => {
      const isTarget = btn.getAttribute('data-tab') === tabKey;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Update panes
    this.tabPanes.forEach((pane) => {
      const isTarget = pane.id === `tab-${tabKey}`;
      pane.classList.toggle('active', isTarget);
    });

    // Scroll to top of page gently
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  initToastSystem() {
    this.toastContainer = document.getElementById('toast-container');
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }
  }

  showToast(message, type = 'info', duration = 3200) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" color="var(--color-success)">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `,
      error: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" color="var(--color-danger)">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `,
      info: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" color="var(--color-info)">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      `
    };

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.6rem;">
        ${iconMap[type] || iconMap.info}
        <span>${message}</span>
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  initTools() {
    this.compressor = new CompressorTool(this);
    this.converter = new ConverterExifTool(this);
    this.passport = new PassportMakerTool(this);
    this.imageToPdf = new ImageToPdfTool(this);
    this.redactor = new RedactorTool(this);
    this.signature = new SignatureMakerTool(this);
    this.assets = new AssetGeneratorTool(this);
  }

  bindGlobalEvents() {
    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Escape closes any open modals
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-backdrop.active');
        if (activeModal) {
          activeModal.classList.remove('active');
        }
      }
    });

    // Brand logo click returns to #compress
    const brand = document.querySelector('.brand-wrapper');
    if (brand) {
      brand.addEventListener('click', () => {
        window.location.hash = '#compress';
      });
    }
  }
}

// Bootstrap Application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.__PIXEL_SHIELD_APP__ = new App();
});
