# Universal File Converter 🔄

A powerful, full-stack web application designed to convert files seamlessly between various formats. Built with a modern React frontend and a robust Node.js backend, this tool supports live progress tracking, drag-and-drop functionality, and handles complex media, image, and document conversions.

---

## 🌟 Features

- **Universal Format Support:** Convert effortlessly between Documents (PDF, DOCX, TXT, CSV), Media (MP4, MP3, WAV, AVI), and Images (JPG, PNG, WEBP).
- **Intelligent UI Engine:** The dropdown menu automatically analyzes the uploaded file extension and presents only mathematically and physically possible conversion targets, eliminating unsupported errors.
- **Real-Time Progress Tracking:** Live progress bars and status updates powered by a robust, globally-broadcasted `Socket.IO` architecture that is immune to network lag or reconnects.
- **Serverless-Ready Media Engine:** Audio and video conversions leveraging `FFmpeg`. (Fully bundled with static binaries—no local installation required!)
- **Advanced Document Processing:** Extracts text from PDFs and DOCX files, and dynamically generates new Word documents and PDFs on the fly using `pdf-parse`, `mammoth`, and `docx`.
- **Drag & Drop Interface:** Intuitive, sleek file uploading using `react-dropzone`.
- **Dark Mode Support:** A beautiful, responsive UI that automatically adapts to your preferred theme.

---

## 🛠️ Tech Stack

**Frontend (Deployed on Vercel):**
- [React 19](https://react.dev/) & [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Socket.IO Client](https://socket.io/)
- [Axios](https://axios-http.com/)

**Backend (Deployed on Render):**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/) (for real-time events)
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) (Media conversion)
- [Sharp](https://sharp.pixelplumbing.com/) (Image conversion)
- [pdf-lib](https://pdf-lib.js.org/), `pdf-parse`, `docx`, `mammoth` (Document processing)

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js**: Ensure you have Node.js (v18+ recommended) installed.
2. *Note: You do **not** need to install FFmpeg locally! The static binaries are securely bundled inside the backend for seamless deployment to cloud environments.*

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shreyam007/file-converter-full-stack.git
   cd file-converter-full-stack
   ```

2. **Install all dependencies:**
   The root directory contains a helper script to install dependencies for both the frontend and backend simultaneously.
   ```bash
   npm run install-all
   ```

### Running the Application

To start both the Vite frontend and the Express backend concurrently, simply run from the root directory:

```bash
npm run dev
```

- **Frontend:** Runs locally on `http://localhost:5173`
- **Backend:** Runs locally on `http://localhost:3000`

---

## 📂 Project Structure

```text
file-converter-full-stack/
├── file_convrtr/                  # Frontend React/Vite Application
│   ├── src/                       # React components, styles, and assets
│   ├── package.json               # Frontend dependencies & scripts
│   └── vite.config.js             # Vite configuration
│
├── file_convrtr_backend/          # Backend Node/Express Server
│   ├── conversionModule.js        # Core conversion logic (FFmpeg, Sharp, pdf-lib, docx)
│   ├── server.js                  # Express server & Socket.IO initialization
│   └── package.json               # Backend dependencies
│
└── package.json                   # Root package manager (handles concurrent scripts)
```

---

## 🔄 How it Works

1. **Upload:** Files are dragged into the UI and sent to the Express server using `Multer`.
2. **Determine Tool:** The backend evaluates the file extension and selected target format to cleanly route to the correct processing engine (`ffmpeg`, `sharp`, `pdf-parse`, `docx`, `mammoth`, etc.).
3. **Convert & Broadcast:** As the conversion engine works, it pushes incremental progress events via `Socket.IO`. These events are globally broadcasted and filtered cryptographically on the frontend using unique file identifiers, completely eliminating lost connections or race conditions.
4. **Download:** Upon completion, the backend serves the converted file dynamically, rendering a downloadable link in the frontend UI. 

---

## 📝 License

Distributed under the MIT License.
