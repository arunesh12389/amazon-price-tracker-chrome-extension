// Global variables
let currentProducts = [];
let currentAction = null;
let currentProductUrl = null;

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadUserProducts();
    loadAlerts();
    loadUserSettings();
});

// Setup all event listeners for the page
function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', loadUserProducts);
    document.getElementById('clearAllAlertsBtn').addEventListener('click', clearAllAlerts);
    document.getElementById('cancelThresholdBtn').addEventListener('click', closeModal);
    document.getElementById('updateThresholdBtn').addEventListener('click', updateThreshold);
    document.getElementById('cancelConfirmBtn').addEventListener('click', closeModal);
    document.getElementById('confirmBtn').addEventListener('click', confirmAction);
    window.addEventListener('click', (event) => { if (event.target.classList.contains('modal')) closeModal(); });
    document.getElementById('newThreshold').addEventListener('keypress', (event) => { if (event.key === 'Enter') updateThreshold(); });
    document.getElementById('tabHome').addEventListener('click', () => switchTab('home'));
    document.getElementById('tabAlerts').addEventListener('click', () => switchTab('alerts'));
    document.getElementById('tabSettings').addEventListener('click', () => switchTab('settings'));
    document.getElementById('checkAlertsBtn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'CHECK_ALERTS_NOW' }, (response) => {
            showSuccess(response.status);
        });
    });
    document.getElementById('saveEmailBtn').addEventListener('click', saveEmail);
};

function switchTab(tabName) {
    // Hide all main sections
    document.getElementById('homeSection').style.display = 'none';
    document.getElementById('alertsSection').style.display = 'none';
    document.getElementById('settingsSection').style.display = 'none';

    // Deactivate all tabs
    document.getElementById('tabHome').classList.remove('active');
    document.getElementById('tabAlerts').classList.remove('active');
    document.getElementById('tabSettings').classList.remove('active');

    // Activate the selected tab and show the corresponding section
    if (tabName === 'home') {
        document.getElementById('tabHome').classList.add('active');
        document.getElementById('homeSection').style.display = 'block';
    } else if (tabName === 'alerts') {
        document.getElementById('tabAlerts').classList.add('active');
        document.getElementById('alertsSection').style.display = 'block';
        loadAlerts();
    } else if (tabName === 'settings') {
        document.getElementById('tabSettings').classList.add('active');
        document.getElementById('settingsSection').style.display = 'block';
        loadUserSettings();
    }
}

async function makeApiCall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        if (!chrome.runtime || !chrome.runtime.sendMessage) return reject(new Error("Extension context not available."));
        chrome.runtime.sendMessage({ type: 'API_CALL', endpoint, method, body }, (response) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (response && response.error) reject(new Error(response.error));
            else if (response && response.data) resolve(response.data);
            else reject(new Error('Invalid response from background script.'));
        });
    });
}

async function loadUserProducts() {
    const container = document.getElementById('productsContainer');
    container.innerHTML = `<div class="loading"><div class="spinner"></div>Loading your products...</div>`; // Updated loading message
    try {
        const data = await makeApiCall('/api/user/products');
        currentProducts = data.products || [];
        updateStats();
        renderProducts(currentProducts);
    } catch (error) {
        container.innerHTML = `<div class="empty-state"><h3>❌ Error Loading Products</h3><p>${error.message}</p></div>`;
    }
}

function updateStats() {
    const activeProducts = currentProducts.filter(p => p.is_active !== false).length;
    document.getElementById('totalProducts').textContent = currentProducts.length;
    document.getElementById('activeProducts').textContent = activeProducts;
    document.getElementById('priceAlerts').textContent = String(window.alertsCache?.length || 0);
}

function renderProducts(products) {
    const container = document.getElementById('productsContainer');
    const activeProducts = products.filter(p => p.is_active !== false);

    if (activeProducts.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>📦 No Products Tracked</h3><p>Start tracking products from Amazon pages!</p></div>`; // Added helpful message
        return;
    }
    container.innerHTML = activeProducts.map(createProductCard).join('');
    addProductButtonListeners();
}

// UPDATED createProductCard
function createProductCard(product) {
    const isAlert = product.current_price <= product.threshold;
    // Updated placeholder image for clearer text
    const placeholderImage = 'https://placehold.co/300x180/eef2ff/667eea?text=No+Image';
    return `
        <div class="product-card ${isAlert ? 'price-alert' : ''}">
            <img src="${product.image_url || placeholderImage}" alt="Product image for ${product.name}" class="product-image" onerror="this.src='${placeholderImage}'">
            <div class="product-details">
                <div class="product-name"><a href="${product.url}" target="_blank">${product.name}</a></div>
                <div class="price-info">
                    <div class="price-item"><div class="price-label">Current Price</div><div class="price-value current-price">₹${product.current_price}</div></div>
                    <div class="price-item"><div class="price-label">Alert Threshold</div><div class="price-value threshold-price">₹${product.threshold}</div></div>
                </div>
                <div class="actions">
                    <button class="btn btn-primary update-threshold-btn" data-url="${product.url}" data-threshold="${product.threshold}">📝 Update</button>
                    <button class="btn btn-danger stop-tracking-btn" data-url="${product.url}">🗑️ Stop</button>
                </div>
            </div>
        </div>
    `;
}

function addProductButtonListeners() {
    document.querySelectorAll('.update-threshold-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const { url, threshold } = e.currentTarget.dataset;
        openThresholdModal(url, threshold);
    }));
    document.querySelectorAll('.stop-tracking-btn').forEach(btn => btn.addEventListener('click', (e) => {
        stopTracking(e.currentTarget.dataset.url);
    }));
}

async function loadAlerts() {
    const container = document.getElementById('alertsContainer');
    container.innerHTML = `<div class="loading"><div class="spinner"></div>Loading alerts...</div>`; // Updated loading message
    try {
        const data = await makeApiCall('/api/alerts');
        const alerts = data.alerts || [];
        window.alertsCache = alerts;
        document.getElementById('priceAlerts').textContent = alerts.length;
        if (alerts.length === 0) {
            container.innerHTML = '<div class="empty-state">No alerts yet.</div>';
            return;
        }
        container.innerHTML = alerts.map(createAlertCard).join('');
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h3>❌ Error Loading Alerts</h3><p>${e.message}</p></div>`;
    }
}

// UPDATED createAlertCard (same structure as createProductCard for consistency)
function createAlertCard(alert) {
    const placeholderImage = 'https://placehold.co/300x180/ffe6e6/dc3545?text=Alert!';
    return `
        <div class="product-card price-alert">
            <img src="${alert.image_url || placeholderImage}" alt="Alert product image for ${alert.name}" class="product-image" onerror="this.src='${placeholderImage}'">
            <div class="product-details">
                <div class="product-name"><a href="${alert.url}" target="_blank">${alert.name || alert.url}</a></div>
                <div class="price-info">
                    <div class="price-item"><div class="price-label">Triggered Price</div><div class="price-value current-price">₹${alert.price}</div></div>
                    <div class="price-item"><div class="price-label">Your Threshold</div><div class="price-value threshold-price">₹${alert.threshold}</div></div>
                </div>
                <small style="text-align: center; margin-top: auto;">${new Date(alert.timestamp).toLocaleString()}</small>
            </div>
        </div>
    `;
}

async function clearAllAlerts() {
    const confirmed = await new Promise(resolve => {
        if (confirm('Are you sure you want to delete ALL alerts? This action cannot be undone.')) {
            resolve(true);
        } else {
            resolve(false);
        }
    });

    if (!confirmed) return;

    try {
        const response = await makeApiCall('/api/alerts/all', 'DELETE', { user_id: 'default' });
        showSuccess(response.message || 'All alerts cleared!');
        loadAlerts(); 
    } catch (error) { showError('Failed to clear alerts: ' + error.message); }
}

function openThresholdModal(url, currentThreshold) {
    currentProductUrl = url;
    document.getElementById('newThreshold').value = parseFloat(currentThreshold) || '';
    document.getElementById('thresholdModal').style.display = 'block';
}

async function updateThreshold() {
    const newThreshold = parseFloat(document.getElementById('newThreshold').value);
    if (!newThreshold || newThreshold <= 0) {
        showError('Please enter a valid threshold price (greater than 0).');
        return;
    }
    try {
        const response = await makeApiCall('/api/product/threshold', 'PUT', { url: currentProductUrl, new_threshold: newThreshold });
        showSuccess(response.message);
        closeModal();
        loadUserProducts(); 
    } catch (error) { showError('Failed to update threshold: ' + error.message); }
}

function stopTracking(url) {
    currentProductUrl = url;
    currentAction = 'stop';
    document.getElementById('confirmTitle').textContent = '⚠️ Stop Tracking';
    document.getElementById('confirmMessage').textContent = 'Are you sure you want to stop tracking this product? Its history and alerts will be removed permanently.';
    document.getElementById('confirmBtn').textContent = 'Yes, Stop Tracking';
    document.getElementById('confirmModal').style.display = 'block';
}

async function confirmAction() {
    if (!currentAction || !currentProductUrl) {
        closeModal();
        return;
    }
    try {
        if (currentAction === 'stop') {
            const response = await makeApiCall('/api/product/remove', 'DELETE', { url: currentProductUrl });
            showSuccess(response.message);
            loadUserProducts(); 
        }
    } catch (error) {
        showError('Action failed: ' + error.message);
    } finally {
        closeModal();
    }
}

function closeModal() {
    document.getElementById('thresholdModal').style.display = 'none';
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null; currentProductUrl = null;
}

function showSuccess(message) { showNotification(message, 'success'); }
function showError(message) { showNotification(message, 'error'); }

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300); 
    }, 3000);
}

async function loadUserSettings() {
    try {
        const data = await makeApiCall('/api/user/email?user_id=default', 'GET');
        const email = data.email;
        const currentEmailSpan = document.getElementById('currentEmail');
        if (email) {
            currentEmailSpan.textContent = email;
            document.getElementById('emailInput').value = email;
        } else {
            currentEmailSpan.textContent = 'Not set';
        }
    } catch (error) {
        showError('Could not load user settings.');
    }
}

async function saveEmail(emailToSave) {
    const email = typeof emailToSave === 'string' ? emailToSave : document.getElementById('emailInput').value.trim();
    if (!email) {
        return showError('Please enter a valid email address.');
    }

    try {
        const response = await makeApiCall('/api/user/email', 'POST', { email: email, user_id: 'default' });
        showSuccess(response.message || "Email saved!");
        loadUserSettings(); // Refresh the displayed email
        return true; 
    } catch (error) {
        showError('Failed to save email: ' + error.message);
        return false;
    }
}