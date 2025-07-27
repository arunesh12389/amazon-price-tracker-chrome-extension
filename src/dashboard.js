// Global variables
let currentProducts = [];
let currentAction = null;
let currentProductUrl = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialized');
    setupEventListeners();
    loadUserProducts();
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

// Load user's tracked products
async function loadUserProducts() {
    try {
        console.log('Loading user products...');
        const data = await makeApiCall('/api/user/products');
        console.log('Received data:', data);
        
        currentProducts = data.products || [];
        
        updateStats(data);
        renderProducts(currentProducts);
        
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
    document.getElementById('priceAlerts').textContent = '0'; // TODO: Implement alert counting
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
    
    return `
        <div class="product-card ${priceStatusClass}">
            <div class="product-name">${product.name || 'Unknown Product'}</div>
            <div class="product-url">${product.url || 'No URL'}</div>
            
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