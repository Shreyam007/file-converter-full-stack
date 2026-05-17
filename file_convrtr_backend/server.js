// file_convrtr_backend/server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config(); // Use .env file for secrets/ports

const app = express();
const server = http.createServer(app);

// 1. CORS Configuration (Allow frontend access)
// Using '*' allows any origin to connect, preventing CORS issues during local testing or deployed environments
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE']
}));

// 2. Setup Socket.IO for Real-Time
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS']
    }
});

// 3. File Upload Setup (using multer for temporary storage)
const uploadDir = path.join(__dirname, 'uploads');
const convertedDir = path.join(__dirname, 'converted');

[uploadDir, convertedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use a timestamp to prevent name collisions
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// === CONVERSION MODULE (To be expanded in the next step) ===
const conversionModule = require('./conversionModule'); 

// 4. API Route to Handle File Upload and Start Conversion
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const { targetFormat, socketId, fileId } = req.body;

    // Start conversion in the background
    conversionModule.startConversion(
        req.file.path, 
        targetFormat, 
        socketId, 
        fileId, 
        io
    );

    res.json({
        message: 'Upload successful, conversion started.',
        fileId: fileId,
        fileName: req.file.originalname,
    });
});

// 5. API Route for Auto-Download
app.get('/api/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'converted', req.params.filename);
    res.download(filePath, req.params.filename, (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(404).send('File not found or download failed.');
        }
        // TODO: Add file cleanup logic here after successful download
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));