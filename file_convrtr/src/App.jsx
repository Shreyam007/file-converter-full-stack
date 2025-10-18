// file_convrtr/src/App.jsx

import React, { useState, useEffect, useCallback } from 'react';
import logo from './assets/logo.png';
import { useDropzone } from 'react-dropzone';
// import axios from 'axios';
// import io from 'socket.io-client';

// --- Mock/Placeholder Setup ---
const BACKEND_URL = 'https://file-converter-full-stack-production.up.railway.app/';
// const socket = io(BACKEND_URL);

// MODIFIED: simulateConversion now takes recentConversions and setRecentConversions
const simulateUpload = (fileId, targetFormat, updateFile) => {
    updateFile(fileId, { status: 'Uploading' });
    let progress = 0;
    const interval = setInterval(() => {
        progress += 20;
        if (progress <= 100) {
            updateFile(fileId, { progress: progress });
        }
        if (progress >= 100) {
            clearInterval(interval);
            updateFile(fileId, { status: 'Converting', progress: 0 });
            // simulateConversion will now be called with recent conversions in App.jsx
        }
    }, 500);
};

// Removed simulateConversion from here - it's now managed in App.jsx to access recentConversions state

// --- END Mock Setup ---


// File Status Enum
const FILE_STATUS = {
    PENDING: 'Pending',
    UPLOADING: 'Uploading',
    CONVERTING: 'Converting',
    COMPLETE: 'Complete',
    ERROR: 'Error',
};

// --- Component: Loading Spinner based on the Logo ---
const LoadingSpinner = () => (
    // Uses the main logo image and applies the spinning CSS class
    <img src={logo} alt="Loading..." className="loading-logo" />
);


// --- Component: Progress Card ---
const ProgressCard = ({ file, onConvert, onFormatChange }) => {
    const isActionDisabled = file.status !== FILE_STATUS.PENDING;
    const downloadExt = file.downloadUrl ? file.downloadUrl.split('.').pop().toUpperCase() : file.targetFormat.toUpperCase();
    
    // Check if the file is actively processing
    const isProcessing = file.status === FILE_STATUS.UPLOADING || file.status === FILE_STATUS.CONVERTING;

    return (
        <div className="progress-card">
            <div className="progress-header">
                <span className="file-name">{file.name}</span>
                
                {/* CONDITIONAL RENDERING FOR LOADER */}
                {isProcessing ? (
                    <LoadingSpinner />
                ) : (
                    <span className={`file-status status-${file.status.toLowerCase()}`}>
                        {file.status}
                    </span>
                )}
            </div>

            {/* Progress Bar (Only show if processing) */}
            {isProcessing && (
                <div className="progress-bar-container">
                    <span className="progress-percentage">{file.progress}%</span>
                    <div className="progress-bar" style={{ width: `${file.progress}%` }}></div>
                </div>
            )}
            
            <div className="progress-actions">
                <select 
                    value={file.targetFormat} 
                    onChange={(e) => onFormatChange(file.id, e.target.value)}
                    className="format-select"
                    disabled={isActionDisabled}
                >
                    {['PDF', 'DOCX', 'PPTX', 'XLSX', 'JPG', 'PNG', 'MP4', 'MP3'].map(fmt => (
                        <option key={fmt} value={fmt.toLowerCase()}>{fmt}</option>
                    ))}
                </select>

                {file.status === FILE_STATUS.PENDING && (
                    <button
                        onClick={() => onConvert(file.id)}
                        className="action-btn convert-btn"
                    >
                        Convert
                    </button>
                )}
                {file.status === FILE_STATUS.COMPLETE && (
                    <a
                        href={file.downloadUrl || '#'}
                        download
                        className="action-btn download-btn"
                    >
                        Download .{downloadExt} 
                    </a>
                )}
                {file.status === FILE_STATUS.ERROR && (
                    <span className="error-message">Error: {file.errorMessage || 'Failed'}</span>
                )}
            </div>
        </div>
    );
};


// --- NEW Component: Recent Conversions Table ---
const RecentConversionsTable = ({ conversions }) => (
    <div className="recent-conversions-section">
        <h2 className="section-title">Recent Conversions</h2>
        <div className="recent-conversions-table-container"> {/* Added a container for styling */}
            <table className="recent-conversions-table">
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Original Format</th>
                        <th>Converted Format</th>
                        <th></th> {/* For the Download button */}
                    </tr>
                </thead>
                <tbody>
                    {conversions.map((conv) => (
                        <tr key={conv.id}>
                            <td>{conv.name}</td>
                            <td>{conv.originalFormat.toUpperCase()}</td>
                            <td>{conv.convertedFormat.toUpperCase()}</td>
                            <td>
                                <a href={conv.downloadUrl} download className="table-download-link">
                                    Download
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);


// --- Component: Main App ---
function App() {
    const [files, setFiles] = useState([]);
    const [isDarkMode, setIsDarkMode] = useState(false);
    // NEW STATE: To store recent conversions for the table
    const [recentConversions, setRecentConversions] = useState([]); 

    const updateFile = useCallback((fileId, updates) => {
        setFiles(prevFiles =>
            prevFiles.map(f => (f.id === fileId ? { ...f, ...updates } : f))
        );
    }, []);

    // NEW FUNCTION: Centralized conversion simulation logic
    const simulateConversionProcess = useCallback((fileId, targetFormat, originalFile) => {
        let progress = 0;
        const conversionInterval = setInterval(() => {
            progress += 10;
            if (progress <= 100) {
                updateFile(fileId, { progress: progress });
            }
            if (progress >= 100) {
                clearInterval(conversionInterval);
                const downloadUrl = `/downloads/${fileId}-converted.${targetFormat}`;
                updateFile(fileId, {
                    status: 'Complete',
                    progress: 100,
                    downloadUrl: downloadUrl,
                });

                // ADD COMPLETED CONVERSION TO RECENT CONVERSIONS
                setRecentConversions(prev => [
                    {
                        id: fileId,
                        name: originalFile.name,
                        originalFormat: originalFile.file.name.split('.').pop(),
                        convertedFormat: targetFormat,
                        downloadUrl: downloadUrl,
                    },
                    ...prev, // Add new conversion to the top
                ].slice(0, 5)); // Keep only the latest 5 conversions
            }
        }, 300);
    }, [updateFile]);


    const toggleDarkMode = () => {
        setIsDarkMode(prev => !prev);
    };

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    const onDrop = useCallback(acceptedFiles => {
        const newFiles = acceptedFiles.map(file => ({
            id: file.path + Date.now(),
            file: file, // Store the raw file object to get original extension
            name: file.path,
            status: FILE_STATUS.PENDING,
            progress: 0,
            targetFormat: 'pdf', // Default smart suggestion
            downloadUrl: null,
            errorMessage: null,
        }));
        setFiles(prev => [...prev, ...newFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

    const handleConvert = async (fileId) => {
        const fileToConvert = files.find(f => f.id === fileId);
        if (!fileToConvert || fileToConvert.status !== FILE_STATUS.PENDING) return;
        
        // Start upload simulation
        updateFile(fileId, { status: 'Uploading' });
        let uploadProgress = 0;
        const uploadInterval = setInterval(() => {
            uploadProgress += 20;
            if (uploadProgress <= 100) {
                updateFile(fileId, { progress: uploadProgress });
            }
            if (uploadProgress >= 100) {
                clearInterval(uploadInterval);
                updateFile(fileId, { status: 'Converting', progress: 0 });
                // Once upload is 'complete', start conversion simulation
                simulateConversionProcess(fileId, fileToConvert.targetFormat, fileToConvert);
            }
        }, 500);
    };

    const handleFormatChange = (fileId, newTargetFormat) => {
        updateFile(fileId, { targetFormat: newTargetFormat });
    };

    return (
        <div className="app-container">
            
            {/* Header */}
            <header className="main-header">
                <div className="header-content">
                    <div className="logo-section">
                        <img src={logo} alt="Company Logo" className="logo-image" /> 
                        <span className="header-app-title">File Converter</span>
                    </div>

                    <div className="header-actions">
                        <button
                            onClick={toggleDarkMode}
                            className="dark-mode-toggle"
                            title="Toggle Dark Mode"
                        >
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="main-content">
                
                <h2 className="page-main-title">File Converter</h2>
                <p className="page-subtitle">Convert your files to any format</p>
                
                {/* Dropzone Area */}
                <div
                    {...getRootProps()}
                    className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
                >
                    <input {...getInputProps()} />
                    <p className="dropzone-text">
                        {isDragActive 
                            ? 'Drop the files here...' 
                            : 'Drag & Drop your file here'
                        }
                    </p>
                    <p className="dropzone-or">or</p>
                    <button className="browse-btn">
                        Browse files
                    </button>
                </div>

                {/* Conversion Queue (Progress/Download) */}
                {files.length > 0 && (
                    <div className="conversion-queue">
                        <h2 className="section-title">Conversion Queue</h2> {/* Re-using section-title for consistent heading */}
                        {files.map(file => (
                            <ProgressCard 
                                key={file.id} 
                                file={file} 
                                onConvert={handleConvert}
                                onFormatChange={handleFormatChange} 
                            />
                        ))}
                    </div>
                )}
                
                {/* Static Options (ONLY show if no files are being converted) */}
                {files.length === 0 && (
                    <div className="static-options-display">
                        <h2 className="section-title">Convert to:</h2> {/* Re-using section-title */}
                        <div className="format-pills-container">
                            {['PDF', 'DOCX', 'PPTX', 'XLSX', 'JPG', 'PNG'].map(fmt => (
                                <span key={fmt} className="format-pill">{fmt}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* NEW: Recent Conversions Section */}
                {recentConversions.length > 0 && (
                    <RecentConversionsTable conversions={recentConversions} />
                )}
            </main>
        </div>
    );
}

export default App;
