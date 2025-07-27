// Helper function to make API calls through background script
async function makeApiCall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: 'API_CALL',
            endpoint: endpoint,
            method: method,
            body: body
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response.data);
            }
        });
    });
}

document.getElementById('trackBtn').onclick = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Site validation
    if (!tab.url.includes('amazon.in') && !tab.url.includes('flipkart.com')) {
      alert('This site is not supported. Please use Amazon or Flipkart.');
      return;
    }

    // Get product data
    const product = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Communication error: ' + chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });

    if (!product) {
      document.getElementById('productName').textContent = 'Product not found';
      document.getElementById('productPrice').textContent = '-';
      alert('Could not extract product details.');
      return;
    }

    // Update UI
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productPrice').textContent = product.currentPrice;

    // Prepare payload
    const payload = {
      url: product.url,
      name: product.name,
      price: parseFloat(product.currentPrice.replace(/[^0-9.]/g, '')),
      threshold: parseFloat(document.getElementById('priceThreshold')?.value || 1000),
      last_checked: new Date().toISOString()
    };

    // Send to backend using background script
    const result = await makeApiCall('/api/track', 'POST', payload);
    
    // Show success and render graph
    const threshold = parseFloat(document.getElementById('priceThreshold')?.value || 1000);
    
    if (result.data_points_needed > 0) {
      showTrackingStatus(`✅ Tracking started! We're still collecting past price data to make a prediction. ${result.data_points_needed} more prices are needed. We'll check again in 30 minutes.`, true);
      showDataCollectionProgress(result.data_points_needed);
    } else {
      showTrackingStatus(`✅ Success! You will be notified when the price drops below ₹${threshold}`, true);
      if (result.prediction) {
        renderPredictionGraph(result.prediction);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    showTrackingStatus(error.message, false);
  }
};

// Graph rendering function
function renderPredictionGraph(predictionData) {
  const graphContainer = document.getElementById('graphContainer');
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  
  // Clear previous graph if exists
  if (window.predictionChart) {
    window.predictionChart.destroy();
  }

  // Create new chart
  window.predictionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: predictionData.dates,
      datasets: [{
        label: 'Price Prediction',
        data: predictionData.prices,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (context) => `₹${context.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value) => `₹${value}`
          }
        }
      }
    }
  });

  // Update recommendation
  document.getElementById('recText').textContent = predictionData.recommendation;
  document.getElementById('confText').textContent = (predictionData.confidence * 100).toFixed(0);
  
  // Show graph container
  graphContainer.style.display = 'block';
}

// UI helper function
function showTrackingStatus(message, isSuccess) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.style.color = isSuccess ? 'green' : 'red';
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000); // Increased timeout for better readability
}

function showDataCollectionProgress(dataPointsNeeded) {
  const progressContainer = document.getElementById('dataProgressContainer');
  if (!progressContainer) {
    // Create progress container if it doesn't exist
    const container = document.createElement('div');
    container.id = 'dataProgressContainer';
    container.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background-color: #f0f8ff;
      border-radius: 5px;
      border-left: 4px solid #2196F3;
    `;
    
    const progressText = document.createElement('p');
    progressText.style.margin = '0 0 10px 0';
    progressText.textContent = `📊 Data Collection Progress`;
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 100%;
      height: 20px;
      background-color: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
    `;
    
    const progressFill = document.createElement('div');
    const progressPercent = ((5 - dataPointsNeeded) / 5) * 100;
    progressFill.style.cssText = `
      width: ${progressPercent}%;
      height: 100%;
      background-color: #2196F3;
      transition: width 0.3s ease;
    `;
    
    const progressLabel = document.createElement('div');
    progressLabel.style.cssText = `
      text-align: center;
      margin-top: 5px;
      font-size: 12px;
      color: #666;
    `;
    progressLabel.textContent = `${5 - dataPointsNeeded}/5 data points collected`;
    
    progressBar.appendChild(progressFill);
    container.appendChild(progressText);
    container.appendChild(progressBar);
    container.appendChild(progressLabel);
    
    // Insert after status message
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.parentNode.insertBefore(container, statusDiv.nextSibling);
  } else {
    // Update existing progress
    const progressFill = progressContainer.querySelector('div > div');
    const progressLabel = progressContainer.querySelector('div:last-child');
    const progressPercent = ((5 - dataPointsNeeded) / 5) * 100;
    
    progressFill.style.width = `${progressPercent}%`;
    progressLabel.textContent = `${5 - dataPointsNeeded}/5 data points collected`;
  }
}


async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: {tabId: tabId},
      files: ['contentScript.js']
    });
    console.log("Injected content script");
  } catch (err) {
    console.error("Injection failed:", err);
  }
}

// Listen for product info sent by content script and auto-fill fields
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRODUCT_FOUND' && message.data) {
    document.getElementById('productName').textContent = message.data.name;
    document.getElementById('productPrice').textContent = message.data.currentPrice;
    // Optionally, set the threshold input to a default value based on price
    if (message.data.currentPrice && !isNaN(Number(message.data.currentPrice))) {
      document.getElementById('priceThreshold').value = Math.round(Number(message.data.currentPrice) * 0.9);
    }
  }
});

// On popup load, request product info if not already filled
window.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' }, (response) => {
    if (response && response.name && response.currentPrice) {
      document.getElementById('productName').textContent = response.name;
      document.getElementById('productPrice').textContent = response.currentPrice;
      if (response.currentPrice && !isNaN(Number(response.currentPrice))) {
        document.getElementById('priceThreshold').value = Math.round(Number(response.currentPrice) * 0.9);
      }
    }
  });
});

// Call this when popup opens
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  injectContentScript(tabs[0].id);
});