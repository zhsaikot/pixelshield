/**
 * ============================================================================
 * App Controller - PixelShield Desktop Studio
 * PixorAI Architecture: Collapsible Sidebar, Command Palette (⌘K), Sample Presets
 * ============================================================================
 */

import { CompressorTool } from './tools/compressor.js';
import { ConverterExifTool } from './tools/converter-exif.js';
import { PassportMakerTool } from './tools/passport-maker.js';
import { ImageToPdfTool } from './tools/image-to-pdf.js';
import { RedactorTool } from './tools/redactor.js';
import { SignatureMakerTool } from './tools/signature-maker.js';
import { AssetGeneratorTool } from './tools/asset-generator.js';

export class App {
  constructor() {
    this.currentTheme = localStorage.getItem('pixelshield_theme') || localStorage.getItem('pixelsafe_theme') || this.getSystemThemePreference();
    this.activeTab = 'compress';

    this.initTheme();
    this.initStudioShell();
    this.initNavigation();
    this.initSlidersSystem();
    this.initToastSystem();
    this.initTools();
    this.initCommandPalette();
    this.initSamplePresets();
    this.bindGlobalEvents();
  }

  getSystemThemePreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    this.updateThemeButtonIcon(themeBtn);

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('pixelshield_theme', this.currentTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    this.updateThemeButtonIcon(themeBtn);
    this.showToast(`Switched to ${this.currentTheme} mode`, 'info', 2000);
  }

  updateThemeButtonIcon(button) {
    if (!button) return;
    const isDark = this.currentTheme === 'dark';
    button.innerHTML = isDark
      ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    button.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  }

  initStudioShell() {
    this.studioShell = document.getElementById('studio-shell');
    this.sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    
    // Restore collapsed state
    const isCollapsed = localStorage.getItem('pixelshield_sidebar_collapsed') === 'true';
    if (isCollapsed && this.studioShell) {
      this.studioShell.classList.add('sidebar-collapsed');
    }

    if (this.sidebarToggleBtn && this.studioShell) {
      this.sidebarToggleBtn.addEventListener('click', () => {
        const collapsed = this.studioShell.classList.toggle('sidebar-collapsed');
        localStorage.setItem('pixelshield_sidebar_collapsed', collapsed.toString());
      });
    }

    // Fullscreen Stage Toggle
    const fullscreenBtn = document.getElementById('stage-fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Privacy Guarantee Info Modal
    const privacyBtn = document.getElementById('privacy-info-btn');
    const privacyModal = document.getElementById('privacy-modal-backdrop');
    const privacyClose = document.getElementById('privacy-modal-close');
    if (privacyBtn && privacyModal) {
      privacyBtn.addEventListener('click', () => privacyModal.classList.add('active'));
    }
    if (privacyClose && privacyModal) {
      privacyClose.addEventListener('click', () => privacyModal.classList.remove('active'));
    }
    if (privacyModal) {
      privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) privacyModal.classList.remove('active');
      });
    }
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

    // Update Topbar Breadcrumb
    const toolNames = {
      'compress': 'Smart Compressor',
      'convert': 'Converter & EXIF',
      'passport': 'Passport & ID Studio',
      'img-to-pdf': 'Images to PDF',
      'redact': 'Privacy Redactor',
      'signature': 'Signature & Watermark',
      'assets': 'Favicon & Social Assets'
    };
    const crumb = document.getElementById('studio-active-tool-crumb');
    if (crumb) crumb.textContent = toolNames[tabKey] || 'Studio';

    // Sync range sliders in active pane
    if (this.syncAllSliders) {
      setTimeout(() => this.syncAllSliders(), 40);
    }

    // Scroll to top of page gently
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  initSlidersSystem() {
    const syncSlider = (slider) => {
      if (!slider) return;
      const min = parseFloat(slider.min !== '' ? slider.min : '0');
      const max = parseFloat(slider.max !== '' ? slider.max : '100');
      const val = parseFloat(slider.value !== '' ? slider.value : '0');
      const range = max - min;
      const pct = range <= 0 ? 0 : Math.max(0, Math.min(100, ((val - min) / range) * 100));
      slider.style.setProperty('--range-progress', `${pct.toFixed(2)}%`);
    };

    // Initial sync of all range sliders
    document.querySelectorAll('input[type="range"].range-slider').forEach(syncSlider);

    // Global listener for real-time smooth updates on any range slider in the app
    document.addEventListener('input', (e) => {
      if (e.target && e.target.matches && e.target.matches('input[type="range"].range-slider')) {
        syncSlider(e.target);
      }
    });

    this.syncAllSliders = () => {
      document.querySelectorAll('input[type="range"].range-slider').forEach(syncSlider);
    };
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

  initCommandPalette() {
    this.cmdModal = document.getElementById('command-palette-backdrop');
    this.cmdInput = document.getElementById('command-search-input');
    this.cmdList = document.getElementById('command-palette-results');
    this.cmdTriggerBtn = document.getElementById('topbar-command-trigger');

    this.commands = [
      { id: 'compress', label: 'Smart Compressor', badge: 'Tool', icon: '🗜️', action: () => window.location.hash = '#compress' },
      { id: 'convert', label: 'Converter & EXIF Stripper', badge: 'Tool', icon: '🛡️', action: () => window.location.hash = '#convert' },
      { id: 'passport', label: 'Passport & ID Photo Studio', badge: 'Tool', icon: '📸', action: () => window.location.hash = '#passport' },
      { id: 'img-to-pdf', label: 'Images to Multi-Page PDF', badge: 'Tool', icon: '📄', action: () => window.location.hash = '#img-to-pdf' },
      { id: 'redact', label: 'Privacy Redactor & Blur Tool', badge: 'Tool', icon: '⬛', action: () => window.location.hash = '#redact' },
      { id: 'signature', label: 'Signature Cleaner & Watermark', badge: 'Tool', icon: '✍️', action: () => window.location.hash = '#signature' },
      { id: 'assets', label: 'Favicon & Social Media Assets', badge: 'Tool', icon: '🎨', action: () => window.location.hash = '#assets' },
      { id: 'theme', label: 'Toggle Light / Dark Mode', badge: 'Action', icon: '🌓', action: () => this.toggleTheme() },
      { id: 'fullscreen', label: 'Toggle Fullscreen Canvas Stage', badge: 'Action', icon: '🖥️', action: () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }},
      { id: 'privacy', label: 'Open Privacy Architecture Inspector', badge: 'Info', icon: '🔒', action: () => {
        const pm = document.getElementById('privacy-modal-backdrop');
        if (pm) pm.classList.add('active');
      }},
      { id: 'sample-portrait', label: 'Load Sample Portrait Photo', badge: 'Preset', icon: '👩', action: () => this.loadSamplePreset('portrait') },
      { id: 'sample-doc', label: 'Load Sample Document Scan', badge: 'Preset', icon: '📑', action: () => this.loadSamplePreset('document') }
    ];

    if (this.cmdTriggerBtn && this.cmdModal) {
      this.cmdTriggerBtn.addEventListener('click', () => this.openCommandPalette());
    }

    if (this.cmdModal) {
      this.cmdModal.addEventListener('click', (e) => {
        if (e.target === this.cmdModal) this.closeCommandPalette();
      });
    }

    if (this.cmdInput) {
      this.cmdInput.addEventListener('input', (e) => this.renderCommandResults(e.target.value));
      this.cmdInput.addEventListener('keydown', (e) => this.handleCommandKeynav(e));
    }
  }

  openCommandPalette() {
    if (!this.cmdModal) return;
    this.cmdModal.classList.add('active');
    if (this.cmdInput) {
      this.cmdInput.value = '';
      setTimeout(() => this.cmdInput.focus(), 50);
    }
    this.renderCommandResults('');
  }

  closeCommandPalette() {
    if (this.cmdModal) this.cmdModal.classList.remove('active');
  }

  renderCommandResults(filterText = '') {
    if (!this.cmdList) return;
    const term = filterText.toLowerCase().trim();
    const matches = this.commands.filter((c) => c.label.toLowerCase().includes(term) || c.badge.toLowerCase().includes(term));

    this.cmdList.innerHTML = matches.length === 0
      ? `<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">No matching tools or commands found.</div>`
      : matches.map((item, idx) => `
        <div class="cmd-item ${idx === 0 ? 'selected' : ''}" data-cmd-id="${item.id}" tabindex="0">
          <span class="cmd-item-icon">${item.icon}</span>
          <span class="cmd-item-label">${item.label}</span>
          <span class="cmd-item-badge">${item.badge}</span>
        </div>
      `).join('');

    // Click listener on rendered items
    this.cmdList.querySelectorAll('.cmd-item').forEach((itemEl) => {
      itemEl.addEventListener('click', () => {
        const cmdId = itemEl.getAttribute('data-cmd-id');
        const match = this.commands.find((c) => c.id === cmdId);
        if (match) {
          match.action();
          this.closeCommandPalette();
        }
      });
    });
  }

  handleCommandKeynav(e) {
    const items = Array.from(this.cmdList.querySelectorAll('.cmd-item'));
    if (!items.length) return;

    let currentIndex = items.findIndex((it) => it.classList.contains('selected'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items.forEach((it, i) => it.classList.toggle('selected', i === nextIndex));
      items[nextIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('selected', i === prevIndex));
      items[prevIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = items[currentIndex >= 0 ? currentIndex : 0];
      if (selected) {
        const cmdId = selected.getAttribute('data-cmd-id');
        const match = this.commands.find((c) => c.id === cmdId);
        if (match) {
          match.action();
          this.closeCommandPalette();
        }
      }
    }
  }

  initSamplePresets() {
    const presetButtons = document.querySelectorAll('.preset-chip-btn');
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-preset');
        this.loadSamplePreset(type);
      });
    });
  }

  /**
   * Generates a 100% client-side synthetic high-res image to allow instant 1-click testing
   */
  loadSamplePreset(type = 'portrait') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1600;
    canvas.height = 1200;

    if (type === 'portrait') {
      // Beautiful gradient background
      const grad = ctx.createLinearGradient(0, 0, 1600, 1200);
      grad.addColorStop(0, '#ECE9E6');
      grad.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1600, 1200);

      // Artistic portrait silhouette / visual geometry
      ctx.fillStyle = '#2A7F62';
      ctx.beginPath();
      ctx.arc(800, 520, 260, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#DFD9E2';
      ctx.beginPath();
      ctx.ellipse(800, 1150, 480, 400, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#152427';
      ctx.font = 'bold 54px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PixelShield Studio Portrait Test', 800, 150);

      ctx.fillStyle = '#538083';
      ctx.font = '500 32px Inter, sans-serif';
      ctx.fillText('1600 × 1200 px · High-Res Studio Master', 800, 210);
    } else if (type === 'document') {
      // Formal document scan mockup
      ctx.fillStyle = '#F8F9FA';
      ctx.fillRect(0, 0, 1600, 1200);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(200, 100, 1200, 1000);
      ctx.strokeStyle = '#DFD9E2';
      ctx.lineWidth = 4;
      ctx.strokeRect(200, 100, 1200, 1000);

      ctx.fillStyle = '#2A7F62';
      ctx.font = 'bold 44px Inter, sans-serif';
      ctx.fillText('OFFICIAL IDENTITY VERIFICATION RECORD', 260, 200);

      ctx.fillStyle = '#89909F';
      for (let y = 300; y <= 900; y += 70) {
        ctx.fillRect(260, y, 600 + Math.sin(y) * 200, 14);
      }
    } else {
      // Scenery gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1200);
      grad.addColorStop(0, '#538083');
      grad.addColorStop(0.5, '#C3ACCE');
      grad.addColorStop(1, '#2A7F62');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1600, 1200);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Nordic Scenic Master Specimen', 800, 600);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `sample-${type}-test.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      
      // Inject into active tool or compressor
      if (this.activeTab === 'compress' && this.compressor) {
        this.compressor.handleFiles([file]);
      } else if (this.activeTab === 'convert' && this.converter) {
        this.converter.handleFiles([file]);
      } else if (this.activeTab === 'passport' && this.passport) {
        this.passport.loadImage(file);
      } else if (this.activeTab === 'redact' && this.redactor) {
        this.redactor.loadImage(file);
      } else if (this.compressor) {
        window.location.hash = '#compress';
        setTimeout(() => this.compressor.handleFiles([file]), 100);
      }
      this.showToast(`Loaded sample ${type} photo into studio stage`, 'success', 2500);
    }, 'image/jpeg', 0.95);
  }

  bindGlobalEvents() {
    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // ⌘K or Ctrl+K opens Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openCommandPalette();
        return;
      }

      // Escape closes any open modals
      if (e.key === 'Escape') {
        this.closeCommandPalette();
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
