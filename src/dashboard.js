// Global variables
let currentProducts = [];
let currentAction = null;
let currentProductUrl = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialized');
    setupEventListeners();
    loadUserProducts();
    loadAlerts();
});

// Setup all event listeners
function setupEventListeners() {
    // Test API button
    document.getElementById('testApiBtn').addEventListener('click', testApiConnection);
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadUserProducts);
    
    // Modal buttons
    document.getElementById('cancelThresholdBtn').addEventListener('click', closeModal);
    document.getElementById('updateThresholdBtn').addEventListener('click', updateThreshold);
    document.getElementById('cancelConfirmBtn').addEventListener('click', closeModal);
    document.getElementById('confirmBtn').addEventListener('click', confirmAction);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const thresholdModal = document.getElementById('thresholdModal');
        const confirmModal = document.getElementById('confirmModal');
        
        if (event.target === thresholdModal) {
            closeModal();
        }
        if (event.target === confirmModal) {
            closeModal();
        }
    });
    
    // Handle Enter key in threshold input
    document.getElementById('newThreshold').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            updateThreshold();
        }
    });
    
    console.log('Event listeners setup complete');

    // Tabs wiring
    const tabHome = document.getElementById('tabHome');
    const tabAlerts = document.getElementById('tabAlerts');
    const homeSection = document.getElementById('homeSection');
    const alertsSection = document.getElementById('alertsSection');
    if (tabHome && tabAlerts && homeSection && alertsSection) {
        tabHome.addEventListener('click', () => {
            tabHome.classList.add('active');
            tabAlerts.classList.remove('active');
            homeSection.style.display = 'block';
            alertsSection.style.display = 'none';
        });
        tabAlerts.addEventListener('click', () => {
            tabAlerts.classList.add('active');
            tabHome.classList.remove('active');
            homeSection.style.display = 'none';
            alertsSection.style.display = 'block';
            loadAlerts();
        });
    }
}

// Helper function to make API calls through background script
async function makeApiCall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        console.log(`Making API call: ${method} ${endpoint}`, body);
        
        chrome.runtime.sendMessage({
            type: 'API_CALL',
            endpoint: endpoint,
            method: method,
            body: body
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.error) {
                console.error('API error:', response.error);
                reject(new Error(response.error));
            } else if (response && response.data) {
                console.log('API success:', response.data);
                resolve(response.data);
            } else {
                console.error('Unexpected response:', response);
                reject(new Error('Unexpected response format'));
            }
        });
    });
}

// Test API connection
async function testApiConnection() {
    try {
        console.log('Testing API connection...');
        const data = await makeApiCall('/ping');
        console.log('API test response:', data);
        showSuccess('✅ API connection successful! Server is running.');
    } catch (error) {
        console.error('API test failed:', error);
        showError('❌ API connection failed: ' + error.message);
    }
}

// Show warning message
function showWarning(message) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.style.color = '#ff9800'; // Orange color for warnings
    statusDiv.style.display = 'block';
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Load user's tracked products
async function loadUserProducts() {
    try {
        console.log('Loading user products...');
        
        // First, try to get products from local storage
        chrome.storage.local.get(['trackedProducts'], async (result) => {
            const localProducts = result.trackedProducts || {};
            console.log('Products from local storage:', localProducts);
            
            // Convert object to array
            const localProductsArray = Object.values(localProducts).map(product => ({
                name: product.name,
                url: product.url,
                current_price: product.price,
                threshold: product.threshold,
                is_active: true,
                last_checked: product.lastChecked,
                date_added: product.dateAdded || Date.now()
            }));
            
            // Try to get products from API as well
            try {
                const data = await makeApiCall('/api/user/products');
                console.log('Received data from API:', data);
                
                // Merge products from API with local storage products
                const apiProducts = data.products || [];
                
                // Use a Map to deduplicate by URL
                const productMap = new Map();
                
                // Add local products first
                localProductsArray.forEach(product => {
                    productMap.set(product.url, product);
                });
                
                // Then add/override with API products
                apiProducts.forEach(product => {
                    productMap.set(product.url, product);
                });
                
                // Convert back to array
                currentProducts = Array.from(productMap.values());
                
                updateStats({ total_products: currentProducts.length });
                renderProducts(currentProducts);
                
            } catch (error) {
                console.error('Error loading products from API:', error);
                showWarning('Could not connect to server. Showing locally tracked products only.');
                
                // If API fails, just use local products
                currentProducts = localProductsArray;
                updateStats({ total_products: currentProducts.length });
                renderProducts(currentProducts);
            }
        });
        
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products. Please check if the server is running.');
        
        // Show error state in the container
        const container = document.getElementById('productsContainer');
        container.innerHTML = `
            <div class="empty-state">
                <h3>❌ Error Loading Products</h3>
                <p>Failed to load your tracked products.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <button class="btn btn-primary" onclick="loadUserProducts()" style="margin-top: 10px;">
                    🔄 Try Again
                </button>
            </div>
        `;
    }
}

// Update statistics
function updateStats(data) {
    const totalProducts = data.total_products || 0;
    const activeProducts = currentProducts.filter(p => p.is_active !== false).length;
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('activeProducts').textContent = activeProducts;
    document.getElementById('priceAlerts').textContent = String((window.__alertsCache || []).length || 0);
}

// Render products in the grid
function renderProducts(products) {
    const container = document.getElementById('productsContainer');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📦 No Products Tracked</h3>
                <p>You haven't started tracking any products yet.</p>
                <p>Go back to the tracker to add your first product!</p>
            </div>
        `;
        return;
    }
    
    const productsHTML = products.map(product => createProductCard(product)).join('');
    container.innerHTML = `
        <div class="product-grid">
            ${productsHTML}
        </div>
    `;
    
    // Add event listeners to the newly created buttons
    addProductButtonListeners();
}

// Add event listeners to product buttons
function addProductButtonListeners() {
    // Update threshold buttons
    document.querySelectorAll('.update-threshold-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            const threshold = this.getAttribute('data-threshold');
            openThresholdModal(url, threshold);
        });
    });
    
    // Stop tracking buttons
    document.querySelectorAll('.stop-tracking-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            stopTracking(url);
        });
    });
    
    // Remove product buttons
    document.querySelectorAll('.remove-product-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            removeProduct(url);
        });
    });
}

// Create product card HTML
function createProductCard(product) {
    const currentPrice = product.current_price || 'N/A';
    const threshold = product.threshold || 'N/A';
    const isActive = product.is_active !== false;
    
    const priceStatus = currentPrice !== 'N/A' && threshold !== 'N/A' 
        ? (currentPrice <= threshold ? '🎯 Price Alert!' : '📊 Monitoring')
        : '📊 Monitoring';
    
    const priceStatusClass = currentPrice !== 'N/A' && threshold !== 'N/A' && currentPrice <= threshold 
        ? 'price-alert' 
        : '';
    
    const safeUrl = product.url || '#';
    const clickableName = safeUrl && safeUrl !== '#' ? `<a href="${safeUrl}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">${product.name || 'Unknown Product'}</a>` : (product.name || 'Unknown Product');
    return `
        <div class="product-card ${priceStatusClass}">
            <div class="product-name">${clickableName}</div>
            <div class="product-url">${safeUrl !== '#' ? safeUrl : 'No URL'}</div>
            
            <div class="price-info">
                <div class="price-item">
                    <div class="price-label">Current Price</div>
                    <div class="price-value current-price">₹${currentPrice}</div>
                </div>
                <div class="price-item">
                    <div class="price-label">Alert Threshold</div>
                    <div class="price-value threshold-price">₹${threshold}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px; padding: 8px; background: #f8f9fa; border-radius: 5px; text-align: center;">
                <strong>${priceStatus}</strong>
            </div>
            
            <div class="actions">
                <button class="btn btn-primary update-threshold-btn" data-url="${product.url}" data-threshold="${threshold}">
                    📝 Update Threshold
                </button>
                <button class="btn btn-warning stop-tracking-btn" data-url="${product.url}">
                    ⏸️ Stop Tracking
                </button>
                <button class="btn btn-danger remove-product-btn" data-url="${product.url}">
                    🗑️ Remove
                </button>
            </div>
        </div>
    `;
}

// Load Alerts list
async function loadAlerts() {
    try {
        const data = await makeApiCall('/api/alerts');
        const alerts = data.alerts || [];
        window.__alertsCache = alerts;
        const countEl = document.getElementById('priceAlerts');
        if (countEl) countEl.textContent = String(alerts.length);
        const container = document.getElementById('alertsContainer');
        if (!container) return;
        if (alerts.length === 0) {
            container.innerHTML = '<div class="empty-state">No alerts yet.</div>';
            return;
        }
        container.innerHTML = alerts.map(a => `
            <div class="product-card">
                <div class="product-name"><a href="${a.url}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">${a.url}</a></div>
                <div class="price-info">
                    <div class="price-item"><div class="price-label">Triggered Price</div><div class="price-value current-price">₹${a.price}</div></div>
                    <div class="price-item"><div class="price-label">Threshold</div><div class="price-value threshold-price">₹${a.threshold}</div></div>
                </div>
                <div style="font-size:12px;color:#666;">${new Date(a.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load alerts', e);
    }
}

// Open threshold update modal
function openThresholdModal(url, currentThreshold) {
    console.log('Opening threshold modal for:', url, 'current threshold:', currentThreshold);
    currentProductUrl = url;
    
    // Handle different threshold formats
    let thresholdValue = currentThreshold;
    if (currentThreshold === 'N/A' || currentThreshold === null || currentThreshold === undefined) {
        thresholdValue = '';
    } else if (typeof currentThreshold === 'string') {
        thresholdValue = parseFloat(currentThreshold) || '';
    }
    
    document.getElementById('newThreshold').value = thresholdValue;
    document.getElementById('thresholdModal').style.display = 'block';
}

// Update threshold
async function updateThreshold() {
    const newThreshold = parseFloat(document.getElementById('newThreshold').value);
    
    if (!newThreshold || newThreshold <= 0) {
        alert('Please enter a valid threshold price');
        return;
    }
    
    try {
        console.log('Updating threshold for:', currentProductUrl, 'to:', newThreshold);
        
        const response = await makeApiCall('/api/product/threshold', 'PUT', {
            url: currentProductUrl,
            new_threshold: newThreshold,
            user_id: 'default'
        });
        
        console.log('Threshold update response:', response);
        showSuccess(response.message);
        closeModal();
        loadUserProducts(); // Refresh the list
        
    } catch (error) {
        console.error('Error updating threshold:', error);
        showError('Failed to update threshold: ' + error.message);
    }
}

// Stop tracking a product
function stopTracking(url) {
    console.log('Stop tracking called for URL:', url);
    currentProductUrl = url;
    currentAction = 'stop';
    
    document.getElementById('confirmTitle').textContent = 'Stop Tracking Product';
    document.getElementById('confirmMessage').textContent = 'Are you sure you want to stop tracking this product? You can resume tracking later.';
    document.getElementById('confirmBtn').textContent = 'Stop Tracking';
    document.getElementById('confirmBtn').className = 'btn btn-warning';
    
    document.getElementById('confirmModal').style.display = 'block';
}

// Remove product completely
function removeProduct(url) {
    console.log('Remove product called for URL:', url);
    currentProductUrl = url;
    currentAction = 'remove';
    
    document.getElementById('confirmTitle').textContent = 'Remove Product';
    document.getElementById('confirmMessage').textContent = 'Are you sure you want to completely remove this product? This will delete all price history and cannot be undone.';
    document.getElementById('confirmBtn').textContent = 'Remove';
    document.getElementById('confirmBtn').className = 'btn btn-danger';
    
    document.getElementById('confirmModal').style.display = 'block';
}

// Confirm action
async function confirmAction() {
    if (!currentAction || !currentProductUrl) {
        console.error('No action or URL set for confirmation');
        closeModal();
        return;
    }
    
    try {
        console.log('Confirming action:', currentAction, 'for URL:', currentProductUrl);
        
        let endpoint, method;
        
        if (currentAction === 'stop') {
            endpoint = '/api/product/stop-tracking';
            method = 'POST';
        } else if (currentAction === 'remove') {
            endpoint = '/api/product/remove';
            method = 'DELETE';
        }
        
        const response = await makeApiCall(endpoint, method, {
            url: currentProductUrl,
            user_id: 'default'
        });
        
        console.log('Action response:', response);
        showSuccess(response.message);
        closeModal();
        loadUserProducts(); // Refresh the list
        
    } catch (error) {
        console.error('Error performing action:', error);
        showError('Failed to perform action: ' + error.message);
    }
}

// Close modal
function closeModal() {
    document.getElementById('thresholdModal').style.display = 'none';
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
    currentProductUrl = null;
}

// Show success message
function showSuccess(message) {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Show error message
function showError(message) {
    // Create a temporary error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

console.log('Dashboard script loaded');