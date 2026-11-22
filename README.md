# PixelShield 🛡️
> **100% Client-Side Privacy Media Lab & Desktop-Grade Creative Studio**  
> Pure HTML5, Modern CSS3, and Modular Vanilla ES6+ JavaScript. Inspired by PixorAI desktop studio design with collapsible sidebar, central interactive before/after split canvas, floating frosted export dock, and 1-click synthetic test presets. Optimized for direct deployment on GitHub Pages with zero server backend.

[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Local-success?style=flat-square&logo=shield)](https://github.com/zhsaikot/pixelshield)
[![Deployment: GitHub Pages Ready](https://img.shields.io/badge/Deploy-GitHub%20Pages%20Ready-blue?style=flat-square&logo=github)](https://zhsaikot.github.io/pixelshield/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Vanilla%20ES6)-orange?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Live App](https://img.shields.io/badge/Live-zhsaikot.github.io%2Fpixelshield-brightgreen?style=flat-square)](https://zhsaikot.github.io/pixelshield/)

---

## 🌟 Highlights & Zero-Server Guarantee

- **🔒 Zero-Server Processing:** Every operation (compression, resizing, format conversion, EXIF scrubbing, passport sheet generation, PDF generation, sensitive redaction, signature cleaning, watermarking, and asset generation) runs strictly inside the user's browser using HTML5 `<canvas>`, `FileReader`, `Blob`, `jsPDF`, and `JSZip`.
- **🛡️ 100% Local Privacy:** Files never leave your device. No analytics, no tracking, no external API calls, and no server upload endpoints. Works completely offline.
- **⚡ Target-KB Binary Search Engine:** Automatically balances compression quality and proportional downscaling across an 8-pass binary search loop to hit exact government portal and document upload size caps (e.g. `50 KB`, `100 KB`, `200 KB`).
- **🎨 Desktop-Grade Studio Interface:** Inspired by high-end creative desktop software (PixorAI) with collapsible tool navigation, central interactive split canvas stage, floating frosted export dock with live scale (`0.5x`, `1x`, `2x`) and format pills, and horizontal batch queue filmstrip.
- **⚡ 1-Click Synthetic Test Presets:** Instant test buttons in the sidebar (`Portrait`, `Document`, `Scenery`) to test all tools instantly without needing to search for local files.
- **⌘K Command Palette:** Fuzzy searchable quick-switcher for all 7 tools, preset loaders, and workspace actions.
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
    ├── app.js                  # Main controller, hash router, theme toggle, toast alerts, command palette
    ├── utils/
    │   └── image-engine.js     # Shared canvas engine, binary search, EXIF parser, ZIP helper
    └── tools/
        ├── compressor.js       # Tool 1: Smart Compressor, Target-KB, Stage Split & Filmstrip
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
- **Interactive Split Stage & Floating Dock:**
  - Real-time before/after comparison canvas right on the main stage with a draggable vertical divider.
  - Floating frosted export dock with quick scale multipliers (`0.5x`, `1x`, `2x`), format buttons (`JPG`, `WebP`, `PNG`), live size stats, and instant download.
  - Horizontal batch queue filmstrip for multi-file workflows.
- **Quality & Resize Mode:**
  - Interactive quality slider (10% to 100%) with live preview and byte counter.
  - Optional dimension resizing (Max Width / Max Height) with one-click aspect ratio locking.
  - Output formats: JPEG, WebP, PNG, or Preserve Original.
- **Target File Size (KB) Mode:**
  - Enter exact size constraints (e.g. `50 KB`, `100 KB`, `200 KB`, `500 KB`).
  - **8-Pass Binary Search:** Performs an 8-iteration binary search on JPEG/WebP compression quality. If an oversized image at minimum quality (0.05) still exceeds the target size, the engine dynamically calculates proportional downscaling to guarantee strict compliance without distorting proportions.
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
  - Zoom, Pan, Center, and Rotate tools.
  - Biometric face and eye guideline overlays to align chin, crown, and eye levels according to ICAO specifications.
- **Printable Grid Sheet Generator:**
  - Standard Paper Sizes: `A4` (210 × 297 mm), `4 × 6 inch` (Standard Photo Card), `Letter`.
  - Configurable spacing, print cut guidelines, and single photo download or full printable PDF/PNG export.

### 4. Multi-Image to PDF Studio (`#img-to-pdf`)
- **Drag-and-Drop Page Arrangement:** Upload unlimited images, reorder pages with move left/right controls, and remove unwanted pages.
- **Configurable Layouts:** Page sizes (`A4`, `Letter`, `Fit to Image`), Orientations (`Portrait`, `Landscape`), and Margins (`None`, `Small`, `Medium`).
- **Direct Local PDF Generation:** Compiles images into a single `.pdf` document in-memory using `jsPDF`.

### 5. Privacy Redactor / Blur, Pixelate & Censor (`#redact`)
- **Sensitive Information Scrubbing:** Drag rectangles directly on images or document screenshots to conceal credit cards, national IDs, faces, and phone numbers.
- **3 Redaction Modes:**
  - **Gaussian Blur** with customizable intensity slider.
  - **Mosaic Pixelation** with adjustable block sizes.
  - **Solid Black Censor Bar** for absolute redaction.
- **Undo History & EXIF Cleansing:** Step backward through actions and export as clean, metadata-free PNG or JPEG.

### 6. Job Portal Signature & Watermark Studio (`#signature`)
- **Tab A — Signature Cleaner & Paper Remover:**
  - Upload a mobile photo of a physical signature or draw directly on a touch/mouse canvas.
  - **Dynamic Threshold Slider:** Converts off-white paper and shadows into a pure transparent PNG or crisp white JPG.
  - Quick govt/job portal presets (e.g. `300 × 80 px` under `60 KB`, `300 × 300 px` under `100 KB`).
- **Tab B — Text & Logo Watermarking:**
  - Overlay custom text or brand logos with controls for opacity, font size, angle rotation, corner positioning, and full diagonal tiled repeat.

### 7. Favicon Suite & Social Media Asset Generator (`#assets`)
- **Favicon Production Pack:** Upload a single high-resolution square logo and generate all required favicon sizes: `16×16`, `32×32`, `48×48`, `180×180` (Apple Touch), and `512×512` (PWA). Exports as a ready-to-use `.zip` bundle with a copyable `<link>` HTML snippet.
- **Social Media Aspect Ratio Converter:** One-click presets for `1:1` (Square Feed), `9:16` (Story/Reels), and `16:9` (YouTube Thumbnail/Landscape) with either smart center crop or blurred letterbox padding.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘K` or `Ctrl+K` | Open Command Palette |
| `Escape` | Close active modal / Command Palette |
| `1` - `7` (inside `⌘K`) | Jump directly to Tool 1 - 7 |

---

## 🚀 Local Development & Offline Running

PixelShield requires **no build step, no Node.js compilation, and no backend**.

You can run it with any local static HTTP server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

Open `http://localhost:8000` in any modern web browser.

---

## 📄 License

MIT License. Free and open source for personal and commercial privacy-preserving workflows.
