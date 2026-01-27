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

// State
let isLoading = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadRecentUrls();
});

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
            return;
        }
        
        // Sort by creation date (newest first) and limit to 5
        const recentList = urls
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        recentUrls.innerHTML = recentList.map(url => createUrlItem(url)).join('');
    } catch (error) {
        console.error('Error loading recent URLs:', error);
    }
}

// Create URL item HTML
function createUrlItem(url) {
    const shortUrl = `${window.location.origin}/${url.shortCode}`;
    const date = new Date(url.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    return `
        <div class="url-item">
            <div class="url-item-header">
                <a href="${shortUrl}" class="url-short" target="_blank">${shortUrl}</a>
                <div class="url-stats">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/>
                    </svg>
                    ${url.clicks} ${url.clicks === 1 ? 'click' : 'clicks'}
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
