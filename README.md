# 🔥 CodeForge — Online Python Compiler

> A fast, beautiful, browser-native Python IDE. No install. No server. No API key. Just open and code.

CodeForge runs Python **entirely inside your browser** using [Pyodide](https://pyodide.org) (Python compiled to WebAssembly). It features a professional Monaco editor, a fully interactive terminal that supports real `input()` calls, and a clean dual-theme UI.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🐍 **Python 3 in the browser** | Powered by Pyodide v0.26 — full CPython 3.11 compiled to WebAssembly |
| ⌨️ **Interactive `input()`** | Truly blocking `input()` via `SharedArrayBuffer` + `Atomics.wait` in a Web Worker — no faking |
| 📦 **10 stdlib modules** | `math`, `random`, `datetime`, `sys`, `os`, `time`, `json`, `re`, `collections`, `itertools` |
| 🖥️ **Monaco Editor** | The same editor that powers VS Code — syntax highlighting, bracket matching, ligatures, auto-close |
| 🎨 **3 editor themes** | Dark (default), Light, High Contrast |
| 📁 **File open / download** | Open any `.py` file from disk; download your work as a proper `.py` file |
| 🔗 **Share via URL** | Code is base64-encoded into a shareable link (up to ~4 KB) |
| 📊 **Info panel** | Shows exit code, CPU time, line count, and encoding after each run |
| 📱 **Responsive layout** | Resizable horizontal split pane; mobile-friendly collapse |
| ⚡ **Keyboard shortcuts** | `Ctrl+Enter` → Run · `Ctrl+S` → Download · `Ctrl+O` → Open file |

---

## 🖼️ Screenshots

| Dark Theme | Light Theme |
|------------|-------------|
| Editor + Terminal split | Clean cream terminal on white panels |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [React 18](https://react.dev) + [TypeScript 5](https://www.typescriptlang.org) |
| **Build tool** | [Vite 5](https://vitejs.dev) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com) + Vanilla CSS custom properties |
| **Code editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) via `@monaco-editor/react` |
| **Python runtime** | [Pyodide v0.26](https://pyodide.org) (WebAssembly) |
| **State management** | [Zustand 5](https://zustand-demo.pmnd.rs) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **File saving** | [FileSaver.js](https://github.com/eligrey/FileSaver.js) |
| **Threading** | Web Workers + `SharedArrayBuffer` + `Atomics` |

---

## 📦 Supported Standard Libraries

All modules are part of Python's stdlib and bundled directly with Pyodide — no `pip install` needed.

```python
import math        # Constants, trig, logarithms, combinatorics
import random      # RNG, shuffle, choices — random.seed() works
import datetime    # Real wall-clock time from the browser's Date API
import sys         # argv=['main.py'], platform, version, sys.exit()
import os          # os.environ (HOME, USER, PATH…), os.getcwd(), os.path.*
import time        # time.time(), time.sleep() (capped at 30 s), localtime()
import json        # dumps / loads / dump / load — full RFC 8259
import re          # Full PCRE-compatible regex — findall, sub, groups, flags
import collections # Counter, deque, OrderedDict, defaultdict, namedtuple
import itertools   # combinations, permutations, chain, islice, count, product
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/codeforge.git
cd codeforge

# Install dependencies
npm install
```

### Development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server already sets the required `Cross-Origin-Isolation` headers so `SharedArrayBuffer` works.

> [!IMPORTANT]
> `SharedArrayBuffer` (required for blocking `input()`) needs **Cross-Origin Isolation**. Vite is pre-configured with the correct headers. If you deploy to another host, you must set:
> ```
> Cross-Origin-Opener-Policy: same-origin
> Cross-Origin-Embedder-Policy: require-corp
> ```

### Production build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

---

## 🏗️ Project Structure

```
codeforge/
├── public/
│   └── logo.png              # App logo
├── src/
│   ├── api/
│   │   └── executor.ts       # Pyodide Web Worker engine + SharedArrayBuffer bridge
│   ├── components/
│   │   ├── Editor.tsx         # Monaco editor wrapper
│   │   ├── Navbar.tsx         # Top bar — run, download, upload, share, settings
│   │   ├── OutputPanel.tsx    # Interactive terminal + Errors + Info tabs
│   │   ├── StatusBar.tsx      # Bottom status bar
│   │   ├── HorizontalSplitter.tsx  # Resizable left/right split pane
│   │   └── InputPanel.tsx     # (stdin pre-fill panel)
│   ├── store/
│   │   └── useStore.ts        # Zustand global state
│   ├── App.tsx                # Root component + URL param handling
│   ├── constants.ts           # Language config + editor defaults
│   ├── types.ts               # Shared TypeScript interfaces
│   ├── index.css              # Design tokens (dark + light CSS variables)
│   └── main.tsx               # React entry point
├── index.html
├── vite.config.ts             # COOP/COEP headers + Monaco optimisation
├── tailwind.config.js
└── package.json
```

---

## ⚙️ How It Works

```
┌─────────────────────────────────────────────────┐
│                  Main Thread (React)            │
│                                                 │
│  Editor (Monaco) ──► Run button ──► executor.ts │
│                                          │       │
│  Terminal UI  ◄── onLine callback ◄──────┤       │
│  input() UI   ──► onInputRequest ──►     │       │
└──────────────────────────────────────────┼───────┘
                                           │
                              SharedArrayBuffer
                           (controlBuf + dataBuf)
                                           │
┌──────────────────────────────────────────┼───────┐
│              Web Worker (Pyodide)        │       │
│                                          │       │
│  loadPyodide() ──► runPythonAsync(code)  │       │
│                                          │       │
│  Python's input() calls blockingInput()  │       │
│    └─► Atomics.wait() ◄── blocks here ◄──┘       │
│         until main thread writes value            │
└──────────────────────────────────────────────────┘
```

1. User clicks **Run** — executor creates a `SharedArrayBuffer` and spawns a `Web Worker` running Pyodide.
2. When Python code calls `input()`, the worker posts an `input-request` message and **blocks** via `Atomics.wait()`.
3. The React UI shows an inline input box. When the user hits Enter, the main thread writes the value into the `SharedArrayBuffer` and calls `Atomics.notify()`.
4. The worker wakes up, reads the value, and returns it to Python's `input()` — exactly like a real terminal.

---

## 🎨 Theming

Switch themes in **Settings → Theme**:

| Theme | Description |
|-------|-------------|
| 🌙 **Dark** (default) | Deep navy surfaces, VSCode-style editor, dark terminal |
| ☀️ **Light** | Warm white panels, classic IDE navbar stays dark, cream terminal |
| ⚡ **High Contrast** | Maximum contrast for accessibility |

Themes are persisted to `localStorage` and applied immediately on load (no flash of wrong theme).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Run code |
| `Ctrl + S` | Download `.py` file |
| `Ctrl + O` | Open a `.py` file from disk |
| `Enter` (in terminal) | Submit `input()` value |

---

## 🔗 URL Sharing

Click **Share** to generate a link. The current code is base64-encoded into the URL's `?code=` parameter (truncated to ~4 KB). Anyone with the link can open it and see your exact code ready to run.

---

## 📄 License

MIT © 2026 CodeForge
