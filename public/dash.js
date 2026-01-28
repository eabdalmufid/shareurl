// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const keyInput = document.getElementById('keyInput');
const loginError = document.getElementById('loginError');
const loginErrorMessage = document.getElementById('loginErrorMessage');
const logoutBtn = document.getElementById('logoutBtn');
const recentUrls = document.getElementById('recentUrls');
const recentFiles = document.getElementById('recentFiles');

// Admin state
let adminKey = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if admin key is stored in session storage
    const storedKey = sessionStorage.getItem('adminKey');
    if (storedKey) {
        verifyAndLogin(storedKey);
    }
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = keyInput.value.trim();
    
    if (!key) {
        showLoginError('Please enter an admin key');
        return;
    }
    
    await verifyAndLogin(key);
});

// Verify and login
async function verifyAndLogin(key) {
    try {
        // Verify key by attempting to fetch URLs with admin privileges
        const response = await fetch('/api/urls');
        
        if (!response.ok) {
            throw new Error('Failed to verify admin key');
        }
        
        // Store key in session
        adminKey = key;
        sessionStorage.setItem('adminKey', key);
        
        // Show dashboard
        loginSection.classList.add('dashboard-hidden');
        dashboardSection.classList.remove('dashboard-hidden');
        
        // Load dashboard data
        await loadDashboard();
    } catch (error) {
        showLoginError('Invalid admin key or server error');
        sessionStorage.removeItem('adminKey');
    }
}

// Show login error
function showLoginError(message) {
    loginErrorMessage.textContent = message;
    loginError.style.display = 'block';
    setTimeout(() => {
        loginError.style.display = 'none';
    }, 3000);
}

// Logout
logoutBtn.addEventListener('click', () => {
    adminKey = null;
    sessionStorage.removeItem('adminKey');
    loginSection.classList.remove('dashboard-hidden');
    dashboardSection.classList.add('dashboard-hidden');
    keyInput.value = '';
});

// Load dashboard data
async function loadDashboard() {
    await Promise.all([
        loadStatistics(),
        loadRecentUrls(),
        loadRecentFiles()
    ]);
}

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
        document.getElementById('adminTotalUrls').textContent = totalUrls;
        document.getElementById('adminTotalFiles').textContent = totalFiles;
        document.getElementById('adminTotalClicks').textContent = totalClicks;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load recent URLs
async function loadRecentUrls() {
    try {
        const response = await fetch('/api/urls');
        const urls = await response.json();
        
        if (!urls || urls.length === 0) {
            recentUrls.innerHTML = '<p class="no-items">No URLs found</p>';
            return;
        }
        
        // Sort by creation date (newest first) and limit to 20
        const sortedUrls = urls
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20);
        
        recentUrls.innerHTML = sortedUrls.map(url => createUrlItem(url)).join('');
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.btn-delete-url').forEach(btn => {
            btn.addEventListener('click', async () => {
                const shortCode = btn.getAttribute('data-shortcode');
                await deleteUrl(shortCode);
            });
        });
    } catch (error) {
        console.error('Error loading recent URLs:', error);
        recentUrls.innerHTML = '<p class="no-items">Error loading URLs</p>';
    }
}

// Load recent files
async function loadRecentFiles() {
    try {
        const response = await fetch('/api/files');
        const files = await response.json();
        
        if (!files || files.length === 0) {
            recentFiles.innerHTML = '<p class="no-items">No files found</p>';
            return;
        }
        
        // Sort by creation date (newest first) and limit to 20
        const sortedFiles = files
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20);
        
        recentFiles.innerHTML = sortedFiles.map(file => createFileItem(file)).join('');
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.btn-delete-file').forEach(btn => {
            btn.addEventListener('click', async () => {
                const fileCode = btn.getAttribute('data-filecode');
                await deleteFile(fileCode);
            });
        });
    } catch (error) {
        console.error('Error loading recent files:', error);
        recentFiles.innerHTML = '<p class="no-items">Error loading files</p>';
    }
}

// Create URL item HTML
function createUrlItem(url) {
    const shortUrl = `${window.location.origin}/${url.shortCode}`;
    const date = new Date(url.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
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
                    <button class="btn-delete btn-delete-url" data-shortcode="${url.shortCode}" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3 6 5 6 21 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="10" y1="11" x2="10" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="14" y1="11" x2="14" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="url-original-text" title="${url.originalUrl}">${url.originalUrl}</div>
            <div class="url-meta">
                <span>Created: ${date}</span>
            </div>
        </div>
    `;
}

// Create file item HTML
function createFileItem(file) {
    const fileUrl = `${window.location.origin}/f/${file.fileCode}`;
    const date = new Date(file.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const fileSize = formatFileSize(file.size);
    
    return `
        <div class="url-item" data-filecode="${file.fileCode}">
            <div class="url-item-header">
                <a href="${fileUrl}" class="url-short" target="_blank">${fileUrl}</a>
                <div class="url-actions">
                    <div class="url-stats">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${file.downloads || 0} ${file.downloads === 1 ? 'download' : 'downloads'}
                    </div>
                    <button class="btn-delete btn-delete-file" data-filecode="${file.fileCode}" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3 6 5 6 21 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="10" y1="11" x2="10" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="14" y1="11" x2="14" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="url-original-text" title="${file.originalName}">${file.originalName} (${fileSize})</div>
            <div class="url-meta">
                <span>Created: ${date}</span>
            </div>
        </div>
    `;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Delete URL
async function deleteUrl(shortCode) {
    if (!confirm('Are you sure you want to delete this short URL?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/urls/${shortCode}?key=${adminKey}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const data = await response.json();
            
            if (response.status === 401) {
                alert('Session expired. Please login again.');
                logoutBtn.click();
                return;
            }
            
            throw new Error(data.error || 'Failed to delete URL');
        }
        
        // Reload dashboard
        await loadDashboard();
    } catch (error) {
        alert('Error deleting URL: ' + error.message);
    }
}

// Delete file
async function deleteFile(fileCode) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/files/${fileCode}?key=${adminKey}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const data = await response.json();
            
            if (response.status === 401) {
                alert('Session expired. Please login again.');
                logoutBtn.click();
                return;
            }
            
            throw new Error(data.error || 'Failed to delete file');
        }
        
        // Reload dashboard
        await loadDashboard();
    } catch (error) {
        alert('Error deleting file: ' + error.message);
    }
}
