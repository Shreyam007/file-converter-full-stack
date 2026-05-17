const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun } = require('docx');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const convertedDir = path.join(__dirname, 'converted');
if (!fs.existsSync(convertedDir)) {
    fs.mkdirSync(convertedDir);
}

// Helper to determine tool
const getToolType = (filePath, targetExt) => {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mediaExtensions = ['mp4', 'mp3', 'wav', 'avi', 'mkv', 'webm', 'ogg', 'aac', 'flac'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const textExtensions = ['txt', 'cpp', 'js', 'py', 'java', 'c', 'h', 'css', 'html', 'json', 'md'];
    
    if (targetExt === 'pdf') {
        if (imageExtensions.includes(ext)) return 'image-to-pdf';
        if (textExtensions.includes(ext)) return 'text-to-pdf';
    }
    
    if (ext === 'pdf') {
        if (targetExt === 'txt') return 'pdf-to-text';
        if (targetExt === 'docx') return 'pdf-to-docx';
    }
    if (ext === 'docx') {
        if (targetExt === 'txt') return 'docx-to-text';
        if (targetExt === 'pdf') return 'docx-to-pdf';
    }
    if (textExtensions.includes(ext) && targetExt === 'docx') return 'text-to-docx';

    if (imageExtensions.includes(ext) && imageExtensions.includes(targetExt)) return 'sharp';
    if (mediaExtensions.includes(ext) || mediaExtensions.includes(targetExt)) return 'ffmpeg';
    
    return 'unsupported';
};

async function startConversion(filePath, targetFormat, socketId, fileId, io) {
    const targetExt = targetFormat.toLowerCase();
    const toolType = getToolType(filePath, targetExt);
    
    const baseName = fileId.includes('-') ? fileId.split('-').slice(1).join('-') : fileId;
    const cleanBaseName = path.parse(baseName).name;
    const outputFileName = `${cleanBaseName}-${Date.now()}.${targetExt}`;
    const outputPath = path.join(convertedDir, outputFileName);
    const downloadUrl = `/api/download/${outputFileName}`;

    console.log(`Starting conversion: ${fileId} to ${targetExt} using ${toolType}`);

    const emitComplete = () => {
        io.to(socketId).emit('conversion-complete', { 
            fileId, 
            downloadUrl, 
            fileName: outputFileName,
            originalFormat: path.extname(filePath).replace('.', ''),
            targetFormat: targetExt
        });
        console.log(`Conversion complete: ${fileId} -> ${outputFileName}`);
        fs.unlink(filePath, () => {});
    };

    try {
        if (toolType === 'image-to-pdf') {
            const imageBuffer = await sharp(filePath).png().toBuffer();
            io.to(socketId).emit('progress', { fileId, percentage: 30 });
            
            const pdfDoc = await PDFDocument.create();
            const pngImage = await pdfDoc.embedPng(imageBuffer);
            io.to(socketId).emit('progress', { fileId, percentage: 60 });
            
            const { width, height } = pngImage.scale(1);
            const page = pdfDoc.addPage([width, height]);
            page.drawImage(pngImage, { x: 0, y: 0, width, height });
            const pdfBytes = await pdfDoc.save();
            fs.writeFileSync(outputPath, pdfBytes);
            io.to(socketId).emit('progress', { fileId, percentage: 90 });
            emitComplete();

        } else if (toolType === 'text-to-pdf') {
            const content = fs.readFileSync(filePath, 'utf8');
            io.to(socketId).emit('progress', { fileId, percentage: 20 });
            
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();
            const { height } = page.getSize();
            
            io.to(socketId).emit('progress', { fileId, percentage: 50 });
            
            page.drawText(content, {
                x: 50,
                y: height - 50,
                size: 12,
            });
            const pdfBytes = await pdfDoc.save();
            fs.writeFileSync(outputPath, pdfBytes);
            io.to(socketId).emit('progress', { fileId, percentage: 80 });
            emitComplete();

        } else if (toolType === 'sharp') {
            await sharp(filePath).toFormat(targetExt).toFile(outputPath);
            emitComplete();

        } else if (toolType === 'ffmpeg') {
            ffmpeg(filePath)
                .toFormat(targetExt)
                .on('progress', (progress) => {
                    io.to(socketId).emit('progress', {
                        fileId: fileId,
                        percentage: Math.floor(progress.percent || 0)
                    });
                })
                .on('end', () => {
                    emitComplete();
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err.message);
                    io.to(socketId).emit('conversion-error', { fileId, message: 'FFmpeg failed: ' + err.message });
                    fs.unlink(filePath, () => {});
                })
                .save(outputPath);

        } else if (toolType === 'pdf-to-text') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            const extractedText = data.text || 'No extractable text found in this document.';
            fs.writeFileSync(outputPath, extractedText);
            emitComplete();

        } else if (toolType === 'pdf-to-docx') {
            io.to(socketId).emit('progress', { fileId, percentage: 30 });
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            io.to(socketId).emit('progress', { fileId, percentage: 60 });
            
            const extractedText = data.text || 'No extractable text found in this document.';
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: extractedText.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(outputPath, buffer);
            io.to(socketId).emit('progress', { fileId, percentage: 90 });
            emitComplete();

        } else if (toolType === 'docx-to-text') {
            const result = await mammoth.extractRawText({ path: filePath });
            fs.writeFileSync(outputPath, result.value);
            emitComplete();

        } else if (toolType === 'docx-to-pdf') {
            // Very rudimentary docx to pdf fallback (via text extraction)
            io.to(socketId).emit('progress', { fileId, percentage: 30 });
            const result = await mammoth.extractRawText({ path: filePath });
            
            io.to(socketId).emit('progress', { fileId, percentage: 60 });
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();
            page.drawText(result.value.substring(0, 3000), { x: 50, y: page.getSize().height - 50, size: 12 }); // Limits to first page roughly for basic support
            const pdfBytes = await pdfDoc.save();
            fs.writeFileSync(outputPath, pdfBytes);
            io.to(socketId).emit('progress', { fileId, percentage: 90 });
            emitComplete();

        } else if (toolType === 'text-to-docx') {
            const content = fs.readFileSync(filePath, 'utf8');
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: content.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
                }]
            });
            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(outputPath, buffer);
            emitComplete();

        } else {
            throw new Error(`Conversion from ${path.extname(filePath)} to ${targetExt} is not supported yet.`);
        }
    } catch (err) {
        console.error('Conversion catch error:', err.message);
        io.to(socketId).emit('conversion-error', { fileId, message: err.message });
        fs.unlink(filePath, () => {});
    }
}

module.exports = { startConversion };