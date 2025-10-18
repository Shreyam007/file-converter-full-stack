// file_convrtr_backend/conversionModule.js

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const convertedDir = path.join(__dirname, 'converted');
if (!fs.existsSync(convertedDir)) {
    fs.mkdirSync(convertedDir);
}

// Map file extensions to FFmpeg formats (Simplified example)
const formatMap = {
    'mp4': 'mp4',
    'avi': 'avi',
    'mp3': 'mp3',
    'ogg': 'ogg',
    // ... add more as needed
};

function startConversion(filePath, targetFormat, socketId, fileId, io) {
    const ext = formatMap[targetFormat.toLowerCase()] || 'mp4'; 
    const outputFileName = `${fileId.split('-')[0]}.${ext}`; // Use original timestamp as unique ID
    const outputPath = path.join(convertedDir, outputFileName);
    const downloadUrl = `/api/download/${outputFileName}`;

    ffmpeg(filePath)
        // Set target format and simple options
        .toFormat(ext)
        .on('progress', (progress) => {
            // Send real-time progress to the specific client socket
            io.to(socketId).emit('progress', {
                fileId: fileId,
                percentage: Math.floor(progress.percent)
            });
        })
        .on('end', () => {
            // 1. Notify client conversion is complete
            io.to(socketId).emit('conversion-complete', {
                fileId: fileId,
                downloadUrl: downloadUrl // Send the BE download route
            });
            // 2. Clean up the original uploaded file
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error cleaning up upload:', err);
            });
        })
        .on('error', (err) => {
            console.error('FFmpeg error:', err.message);
            io.to(socketId).emit('conversion-error', {
                fileId: fileId,
                message: 'Conversion failed: ' + err.message
            });
            // Clean up both files on failure (if they exist)
            fs.unlink(filePath, () => {});
            fs.unlink(outputPath, () => {});
        })
        .save(outputPath);
}

module.exports = { startConversion };