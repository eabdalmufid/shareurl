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
const recentUrls = document.getElementById('recentUrls');
const themeToggle = document.getElementById('themeToggle');
const pagination = document.getElementById('pagination');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// State
let isLoading = false;
let isAdmin = false;
let currentPage = 1;
let totalPages = 1;
const ITEMS_PER_PAGE = 5;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAdminKey();
    loadRecentUrls();
    loadStatistics();
    initTheme();
});

// Check if admin key is in URL query parameters
function checkAdminKey() {
    const urlParams = new URLSearchParams(window.location.search);
    const key = urlParams.get('key');
    
    // Check if key matches admin password (admin123 by default)
    if (key === 'admin123') {
        isAdmin = true;
    } else {
        isAdmin = false;
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
        loadRecentUrls();
        urlInput.value = '';
        customCode.value = '';
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

// Load recent URLs
async function loadRecentUrls() {
    try {
        const response = await fetch('/api/urls');
        const urls = await response.json();
        
        if (!urls || urls.length === 0) {
            recentUrls.innerHTML = '<p class="no-urls">No URLs created yet. Create your first short URL above!</p>';
            pagination.style.display = 'none';
            return;
        }
        
        // Sort by creation date (newest first)
        const sortedUrls = urls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Calculate pagination
        totalPages = Math.ceil(sortedUrls.length / ITEMS_PER_PAGE);
        
        // Ensure current page is valid
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
        if (currentPage < 1) {
            currentPage = 1;
        }
        
        // Get URLs for current page
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageUrls = sortedUrls.slice(startIndex, endIndex);
        
        recentUrls.innerHTML = pageUrls.map(url => createUrlItem(url)).join('');
        
        // Show/hide pagination
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            prevPage.disabled = currentPage === 1;
            nextPage.disabled = currentPage === totalPages;
        } else {
            pagination.style.display = 'none';
        }
        
        // Add event listeners to delete buttons (only for admin)
        if (isAdmin) {
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', () => {
                    const shortCode = btn.getAttribute('data-shortcode');
                    deleteUrl(shortCode);
                });
            });
        }
        
        // Update statistics
        loadStatistics();
    } catch (error) {
        console.error('Error loading recent URLs:', error);
    }
}

// Pagination event listeners
prevPage.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadRecentUrls();
    }
});

nextPage.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        loadRecentUrls();
    }
});

// Create URL item HTML
function createUrlItem(url) {
    const shortUrl = `${window.location.origin}/${url.shortCode}`;
    const date = new Date(url.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    const deleteButton = isAdmin ? `
        <button class="btn-delete" data-shortcode="${url.shortCode}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3 6 5 6 21 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="10" y1="11" x2="10" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="14" y1="11" x2="14" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    ` : '';
    
    return `
        <div class="url-item" data-shortcode="${url.shortCode}">
            <div class="url-item-header">
                <a href="${shortUrl}" class="url-short" target="_blank">${shortUrl}</a>
                <div class="url-actions">
                    <div class="url-stats">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/>
                        </svg>
                        ${url.clicks} ${url.clicks === 1 ? 'click' : 'clicks'}
                    </div>
                    ${deleteButton}
                </div>
            </div>
            <div class="url-original-text" title="${url.originalUrl}">${url.originalUrl}</div>
            <div class="url-meta">
                <span>Created: ${date}</span>
            </div>
        </div>
    `;
}

// Auto-focus input on page load
urlInput.focus();

// Delete URL function
async function deleteUrl(shortCode) {
    if (!isAdmin) {
        alert('Admin access required to delete URLs');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this short URL?')) {
        return;
    }
    
    try {
        // Get the admin key from URL
        const urlParams = new URLSearchParams(window.location.search);
        const key = urlParams.get('key');
        
        const response = await fetch(`/api/urls/${shortCode}?key=${key}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const data = await response.json();
            
            // If unauthorized, refresh the page to re-check admin status
            if (response.status === 401) {
                alert('Unauthorized. Please check your admin key.');
                return;
            }
            
            throw new Error(data.error || 'Failed to delete URL');
        }
        
        // Fetch updated URL list to calculate correct pagination
        const response2 = await fetch('/api/urls');
        const urls = await response2.json();
        
        if (urls.length === 0) {
            // No URLs left, reset to page 1
            currentPage = 1;
        } else {
            // Calculate new total pages
            const newTotalPages = Math.ceil(urls.length / ITEMS_PER_PAGE);
            
            // If current page exceeds new total pages, go to last page
            if (currentPage > newTotalPages) {
                currentPage = Math.max(1, newTotalPages);
            }
        }
        
        // Reload recent URLs and statistics
        await loadRecentUrls();
    } catch (error) {
        alert('Error deleting URL: ' + error.message);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/api/urls');
        const urls = await response.json();
        
        const totalUrls = urls.length;
        const totalClicks = urls.reduce((sum, url) => sum + (url.clicks || 0), 0);
        const avgClicks = totalUrls > 0 ? Math.round(totalClicks / totalUrls) : 0;
        
        // Update statistics display
        document.getElementById('totalUrls').textContent = totalUrls;
        document.getElementById('totalClicks').textContent = totalClicks;
        document.getElementById('avgClicks').textContent = avgClicks;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

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
function resetFileUpload() {
    selectedFile = null;
    fileInput.value = '';
    fileDropZone.style.display = 'block';
    filePreview.style.display = 'none';
    uploadBtn.disabled = true;
    fileResultSection.style.display = 'none';
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
            
            // Reset form
            setTimeout(() => {
                resetFileUpload();
            }, 100);
            
            // Reload data
            loadRecentUrls();
            loadStatistics();
        } else {
            showFileError(data.error || 'Failed to upload file');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showFileError('Network error. Please try again.');
    } finally {
        // Hide loading state
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        uploadBtn.disabled = false;
    }
});

// Copy file URL
copyFileBtn.addEventListener('click', () => {
    fileUrlDisplay.select();
    document.execCommand('copy');
    
    const copyText = copyFileBtn.querySelector('.copy-text');
    const originalText = copyText.textContent;
    copyText.textContent = 'Copied!';
    
    setTimeout(() => {
        copyText.textContent = originalText;
    }, 2000);
});
