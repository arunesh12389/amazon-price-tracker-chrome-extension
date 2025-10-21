/* global chrome */

// This listener is for when the user clicks the extension icon in the toolbar.
chrome.action.onClicked.addListener((tab) => {
  // Check if we are on a supported website
  if (tab.url && (tab.url.includes("amazon.in/") || tab.url.includes("flipkart.com/"))) {
    // If yes, send a message to our content script on that page, telling it to show the UI.
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_UI" });
  } else {
    // If we are on any other website (like Google, etc.), open the dashboard in a new tab.
    const dashboardUrl = chrome.runtime.getURL("src/dashboard.html");
    chrome.tabs.create({ url: dashboardUrl });
  }
});


const ALARM_NAME = 'priceAlertChecker';

// 1. Create the alarm when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Price Tracker extension installed. Setting up alarm...');
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,  // Run 1 minute after startup
    periodInMinutes: 15 // Then repeat every 15 minutes
  });
  console.log('Alarm created successfully.');
});

// 2. Listen for the alarm and check for alerts
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Alarm triggered. Checking for new price alerts...');
    checkAndNotify();
  }
});

// 3. Listen for clicks on the notifications
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: notificationId });
  chrome.notifications.clear(notificationId);
});

// 4. Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'API_CALL') {
        handleApiCall(request, sendResponse);
        return true; // Keep channel open for async response
    }
    // New listener for manual check from dashboard
    if (request.type === 'CHECK_ALERTS_NOW') {
        console.log('Manual alert check triggered from dashboard.');
        checkAndNotify();
        sendResponse({ status: 'Alert check initiated.' });
        return true;
    }
});

// Main function to check for alerts and create notifications
async function checkAndNotify() {
    try {
        // Step A: Fetch ONLY new alerts from the backend
        const response = await handleApiCall({ endpoint: '/api/alerts?new_only=true', method: 'GET' });
        const newAlerts = response.data.alerts;

        if (!newAlerts || newAlerts.length === 0) {
            console.log('No new alerts found.');
            return;
        }

        console.log(`Found ${newAlerts.length} new alerts. Creating notifications...`);
        const notifiedAlertIds = [];

        // Step B: Create a notification for each new alert
        for (const alert of newAlerts) {
            createNotification(alert);
            notifiedAlertIds.push(alert._id);
        }
        
        // Step C: Tell the backend to mark these alerts as notified
        if (notifiedAlertIds.length > 0) {
            await handleApiCall({
                endpoint: '/api/alerts/mark-notified',
                method: 'POST',
                body: { alert_ids: notifiedAlertIds, user_id: 'default' }
            });
            console.log('Marked alerts as notified on the backend.');
        }

    } catch (error) {
        console.error('Failed to check for alerts:', error);
    }
}

// Helper to create a rich browser notification
function createNotification(alert) {
    const placeholderImage = 'src/icons/icon128.png';
    chrome.notifications.create(alert.url, { // Use the product URL as the notification ID
        type: 'image',
        iconUrl: chrome.runtime.getURL('src/icons/icon128.png'),
        title: 'Price Drop Alert!',
        message: `The price of ${alert.name} dropped to ₹${alert.price}!`,
        imageUrl: alert.image_url || chrome.runtime.getURL(placeholderImage),
        contextMessage: 'Click to view the product page',
        priority: 2
    });
}



async function fetchApi(endpoint, method = 'GET', body = null) {
    const url = `${BACKEND_URL}${endpoint}`;
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }
    return await response.json();
}


async function handleApiCall(request, sendResponse) {
    try {
        const { endpoint, method = 'GET', body = null } = request;
        // All API calls go to our local server.
        const url = `http://localhost:8000${endpoint}`;
        
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        sendResponse({ data: data });
        
    } catch (error) {
        console.error('API call error in background.js:', error);
        sendResponse({ error: error.message });
    }
}