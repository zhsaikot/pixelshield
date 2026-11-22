# PixelSafe Studio 🛡️
> **100% Client-Side Privacy Image & Document Studio**  
> Pure HTML5, Modern CSS3, and Modular Vanilla ES6+ JavaScript. Optimized for direct deployment on GitHub Pages with zero server backend.

[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Local-success?style=flat-square&logo=shield)](https://github.com)
[![Deployment: GitHub Pages Ready](https://img.shields.io/badge/Deploy-GitHub%20Pages%20Ready-blue?style=flat-square&logo=github)](https://pages.github.com)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Vanilla%20ES6)-orange?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🌟 Highlights & Zero-Server Guarantee

- **🔒 Zero-Server Processing:** Every image operation (compression, resizing, format conversion, EXIF scrubbing, and passport sheet generation) runs strictly inside the user's browser using HTML5 `<canvas>`, `FileReader`, and `Blob` APIs.
- **🛡️ 100% Local Privacy:** Files never leave your device. No analytics, no tracking, no external API calls, and no server upload endpoints. Works completely offline.
- **⚡ Target-KB Binary Search Engine:** Automatically balances compression quality and proportional downscaling across an 8-pass binary search loop to hit exact government portal and document upload size caps (e.g. `50 KB`, `100 KB`, `200 KB`).
- **🖨️ ID & Passport Photo Studio:** Interactive biometric cropping, zoom/pan controls, head and eye alignment guides, background tinting, and high-DPI (300 DPI) printable photo sheets tiled for 4×6" photo paper or A4 paper with cut-guide lines.
- **📦 Batch Processing & ZIP Export:** Process dozens of images concurrently with live size comparison badges (`2.4 MB → 94 KB (-96%)`), individual downloads, or single-click ZIP archive exports via bundled JSZip.

---

## 📁 Modular Directory Structure

```text
privacy-image-studio/
├── index.html                  # Accessible, responsive HTML5 Studio Shell
├── manifest.json               # PWA Web Application Manifest
├── README.md                   # Complete documentation & GitHub Pages deployment guide
├── css/
│   ├── variables.css           # Design tokens, color system, dark/light themes
│   └── style.css               # Studio layout, responsive components, biometric overlays
└── js/
    ├── app.js                  # Main controller, hash router, theme toggle, toast alerts
    ├── utils/
    │   └── image-engine.js     # Shared canvas engine, binary search, EXIF parser, ZIP helper
    └── tools/
        ├── compressor.js       # Tool 1: Smart Compressor & Target-KB Engine
        ├── converter-exif.js   # Tool 2: Format Converter & EXIF Metadata Stripper
        └── passport-maker.js   # Tool 3: ID & Passport Studio & Printable Sheet Maker
```

All asset and script references use clean relative paths (`./css/...`, `./js/...`), ensuring the app works out of the box both at root domains and on GitHub Pages subpaths (`https://<username>.github.io/<repo-name>/`).

---

## 🛠️ Feature Deep Dive

### 1. Smart Compressor & Target-KB Studio (`#compress`)
- **Quality & Resize Mode:**
  - Interactive quality slider (10% to 100%) with live preview and byte counter.
  - Optional dimension resizing (Max Width / Max Height) with one-click aspect ratio locking.
  - Output formats: JPEG, WebP, or Preserve Original.
- **Target File Size (KB) Mode:**
  - Enter exact size constraints (e.g. `50 KB`, `100 KB`, `200 KB`, `500 KB`).
  - **8-Pass Binary Search:** The canvas engine performs an 8-iteration binary search on JPEG/WebP compression quality. If an oversized image at minimum quality (0.05) still exceeds the target size, the engine dynamically calculates proportional downscaling to guarantee strict compliance without distorting proportions.
- **Batch Actions:** Live size comparison (`2.4 MB → 94 KB (-96%)`), individual downloads, and "Download All as ZIP".

### 2. Format Converter & EXIF Stripper (`#convert`)
- **Modern Format Conversion:** Convert bulk images between **WebP**, **JPEG**, and **PNG**.
- **Transparency Handling:** Select background fill color (Pure White `#FFFFFF`, Black `#000000`, Light Grey `#F3F4F6`, or custom hex) when converting transparent PNG/WebP images to JPEG.
- **Automatic EXIF Scrubbing:** Redrawing pixel data through a fresh offscreen `<canvas>` completely purges all metadata chunks (APP1, EXIF, GPS location coordinates, camera model, exposure settings, software tags, and timestamps).
- **Metadata Inspector:** Inspect detected EXIF tags (Make, Model, Date Taken, and GPS warning flags) prior to sanitization.

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

---

## 🚀 Deployment to GitHub Pages

Deploying PixelSafe Studio takes less than 60 seconds:

1. **Initialize Git Repository:**
   ```bash
   cd privacy-image-studio
   git init
   git add .
   git commit -m "feat: initial commit of PixelSafe Studio"
   ```

2. **Push to GitHub:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - In your GitHub repository, navigate to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select `Deploy from a branch`.
   - Select branch `main` and folder `/(root)`.
   - Click **Save**.
   - Your studio will be live in moments at: `https://<your-username>.github.io/<your-repo-name>/`

---

## 💻 Running Locally

Because PixelSafe Studio uses pure Vanilla ES6 JavaScript modules (`import`/`export`), it should be served via any local HTTP server (browser security policies restrict ES6 module loading directly over `file://`):

### Option 1: Python 3
```bash
python -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Option 2: Node `npx serve` or `npx live-server`
```bash
npx serve .
# or
npx live-server .
```

### Option 3: VS Code / IDE Live Server
Right-click `index.html` and click **"Open with Live Server"**.

---

## 🛡️ Security & Privacy Architecture

| Vector | PixelSafe Studio Implementation | Risk Level |
| :--- | :--- | :--- |
| **Network Requests** | Zero outbound requests for image data. Images never touch any server. | **None (0%)** |
| **EXIF & Geolocation** | Redrawn to canvas memory buffer, discarding all TIFF/EXIF/GPS metadata chunks. | **Purged completely** |
| **Data Retention** | Ephemeral memory only (`URL.revokeObjectURL` cleanup). No IndexedDB or localStorage storage of raw images. | **None (0%)** |
| **Offline Support** | Fully functional without internet connection. | **100% Offline** |

---

## 📄 License

MIT License — Feel free to use, customize, and deploy for personal or commercial projects.
