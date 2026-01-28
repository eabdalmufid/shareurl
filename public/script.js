// DOM Elements
const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const customCode = document.getElementById('customCode');
const shortenBtn = document.getElementById('shortenBtn');
const btnText = shortenBtn.querySelector('.btn-text');
const btnLoading = shortenBtn.querySelector('.btn-loading');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const shortUrlDisplay = document.getElementById('shortUrlDisplay');
const originalUrlDisplay = document.getElementById('originalUrlDisplay');
const errorMessage = document.getElementById('errorMessage');
const copyBtn = document.getElementById('copyBtn');
const themeToggle = document.getElementById('themeToggle');

// State
let isLoading = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStatistics();
    initTheme();
});

// Check if admin key is in URL query parameters
function checkAdminKey() {
    const urlParams = new URLSearchParams(window.location.search);
    const key = urlParams.get('key');
    
    // Check if key matches admin password (admin123 by default)
    if (key === 'admin123') {
        return true;
    } else {
        return false;
    }
}

// Theme Management
function initTheme() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    if (!sunIcon || !moonIcon) return;
    
    if (isDark) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// Theme toggle event listener
themeToggle.addEventListener('click', toggleTheme);

// Handle form submission
urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    const url = urlInput.value.trim();
    const custom = customCode.value.trim();
    
    if (!url) {
        showError('Please enter a URL');
        return;
    }
    
    await shortenUrl(url, custom);
});

// Shorten URL function
async function shortenUrl(url, custom) {
    setLoading(true);
    hideMessages();
    
    try {
        const body = { url };
        if (custom) {
            body.customCode = custom;
        }
        
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Handle rate limiting
            if (response.status === 429) {
                throw new Error('⏱️ ' + (data.error || 'Too many requests. Please wait a moment and try again.'));
            }
            // Handle conflict (custom code already in use)
            if (response.status === 409) {
                throw new Error('⚠️ ' + data.error);
            }
            throw new Error(data.error || 'Failed to shorten URL');
        }
        
        showResult(data);
        urlInput.value = '';
        customCode.value = '';
        loadStatistics(); // Update statistics after creating URL
    } catch (error) {
        // Handle network errors
        if (error.message.includes('Failed to fetch')) {
            showError('❌ Network error. Please check your connection and try again.');
        } else {
            showError(error.message);
        }
    } finally {
        setLoading(false);
    }
}

// Show result
function showResult(data) {
    shortUrlDisplay.value = data.shortUrl;
    originalUrlDisplay.textContent = data.originalUrl;
    resultSection.style.display = 'block';
    errorSection.style.display = 'none';
}

// Show error
function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    resultSection.style.display = 'none';
}

// Hide messages
function hideMessages() {
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Set loading state
function setLoading(loading) {
    isLoading = loading;
    shortenBtn.disabled = loading;
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'block';
    } else {
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
    }
}

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
    const url = shortUrlDisplay.value;
    
    try {
        await navigator.clipboard.writeText(url);
        
        const originalText = copyBtn.querySelector('.copy-text').textContent;
        copyBtn.querySelector('.copy-text').textContent = 'Copied!';
        
        setTimeout(() => {
            copyBtn.querySelector('.copy-text').textContent = originalText;
        }, 2000);
    } catch (error) {
        // Fallback for older browsers (deprecated but needed for compatibility)
        shortUrlDisplay.select();
        document.execCommand('copy');
        
        const originalText = copyBtn.querySelector('.copy-text').textContent;
        copyBtn.querySelector('.copy-text').textContent = 'Copied!';
        
        setTimeout(() => {
            copyBtn.querySelector('.copy-text').textContent = originalText;
        }, 2000);
    }
});

// Load statistics
async function loadStatistics() {
    try {
        const [urlsResponse, filesResponse] = await Promise.all([
            fetch('/api/urls'),
            fetch('/api/files')
        ]);
        
        const urls = await urlsResponse.json();
        const files = await filesResponse.json();
        
        const totalUrls = urls.length;
        const totalFiles = files.length;
        const totalUrlClicks = urls.reduce((sum, url) => sum + (url.clicks || 0), 0);
        const totalFileDownloads = files.reduce((sum, file) => sum + (file.downloads || 0), 0);
        const totalClicks = totalUrlClicks + totalFileDownloads;
        
        // Update statistics display
        document.getElementById('totalUrls').textContent = totalUrls;
        document.getElementById('totalFiles').textContent = totalFiles;
        document.getElementById('totalClicks').textContent = totalClicks;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Auto-focus input on page load
urlInput.focus();

// =============================================
// File Upload Functionality
// =============================================

const fileDropZone = document.getElementById('fileDropZone');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFileBtn');
const fileUploadForm = document.getElementById('fileUploadForm');
const uploadBtn = document.getElementById('uploadBtn');
const fileResultSection = document.getElementById('fileResultSection');
const fileErrorSection = document.getElementById('fileErrorSection');
const fileUrlDisplay = document.getElementById('fileUrlDisplay');
const uploadedFileName = document.getElementById('uploadedFileName');
const fileErrorMessage = document.getElementById('fileErrorMessage');
const copyFileBtn = document.getElementById('copyFileBtn');

let selectedFile = null;

// Click to browse files
fileDropZone.addEventListener('click', () => {
    fileInput.click();
});

// File input change
fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
});

// Drag and drop handlers
fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('drag-over');
});

fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('drag-over');
});

fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// Handle file selection
function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showFileError('File too large. Maximum size is 10MB.');
        return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                         'application/pdf', 'text/plain', 'text/csv', 
                         'application/zip', 'application/json',
                         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!allowedTypes.includes(file.type)) {
        showFileError('File type not allowed. Only images, PDFs, text files, and office documents are permitted.');
        return;
    }
    
    selectedFile = file;
    
    // Show file preview
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileDropZone.style.display = 'none';
    filePreview.style.display = 'block';
    uploadBtn.disabled = false;
    
    // Hide result and error sections
    fileResultSection.style.display = 'none';
    fileErrorSection.style.display = 'none';
}

// Remove file
removeFileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetFileUpload();
});

// Reset file upload
function resetFileUpload(keepResultVisible = false) {
    selectedFile = null;
    fileInput.value = '';
    fileDropZone.style.display = 'block';
    filePreview.style.display = 'none';
    uploadBtn.disabled = true;
    if (!keepResultVisible) {
        fileResultSection.style.display = 'none';
    }
    fileErrorSection.style.display = 'none';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Show file error
function showFileError(message) {
    fileErrorMessage.textContent = message;
    fileErrorSection.style.display = 'block';
    fileResultSection.style.display = 'none';
    
    setTimeout(() => {
        fileErrorSection.style.display = 'none';
    }, 5000);
}

// File upload form submission
fileUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
        showFileError('Please select a file to upload.');
        return;
    }
    
    // Show loading state
    const btnText = uploadBtn.querySelector('.btn-text');
    const btnLoading = uploadBtn.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';
    uploadBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success
            fileUrlDisplay.value = data.fileUrl;
            uploadedFileName.textContent = data.originalName;
            fileResultSection.style.display = 'block';
            fileErrorSection.style.display = 'none';
            
            // Hide loading state
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            
            // Reset file selection (but keep result visible)
            // This will disable the button since no file is selected
            resetFileUpload(true);
            
            // Reload data
            loadStatistics();
        } else {
            showFileError(data.error || 'Failed to upload file');
            // Hide loading state and re-enable button on error
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            uploadBtn.disabled = false;
        }
    } catch (error) {
        console.error('Upload error:', error);
        showFileError('Network error. Please try again.');
        // Hide loading state and re-enable button on error
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        uploadBtn.disabled = false;
    }
});

// Copy file URL
copyFileBtn.addEventListener('click', async () => {
    const copyText = copyFileBtn.querySelector('.copy-text');
    const originalText = copyText.textContent;
    
    try {
        // Use modern Clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(fileUrlDisplay.value);
        } else {
            // Fallback for older browsers
            fileUrlDisplay.select();
            document.execCommand('copy');
        }
        
        copyText.textContent = 'Copied!';
        
        setTimeout(() => {
            copyText.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        copyText.textContent = 'Failed';
        setTimeout(() => {
            copyText.textContent = originalText;
        }, 2000);
    }
});
