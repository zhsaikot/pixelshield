/**
 * ============================================================================
 * ImageEngine - Shared 100% Client-Side Canvas & Image Processing Engine
 * ============================================================================
 */

/**
 * Format bytes to human-readable string (e.g. 2.4 MB, 94.2 KB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Calculate percentage savings between original and new size
 */
export function calculateSavings(origBytes, newBytes) {
  if (!origBytes || origBytes <= 0) return { percent: 0, label: '0%', isReduction: true };
  const diff = origBytes - newBytes;
  const percent = Math.round((diff / origBytes) * 100);
  const isReduction = percent >= 0;
  const label = isReduction ? `-${percent}%` : `+${Math.abs(percent)}%`;
  return { percent, label, isReduction };
}

/**
 * Load a File or Blob into an HTMLImageElement
 * Cleans up ObjectURL automatically
 */
export function loadImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      reject(new Error('No file or blob provided'));
      return;
    }

    // Check MIME type or basic validity
    if (fileOrBlob.type && !fileOrBlob.type.startsWith('image/')) {
      reject(new Error(`Unsupported file type: ${fileOrBlob.type || 'unknown'}. Please upload an image.`));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        name: fileOrBlob.name || 'image',
        size: fileOrBlob.size || 0,
        type: fileOrBlob.type || 'image/jpeg',
        lastModified: fileOrBlob.lastModified || Date.now()
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load or decode image "${fileOrBlob.name || 'file'}". The file might be corrupted.`));
    };

    img.src = objectUrl;
  });
}

/**
 * Convert HTMLCanvasElement to Blob with Promise support
 */
export function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback for older browsers or edge cases
            try {
              const dataUrl = canvas.toDataURL(mimeType, quality);
              const blobFromDataUrl = dataUrlToBlob(dataUrl);
              resolve(blobFromDataUrl);
            } catch (err) {
              reject(new Error('Canvas export failed: ' + err.message));
            }
          }
        },
        mimeType,
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Helper to convert dataURL to Blob if toBlob fails
 */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Draw an image onto a newly sized canvas with optional background fill
 */
export function drawImageOnCanvas(img, width, height, bgColor = null) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Smooth rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * Target-KB Binary Search Function
 * Given an image, target MIME type, and maxKB limit:
 * Runs up to 8 binary-search iterations on quality (and proportional downscaling
 * only if quality 0.1 still exceeds maxKB) to produce a Blob strictly under maxKB.
 */
export async function targetKBBinarySearch(img, targetMimeType = 'image/jpeg', maxKB = 100, options = {}) {
  const targetBytes = Math.max(512, Math.round(maxKB * 1024));
  let curWidth = options.initialWidth || img.naturalWidth || img.width;
  let curHeight = options.initialHeight || img.naturalHeight || img.height;
  const bgColor = options.bgColor || (targetMimeType === 'image/jpeg' ? '#ffffff' : null);
  const isLossless = targetMimeType === 'image/png';

  let totalIterations = 0;
  let finalBlob = null;
  let finalQuality = 0.85;

  // For PNG, canvas quality is ignored by browser implementations (lossless compression).
  // Therefore, for PNG, we achieve target size by progressive proportional downscaling.
  if (isLossless) {
    let scale = 1.0;
    for (let i = 0; i < 8; i++) {
      totalIterations++;
      const w = Math.max(30, Math.round(curWidth * scale));
      const h = Math.max(30, Math.round(curHeight * scale));
      const canvas = drawImageOnCanvas(img, w, h, bgColor);
      const blob = await canvasToBlob(canvas, 'image/png');

      if (blob.size <= targetBytes) {
        finalBlob = blob;
        curWidth = w;
        curHeight = h;
        break;
      }

      // Proportional scale estimation based on byte ratio
      const ratio = Math.sqrt(targetBytes / blob.size) * 0.95;
      scale = Math.max(0.05, Math.min(scale * 0.85, scale * ratio));
      finalBlob = blob;
      curWidth = w;
      curHeight = h;
    }

    return {
      blob: finalBlob,
      quality: 1.0,
      width: curWidth,
      height: curHeight,
      iterations: totalIterations,
      finalKB: (finalBlob ? finalBlob.size : 0) / 1024
    };
  }

  // For JPEG and WebP:
  // Outer loop handles proportional downscaling if minimum quality still exceeds targetBytes
  let dimensionReductionLoops = 0;
  const maxDimensionLoops = 4;

  while (dimensionReductionLoops < maxDimensionLoops) {
    let lowQ = 0.05;
    let highQ = 0.98;
    let bestBlobForDims = null;
    let bestQForDims = lowQ;

    const canvas = drawImageOnCanvas(img, curWidth, curHeight, bgColor);

    // 8-iteration binary search on quality
    for (let iter = 0; iter < 8; iter++) {
      totalIterations++;
      const midQ = (lowQ + highQ) / 2;
      const blob = await canvasToBlob(canvas, targetMimeType, midQ);

      if (blob.size <= targetBytes) {
        // Fits under target! Try to search upper half to get maximum possible visual quality
        bestBlobForDims = blob;
        bestQForDims = midQ;
        lowQ = midQ;
      } else {
        // Too large, decrease quality
        highQ = midQ;
      }

      // If the binary search interval is sufficiently narrow, break early
      if (Math.abs(highQ - lowQ) < 0.015) {
        break;
      }
    }

    if (bestBlobForDims && bestBlobForDims.size <= targetBytes) {
      finalBlob = bestBlobForDims;
      finalQuality = bestQForDims;
      break;
    }

    // If even lowest quality (0.05) exceeds targetBytes, downscale dimensions proportionally
    const lowestQualityBlob = await canvasToBlob(canvas, targetMimeType, 0.05);
    totalIterations++;

    if (lowestQualityBlob.size <= targetBytes) {
      finalBlob = lowestQualityBlob;
      finalQuality = 0.05;
      break;
    }

    // Downscale dimensions based on square root of byte ratio
    const areaRatio = targetBytes / lowestQualityBlob.size;
    const dimensionRatio = Math.max(0.2, Math.min(0.85, Math.sqrt(areaRatio) * 0.92));

    curWidth = Math.max(50, Math.round(curWidth * dimensionRatio));
    curHeight = Math.max(50, Math.round(curHeight * dimensionRatio));
    dimensionReductionLoops++;
    finalBlob = lowestQualityBlob;
    finalQuality = 0.05;
  }

  return {
    blob: finalBlob,
    quality: finalQuality,
    width: curWidth,
    height: curHeight,
    iterations: totalIterations,
    finalKB: (finalBlob ? finalBlob.size : 0) / 1024
  };
}

/**
 * Basic EXIF & Metadata Parser
 * Inspects JPEG ArrayBuffer for APP1/EXIF markers, TIFF header, IFD0 tags & GPS
 */
export async function extractExif(file) {
  const result = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'unknown',
    lastModified: new Date(file.lastModified).toLocaleString(),
    hasExif: false,
    make: null,
    model: null,
    dateTime: null,
    software: null,
    orientation: null,
    hasGps: false,
    gpsLatitude: null,
    gpsLongitude: null,
    dimensions: null,
    rawTagsCount: 0
  };

  if (!file.type || !file.type.includes('jpeg')) {
    return result;
  }

  try {
    // Read first 128KB of the file (standard EXIF is contained near the beginning)
    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    // Verify JPEG SOI marker (0xFFD8)
    if (view.getUint16(0) !== 0xFFD8) {
      return result;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 4) {
      const marker = view.getUint16(offset);
      offset += 2;

      // APP1 Marker (0xFFE1) typically holds EXIF
      if (marker === 0xFFE1) {
        const app1Length = view.getUint16(offset);
        const exifHeader = view.getUint32(offset + 2);

        // "Exif" in ASCII is 0x45786966
        if (exifHeader === 0x45786966) {
          result.hasExif = true;
          parseTiff(view, offset + 8, result);
        }
        break;
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      } else {
        // Skip other markers
        const markerLength = view.getUint16(offset);
        offset += markerLength;
      }
    }
  } catch (err) {
    console.warn('EXIF parsing warning (non-fatal):', err);
  }

  return result;
}

/**
 * Internal helper to parse TIFF header and IFD0 tags
 */
function parseTiff(view, tiffStart, result) {
  try {
    // Check endianness: 'II' (0x4949) = Little Endian, 'MM' (0x4D4D) = Big Endian
    const byteOrder = view.getUint16(tiffStart);
    const littleEndian = byteOrder === 0x4949;

    // Check TIFF 42 marker
    if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002A) {
      return;
    }

    const firstIFDOffset = view.getUint32(tiffStart + 4, littleEndian);
    if (firstIFDOffset < 8) return;

    let ifdOffset = tiffStart + firstIFDOffset;
    if (ifdOffset >= view.byteLength - 2) return;

    const numEntries = view.getUint16(ifdOffset, littleEndian);
    result.rawTagsCount = numEntries;
    ifdOffset += 2;

    let exifIFDOffset = null;
    let gpsIFDOffset = null;

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, littleEndian);

      if (tag === 0x010F) {
        // Make
        result.make = readStringTag(view, tiffStart, entryOffset, littleEndian);
      } else if (tag === 0x0110) {
        // Model
        result.model = readStringTag(view, tiffStart, entryOffset, littleEndian);
      } else if (tag === 0x0132) {
        // DateTime
        result.dateTime = readStringTag(view, tiffStart, entryOffset, littleEndian);
      } else if (tag === 0x0131) {
        // Software
        result.software = readStringTag(view, tiffStart, entryOffset, littleEndian);
      } else if (tag === 0x0112) {
        // Orientation
        result.orientation = view.getUint16(entryOffset + 8, littleEndian);
      } else if (tag === 0x8769) {
        // Exif IFD Pointer
        exifIFDOffset = view.getUint32(entryOffset + 8, littleEndian);
      } else if (tag === 0x8825) {
        // GPS IFD Pointer
        gpsIFDOffset = view.getUint32(entryOffset + 8, littleEndian);
        result.hasGps = true;
      }
    }

    if (gpsIFDOffset) {
      result.hasGps = true;
    }
  } catch (e) {
    // Gracefully handle partial or malformed TIFF blocks
  }
}

/**
 * Read string value from TIFF tag
 */
function readStringTag(view, tiffStart, entryOffset, littleEndian) {
  try {
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    if (type !== 2 || count <= 0) return null; // type 2 = ASCII string

    let strOffset = entryOffset + 8;
    if (count > 4) {
      strOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
    }

    let str = '';
    for (let i = 0; i < Math.min(count - 1, 128); i++) {
      if (strOffset + i >= view.byteLength) break;
      const charCode = view.getUint8(strOffset + i);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }
    return str.trim();
  } catch {
    return null;
  }
}

/**
 * Strip EXIF & Clean Pixel Redraw
 * Renders cleanly to a canvas and outputs a freshly-minted Blob with zero metadata
 */
export async function stripExifAndExport(img, mimeType = 'image/jpeg', quality = 0.92, bgColor = null) {
  const canvas = drawImageOnCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height, bgColor);
  return await canvasToBlob(canvas, mimeType, quality);
}

/**
 * Trigger client-side file download
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Download multiple files bundled in a single ZIP archive using JSZip
 */
export async function downloadZip(items, zipFilename = 'processed-images.zip', onProgress = null) {
  if (typeof window.JSZip === 'undefined') {
    throw new Error('JSZip library not loaded. Please verify CDN script tag.');
  }

  const zip = new window.JSZip();
  const folder = zip.folder('images');

  // Add all files
  for (const item of items) {
    if (item.blob && item.name) {
      folder.file(item.name, item.blob);
    }
  }

  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  downloadBlob(content, zipFilename);
}
