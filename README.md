# PhotoSo

A fast, offline-capable photo sorter app for photographers. Sort through hundreds of photos quickly using keyboard shortcuts — no uploads, no server, everything stays on your machine.

---

## How to Use

PhotoSo runs entirely in the browser using the **File System Access API**. No installation required beyond opening the HTML file.

**Requirements:** Chrome or Edge (desktop). Safari and Firefox do not support the File System Access API.

### Setup

1. Open `index.html` in Chrome or Edge
2. Pick three folders:
   - **Source** — where your photos currently live
   - **Accepted** — keepers will be moved here
   - **Rejected** — rejects will be moved here
3. Click **Start Sorting**

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` | Navigate to next photo |
| `←` | Navigate to previous photo |
| `A` | Accept current photo |
| `R` | Reject current photo |
| `Esc` | Close zoom view |

### Photo States

Every photo has one of four states shown as a badge on the photo:

| State | Meaning |
|-------|---------|
| **Pending** | Not yet visited |
| **Decide Later** | Visited but no action taken, or manually deferred |
| **Accepted** | Moved to accepted folder |
| **Rejected** | Moved to rejected folder |

Navigating away from a **Pending** photo without acting marks it **Decide Later**. The file stays in the source folder.

### Changing Your Mind

Navigate back to any photo at any time using `←`. You can change the state of already-decided photos — the file moves to the correct folder automatically. A fresh file handle is fetched before every move so stale handles are never an issue.

On **Accepted** and **Rejected** photos, a **Decide Later** button appears in the footer — clicking it moves the file back to source.

### Filter Mode

Click any pill in the topbar to filter the timeline to only that state:

- **Accepted** — browse only accepted photos
- **Rejected** — browse only rejected photos
- **Decide Later** — review deferred photos
- **Pending** — see what hasn't been touched yet

Click the same pill again to clear the filter and return to the full timeline.

When acting on a photo in filter mode (e.g. accepting a rejected photo while filtering by rejected), the file moves immediately but the photo stays on screen until you navigate away.

### Session End

**Auto-complete** — when the source folder becomes empty (all photos accepted or rejected), the done screen appears automatically showing accepted and rejected counts.

**Manual quit** — click **Quit** in the topbar at any time. The done screen shows accepted, rejected, and remaining (decide later + pending combined).

---

## Resuming a Session

If you start a session with the same folders and the accepted or rejected folders are not empty, PhotoSo detects a previous session and prompts you:

- **Resume** — merges all three folders into one timeline. Previously sorted photos appear with their state intact. The timeline starts at the first pending photo.
- **Start Fresh** — moves all previously sorted photos back to source and begins from scratch.

---

## File Structure

```
photo-sorter/
├── index.html          — App shell and all screens
├── manifest.json       — PWA manifest
├── sw.js               — Service worker (network-first, offline fallback)
├── css/
│   └── styles.css      — All styles
└── js/
    ├── app.js          — Entry point, event wiring
    ├── triage.js       — Core session state and timeline engine
    ├── ui.js           — All DOM manipulation
    ├── fileSystem.js   — File System Access API helpers
    ├── photoLoader.js  — Object URL cache and preloading
    └── keyboard.js     — Keyboard shortcut bindings
```

---

## Offline Support

PhotoSo is a PWA. On first load (while online), the service worker caches all app assets. After that:

- **Online** — always fetches fresh files from the server, updates cache in background
- **Offline** — serves from cache seamlessly

In Chrome/Edge you will see an **Install** prompt at the bottom-left to install PhotoSo as a desktop app.

---

## Supported File Types

`JPG` `JPEG` `PNG` `WEBP` `GIF`

---

## Technical Notes

- **No framework** — vanilla JS with ES modules
- **No server** — runs entirely from the local filesystem or any static file host
- **File moves** — implemented as copy-to-destination + delete-from-source (browsers have no native move API)
- **Stale handles** — file handles are always re-fetched from the correct `currentDir` before any move operation
- **Photo order** — natural filename sort (`IMG_1, IMG_2 ... IMG_10` not `IMG_1, IMG_10, IMG_2`)
- **Preloading** — the next 2 photos are preloaded into memory while you view the current one
