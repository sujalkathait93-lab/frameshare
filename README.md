# 📡 FrameShare

> **Share Files, Frame by Frame — 100% Offline via Optical QR Streams.**

FrameShare is a fully offline, air-gapped peer-to-peer file-sharing web application. It transfers files from one device to another using only **animated high-speed QR code streams** on screen and a **camera to scan them** — zero internet, zero Wi-Fi, zero Bluetooth, zero cables, and **zero server storage**.

---

## 🔒 Core Guarantees & Architecture

### 1. 🛑 100% Means STOP — No Infinite Chunk Processing
* When the transfer reaches 100% (final chunk $N/N$), chunk generation and transmission terminate **immediately and completely**.
* No background retry loops, timers, or duplicate frame generators run after completion.

### 2. 🔁 Instant Reuse / "Send Again"
* After a completed or cancelled transfer, users can tap **`[ 🔁 Send Again ]`** to send the exact same selected file without picking it from disk again.
* **Fresh Session Isolation:** "Send Again" creates a brand new `transferId` (6-digit PIN), resets progress cleanly to 0%, and never resumes from partial progress or leaks old session state.

### 3. 🛡️ Complete Cancellation & Race Condition Protection
* Cancelling at 1%, 50%, or 99% stops all camera feeds, chunk generation, and memory listeners instantly.
* A cancelled transfer can never transition to `COMPLETED`.

### 4. 🗄️ Zero Server Storage
* **Zero Persistence:** No file contents, chunks, ArrayBuffers, or Blobs ever touch a server, database, or disk log.
* **Client-Only Reassembly:** The receiver reconstructs files strictly in local browser memory (`Blob` + `URL.createObjectURL()`) and frees memory on session reset.

---

## 🏗️ State Machine Lifecycle

FrameShare enforces a deterministic state machine for both the Broadcaster (Sender) and Scanner (Receiver):

```mermaid
stateDiagram-v2
    [*] --> FILE_SELECTED: User Picks File
    FILE_SELECTED --> INITIALIZING: Start Transfer
    INITIALIZING --> TRANSFERRING: Chunks Prepared & PIN Generated

    state TRANSFERRING {
        [*] --> StreamingFrames
        StreamingFrames --> FrameRotated: Next Chunk
        FrameRotated --> StreamingFrames: Timer Tick
    }

    TRANSFERRING --> CANCELLED: User Cancels (1%-99%)
    TRANSFERRING --> VERIFYING: Final Chunk Reached (100%)
    
    VERIFYING --> COMPLETED: Integrity & Blob Verified
    VERIFYING --> FAILED: Missing Chunks / Error
    VERIFYING --> CANCELLED: Abort Signal

    state CANCELLED {
        [*] --> CancelledView
        CancelledView --> INITIALIZING: [ 🔁 Send Again ] (0%, New PIN)
        CancelledView --> FILE_SELECTED: [ 📁 Choose Another File ]
    }

    state COMPLETED {
        [*] --> CompletedView
        CompletedView --> INITIALIZING: [ 🔁 Send Again ] (0%, New PIN)
        CompletedView --> FILE_SELECTED: [ 📁 Choose Another File ]
    }
```

---

## 🔄 How It Works (End-to-End Optical Pipeline)

```mermaid
sequenceDiagram
    autonumber
    actor S as Sender User
    participant SF as Sender UI (transfer.tsx)
    participant CE as Chunk Engine (chunkService.ts)
    participant QR as Canvas QR Renderer
    actor R as Receiver User
    participant RF as Receiver UI (receive.tsx)
    participant CS as Camera Scanner (jsQR)
    participant RS as Reassembly Engine

    Note over S,SF: Phase 1: Local Slicing & PIN Generation
    S->>SF: Selects local file (e.g. photo.jpg)
    SF->>CE: splitIntoChunks(ArrayBuffer) in memory
    CE-->>SF: Returns N chunks [c_0, c_1, ... c_N]
    SF->>SF: Generates 6-Digit PIN (e.g. 582914)

    Note over SF,CS: Phase 2: Rapid Optical Broadcast
    R->>RF: Opens Camera Scanner (or Manual PIN)
    RF->>CS: Starts requestAnimationFrame scanner
    
    loop Continuous Frame Streaming (150ms - 350ms)
        SF->>QR: renderQRToCanvas(chunk_payload)
        QR-->>SF: Renders QR directly to HTML5 Canvas
        CS->>CS: Optical capture via Camera lens
        CS->>RF: Decodes JSON payload {t, c, l, d}
        RF->>RF: Rejects if payload.t != current PIN
        RF->>RF: Stores unique chunk in Memory Map
    end

    Note over RF,RS: Phase 3: 100% Stop & Local Reassembly
    RF->>RF: 100% Reached (receivedCount == totalChunks)
    RF->>CS: Stops Camera stream & Frame loop
    RF->>RS: reassembleFile(chunksMap, total, mimeType)
    RS-->>RF: Creates in-memory Blob URL
    RF-->>R: "Transfer Complete!" + Download button
```

---

## 📦 Optical Protocol & QR Payload Schema

Each QR code holds a lightweight, minified JSON packet designed to minimize QR density for instant optical recognition:

```mermaid
classDiagram
    class ChunkPayload {
        +string app: "FS" (App Identifier)
        +string t: "582914" (6-Digit Transfer PIN)
        +string n: "document.pdf" (File Name)
        +string m: "application/pdf" (MIME Type)
        +number c: 47 (Zero-Based Chunk Index)
        +number l: 652 (Total Chunks Count)
        +string d: "aW1hZ2UgYmluYXJ5..." (Base64 Binary Slice)
    }
```

---

## ⚡ Speed Modes & Controls

| Mode | Frame Interval | Effective FPS | Recommendation |
| :--- | :--- | :--- | :--- |
| **⚡ Turbo** | `150ms` | ~6.6 FPS | Modern smartphones & high-res cameras |
| **Fast** *(Default)* | `250ms` | 4.0 FPS | General high-speed transfers |
| **Normal** | `350ms` | ~2.8 FPS | Standard scanning speed |
| **Slow** | `500ms` | 2.0 FPS | Low-light environments & older cameras |

---

## 📁 Supported Files

| Type  | Extensions            | Max Size |
| ----- | --------------------- | -------- |
| Text  | `.txt`                | 20 MB    |
| Image | `.jpg` `.jpeg` `.png` | 20 MB    |

---

## 🛠️ Tech Stack

| Layer       | Technology                              |
| ----------- | --------------------------------------- |
| Framework   | Next.js (Pages Router, Static Export)   |
| Language    | TypeScript                              |
| Styling     | Botanical / Organic Serif (Vanilla CSS) |
| QR Generate | `qrcode` (Direct HTML5 Canvas Render)   |
| QR Scan     | `jsQR` via `requestAnimationFrame`      |
| Camera API  | `navigator.mediaDevices.getUserMedia()` |
| Memory I/O  | File API, FileReader, Blob              |

---

## ⚡ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) 18+
- npm or yarn

### 2. Install & Run Development Server
```bash
# Clone the repository
git clone https://github.com/sujalkathait93-lab/frameshare.git
cd frameshare

# Install dependencies
npm install

# Start local server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 📱 Usage Guide

### 📤 Sender Flow (Device A)
1. Tap **Send File** and select a file (`.txt`, `.jpg`, `.jpeg`, `.png`).
2. Tap **Start Optical Transfer →**.
3. Point the streaming QR code toward the receiver.
4. If cancelled or completed, tap **`[ 🔁 Send Again ]`** to start a fresh transfer session with the same file.

### 📥 Receiver Flow (Device B)
1. Tap **Receive File**.
2. **Optical Mode:** Tap **Start Camera Scanner** and point at Device A.
3. **Manual Mode:** Switch to **Transfer PIN / Paste** tab to enter the 6-digit PIN or paste frame payloads.
4. When 100% is reached, tap **`[ 💾 Save / Download File ]`**.

---

## 📄 License

Open-source educational and practical air-gap transfer software. Zero server storage guaranteed.
