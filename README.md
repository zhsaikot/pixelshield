# PixelShield 🛡️
> **100% Client-Side Privacy Media Lab & Document Studio**  
> Pure HTML5, Modern CSS3, and Modular Vanilla ES6+ JavaScript. Designed with a clean SaaS aesthetic, optimized for direct deployment on GitHub Pages with zero server backend.

[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Local-success?style=flat-square&logo=shield)](https://github.com)
[![Deployment: GitHub Pages Ready](https://img.shields.io/badge/Deploy-GitHub%20Pages%20Ready-blue?style=flat-square&logo=github)](https://pages.github.com)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Vanilla%20ES6)-orange?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Live App](https://img.shields.io/badge/Live-zhsaikot.github.io%2Fpixelshield-brightgreen?style=flat-square)](https://zhsaikot.github.io/pixelshield/)

---

## 🌟 Highlights & Zero-Server Guarantee

- **🔒 Zero-Server Processing:** Every operation (compression, resizing, format conversion, EXIF scrubbing, passport sheet generation, PDF generation, sensitive redaction, signature cleaning, watermarking, and asset generation) runs strictly inside the user's browser using HTML5 `<canvas>`, `FileReader`, `Blob`, `jsPDF`, and `JSZip`.
- **🛡️ 100% Local Privacy:** Files never leave your device. No analytics, no tracking, no external API calls, and no server upload endpoints. Works completely offline.
- **⚡ Target-KB Binary Search Engine:** Automatically balances compression quality and proportional downscaling across an 8-pass binary search loop to hit exact government portal and document upload size caps (e.g. `50 KB`, `100 KB`, `200 KB`).
- **🔍 Interactive Before/After Split Slider:** Compare original and compressed image fidelity side-by-side with a draggable split-screen comparison modal.
- **🏷️ Smart Batch Rename:** Prefix all processed files automatically before exporting single files or bundled ZIP archives.
- **🖨️ Complete 7-in-1 Privacy Suite:** From ID sheets and PDF compilation to sensitive document censorship and job portal signature binarization.

---

## 📁 Modular Directory Structure

```text
pixelshield/
├── index.html                  # Accessible, responsive HTML5 Studio Shell
├── manifest.json               # PWA Web Application Manifest
├── README.md                   # Complete documentation & GitHub Pages deployment guide
├── css/
│   ├── variables.css           # Design tokens, color system, dark/light themes
│   └── style.css               # Studio layout, responsive components, tool interfaces
└── js/
    ├── app.js                  # Main controller, hash router, theme toggle, toast alerts
    ├── utils/
    │   └── image-engine.js     # Shared canvas engine, binary search, EXIF parser, ZIP helper
    └── tools/
        ├── compressor.js       # Tool 1: Smart Compressor, Target-KB & Split Comparison
        ├── converter-exif.js   # Tool 2: Format Converter, EXIF Stripper & Batch Renamer
        ├── passport-maker.js   # Tool 3: ID & Passport Studio & Printable Sheet Maker
        ├── image-to-pdf.js     # Tool 4: Multi-Image to PDF Studio (jsPDF)
        ├── redactor.js         # Tool 5: Privacy Redactor / Blur, Pixelate & Censor Tool
        ├── signature-maker.js  # Tool 6: Signature Cleaner/Resizer & Watermark Studio
        └── asset-generator.js  # Tool 7: Favicon Suite & Social Media Asset Generator
```

All asset and script references use clean relative paths (`./css/...`, `./js/...`), ensuring the app works out of the box both at root domains and on GitHub Pages subpaths (`https://<username>.github.io/<repo-name>/`).

---

## 🛠️ Complete Suite of 7 Privacy Tools

### 1. Smart Compressor & Target-KB Studio (`#compress`)
- **Quality & Resize Mode:**
  - Interactive quality slider (10% to 100%) with live preview and byte counter.
  - Optional dimension resizing (Max Width / Max Height) with one-click aspect ratio locking.
  - Output formats: JPEG, WebP, or Preserve Original.
- **Target File Size (KB) Mode:**
  - Enter exact size constraints (e.g. `50 KB`, `100 KB`, `200 KB`, `500 KB`).
  - **8-Pass Binary Search:** Performs an 8-iteration binary search on JPEG/WebP compression quality. If an oversized image at minimum quality (0.05) still exceeds the target size, the engine dynamically calculates proportional downscaling to guarantee strict compliance without distorting proportions.
- **Interactive Before/After Split Comparison:**
  - Click "Compare" on any compressed item to open an interactive side-by-side split slider to visually inspect pixel quality differences.
- **Batch Actions & Smart Renaming:**
  - Live size comparison (`2.4 MB → 94 KB (-96%)`), custom filename prefix input, individual downloads, and single-click "Download All as ZIP".

### 2. Format Converter & EXIF Stripper (`#convert`)
- **Modern Format Conversion:** Convert bulk images between **WebP**, **JPEG**, and **PNG**.
- **Transparency Handling:** Select background fill color (Pure White `#FFFFFF`, Black `#000000`, Light Grey `#F3F4F6`, or custom hex) when converting transparent PNG/WebP images to JPEG.
- **Automatic EXIF Scrubbing:** Redrawing pixel data through a fresh offscreen `<canvas>` completely purges all metadata chunks (APP1, EXIF, GPS location coordinates, camera model, exposure settings, software tags, and timestamps).
- **Metadata Inspector:** Inspect detected EXIF tags (Make, Model, Date Taken, and GPS warning flags) prior to sanitization.
- **Smart Prefix Renaming:** Batch rename with custom prefixes on ZIP export.

### 3. ID & Passport Photo Sheet Maker (`#passport`)
- **Standard International Presets:**
  - `35 × 45 mm` (Standard Passport / Schengen / UK / Australia / Global - 413 × 531 px @ 300 DPI)
  - `2 × 2 inch` (US Passport & Visa / India Visa - 600 × 600 px @ 300 DPI)
  - `300 × 300 px` (Digital Applications / Portal Uploads)
  - `35 × 35 mm` (Japan / Asian ID)
  - `50 × 70 mm` (Canadian Passport)
- **Interactive Biometric Cropper:**
  - Drag to pan, mouse-wheel or slider to zoom (50% to 300%).
  - Rotation straightener slider (-45° to +45°) to correct tilted headshots.
  - Horizontal flip toggle.
  - Biometric guideline overlay: Face oval boundary (crown to chin 70-80% height), eye level guideline (56-60% height), and center vertical axis.
- **Studio Background Replacer:** Select Pure White, Off-White, Light Blue (standard for Asian/Arab passports), or Original.
- **Two Export Modes:**
  1. **Single Digital Photo:** 300 DPI high-resolution JPEG/PNG formatted to exact preset dimensions.
  2. **Printable Photo Sheet:** Automatically tiles multiple copies (e.g., 8 photos on 4×6" photo paper or 24+ photos on A4 paper) with subtle scissor cut-guide lines and corner tick marks. Features live miniature sheet preview.

### 4. Multi-Image to PDF Studio (`#img-to-pdf`)
- **Multi-Image Drag & Drop:** Upload batches of receipts, contract pages, or photos.
- **Interactive Page Reordering:** Move pages left/right or remove individual pages with live re-indexed page thumbnails.
- **Configurable Document Settings:**
  - Page Formats: `A4`, `Letter`, or `Fit to Image`.
  - Orientations: `Portrait` or `Landscape` (with auto-orient option for "Fit to Image").
  - Margins: `None (0 mm)`, `Small (10 mm)`, `Medium (20 mm)`.
  - Image Compression: Adjustable quality slider from high fidelity to small file size.
- **Local PDF Engine:** Utilizes client-side `jsPDF` to compile and download multi-page PDFs with zero server transmissions.

### 5. Privacy Redactor / Blur & Censor Tool (`#redact`)
- **Interactive Canvas Redactor:** Upload screenshots, identity cards, or sensitive documents and drag selection boxes directly over private details (phone numbers, National IDs, bank accounts, faces).
- **3 Redaction Modes:**
  1. **Gaussian Blur:** Soft optical blurring with adjustable intensity radius.
  2. **Pixelate (Mosaic):** Heavy cryptographic mosaic block obfuscation with adjustable block size.
  3. **Solid Blackout Bar:** Opaque redaction bar meeting government disclosure standards.
- **Precision Workflow:** Multi-step Undo (`Ctrl+Z`), full reset, zoom/pan capability, and clean export (PNG/JPEG) with complete EXIF metadata stripping.

### 6. Job Portal Signature & Watermark Studio (`#signature`)
- **Tab A — Signature Cleaner & Resizer:**
  - **Paper-to-Clean Digital Conversion:** Upload a photo of a signature taken on paper with uneven shadows or draw live on a smooth touch/mouse signature pad.
  - **Binarization & Threshold Engine:** Adjust threshold slider to remove off-white paper, shadows, and wrinkles, turning signatures into crisp transparent-background PNGs or pure white JPGs.
  - **Portal Size & KB Presets:** One-click presets for government and job portal requirements:
    - `300 × 80 px` under `60 KB`
    - `300 × 300 px` under `100 KB`
    - Custom dimensions and target KB using the built-in binary search engine.
- **Tab B — Text & Logo Watermark Overlay:**
  - Add copyright notices or draft stamps to protect confidential previews.
  - Text watermarks with customizable font size, color, opacity, and rotation angle (-90° to +90°).
  - Flexible positioning: Tiled repeated pattern, Center, Top-Left, Top-Right, Bottom-Left, Bottom-Right.
  - Logo watermark support: Overlay company logos or stamps with transparency control.

### 7. Favicon & Social Asset Generator (`#assets`)
- **Subtab A — Favicon Suite:**
  - Upload a high-resolution logo to generate all standard web and mobile icon sizes: `16 × 16`, `32 × 32`, `48 × 48`, `180 × 180` (Apple Touch Icon), and `512 × 512` (PWA).
  - One-click bundled ZIP download containing all 5 optimized PNG icons.
  - Instant copyable HTML `<link rel="icon">` snippet ready to paste into website headers.
- **Subtab B — Social Media Crop & Blur-Pad:**
  - Standard aspect ratio presets:
    - `1:1` (Instagram / Square Post)
    - `9:16` (Story / Reels / TikTok)
    - `16:9` (YouTube Thumbnail / Twitter Card)
    - `4:5` (Instagram Portrait)
  - **Dual Layout Options:** Center crop to fill or intelligent **Blur-Pad** (scales the entire image to fit while filling letterbox bars with an aesthetically pleasing blurred version of the photo).

---

## 🚀 Deployment to GitHub Pages

Deploying PixelShield takes less than 60 seconds:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: complete PixelShield 7-in-1 privacy studio"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Enable GitHub Pages:**
   - In your GitHub repository, navigate to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select `Deploy from a branch`.
   - Select branch `main` and folder `/(root)`.
   - Click **Save**.
   - Your studio will be live in moments at: `https://zhsaikot.github.io/pixelshield/`

---

## 💻 Running Locally

Because PixelShield uses pure Vanilla ES6 JavaScript modules (`import`/`export`), serve it via any local HTTP server:

### Option 1: Python 3
```bash
python -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Option 2: Node `npx serve`
```bash
npx serve .
```

### Option 3: VS Code / IDE Live Server
Right-click `index.html` and select **"Open with Live Server"**.

---

## 🛡️ Security & Privacy Architecture

| Vector | PixelShield Implementation | Risk Level |
| :--- | :--- | :--- |
| **Network Requests** | Zero outbound requests for image or document data. Operations never touch any server. | **None (0%)** |
| **EXIF & Geolocation** | Redrawn to fresh canvas memory buffers, discarding all TIFF, EXIF, and GPS coordinates. | **Purged completely** |
| **Data Retention** | Ephemeral browser memory only (`URL.revokeObjectURL` cleanup). No IndexedDB or localStorage storage of raw images. | **None (0%)** |
| **Offline Support** | Fully functional without internet connection once cached. | **100% Offline** |

---

## 📄 License

MIT License — Free for personal and commercial use.
