# Universal File Converter 🔄

A powerful, full-stack web application designed to convert files seamlessly between various formats. Built with a modern React frontend and a robust Node.js backend, this tool supports live progress tracking, drag-and-drop functionality, and handles complex media and document conversions.

---

## 🌟 Features

- **Drag & Drop Interface:** Intuitive, sleek file uploading using `react-dropzone`.
- **Real-Time Progress Tracking:** Live progress bars and status updates powered by `Socket.IO`.
- **Media Conversions:** Audio and video conversions leveraging `FFmpeg`.
- **Image Processing:** High-performance image conversions (JPG, PNG, WEBP, etc.) utilizing `Sharp`.
- **Document Generation:** Converts text and images to high-quality PDFs using `pdf-lib`.
- **Dark Mode Support:** A beautiful, responsive UI that automatically adapts to your preferred theme.
- **Recent Conversions Table:** Easily keep track of and download your recently converted files.

---

## 🛠️ Tech Stack

**Frontend:**
- [React 19](https://react.dev/) & [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Socket.IO Client](https://socket.io/)
- [Axios](https://axios-http.com/)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/) (for real-time events)
- [Multer](https://www.npmjs.com/package/multer) (for file uploading)
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) (Media conversion)
- [Sharp](https://sharp.pixelplumbing.com/) (Image conversion)
- [pdf-lib](https://pdf-lib.js.org/) (PDF generation)

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js**: Ensure you have Node.js (v18+ recommended) installed.
2. **FFmpeg**: You **must** have `ffmpeg` installed on your system and added to your environment `PATH` for audio and video conversions to work. 
   - *Windows:* Download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or install via winget: `winget install ffmpeg`
   - *Mac:* `brew install ffmpeg`
   - *Linux:* `sudo apt install ffmpeg`

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
│   ├── conversionModule.js        # Core conversion logic (FFmpeg, Sharp, pdf-lib)
│   ├── server.js                  # Express server & Socket.IO initialization
│   └── package.json               # Backend dependencies
│
└── package.json                   # Root package manager (handles concurrent scripts)
```

---

## 🔄 How it Works

1. **Upload:** Files are dragged into the UI and sent to the Express server using `Multer`.
2. **Determine Tool:** The backend evaluates the file extension and selected target format to choose the correct processing module (`ffmpeg`, `sharp`, `text-to-pdf`, `image-to-pdf`).
3. **Convert & Stream:** As the conversion engine works, it pushes incremental progress events via `Socket.IO` to the frontend.
4. **Download:** Upon completion, the backend serves the converted file dynamically, rendering a downloadable link in the frontend UI. 

---

## 📝 License

Distributed under the MIT License.
