import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios'; // <-- UNCOMMENTED: For making API requests (file upload)
import io from 'socket.io-client'; // <-- UNCOMMENTED: For real-time progress updates

// IMPORTANT: BACKEND URL
const BACKEND_URL = 'https://file-converter-full-stack-production.up.railway.app';
const socket = io(BACKEND_URL); // <-- UNCOMMENTED: Socket connection initialized

// Mock data is retained only for display history, but the conversion logic is now live
const mockRecentFiles = [
    { id: 1, name: 'document_v1.pdf', status: 'completed', progress: 100, format: 'PDF', downloadUrl: `${BACKEND_URL}/download/mock-1` },
    { id: 2, name: 'image_draft.jpg', status: 'completed', progress: 100, format: 'JPEG', downloadUrl: `${BACKEND_URL}/download/mock-2` },
    { id: 3, name: 'presentation_v2.pptx', status: 'completed', progress: 100, format: 'PPTX', downloadUrl: `${BACKEND_URL}/download/mock-3` },
];

let fileIdCounter = mockRecentFiles.length + 1;
const generateFileId = () => fileIdCounter++;

// SVG Icon for the file converter (Aesthetics/Placeholder for Logo)
const FileConverterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v10"></path>
        <path d="M5 10H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1"></path>
        <path d="M12 17v5"></path>
        <circle cx="12" cy="17" r="5"></circle>
    </svg>
);

// Component to display conversion status
const StatusIndicator = ({ status }) => {
    let colorClass = 'bg-gray-400';
    let text = 'Queued';

    switch (status) {
        case 'processing':
            colorClass = 'bg-yellow-500 animate-pulse';
            text = 'Processing';
            break;
        case 'completed':
            colorClass = 'bg-green-600';
            text = 'Completed';
            break;
        case 'error':
            colorClass = 'bg-red-500';
            text = 'Error';
            break;
        case 'queued':
            colorClass = 'bg-gray-400';
            text = 'Queued';
            break;
        default:
            break;
    }

    return (
        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${colorClass} text-white`}>
            {text}
        </span>
    );
};

// Main Application Component
const App = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [fileToConvert, setFileToConvert] = useState(null);
    const [targetFormat, setTargetFormat] = useState('pdf');
    const [conversionStatus, setConversionStatus] = useState('idle');
    const [recentFiles, setRecentFiles] = useState(mockRecentFiles);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentFileId, setCurrentFileId] = useState(null);

    const allowedFormats = useMemo(() => ['pdf', 'docx', 'xlsx', 'jpg', 'png', 'svg'], []);

    // --- DRAG AND DROP HANDLERS (REMAINS THE SAME) ---
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            setFileToConvert(files[0]);
            setErrorMessage('');
            setConversionStatus('idle');
        }
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileToConvert(file);
            setErrorMessage('');
            setConversionStatus('idle');
        }
    };
    
    // --- SOCKET.IO REAL-TIME LISTENER ---
    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to backend socket for real-time updates.');
        });

        socket.on('conversionProgress', ({ fileId, progress }) => {
            // Update the specific file's progress
            setRecentFiles(prev => prev.map(file => 
                file.id === fileId ? { ...file, progress } : file
            ));
        });

        socket.on('conversionComplete', ({ fileId, downloadPath }) => {
            // Update the specific file's status to completed
            setRecentFiles(prev => prev.map(file => 
                file.id === fileId 
                ? { 
                    ...file, 
                    status: 'completed', 
                    progress: 100,
                    downloadUrl: `${BACKEND_URL}${downloadPath}` // Use path provided by backend
                } 
                : file
            ));
            
            // If the completed file is the one we just uploaded, clear the input
            if(fileId === currentFileId) {
                setFileToConvert(null);
                setConversionStatus('completed');
                setCurrentFileId(null);
            }
        });

        socket.on('conversionError', ({ fileId, message }) => {
            setRecentFiles(prev => prev.map(file => 
                file.id === fileId ? { ...file, status: 'error', progress: 0 } : file
            ));
            if(fileId === currentFileId) {
                setConversionStatus('error');
                setErrorMessage(message || 'Conversion failed due to an unknown server error.');
                setCurrentFileId(null);
            }
        });
        
        // This is necessary to handle situations where the component might remount.
        // Also helps with initial connection logging.
        socket.connect(); 

        // Cleanup on component unmount
        return () => {
            socket.off('connect');
            socket.off('conversionProgress');
            socket.off('conversionComplete');
            socket.off('conversionError');
            socket.disconnect();
        };
    }, [currentFileId]); // Re-run effect if currentFileId changes

    
    // --- LIVE CONVERSION API CALL ---
    const startConversion = async () => {
        if (!fileToConvert) {
            setErrorMessage('Please select a file first.');
            return;
        }
        
        // 1. Prepare data and UI state
        setErrorMessage('');
        setConversionStatus('queued');
        
        // Create a temporary file entry in the recent list
        const newFileId = generateFileId();
        const tempFileName = fileToConvert.name.split('.').slice(0, -1).join('.') + '.' + targetFormat;
        
        const tempFile = {
            id: newFileId,
            name: tempFileName,
            status: 'queued',
            progress: 0,
            format: targetFormat.toUpperCase(),
            downloadUrl: null,
        };
        
        setRecentFiles(prev => [tempFile, ...prev]);
        setCurrentFileId(newFileId); // Track the file being processed
        
        const formData = new FormData();
        formData.append('file', fileToConvert);
        formData.append('targetFormat', targetFormat);
        formData.append('fileId', newFileId); // Send ID so backend can emit socket events

        try {
            setConversionStatus('processing');
            // The /convert endpoint is the main file upload endpoint
            const response = await axios.post(`${BACKEND_URL}/convert`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            // The backend should respond quickly (e.g., status 202 Accepted) and then handle the rest via socket.io
            console.log('Conversion request accepted:', response.data);

        } catch (error) {
            const message = error.response?.data?.message || 'Conversion failed. Check your backend server status.';
            setErrorMessage(message);
            setConversionStatus('error');
            
            // Mark the recently added file as error
            setRecentFiles(prev => prev.map(file => 
                file.id === newFileId ? { ...file, status: 'error', progress: 0 } : file
            ));
        }
    };

    // Function to handle the download action 
    const handleDownload = (file) => {
        if (file.downloadUrl) {
            // Open the download URL in a new tab (assumes the backend serves the file at this URL)
            window.open(file.downloadUrl, '_blank');
        } else {
            console.warn(`Download URL missing for file: ${file.name}`);
        }
    };

    // Combined drag/drop handlers for the main element
    const dropzoneProps = {
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
    };

    // Find the progress of the currently uploading file to display in the main card
    const currentProgress = recentFiles.find(f => f.id === currentFileId)?.progress || 0;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8 font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />

            {/* Header */}
            <header className="w-full max-w-4xl flex justify-center py-6">
                <div className="flex items-center space-x-3">
                    <FileConverterIcon />
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                        Universal File Converter
                    </h1>
                </div>
            </header>

            {/* Main Conversion Card */}
            <main className="w-full max-w-4xl bg-white shadow-xl rounded-xl p-6 sm:p-10 mb-8 border border-indigo-100">
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Convert Files Instantly</h2>

                {/* Dropzone Area */}
                <div
                    {...dropzoneProps}
                    className={`
                        border-4 border-dashed rounded-lg p-12 text-center transition-colors duration-300 mb-6
                        ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
                    `}
                >
                    {fileToConvert ? (
                        <div className="text-lg font-medium text-gray-700">
                            Selected: <span className="font-semibold text-indigo-600">{fileToConvert.name}</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-xl font-semibold text-gray-600 mb-2">Drag & Drop Your File Here</p>
                            <p className="text-gray-500 mb-4">or click below to select a file.</p>
                        </>
                    )}
                    
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <label 
                        htmlFor="file-upload" 
                        className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 cursor-pointer transition-colors duration-300"
                    >
                        Browse Files
                    </label>
                </div>

                {errorMessage && (
                    <div className="p-3 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
                        {errorMessage}
                    </div>
                )}
                
                {/* Conversion Settings */}
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="w-full sm:w-1/2">
                        <label htmlFor="format-select" className="block text-sm font-medium text-gray-700 mb-1">
                            Convert To:
                        </label>
                        <select
                            id="format-select"
                            value={targetFormat}
                            onChange={(e) => setTargetFormat(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        >
                            {allowedFormats.map(format => (
                                <option key={format} value={format}>.{format.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full sm:w-1/2">
                        <button
                            onClick={startConversion}
                            disabled={!fileToConvert || conversionStatus === 'processing' || conversionStatus === 'queued'}
                            className={`w-full px-6 py-3 mt-4 text-white font-bold rounded-lg shadow-lg transition duration-300 
                                ${!fileToConvert || conversionStatus === 'processing' || conversionStatus === 'queued'
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                                }
                            `}
                        >
                            {conversionStatus === 'processing' ? 'Processing...' : 
                             conversionStatus === 'queued' ? 'Queued...' : 'Start Conversion'}
                        </button>
                    </div>
                </div>

                {/* Progress Bar (Visible only for the currently tracked file) */}
                {(conversionStatus === 'processing' || conversionStatus === 'queued') && (
                    <div className="mt-6">
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-indigo-700">Conversion Progress</span>
                            <span className="text-sm font-medium text-indigo-700">{currentProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${currentProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </main>

            {/* Recent Files Table */}
            <section className="w-full max-w-4xl bg-white shadow-xl rounded-xl p-6 sm:p-10 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Recent Conversions</h2>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    File Name
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                    Format
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentFiles.map((file) => (
                                <tr key={file.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {file.name}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                        {file.format}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <StatusIndicator status={file.status} />
                                        {file.status === 'processing' && file.progress > 0 && (
                                            <span className="text-xs text-indigo-500 ml-2">{file.progress}%</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                        {file.status === 'completed' ? (
                                            <a 
                                                href={file.downloadUrl || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => { e.preventDefault(); handleDownload(file); }}
                                                className="text-indigo-600 hover:text-indigo-900 font-semibold transition duration-150"
                                            >
                                                Download
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">Waiting</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default App;
