// Function to ensure Chart.js is loaded
function ensureChartJsLoaded() {
  return new Promise((resolve, reject) => {
    // If Chart is already defined, resolve immediately
    if (typeof Chart !== 'undefined') {
      console.log('Chart.js is already loaded');
      resolve(true);
      return;
    }
    
    console.log('Loading Chart.js dynamically');
    // Try to load Chart.js dynamically
    const script = document.createElement('script');
    script.id = 'chartjs-script';
    // Use chrome.runtime.getURL to ensure proper path inside extension
    try {
      // Prefer min file if present
      script.src = chrome.runtime?.getURL
        ? chrome.runtime.getURL('src/lib/chart.min.js')
        : '/src/lib/chart.min.js';
    } catch (e) {
      script.src = '/src/lib/chart.min.js';
    }
    
    script.onload = function() {
      console.log('Chart.js loaded successfully');
      resolve(true);
    };
    
    script.onerror = function(e) {
      console.error('Failed to load Chart.js primary path, retrying alternative...', e);
      // Fallback to alternative location used in some builds
      const alt = document.createElement('script');
      alt.id = 'chartjs-script-alt';
      try {
        alt.src = chrome.runtime?.getURL
          ? chrome.runtime.getURL('lib/chart.min.js')
          : '/lib/chart.min.js';
      } catch (err) {
        alt.src = '/lib/chart.min.js';
      }
      alt.onload = () => resolve(true);
      alt.onerror = () => reject(new Error('Failed to load Chart.js'));
      document.head.appendChild(alt);
    };
    
    document.head.appendChild(script);
  });
}

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

function showTrackingStatus(message, isSuccess) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.style.color = isSuccess ? 'green' : 'red';
    statusDiv.style.display = 'block';
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// --- Main Logic ---
async function getProductInfoFromTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' }, (response) => {
            resolve(response);
        });
    });
}

// Ensure Chart.js is loaded when window loads
window.onload = function() {
    console.log('Window loaded, checking Chart.js availability');
    ensureChartJsLoaded()
        .then(() => console.log('Chart.js loaded successfully on window load'))
        .catch(err => console.error('Failed to load Chart.js on window load:', err));
};

// On popup load, fill product info
window.addEventListener('DOMContentLoaded', async () => {
    // Dashboard link hover effects are now handled by CSS

    // Ensure Chart.js is loaded
    ensureChartJsLoaded()
        .then(() => console.log('Chart.js loaded successfully in DOMContentLoaded'))
        .catch(err => console.error('Failed to load Chart.js in DOMContentLoaded:', err));

    const product = await getProductInfoFromTab();
    if (product && product.name && product.currentPrice) {
        document.getElementById('productName').textContent = product.name;
        document.getElementById('productPrice').textContent = product.currentPrice;
        if (product.currentPrice && !isNaN(Number(product.currentPrice))) {
            document.getElementById('priceThreshold').value = Math.round(Number(product.currentPrice) * 0.9);
        }
    }

    // Auto-load history and prediction to render graph when 5+ data points exist
    try {
        if (product && product.url) {
            const result = await makeApiCall(`/api/history-prediction?url=${encodeURIComponent(product.url)}&user_id=default`, 'GET');
            if (result && result.prediction) {
                await renderPredictionGraph(result.prediction);
            } else if (result && typeof result.data_points === 'number') {
                // Show progress if not enough points
                const remaining = Math.max(0, (result.min_required || 5) - result.data_points);
                showDataCollectionProgress(remaining);
            }
        }
    } catch (e) {
        console.warn('Auto-load graph failed:', e.message);
    }
});

document.getElementById('trackBtn').onclick = async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        // Site validation
        if (!tab.url.includes('amazon.in') ) {
            alert('This site is not supported. Please use Amazon');
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
        // Show success and render graph or data points needed
        const threshold = parseFloat(document.getElementById('priceThreshold')?.value || 1000);



        if (result.data_points_needed > 0) {
            const waitMinutes = result.data_points_needed * 2; // since scheduler runs every 2 minutes
            showTrackingStatus(
                `✅ Tracking started! We're still collecting price data to make a prediction. 
                ${result.data_points_needed} more prices are needed. Please check again in ~${waitMinutes} minutes.`,
                true
            );
            showDataCollectionProgress(result.data_points_needed);
            try {
                const history = await makeApiCall(`/api/history?url=${encodeURIComponent(product.url)}&user_id=default`, 'GET');
                if (history && history.length > 0) {
                    await renderHistoryGraph(history);  // <-- new function
                }
            } catch (e) {
                console.warn("Failed to load history graph:", e.message);
            }
        } 
        else {
            showTrackingStatus(`✅ Success! You will be notified when the price drops below ₹${threshold}`, true);
            if (result.prediction) {
                // Ensure Chart.js is loaded before rendering prediction graph
                await renderPredictionGraph(result.prediction);
            }
            // Notify content script to reflect "Tracking" state on page buttons
            chrome.tabs.sendMessage(tab.id, { type: 'TRACKING_STARTED', data: { url: product.url, threshold } }, () => {});
        }
    } catch (error) {
        console.error('Error:', error);
        showTrackingStatus(error.message, false);
    }
};

// Graph rendering function
async function renderHistoryGraph(history) {
  const graphContainer = document.getElementById('graphContainer');
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  
  function renderChart() {
    try {
      // Clear previous graph if exists
      if (window.predictionChart) {
        window.predictionChart.destroy();
      }

      // Create new chart
      window.predictionChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: history.map(h => new Date(h.date).toLocaleString()),
            datasets: [{
              label: 'Collected Prices',
              data: history.map(h => h.price),
              borderColor: '#2196F3',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              tension: 0.3,
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
      // document.getElementById('recText').textContent = predictionData.recommendation;
      // document.getElementById('confText').textContent = (predictionData.confidence * 100).toFixed(0);
      
      // Show graph container
      graphContainer.style.display = 'block';
    } catch (error) {
      console.error('Error rendering prediction chart:', error);
      graphContainer.innerHTML = `<div class="chart-error">Error rendering chart: ${error.message}</div>`;
      graphContainer.style.display = 'block';
    }
  }
  
  try {
    // Ensure Chart.js is loaded before rendering
    await ensureChartJsLoaded();
    
    // Now that we're sure Chart.js is loaded, render the chart
    renderChart();
  } catch (error) {
    console.error('Failed to load Chart.js:', error);
    graphContainer.innerHTML = '<div class="chart-error">Unable to load Chart.js library. Please refresh the extension.</div>';
    graphContainer.style.display = 'block';
  }
}

// UI helper function
function showTrackingStatus(message, isSuccess) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.classList.remove('success', 'error');
  statusDiv.classList.add(isSuccess ? 'success' : 'error');
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
    
    const progressText = document.createElement('p');
    progressText.textContent = `📊 Data Collection Progress`;
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressFill = document.createElement('div');
    const progressPercent = ((5 - dataPointsNeeded) / 5) * 100;
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${progressPercent}%`;
    
    const progressLabel = document.createElement('div');
    progressLabel.className = 'progress-label';
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

chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  injectContentScript(tabs[0].id);
});

// Check Chart.js availability when window loads
window.onload = function() {
  console.log('Window loaded, checking Chart.js availability');
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not available after window load');
    const graphContainer = document.getElementById('graphContainer');
    if (graphContainer) {
      graphContainer.style.display = 'block';
      graphContainer.innerHTML = '<div style="color:red;">Chart.js library is not loaded. Please check your extension HTML.</div>';
    }
    
    // Try to load Chart.js dynamically with correct path
     const script = document.createElement('script');
     script.src = '/src/lib/chart.min.js';
     script.onload = function() {
       console.log('Chart.js dynamically loaded on window.onload');
     };
    document.head.appendChild(script);
  } else {
    console.log('Chart.js is available on window.onload');
  }
};