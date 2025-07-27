/* global chrome */

/**
 * @typedef {Object} TrackedProduct
 * @property {string} url
 * @property {number} threshold
 * @property {number} lastChecked
 */

// Run check every hour
const CHECK_INTERVAL = 60 * 60 * 1000;

// Initialize tracked products from storage
chrome.storage.local.get(['trackedProducts'], (result) => {
  const trackedProducts = result.trackedProducts || {};
  startPriceMonitoring(trackedProducts);
});

// Listen for messages to track a new product
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRACK_PRODUCT') {
    const { url, threshold } = message.data;
    addProductToTrack(url, threshold);
    sendResponse({ success: true });
  }
});

// Add new product and trigger first check
async function addProductToTrack(url, threshold) {
  const { trackedProducts = {} } = await chrome.storage.local.get(['trackedProducts']);

  trackedProducts[url] = {
    url,
    threshold,
    lastChecked: Date.now(),
  };

  await chrome.storage.local.set({ trackedProducts });
  checkPrice(url, threshold);
}

// Periodically monitor all tracked products
function startPriceMonitoring(trackedProducts) {
  // First-time check
  Object.values(trackedProducts).forEach((product) => {
    checkPrice(product.url, product.threshold);
  });

  // Then interval checks
  setInterval(() => {
    Object.values(trackedProducts).forEach((product) => {
      checkPrice(product.url, product.threshold);
    });
  }, CHECK_INTERVAL);
}

// Fetch current price and notify if below threshold
async function checkPrice(url, threshold) {
  try {
    const response = await fetch(`http://localhost:8000/api/price?url=${encodeURIComponent(url)}`);
    const { price } = await response.json();

    if (price <= threshold) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'Price Alert!',
        message: `The price has dropped to $${price}! Click to view the product.`,
      });

      const { trackedProducts } = await chrome.storage.local.get(['trackedProducts']);
      if (trackedProducts[url]) {
        trackedProducts[url].lastChecked = Date.now();
        await chrome.storage.local.set({ trackedProducts });
      }
    }
  } catch (error) {
    console.error('Error checking price:', error);
  }
}

// Background script for Price Tracker Extension

console.log('Background script loaded');

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.type === 'API_CALL') {
        handleApiCall(request, sendResponse);
        return true; // Keep the message channel open for async response
    }
    
    // Handle other message types here
    sendResponse({ success: true });
});

// Handle API calls to the backend
async function handleApiCall(request, sendResponse) {
    try {
        const { endpoint, method = 'GET', body = null } = request;
        const url = `http://localhost:8000${endpoint}`;
        
        console.log(`Making API call: ${method} ${url}`, body);
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API call failed:', response.status, errorText);
            sendResponse({
                error: `HTTP ${response.status}: ${errorText}`
            });
            return;
        }
        
        const data = await response.json();
        console.log('API call successful:', data);
        
        sendResponse({
            data: data
        });
        
    } catch (error) {
        console.error('API call error:', error);
        sendResponse({
            error: error.message
        });
    }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
    console.log('Price Tracker Extension installed');
});

// Extension startup handler
chrome.runtime.onStartup.addListener(() => {
    console.log('Price Tracker Extension started');
});

// Test the background script is working
console.log('Background script initialization complete');

