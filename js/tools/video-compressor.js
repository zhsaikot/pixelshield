/**
 * ============================================================================
 * Tool 9: Smart Video Compressor & Resizer
 * 100% Client-Side In-Browser Video Compression (WebCodecs + mp4-muxer)
 * Zero-Server, 100% Private, Hardware Accelerated
 * ============================================================================
 */

import {
  formatBytes,
  calculateSavings,
  downloadBlob
} from '../utils/image-engine.js';

import {
  loadVideoMetadata,
  calculateTargetBitrate,
  calculateScaledDimensions,
  estimateOutputSize,
  formatDuration,
  isWebCodecsSupported,
  isMediaRecorderSupported,
  compressWithWebCodecs,
  compressWithMediaRecorder
} from '../utils/video-engine.js';

export class VideoCompressorTool {
  constructor(app) {
    this.app = app;
    this.currentVideo = null;
    this.compressedBlob = null;
    this.compressedUrl = null;

    // Settings
    this.mode = 'target-size'; // 'target-size' or 'manual-quality'
    this.targetSizeMB = 25; // Default Discord 25MB limit
    this.qualityPercent = 65; // 10 to 95
    this.resolutionSetting = 'original'; // 'original', '1080', '720', '480', '360'
    this.fpsSetting = 30; // 30, 24, 15, or 'original'
    this.audioSetting = 'compress'; // 'compress', 'mute', 'keep'

    // Engine & Processing State
    this.isProcessing = false;
    this.abortSignal = { aborted: false };

    this.initDOMElements();
    this.bindEvents();
  }

  initDOMElements() {
    this.container = document.getElementById('tab-video-compress');
    this.dropzone = document.getElementById('vidcomp-dropzone');
    this.fileInput = document.getElementById('vidcomp-file-input');
    this.workspace = document.getElementById('vidcomp-workspace');

    // Video Players & Comparison View
    this.playerOriginal = document.getElementById('vidcomp-player-original');
    this.playerCompressed = document.getElementById('vidcomp-player-compressed');
    this.compressedVideoCard = document.getElementById('vidcomp-compressed-card');

    // Header & Info Badges
    this.metaFilename = document.getElementById('vidcomp-meta-filename');
    this.metaDuration = document.getElementById('vidcomp-meta-duration');
    this.metaResolution = document.getElementById('vidcomp-meta-resolution');
    this.metaOriginalSize = document.getElementById('vidcomp-meta-orig-size');
    this.changeVideoBtn = document.getElementById('vidcomp-change-video-btn');

    // Mode Selector
    this.modeTargetBtn = document.getElementById('vidcomp-mode-target-btn');
    this.modeQualityBtn = document.getElementById('vidcomp-mode-quality-btn');
    this.sectionTargetSize = document.getElementById('vidcomp-section-target-size');
    this.sectionQuality = document.getElementById('vidcomp-section-quality');

    // Preset Target Buttons & Custom Input
    this.presetBtns = document.querySelectorAll('.vidcomp-preset-btn');
    this.customSizeInput = document.getElementById('vidcomp-custom-size-input');

    // Manual Quality Controls
    this.qualitySlider = document.getElementById('vidcomp-quality-slider');
    this.qualityVal = document.getElementById('vidcomp-quality-val');

    // Resolution & FPS & Audio Selectors
    this.resolutionSelect = document.getElementById('vidcomp-resolution-select');
    this.fpsSelect = document.getElementById('vidcomp-fps-select');
    this.audioSelect = document.getElementById('vidcomp-audio-select');

    // Estimated Size & Bitrate Preview
    this.estSizeBadge = document.getElementById('vidcomp-est-size-badge');
    this.estSavingsBadge = document.getElementById('vidcomp-est-savings-badge');
    this.estBitrateBadge = document.getElementById('vidcomp-est-bitrate-badge');

    // Progress Box & Telemetry
    this.progressBox = document.getElementById('vidcomp-progress-box');
    this.progressBar = document.getElementById('vidcomp-progress-bar');
    this.progressPercent = document.getElementById('vidcomp-progress-percent');
    this.progressStatus = document.getElementById('vidcomp-progress-status');
    this.progressMeta = document.getElementById('vidcomp-progress-meta');
    this.abortBtn = document.getElementById('vidcomp-abort-btn');

    // Results Box
    this.resultBox = document.getElementById('vidcomp-result-box');
    this.resultOrigSize = document.getElementById('vidcomp-result-orig-size');
    this.resultNewSize = document.getElementById('vidcomp-result-new-size');
    this.resultSavingsBadge = document.getElementById('vidcomp-result-savings-badge');

    // Action CTAs
    this.compressBtn = document.getElementById('vidcomp-compress-btn');
    this.downloadBtn = document.getElementById('vidcomp-download-btn');
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

    if (this.changeVideoBtn) {
      this.changeVideoBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    // Mode Selector
    if (this.modeTargetBtn && this.modeQualityBtn) {
      this.modeTargetBtn.addEventListener('click', () => this.switchMode('target-size'));
      this.modeQualityBtn.addEventListener('click', () => this.switchMode('manual-quality'));
    }

    // Preset Target-MB Buttons
    if (this.presetBtns) {
      this.presetBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          this.presetBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const mb = parseFloat(btn.getAttribute('data-target-mb'));
          this.targetSizeMB = mb;
          if (this.customSizeInput) {
            this.customSizeInput.value = mb;
          }
          this.updateEstimates();
        });
      });
    }

    if (this.customSizeInput) {
      this.customSizeInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (val && val > 0) {
          this.targetSizeMB = val;
          this.presetBtns.forEach((btn) => {
            btn.classList.toggle('active', parseFloat(btn.getAttribute('data-target-mb')) === val);
          });
          this.updateEstimates();
        }
      });
    }

    // Quality Slider
    if (this.qualitySlider) {
      this.qualitySlider.addEventListener('input', (e) => {
        this.qualityPercent = parseInt(e.target.value, 10);
        if (this.qualityVal) this.qualityVal.textContent = `${this.qualityPercent}%`;
        this.updateEstimates();
      });
    }

    // Resolution Select
    if (this.resolutionSelect) {
      this.resolutionSelect.addEventListener('change', (e) => {
        this.resolutionSetting = e.target.value;
        this.updateEstimates();
      });
    }

    // FPS Select
    if (this.fpsSelect) {
      this.fpsSelect.addEventListener('change', (e) => {
        this.fpsSetting = e.target.value === 'original' ? 'original' : parseInt(e.target.value, 10);
        this.updateEstimates();
      });
    }

    // Audio Select
    if (this.audioSelect) {
      this.audioSelect.addEventListener('change', (e) => {
        this.audioSetting = e.target.value;
        this.updateEstimates();
      });
    }

    // Action CTAs
    if (this.compressBtn) {
      this.compressBtn.addEventListener('click', () => this.startCompression());
    }

    if (this.abortBtn) {
      this.abortBtn.addEventListener('click', () => this.cancelCompression());
    }

    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.downloadCompressedVideo());
    }
  }

  async loadFile(file) {
    if (!file) return;

    // Check MIME type or extension
    const validExtensions = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'];
    const nameLower = (file.name || '').toLowerCase();
    const hasValidExt = validExtensions.some(ext => nameLower.endsWith(ext));
    const isVideoMime = file.type && file.type.startsWith('video/');

    if (!hasValidExt && !isVideoMime) {
      this.app.showToast('Please select a valid video file (.mp4, .webm, .mov, etc.)', 'warning', 3000);
      return;
    }

    try {
      this.app.showToast('Inspecting video metadata and codec profile...', 'info', 2000);
      const metadata = await loadVideoMetadata(file);
      this.loadVideoData(metadata);
    } catch (err) {
      console.error('Video load error:', err);
      this.app.showToast('Could not load video: ' + err.message, 'error', 5000);
    }
  }

  loadVideoData(metadata) {
    this.currentVideo = metadata;
    this.compressedBlob = null;
    if (this.compressedUrl) {
      URL.revokeObjectURL(this.compressedUrl);
      this.compressedUrl = null;
    }

    // Toggle view from dropzone to workspace
    if (this.dropzone) this.dropzone.style.display = 'none';
    if (this.workspace) this.workspace.style.display = 'block';
    if (this.compressedVideoCard) this.compressedVideoCard.style.display = 'none';
    if (this.resultBox) this.resultBox.style.display = 'none';
    if (this.progressBox) this.progressBox.style.display = 'none';

    // Set source for original player
    if (this.playerOriginal) {
      this.playerOriginal.src = metadata.objectUrl;
      this.playerOriginal.load();
    }

    // Update metadata tags
    if (this.metaFilename) this.metaFilename.textContent = metadata.name;
    if (this.metaDuration) this.metaDuration.textContent = formatDuration(metadata.duration);
    if (this.metaResolution) this.metaResolution.textContent = `${metadata.width} × ${metadata.height}`;
    if (this.metaOriginalSize) this.metaOriginalSize.textContent = formatBytes(metadata.size);

    // Auto-select sensible target size if current video is smaller than 25MB
    const currentMB = metadata.size / (1024 * 1024);
    if (currentMB < 25 && currentMB > 16) {
      this.setTargetPreset(16);
    } else if (currentMB <= 16 && currentMB > 10) {
      this.setTargetPreset(10);
    } else if (currentMB <= 10) {
      const halfSize = Math.max(2, Math.round(currentMB * 0.5));
      this.setCustomTargetMB(halfSize);
    } else {
      this.setTargetPreset(25);
    }

    this.updateEstimates();
    this.app.showToast(`Loaded ${metadata.name} (${formatBytes(metadata.size)}, ${formatDuration(metadata.duration)})`, 'success', 2500);
  }

  setTargetPreset(mb) {
    this.targetSizeMB = mb;
    if (this.customSizeInput) this.customSizeInput.value = mb;
    if (this.presetBtns) {
      this.presetBtns.forEach((btn) => {
        btn.classList.toggle('active', parseFloat(btn.getAttribute('data-target-mb')) === mb);
      });
    }
  }

  setCustomTargetMB(mb) {
    this.targetSizeMB = mb;
    if (this.customSizeInput) this.customSizeInput.value = mb;
    if (this.presetBtns) {
      this.presetBtns.forEach(btn => btn.classList.remove('active'));
    }
  }

  switchMode(mode) {
    this.mode = mode;
    if (this.modeTargetBtn && this.modeQualityBtn) {
      this.modeTargetBtn.classList.toggle('active', mode === 'target-size');
      this.modeQualityBtn.classList.toggle('active', mode === 'manual-quality');
    }

    if (this.sectionTargetSize) this.sectionTargetSize.style.display = mode === 'target-size' ? 'block' : 'none';
    if (this.sectionQuality) this.sectionQuality.style.display = mode === 'manual-quality' ? 'block' : 'none';

    this.updateEstimates();
  }

  getCalculatedSettings() {
    if (!this.currentVideo) return null;

    const origW = this.currentVideo.width;
    const origH = this.currentVideo.height;
    const duration = this.currentVideo.duration || 1;
    const origSize = this.currentVideo.size;

    // Calculate scaled dimensions
    const dims = calculateScaledDimensions(origW, origH, this.resolutionSetting);

    // Audio Bitrate
    let audioBitrate = 64000;
    if (this.audioSetting === 'mute') audioBitrate = 0;
    else if (this.audioSetting === 'keep') audioBitrate = 128000;

    // Video Bitrate
    let videoBitrate = 1500000;
    let targetSizeBytes = 0;

    if (this.mode === 'target-size') {
      targetSizeBytes = Math.round(this.targetSizeMB * 1024 * 1024);
      // If source video is already smaller than target cap, don't inflate bitrate
      const effectiveTargetBytes = (origSize > 0 && targetSizeBytes >= origSize)
        ? Math.round(origSize * 0.90)
        : targetSizeBytes;
      videoBitrate = calculateTargetBitrate(effectiveTargetBytes, duration, audioBitrate);
    } else {
      // Manual Quality: base reference on resolution and quality percentage
      const totalPixels = dims.width * dims.height;
      // High baseline: 1080p @ 30fps ~ 4.5 Mbps at 100% quality
      const baseBitrate = (totalPixels / (1920 * 1080)) * 4500000;
      videoBitrate = Math.max(120000, Math.round(baseBitrate * (this.qualityPercent / 100)));
      targetSizeBytes = estimateOutputSize(videoBitrate, duration, this.audioSetting);
    }

    // Target FPS
    let fps = 30;
    if (this.fpsSetting === 'original') fps = 30;
    else fps = parseInt(this.fpsSetting, 10) || 30;

    return {
      width: dims.width,
      height: dims.height,
      bitrate: videoBitrate,
      targetSizeBytes,
      fps,
      duration,
      origSize
    };
  }

  updateEstimates() {
    if (!this.currentVideo) return;

    const calc = this.getCalculatedSettings();
    if (!calc) return;

    const estBytes = calc.targetSizeBytes;
    const savings = calculateSavings(calc.origSize, estBytes);

    if (this.estSizeBadge) {
      this.estSizeBadge.textContent = `~${formatBytes(estBytes)}`;
    }
    if (this.estSavingsBadge) {
      this.estSavingsBadge.textContent = savings.label;
      this.estSavingsBadge.className = `setting-value-badge ${savings.isReduction ? 'savings-badge-good' : 'savings-badge-warn'}`;
    }
    if (this.estBitrateBadge) {
      const kbps = Math.round(calc.bitrate / 1000);
      this.estBitrateBadge.textContent = `${kbps} kbps`;
    }
  }

  async startCompression() {
    if (!this.currentVideo || this.isProcessing) return;

    const calc = this.getCalculatedSettings();
    if (!calc) return;

    this.isProcessing = true;
    this.abortSignal = { aborted: false };

    // Update UI for processing
    if (this.compressBtn) {
      this.compressBtn.disabled = true;
      this.compressBtn.innerHTML = '<span class="spinner-sm"></span> Compressing...';
    }
    if (this.progressBox) this.progressBox.style.display = 'block';
    if (this.resultBox) this.resultBox.style.display = 'none';
    if (this.compressedVideoCard) this.compressedVideoCard.style.display = 'none';

    this.updateProgress({
      percent: 0,
      frame: 0,
      totalFrames: Math.round(calc.duration * calc.fps),
      speed: '1.0x',
      fps: 0,
      etaSeconds: Math.round(calc.duration)
    });

    try {
      let finalBlob = null;
      const useWebCodecs = isWebCodecsSupported();

      if (useWebCodecs) {
        if (this.progressStatus) this.progressStatus.textContent = 'Hardware GPU Acceleration active (WebCodecs + mp4-muxer)...';
        finalBlob = await compressWithWebCodecs({
          video: this.currentVideo.video,
          targetWidth: calc.width,
          targetHeight: calc.height,
          targetFps: calc.fps,
          targetBitrate: calc.bitrate,
          audioOption: this.audioSetting,
          abortSignal: this.abortSignal,
          onProgress: (p) => this.updateProgress(p)
        });
      } else {
        if (this.progressStatus) this.progressStatus.textContent = 'Encoding via MediaStream canvas pipeline...';
        finalBlob = await compressWithMediaRecorder({
          video: this.currentVideo.video,
          targetWidth: calc.width,
          targetHeight: calc.height,
          targetFps: calc.fps,
          targetBitrate: calc.bitrate,
          audioOption: this.audioSetting,
          abortSignal: this.abortSignal,
          onProgress: (p) => this.updateProgress(p)
        });
      }

      this.onCompressionSuccess(finalBlob);
    } catch (err) {
      if (this.abortSignal.aborted) {
        this.app.showToast('Video compression cancelled.', 'info', 2000);
      } else {
        console.error('Compression error:', err);
        this.app.showToast('Compression failed: ' + err.message, 'error', 5000);
      }
    } finally {
      this.isProcessing = false;
      if (this.compressBtn) {
        this.compressBtn.disabled = false;
        this.compressBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Compress Video (Hardware-Accelerated)
        `;
      }
      if (this.progressBox) this.progressBox.style.display = 'none';
    }
  }

  updateProgress(info) {
    const { percent, frame, totalFrames, speed, etaSeconds } = info;
    if (this.progressBar) this.progressBar.style.width = `${percent}%`;
    if (this.progressPercent) this.progressPercent.textContent = `${percent}%`;
    if (this.progressMeta) {
      this.progressMeta.textContent = `Frame ${frame} / ${totalFrames} · Speed: ${speed} · ETA: ${etaSeconds}s`;
    }
  }

  cancelCompression() {
    this.abortSignal.aborted = true;
    if (this.progressStatus) this.progressStatus.textContent = 'Cancelling...';
  }

  onCompressionSuccess(blob) {
    this.compressedBlob = blob;
    if (this.compressedUrl) {
      URL.revokeObjectURL(this.compressedUrl);
    }
    this.compressedUrl = URL.createObjectURL(blob);

    // Update compressed player
    if (this.playerCompressed) {
      this.playerCompressed.src = this.compressedUrl;
      this.playerCompressed.load();
    }
    if (this.compressedVideoCard) {
      this.compressedVideoCard.style.display = 'block';
    }

    // Results Box
    const savings = calculateSavings(this.currentVideo.size, blob.size);
    if (this.resultBox) {
      this.resultBox.style.display = 'block';
    }
    if (this.resultOrigSize) {
      this.resultOrigSize.textContent = formatBytes(this.currentVideo.size);
    }
    if (this.resultNewSize) {
      this.resultNewSize.textContent = formatBytes(blob.size);
    }
    if (this.resultSavingsBadge) {
      this.resultSavingsBadge.textContent = savings.label;
      this.resultSavingsBadge.className = `setting-value-badge ${savings.isReduction ? 'savings-badge-good' : 'savings-badge-warn'}`;
    }

    this.app.showToast(`Compressed to ${formatBytes(blob.size)} (${savings.label} saved)! Ready to download.`, 'success', 4000);
  }

  downloadCompressedVideo() {
    if (!this.compressedBlob || !this.currentVideo) {
      this.app.showToast('No compressed video available to download.', 'warning');
      return;
    }

    const baseName = this.currentVideo.name.replace(/\.[^/.]+$/, '');
    const ext = this.compressedBlob.type.includes('mp4') ? '.mp4' : '.webm';
    const filename = `${baseName}_compressed${ext}`;

    downloadBlob(this.compressedBlob, filename);
    this.app.showToast(`Downloaded ${filename}`, 'success', 2000);
  }
}
