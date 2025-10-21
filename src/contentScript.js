/* global chrome, Chart */

// CSS for injected UI elements
const injectStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    .price-tracker-container {
      margin: 15px 0;
      padding: 15px;
      border: 1px solid #e7e7e7;
      border-radius: 8px;
      background-color: #f8f8f8;
      font-family: Arial, sans-serif;
      position: relative;
      z-index: 9998;
    }
    .price-tracker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .price-tracker-title {
      font-size: 16px;
      font-weight: bold;
      color: #232F3E;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .price-tracker-close {
      background: none;
      border: none;
      font-size: 24px;
      line-height: 1;
      color: #888;
      cursor: pointer;
      padding: 0;
      margin: 0;
    }
    .price-tracker-close:hover {
      color: #333;
    }
    .price-tracker-chart-container {
      height: 200px;
      margin: 10px 0;
      position: relative;
    }
    .price-tracker-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #232f3e;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 10px;
    }
    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
      display: inline-block;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .price-tracker-buying-assistance {
      margin: 10px 0;
      padding: 10px;
      background-color: #fff;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    .price-tracker-section-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
      color: #232F3E;
    }
    .price-tracker-stats-row {
      display: flex;
      justify-content: space-between;
      text-align: center;
    }
    .price-stat {
      flex: 1;
    }
    .stat-label {
      font-size: 12px;
      color: #555;
    }
    .stat-value {
      font-weight: bold;
      font-size: 16px;
    }
    .stat-value.lowest {
      color: #4CAF50;
    }
    .stat-value.highest {
      color: #f44336;
    }
    .price-tracker-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin-top: 15px;
    }
    .price-tracker-button {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
      color: #0F1111;
      transition: background-color 0.2s ease;
    }
    .price-tracker-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .price-tracker-button.success {
      background-color: #28a745;
      color: white;
      border-color: #28a745;
    }
    .track-button {
      background-color: #FFD814;
      border-color: #F7CA00;
    }
    .price-alert-button {
      background-color: #FF9900;
      border-color: #E88B00;
    }
    .dashboard-button {
      background-color: #232F3E;
      color: #FFFFFF;
      border-color: #131921;
    }
    .dashboard-button:hover {
      background-color: #3b4d66; /* Lighter shade for hover */
      color: #FFFFFF; /* Keep text white */
    }
    .price-tracker-error {
      color: #d9534f;
      margin-top: 10px;
    }
    .price-tracker-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .price-tracker-modal-content {
      background-color: white;
      border-radius: 8px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    .price-tracker-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border-bottom: 1px solid #e0e0e0;
    }
    .price-tracker-modal-header h3 {
      margin: 0;
      font-size: 18px;
      color: #232f3e;
    }
    .price-tracker-modal-close {
      background: none;
      border: none;
      font-size: 24px;
      line-height: 1;
      color: #888;
      cursor: pointer;
    }
    .price-tracker-modal-body {
      padding: 15px;
    }
    .price-tracker-form-group {
      margin-bottom: 15px;
    }
    .price-tracker-form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .price-tracker-form-group input {
      box-sizing: border-box;
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .price-tracker-modal-footer {
      padding: 15px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .price-tracker-modal-footer .price-tracker-button {
      padding: 8px 16px;
    }

    .price-tracker-button:hover { background-color: #e0e0e0; }
    .price-tracker-button:disabled { opacity: 0.7; cursor: not-allowed; }
    .price-tracker-button.success { background-color: #28a745; color: white; border-color: #28a745; }
    .track-button { background-color: #FFD814; border-color: #F7CA00; }
    .track-button:hover { background-color: #F7CA00; border-color: #F0B800; }
    .price-alert-button { background-color: #FF9900; border-color: #E88B00; }
    .price-alert-button:hover { background-color: #E88B00; border-color: #D17D00; }
    .dashboard-button { background-color: #232F3E; color: #FFFFFF; border-color: #131921; }
    .dashboard-button:hover { background-color: #3b4d66; color: #FFFFFF; }
    .price-tracker-modal {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
      justify-content: center; z-index: 9999;
    }
      
    .price-tracker-modal-footer .cancel {
      background-color: #e0e0e0;
      color: #333;
    }
    .price-tracker-stats {
       display: flex;
       justify-content: space-between;
       margin-top: 15px;
       padding: 10px;
       background-color: #f9f9f9;
       border-radius: 4px;
     }

    .ai-advice-button { 
      background-color: #764ba2; 
      color: white; 
      border-color: #663a99; 
    }
    .ai-advice-button:hover:not(:disabled) {
     background-color: #5d3187; 
     }
  `;
  document.head.appendChild(style);
};

// --- (The rest of the file is the same as before) ---

// Extract Amazon product info
const extractAmazonProduct = () => {
  try {
    const name = document.getElementById('productTitle')?.textContent?.trim();
    const priceElement = document.querySelector('.a-price-whole');
    const priceFraction = document.querySelector('.a-price-fraction')?.textContent || '00';
    const price = priceElement ?
      parseFloat(`${priceElement.textContent.replace(/[,.]/g, '')}.${priceFraction}`) :
      0;
    const image = document.getElementById('landingImage')?.getAttribute('src');

    if (!name || !price || isNaN(price)) return null;

    return {
      name,
      currentPrice: price,
      url: window.location.href.split('?')[0],
      image_url:image,
    };
  } catch (error) {
    console.error('Error extracting Amazon product info:', error);
    return null;
  }
};


const extractProductInfo = () => {
  const hostname = window.location.hostname;
  if (hostname.includes('amazon')) return extractAmazonProduct();
  // if (hostname.includes('flipkart')) return extractFlipkartProduct();
  return null;
};

const loadChartJs = () => {
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      resolve(window.Chart);
      return;
    }
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/lib/chart.min.js');
    script.onload = () => {
      if (window.Chart) resolve(window.Chart);
      else reject('Chart.js loaded but Chart global not found');
    };
    script.onerror = () => reject('Failed to load Chart.js');
    document.head.appendChild(script);
  });
};

const makeApiCall = (endpoint, method = 'POST', body) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'API_CALL', endpoint, method, body },
        (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (response && response.error) reject(new Error(response.error));
          else if (response) resolve(response.data);
          else reject(new Error("Unknown error during API call"));
        }
      );
    });
  };

const trackProduct = async (productInfo, threshold) => {
  const payload = {
    url: productInfo.url,
    name: productInfo.name,
    price: productInfo.currentPrice,
    image_url: productInfo.image_url,
    threshold: threshold || (productInfo.currentPrice * 0.9),
  };
  return makeApiCall('/api/track', 'POST', payload);
};

const renderPriceChart = async (container, history, prediction) => {
  try {
    let Chart = await loadChartJs();
    const chartCanvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(chartCanvas);
    const historyDates = history.map(p => new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric'}));
    const historyPrices = history.map(p => p.price);
    const datasets = [{
        label: 'Historical Price',
        data: historyPrices,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.1
    }];
    if (prediction && prediction.dates && prediction.prices) {
        const lastHistoryPrice = historyPrices[historyPrices.length - 1];
        const predictionData = [lastHistoryPrice, ...prediction.prices];
        datasets.push({
            label: 'Predicted Price',
            data: predictionData,
            borderColor: '#764ba2',
            borderDash: [5, 5],
            backgroundColor: 'rgba(118, 75, 162, 0.1)',
            fill: true,
            tension: 0.1
        });
    }
    new Chart(chartCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: historyDates.concat(prediction ? prediction.dates : []),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { callbacks: { label: (context) => `₹${context.raw.toLocaleString('en-IN')}` } } },
            scales: { y: { ticks: { callback: (value) => `₹${value.toLocaleString('en-IN')}` } } }
        }
    });
  } catch (error) {
    console.error('Error rendering chart, falling back to SVG:', error);
    container.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#666">Chart library failed to load.</text>`;
  }
};

const injectPriceHistoryUI = async () => {
  if (document.querySelector('.price-tracker-container')) return;
  const productInfo = extractProductInfo();
  if (!productInfo) return;
  const targetElement = document.getElementById('corePriceDisplay_desktop_feature_div') || document.getElementById('desktop_buybox');
  if (!targetElement) return;

  const container = document.createElement('div');
  container.className = 'price-tracker-container';
  container.innerHTML = `
    <div class="price-tracker-header">
      <div class="price-tracker-title">📦 Smart Price Tracker</div>
      <button class="price-tracker-close">&times;</button>
    </div>
    <div class="price-tracker-buying-assistance">
      <div class="price-tracker-section-title">Buying Assistance & Price Analytics</div>
      <div class="price-tracker-stats-row">
        <div class="price-stat"><div class="stat-label">Lowest</div><div class="stat-value lowest">₹${(productInfo.currentPrice * 0.9).toFixed(0)}</div></div>
        <div class="price-stat"><div class="stat-label">Average</div><div class="stat-value">₹${productInfo.currentPrice.toFixed(0)}</div></div>
        <div class="price-stat"><div class="stat-label">Highest</div><div class="stat-value highest">₹${(productInfo.currentPrice * 1.1).toFixed(0)}</div></div>
      </div>
    </div>
    <div class="price-tracker-chart-container" style="display: none;"><div class="price-tracker-loading"><div class="spinner"></div><div>Loading Chart...</div></div></div>
    <div class="price-tracker-buttons">
      <button class="price-tracker-button" id="pt-chart-toggle">📈 Show Price Chart</button>
      <button class="price-tracker-button track-button" id="pt-track-btn">🎯 Track This Product</button>
      <button class="price-tracker-button price-alert-button" id="pt-alert-btn">🔔 Set Price Alert</button>
      <button class="price-tracker-button ai-advice-button" id="pt-ai-advice-btn">🤖 Get AI Advice</button>
      <a href="${chrome.runtime.getURL('src/dashboard.html')}" target="_blank" class="price-tracker-button dashboard-button">📊 View Dashboard</a>
    </div>
  `;
  targetElement.parentNode.insertBefore(container, targetElement.nextSibling);

  // Event Listeners
  container.querySelector('.price-tracker-close').addEventListener('click', () => container.remove());

  const chartToggle = container.querySelector('#pt-chart-toggle');
  const chartContainer = container.querySelector('.price-tracker-chart-container');
  let chartLoaded = false;
  chartToggle.addEventListener('click', async () => {
    const isVisible = chartContainer.style.display !== 'none';
    if (isVisible) {
      chartContainer.style.display = 'none';
      chartToggle.innerHTML = '📈 Show Price Chart';
    } else {
      chartContainer.style.display = 'block';
      chartToggle.innerHTML = '📉 Hide Price Chart';
      if (!chartLoaded) {
        chartToggle.disabled = true;
        chartToggle.innerHTML = '⏳ Loading Chart...';
        try {
          const url = productInfo.url;
          const data = await makeApiCall(`/api/history-prediction?url=${encodeURIComponent(url)}`, 'GET');
          if (data && data.history && data.history.length > 0) {
            await renderPriceChart(chartContainer, data.history, data.prediction);
            chartLoaded = true;
          } else {
            chartContainer.innerHTML = '<p style="text-align:center;color:#666;padding-top:80px;">Not enough data for a chart. Track product to begin.</p>';
          }
        } catch (e) {
          chartContainer.innerHTML = `<p style="text-align:center;color:red;padding-top:80px;">Error loading chart: ${e.message}</p>`;
        } finally {
          chartToggle.disabled = false;
        }
      }
    }
  });

  const trackButton = container.querySelector('#pt-track-btn');
  trackButton.addEventListener('click', async () => {
    trackButton.disabled = true;
    trackButton.innerHTML = '<div class="spinner-small"></div> Tracking...';
    try {
      await trackProduct(productInfo);
      trackButton.classList.add('success');
      trackButton.innerHTML = '✅ Tracking';
    } catch (error) {
      trackButton.innerHTML = '❌ Error';
      setTimeout(() => { trackButton.disabled = false; trackButton.innerHTML = '🎯 Track This Product'; }, 3000);
    }
  });

  container.querySelector('#pt-alert-btn').addEventListener('click', () => {
    const { currentPrice } = productInfo;
    const suggestedThreshold = (currentPrice * 0.9).toFixed(2);
    const modal = document.createElement('div');
    modal.className = 'price-tracker-modal';
    // Fetch the user's current email to pre-fill the input
    let userEmail = '';
    try {
        const emailData = makeApiCall('/api/user/email?user_id=default', 'GET');
        userEmail = emailData.email || '';
    } catch(e) {
        console.warn("Could not fetch user's email for modal.");
    }
    modal.innerHTML = `
<div class="price-tracker-modal-content">
        <div class="price-tracker-modal-header"><h3>Set Price Alert</h3><button class="price-tracker-modal-close">&times;</button></div>
        <div class="price-tracker-modal-body">
          <p>Current price: <b>₹${currentPrice}</b></p>
          <div class="price-tracker-form-group">
            <label for="price-threshold">Alert me when price drops below:</label>
            <input type="number" id="price-threshold" value="${suggestedThreshold}" style="width:100%;padding:8px;box-sizing:border-box;">
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <div class="price-tracker-form-group">
            <label for="alert-email">Send email notifications to:</label>
            <input type="email" id="alert-email" value="${userEmail}" placeholder="your.email@example.com" style="width:100%;padding:8px;box-sizing:border-box;">
          </div>
        </div>
        <div class="price-tracker-modal-footer">
          <button class="price-tracker-button cancel">Cancel</button>
          <button class="price-tracker-button price-alert-button" id="confirm-alert-btn">Set Alert</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => document.body.removeChild(modal);
    modal.querySelector('.price-tracker-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.cancel').addEventListener('click', closeModal);

    modal.querySelector('#confirm-alert-btn').addEventListener('click', async (e) => {
      const setAlertBtn = e.currentTarget;
      const threshold = parseFloat(modal.querySelector('#price-threshold').value);
      const email = modal.querySelector('#alert-email').value.trim();
      if (isNaN(threshold) || threshold <= 0) {
        alert('Please enter a valid price threshold');
        return;
      }
      setAlertBtn.disabled = true;
      setAlertBtn.innerHTML = '<div class="spinner-small"></div> Setting...';
      try {
        await trackProduct(productInfo, threshold);
        // If an email was entered, save it
        if (email) {
          await makeApiCall('/api/user/email', 'POST', { email: email, user_id: 'default' });
        }
        closeModal();
        const alertButtonOnPage = container.querySelector('#pt-alert-btn');
        alertButtonOnPage.innerHTML = '✅ Alert Set';
        alertButtonOnPage.classList.add('success');
        alertButtonOnPage.disabled = true;
      } catch (error) {
        setAlertBtn.disabled = false;
        setAlertBtn.innerHTML = 'Set Alert';
        alert(`Error setting alert: ${error.message}`);
      }
    });
  });

  // NEW LISTENER FOR AI ADVICE BUTTON
    container.querySelector('#pt-ai-advice-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = '🤖 Thinking...';
  
      const modal = document.createElement('div');
      modal.className = 'price-tracker-modal';
      modal.innerHTML = `
        <div class="price-tracker-modal-content">
          <div class="price-tracker-modal-header"><h3>🧠 AI Buying Advice</h3><button class="price-tracker-modal-close">&times;</button></div>
          <div class="price-tracker-modal-body" style="text-align: center;">
              <div class="spinner"></div>
              <p>Analyzing price trends...</p>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const closeModal = () => document.body.removeChild(modal);
      modal.querySelector('.price-tracker-modal-close').addEventListener('click', closeModal);
  
      try {
          const response = await makeApiCall('/api/product/advice', 'POST', { url: productInfo.url });
          const adviceText = response.advice.replace(/\n/g, '<br>'); // Format newlines for HTML
          modal.querySelector('.price-tracker-modal-body').innerHTML = `<p style="text-align: left; line-height: 1.6;">${adviceText}</p>`;
      } catch (error) {
          modal.querySelector('.price-tracker-modal-body').innerHTML = `<p style="color: red;">Error: Could not get AI advice. ${error.message}</p>`;
      } finally { 
          btn.disabled = false;
          btn.innerHTML = '🤖 Get AI Advice';
      }
    });

};

injectStyles();
setTimeout(injectPriceHistoryUI, 2000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "TOGGLE_UI") {
        const existingUI = document.querySelector('.price-tracker-container');
        if (existingUI) existingUI.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else injectPriceHistoryUI();
        sendResponse({ status: "done" });
        return true;
    }
    if (request.type === 'GET_PRODUCT_INFO') {
        sendResponse(extractProductInfo());
        return true;
    }
    if (request.type === 'TRACKING_STARTED') {
        const trackBtn = document.querySelector('#pt-track-btn');
        if (trackBtn) {
            trackBtn.innerHTML = '✅ Tracking';
            trackBtn.classList.add('success');
            trackBtn.disabled = true;
        }
    }
});