/**
 * ============================================================================
 * VideoEngine - 100% Client-Side In-Browser Video Compression & Processing
 * Hardware-Accelerated WebCodecs (VideoEncoder + VideoDecoder) & mp4-muxer
 * Zero-Server, 100% Private, Zero Telemetry
 * ============================================================================
 */

import { formatBytes, calculateSavings, downloadBlob } from './image-engine.js';

let mp4MuxerModule = null;

/**
 * Dynamically import mp4-muxer library on demand
 */
export async function getMp4Muxer() {
  if (mp4MuxerModule) return mp4MuxerModule;
  try {
    mp4MuxerModule = await import('https://esm.sh/mp4-muxer@5.1.4');
    return mp4MuxerModule;
  } catch (e1) {
    console.warn('Failed esm.sh mp4-muxer import, trying jsdelivr...', e1);
    try {
      mp4MuxerModule = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.4/+esm');
      return mp4MuxerModule;
    } catch (e2) {
      console.warn('Failed jsdelivr mp4-muxer import, trying unpkg...', e2);
      mp4MuxerModule = await import('https://unpkg.com/mp4-muxer@5.1.4/build/mp4-muxer.mjs');
      return mp4MuxerModule;
    }
  }
}

/**
 * Load Video metadata and create HTMLVideoElement
 */
export function loadVideoMetadata(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      reject(new Error('No video file provided'));
      return;
    }

    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(fileOrBlob);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let hasResolved = false;

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };

    const onLoaded = () => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();

      const duration = video.duration || 0;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const name = fileOrBlob.name || 'video.mp4';
      const size = fileOrBlob.size || 0;
      const type = fileOrBlob.type || 'video/mp4';

      resolve({
        video,
        file: fileOrBlob,
        blob: fileOrBlob,
        objectUrl,
        duration,
        width,
        height,
        name,
        size,
        type,
        aspectRatio: width / height
      });
    };

    const onError = () => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load video "${fileOrBlob.name || 'file'}". The codec or format may not be supported by your browser.`));
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);

    // Timeout safety
    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        cleanup();
        reject(new Error('Timed out waiting for video metadata. Please verify the file is a valid video.'));
      }
    }, 15000);

    video.src = objectUrl;
    video.load();
  });
}

/**
 * Calculate target video bitrate given desired file size and duration
 * S_target in bytes, duration in seconds, audioBitrate in bps (e.g. 64000)
 */
export function calculateTargetBitrate(targetSizeBytes, durationSeconds, audioBitrate = 64000) {
  if (!durationSeconds || durationSeconds <= 0) return 1500000;
  
  // Total bits available
  const totalBits = targetSizeBytes * 8;
  const totalBitrate = totalBits / durationSeconds;
  
  // Reserve space for audio and MP4 container headers (~4% safety margin)
  const safeTotalBitrate = totalBitrate * 0.96;
  const videoBitrate = Math.max(80000, safeTotalBitrate - audioBitrate);
  
  return Math.round(videoBitrate);
}

/**
 * Calculate scaled dimensions while preserving aspect ratio and ensuring even numbers
 * (H.264/WebCodecs encoders strictly require width and height divisible by 2)
 */
export function calculateScaledDimensions(origWidth, origHeight, maxDimensionSetting) {
  if (!maxDimensionSetting || maxDimensionSetting === 'original') {
    let w = origWidth;
    let h = origHeight;
    if (w % 2 !== 0) w -= 1;
    if (h % 2 !== 0) h -= 1;
    return { width: Math.max(2, w), height: Math.max(2, h) };
  }

  const maxTarget = parseInt(maxDimensionSetting, 10);
  let w = origWidth;
  let h = origHeight;
  const isLandscape = origWidth >= origHeight;
  const currentMax = isLandscape ? origWidth : origHeight;

  if (currentMax > maxTarget) {
    const scale = maxTarget / currentMax;
    w = Math.round(origWidth * scale);
    h = Math.round(origHeight * scale);
  }

  // Ensure divisible by 2
  if (w % 2 !== 0) w -= 1;
  if (h % 2 !== 0) h -= 1;

  return { width: Math.max(2, w), height: Math.max(2, h) };
}

/**
 * Estimate output size given bitrate, duration, and audio options
 */
export function estimateOutputSize(videoBitrate, durationSeconds, audioOption = 'compress') {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  let audioBitrate = 64000; // 64 kbps
  if (audioOption === 'mute') audioBitrate = 0;
  else if (audioOption === 'original') audioBitrate = 128000; // 128 kbps estimate

  const totalBits = (videoBitrate + audioBitrate) * durationSeconds;
  const totalBytes = (totalBits / 8) * 1.03; // container overhead
  return Math.round(totalBytes);
}

/**
 * Check if WebCodecs VideoEncoder is supported in this browser
 */
export function isWebCodecsSupported() {
  return typeof window.VideoEncoder !== 'undefined' && typeof window.VideoFrame !== 'undefined';
}

/**
 * Check if MediaRecorder is supported
 */
export function isMediaRecorderSupported() {
  return typeof window.MediaRecorder !== 'undefined';
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Primary Video Compressor: Hardware-Accelerated WebCodecs + mp4-muxer
 * 
 * @param {Object} options
 * @param {HTMLVideoElement} options.video
 * @param {number} options.targetWidth
 * @param {number} options.targetHeight
 * @param {number} options.targetFps (e.g. 30, 24, 15)
 * @param {number} options.targetBitrate (in bps)
 * @param {string} options.audioOption ('keep', 'compress', 'mute')
 * @param {Function} options.onProgress Callback({ percent, frame, totalFrames, fps, speed, etaSeconds })
 * @param {Object} options.abortSignal Ref { aborted: false }
 */
export async function compressWithWebCodecs(options) {
  const {
    video,
    targetWidth,
    targetHeight,
    targetFps = 30,
    targetBitrate = 1500000,
    audioOption = 'mute',
    onProgress = null,
    abortSignal = { aborted: false }
  } = options;

  const muxerLib = await getMp4Muxer();
  if (!muxerLib || !muxerLib.Muxer) {
    throw new Error('Could not load mp4-muxer module.');
  }

  const { Muxer, ArrayBufferTarget } = muxerLib;

  // Setup offscreen canvas for frame resizing
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Setup MP4 Muxer
  const muxerTarget = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: 'avc',
      width: targetWidth,
      height: targetHeight
    },
    fastStart: 'in-memory'
  });

  // Determine AVC codec string supported by browser
  // High profile: avc1.640028, Main: avc1.4d002a, Baseline: avc1.42001f
  const candidateCodecs = ['avc1.4d002a', 'avc1.42001f', 'avc1.640028'];
  let chosenCodec = 'avc1.4d002a';

  if (window.VideoEncoder.isConfigSupported) {
    for (const c of candidateCodecs) {
      try {
        const support = await window.VideoEncoder.isConfigSupported({
          codec: c,
          width: targetWidth,
          height: targetHeight,
          bitrate: targetBitrate,
          framerate: targetFps
        });
        if (support && support.supported) {
          chosenCodec = c;
          break;
        }
      } catch (e) {
        // try next
      }
    }
  }

  // Setup VideoEncoder
  let encodeError = null;
  const encoder = new window.VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      console.error('VideoEncoder error:', err);
      encodeError = err;
    }
  });

  encoder.configure({
    codec: chosenCodec,
    width: targetWidth,
    height: targetHeight,
    bitrate: targetBitrate,
    framerate: targetFps,
    bitrateMode: 'variable',
    latencyMode: 'quality'
  });

  const duration = video.duration || 1;
  const frameIntervalSec = 1 / targetFps;
  const totalFrames = Math.max(1, Math.round(duration * targetFps));

  const startTime = performance.now();
  let processedFrames = 0;
  const keyFrameInterval = targetFps * 2; // keyframe every 2 seconds

  // Step through video timeline and encode frames
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (abortSignal.aborted) {
      encoder.close();
      throw new Error('Video compression was cancelled by user.');
    }
    if (encodeError) {
      encoder.close();
      throw encodeError;
    }

    const targetTime = Math.min(duration - 0.001, frameIndex * frameIntervalSec);

    // Seek video to exact frame
    await seekVideoTo(video, targetTime);

    // Draw video frame to scaled canvas
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Create VideoFrame from canvas
    const timestampMicroseconds = Math.round(targetTime * 1000000);
    const videoFrame = new window.VideoFrame(canvas, {
      timestamp: timestampMicroseconds,
      duration: Math.round(frameIntervalSec * 1000000)
    });

    const isKeyFrame = frameIndex % keyFrameInterval === 0;
    encoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    processedFrames++;

    // Calculate progress and telemetry metrics
    if (onProgress && (processedFrames % 3 === 0 || processedFrames === totalFrames)) {
      const now = performance.now();
      const elapsedSeconds = (now - startTime) / 1000;
      const currentFps = elapsedSeconds > 0 ? processedFrames / elapsedSeconds : 0;
      const speedMultiplier = (currentFps / targetFps).toFixed(1);
      const remainingFrames = totalFrames - processedFrames;
      const etaSeconds = currentFps > 0 ? Math.max(0, Math.round(remainingFrames / currentFps)) : 0;
      const percent = Math.min(99, Math.round((processedFrames / totalFrames) * 100));

      onProgress({
        percent,
        frame: processedFrames,
        totalFrames,
        fps: Math.round(currentFps),
        speed: `${speedMultiplier}x`,
        etaSeconds
      });
    }

    // Allow browser event loop turn to keep UI responsive
    if (processedFrames % 10 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // Flush remaining frames from encoder
  await encoder.flush();
  encoder.close();

  // Finalize MP4 container
  muxer.finalize();
  const buffer = muxerTarget.buffer;
  const compressedBlob = new Blob([buffer], { type: 'video/mp4' });

  if (onProgress) {
    onProgress({
      percent: 100,
      frame: totalFrames,
      totalFrames,
      fps: 0,
      speed: 'Done',
      etaSeconds: 0
    });
  }

  return compressedBlob;
}

/**
 * Helper to accurately seek video element to timestamp
 */
function seekVideoTo(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }

    let resolved = false;
    const onSeeked = () => {
      if (resolved) return;
      resolved = true;
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };

    video.addEventListener('seeked', onSeeked, { once: true });

    // Fallback timer in case seeked doesn't fire
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }
    }, 400);

    video.currentTime = time;
  });
}

/**
 * Fallback Video Compressor using Canvas Stream + MediaRecorder
 * Compatible with all browsers without requiring WebCodecs
 */
export async function compressWithMediaRecorder(options) {
  const {
    video,
    targetWidth,
    targetHeight,
    targetFps = 30,
    targetBitrate = 1500000,
    audioOption = 'mute',
    onProgress = null,
    abortSignal = { aborted: false }
  } = options;

  if (!isMediaRecorderSupported()) {
    throw new Error('MediaRecorder is not supported in this browser.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

  // Choose MIME type
  const candidates = [
    'video/mp4; codecs=avc1',
    'video/mp4',
    'video/webm; codecs=h264',
    'video/webm; codecs=vp9',
    'video/webm'
  ];

  let selectedMime = 'video/webm';
  for (const m of candidates) {
    if (window.MediaRecorder.isTypeSupported(m)) {
      selectedMime = m;
      break;
    }
  }

  const stream = canvas.captureStream(targetFps);

  // Audio track handling
  let audioTrack = null;
  if (audioOption !== 'mute') {
    try {
      if (typeof video.captureStream === 'function') {
        const vStream = video.captureStream();
        const aTracks = vStream.getAudioTracks();
        if (aTracks.length > 0) {
          audioTrack = aTracks[0];
          stream.addTrack(audioTrack);
        }
      }
    } catch (e) {
      console.warn('Could not capture audio track from video:', e);
    }
  }

  const recorderOptions = {
    mimeType: selectedMime,
    videoBitsPerSecond: targetBitrate
  };

  const recorder = new window.MediaRecorder(stream, recorderOptions);
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const duration = video.duration || 1;
  const totalFrames = Math.max(1, Math.round(duration * targetFps));
  const frameIntervalSec = 1 / targetFps;

  video.muted = true;
  video.currentTime = 0;
  await new Promise(r => setTimeout(r, 100));

  recorder.start();

  const startTime = performance.now();
  let processedFrames = 0;

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (abortSignal.aborted) {
      recorder.stop();
      throw new Error('Video compression was cancelled by user.');
    }

    const targetTime = Math.min(duration - 0.001, frameIndex * frameIntervalSec);
    await seekVideoTo(video, targetTime);

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    processedFrames++;

    if (onProgress && (processedFrames % 5 === 0 || processedFrames === totalFrames)) {
      const now = performance.now();
      const elapsedSeconds = (now - startTime) / 1000;
      const currentFps = elapsedSeconds > 0 ? processedFrames / elapsedSeconds : 0;
      const speedMultiplier = (currentFps / targetFps).toFixed(1);
      const remainingFrames = totalFrames - processedFrames;
      const etaSeconds = currentFps > 0 ? Math.max(0, Math.round(remainingFrames / currentFps)) : 0;
      const percent = Math.min(99, Math.round((processedFrames / totalFrames) * 100));

      onProgress({
        percent,
        frame: processedFrames,
        totalFrames,
        fps: Math.round(currentFps),
        speed: `${speedMultiplier}x`,
        etaSeconds
      });
    }

    await new Promise(r => setTimeout(r, 5));
  }

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const outputMime = selectedMime.includes('mp4') ? 'video/mp4' : 'video/webm';
      const finalBlob = new Blob(chunks, { type: outputMime });
      if (onProgress) {
        onProgress({
          percent: 100,
          frame: totalFrames,
          totalFrames,
          fps: 0,
          speed: 'Done',
          etaSeconds: 0
        });
      }
      resolve(finalBlob);
    };

    recorder.onerror = (err) => {
      reject(err);
    };

    recorder.stop();
  });
}
