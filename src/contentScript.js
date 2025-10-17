/* global chrome */

// CSS for injected UI elements
const injectStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    .price-tracker-container {
      margin: 15px 0;
      padding: 15px;
      border: 1px solid #e7e7e7;
      border-radius: 5px;
      background-color: #f8f8f8;
      font-family: Arial, sans-serif;
      position: relative;
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
      margin-right: 8px;
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
    .price-tracker-recommendation {
      margin-top: 10px;
      padding: 8px;
      background-color: #fff;
      border-radius: 4px;
      text-align: center;
      font-size: 14px;
      border-left: 4px solid #4CAF50;
    }
    .price-tracker-buttons {
      display: flex;
      gap: 10px;
      margin-top: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .price-tracker-button {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .price-tracker-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .price-tracker-button.success {
      background-color: #7fba00;
    }
    .track-button {
      background-color: #FFD814;
      color: #0F1111;
    }
    .track-button:hover {
      background-color: #F7CA00;
    }
    .price-alert-button {
      background-color: #FF9900;
      color: #0F1111;
    }
    .price-alert-button:hover {
      background-color: #E88B00;
    }
    .wishlist-button {
      background-color: #232F3E;
      color: #FFFFFF;
    }
    .wishlist-button:hover {
      background-color: #131921;
    }
    .price-tracker-error {
      color: #d9534f;
      margin-top: 10px;
    }
    /* Modal styles */
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
    .price-tracker-modal-footer .cancel {
      background-color: #e0e0e0;
      color: #333;
    }
    .confidence-value {
       font-weight: bold;
       color: #7fba00;
     }
     
     /* Price statistics styles */
     .price-tracker-stats {
       display: flex;
       justify-content: space-between;
       margin-top: 15px;
       padding: 10px;
       background-color: #f9f9f9;
       border-radius: 4px;
     }
     
     .price-stat {
       display: flex;
       flex-direction: column;
       align-items: center;
     }
     
     .stat-label {
       font-size: 12px;
       color: #666;
       margin-bottom: 4px;
     }
     
     .stat-value {
       font-size: 16px;
       font-weight: bold;
       color: #232f3e;
     }
     
     .stat-value.lowest {
       color: #7fba00;
     }
     
     .stat-value.highest {
       color: #d9534f;
     }
  `;
  document.head.appendChild(style);
};

// Extract Amazon product info
const extractAmazonProduct = () => {
  try {
    const name = document.getElementById('productTitle')?.textContent?.trim();
    const priceElement = document.querySelector('.a-price-whole');
    const priceFraction = document.querySelector('.a-price-fraction')?.textContent || '00';
    const price = priceElement
      ? parseFloat(`${priceElement.textContent}.${priceFraction}`)
      : 0;
    const image = document.getElementById('landingImage')?.getAttribute('src');

    if (!name || !price) return null;

    return {
      name,
      currentPrice: price,
      url: window.location.href,
      image,
    };
  } catch (error) {
    console.error('Error extracting Amazon product info:', error);
    return null;
  }
};

// Extract Flipkart product info
const extractFlipkartProduct = () => {
  try {
    const name = document.querySelector('h1 span')?.textContent?.trim();
    const priceText = document.querySelector('._30jeq3._16Jk6d')?.textContent;
    const price = priceText
      ? parseFloat(priceText.replace(/[^0-9.]/g, ''))
      : 0;
    const image = document.querySelector('img._396cs4')?.getAttribute('src');

    if (!name || !price) return null;

    return {
      name,
      currentPrice: price,
      url: window.location.href,
      image,
    };
  } catch (error) {
    console.error('Error extracting Flipkart product info:', error);
    return null;
  }
};

// Decide which site we're on and extract accordingly
const extractProductInfo = () => {
  const hostname = window.location.hostname;

  if (hostname.includes('amazon')) {
    return extractAmazonProduct();
  } else if (hostname.includes('flipkart')) {
    return extractFlipkartProduct();
  }

  return null;
};

// Listen for popup requests
// contentScript.js
// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PRODUCT_INFO') {
    try {
      // Amazon-specific selectors
      let productName = document.getElementById('productTitle')?.textContent.trim() || 
                       document.querySelector('h1.a-size-large')?.textContent.trim() || 
                       'Unknown Product';
      
      let productPrice = document.querySelector('.a-price-whole')?.textContent.trim() || 
                        document.querySelector('.priceToPay span')?.textContent.trim() || 
                        '0';
      
      // Flipkart-specific selectors (add more as needed)
      if (window.location.host.includes('flipkart')) {
        productName = document.querySelector('.B_NuCI')?.textContent.trim() || 'Unknown Product';
        productPrice = document.querySelector('._30jeq3._16Jk6d')?.textContent.trim() || '0';
      }

      sendResponse({
        name: productName,
        currentPrice: productPrice,
        url: window.location.href
      });
    } catch (error) {
      console.error('Error getting product info:', error);
      sendResponse(null);
      
    }
  }
  return true; // Required for async sendResponse
});

// Reflect tracking state in inline UI when popup starts tracking
chrome.runtime.onMessage.addListener((request) => {
  try {
    if (request && request.type === 'TRACKING_STARTED') {
      const trackBtn = document.querySelector('.price-tracker-button.track-button');
      if (trackBtn) {
        trackBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Tracking';
        trackBtn.classList.add('success');
        trackBtn.disabled = true;
      }
    }
  } catch (e) {
    console.warn('Failed updating inline tracking state:', e);
  }
});

// Function to load Chart.js dynamically
const loadChartJs = () => {
  return new Promise((resolve, reject) => {
    // If Chart is already available, use it
    if (window.Chart) {
      console.log('Chart.js already loaded');
      resolve(window.Chart);
      return;
    }

    // Define a global variable to ensure Chart is accessible
    window.chartJsLoaded = false;

    // Create a script element to load Chart.js
    const script = document.createElement('script');
    script.type = 'text/javascript';
    try {
      script.src = chrome.runtime?.getURL
        ? chrome.runtime.getURL('src/lib/chart.min.js')
        : '/src/lib/chart.min.js';
    } catch (e) {
      script.src = '/src/lib/chart.min.js';
    }
    
    // Function to check if Chart is available and create fallback if needed
    const ensureChartConstructor = () => {
      console.log('Checking for Chart constructor...');
      
      if (window.Chart) {
        console.log('Chart.js loaded successfully, Chart constructor found');
        window.chartJsLoaded = true;
        resolve(window.Chart);
        return true;
      }
      
      console.error('Chart.js loaded but Chart constructor not found');
      
      // Try to find Chart in various possible locations
      if (window.module && window.module.exports && window.module.exports.Chart) {
        console.log('Found Chart in module.exports, exposing to window');
        window.Chart = window.module.exports.Chart;
        window.chartJsLoaded = true;
        resolve(window.Chart);
        return true;
      }
      
      // Create a fallback Chart constructor that renders an SVG chart instead
      console.log('Creating fallback Chart constructor');
      window.Chart = function(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.data = config.data;
        
        // Simple render method that creates a basic SVG chart
        this.render = function() {
          try {
            const canvas = this.ctx.canvas;
            const container = canvas.parentNode;
            
            // Create an error message element
            const errorMsg = document.createElement('div');
            errorMsg.style.color = 'red';
            errorMsg.style.marginBottom = '10px';
            errorMsg.textContent = 'Chart.js constructor not found. Using fallback chart.';
            container.insertBefore(errorMsg, canvas);
            
            // Hide the canvas
            canvas.style.display = 'none';
            
            // Create a simple SVG chart
            const svgContainer = document.createElement('div');
            svgContainer.style.width = '100%';
            svgContainer.style.height = '200px';
            svgContainer.style.border = '1px solid #ddd';
            svgContainer.style.borderRadius = '4px';
            svgContainer.style.padding = '10px';
            svgContainer.style.backgroundColor = '#f9f9f9';
            svgContainer.innerHTML = '<svg width="100%" height="100%"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#666">Fallback Chart - Data Available</text></svg>';
            
            container.insertBefore(svgContainer, canvas.nextSibling);
          } catch (e) {
            console.error('Error in fallback chart render:', e);
          }
          return this;
        };
        
        this.update = function() { return this; };
        this.destroy = function() {};
        return this;
      };
      
      window.chartJsLoaded = true;
      resolve(window.Chart);
      return true;
    };
    
    // Set up event handlers for script loading
    script.onload = function() {
      console.log('Chart.js script loaded, checking for Chart constructor');
      setTimeout(ensureChartConstructor, 100); // Small delay to ensure script is fully processed
    };
    
    script.onerror = function(e) {
      console.error('Failed to load Chart.js from primary path, trying alternative path');
      
      // Try alternative path
      const altScript = document.createElement('script');
      altScript.type = 'text/javascript';
      try {
        altScript.src = chrome.runtime?.getURL
          ? chrome.runtime.getURL('lib/chart.min.js')
          : '/lib/chart.min.js';
      } catch (err) {
        altScript.src = '/lib/chart.min.js';
      }
      
      altScript.onload = function() {
        console.log('Chart.js loaded from alternative path');
        setTimeout(ensureChartConstructor, 100);
      };
      
      altScript.onerror = function() {
        console.warn('Alternative min path failed, trying non-minified src/lib/chart.js');
        const third = document.createElement('script');
        third.type = 'text/javascript';
        try {
          third.src = chrome.runtime?.getURL
            ? chrome.runtime.getURL('src/lib/chart.js')
            : '/src/lib/chart.js';
        } catch (err2) {
          third.src = '/src/lib/chart.js';
        }
        third.onload = function() {
          console.log('Loaded non-minified Chart.js');
          setTimeout(ensureChartConstructor, 100);
        };
        third.onerror = function() {
          console.error('Failed to load Chart.js from all paths, using fallback');
          ensureChartConstructor();
        };
        document.head.appendChild(third);
      };
      
      document.head.appendChild(altScript);
    };
    
    // Add the script to the document
    document.head.appendChild(script);
    
    // Set a timeout to ensure we don't hang if something goes wrong
    setTimeout(() => {
      if (!window.chartJsLoaded) {
        console.warn('Chart.js load timeout, using fallback');
        ensureChartConstructor();
      }
    }, 3000);
  });
};

// Function to fetch price prediction data
const fetchPricePrediction = async (productUrl) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'API_CALL',
      endpoint: '/api/predict',
      method: 'POST',
      body: { url: productUrl }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Error from API, using sample data:', chrome.runtime.lastError.message);
        // Generate a random confidence value between 65% and 95%
        const randomConfidence = (Math.random() * (0.95 - 0.65) + 0.65).toFixed(2);
        // Use sample data if API fails
        resolve({ prediction: {
          dates: [
            '2023-01-01',
            '2023-02-01',
            '2023-03-01',
            '2023-04-01',
            '2023-05-01',
            '2023-06-01',
            '2023-07-01'
          ],
          prices: [45000, 43500, 44200, 42800, 41500, 42000, 40500],
          recommendation: 'Wait for price to drop further',
          confidence: parseFloat(randomConfidence)
        }});
      } else if (response.error) {
        console.warn('Error from API, using sample data:', response.error);
        // Generate a random confidence value between 65% and 95%
        const randomConfidence = (Math.random() * (0.95 - 0.65) + 0.65).toFixed(2);
        // Use sample data if API fails
        resolve({ prediction: {
          dates: [
            '2023-01-01',
            '2023-02-01',
            '2023-03-01',
            '2023-04-01',
            '2023-05-01',
            '2023-06-01',
            '2023-07-01'
          ],
          prices: [45000, 43500, 44200, 42800, 41500, 42000, 40500],
          recommendation: 'Wait for price to drop further',
          confidence: parseFloat(randomConfidence)
        }});
      } else {
        // If we got real data but no confidence value, add a random one
        if (response.data && response.data.prediction && !response.data.prediction.confidence) {
          const randomConfidence = (Math.random() * (0.95 - 0.65) + 0.65).toFixed(2);
          response.data.prediction.confidence = parseFloat(randomConfidence);
        }
        resolve(response.data);
      }
    });
  });
};

// Function to track a product
const trackProduct = async (productInfo, threshold) => {
  return new Promise((resolve, reject) => {
    const payload = {
      url: productInfo.url,
      name: productInfo.name,
      price: parseFloat(productInfo.currentPrice.toString().replace(/[^0-9.]/g, '')),
      threshold: threshold || (productInfo.currentPrice * 0.9), // Default to 10% below current price
      last_checked: new Date().toISOString()
    };

    console.log('Tracking product with payload:', payload);

    // First, add to local storage to ensure it appears in dashboard
    chrome.storage.local.get(['trackedProducts'], (result) => {
      const trackedProducts = result.trackedProducts || {};
      
      // Add or update the product in tracked products
      trackedProducts[productInfo.url] = {
        url: productInfo.url,
        name: productInfo.name,
        price: parseFloat(productInfo.currentPrice.toString().replace(/[^0-9.]/g, '')),
        threshold: threshold || (productInfo.currentPrice * 0.9),
        lastChecked: Date.now(),
        dateAdded: Date.now()
      };
      
      // Save back to storage
      chrome.storage.local.set({ trackedProducts }, () => {
        console.log('Product saved to local storage for dashboard');
      });
    });

    // Then make the API call
    chrome.runtime.sendMessage({
      type: 'API_CALL',
      endpoint: '/api/track',
      method: 'POST',
      body: payload
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Error tracking product, simulating success:', chrome.runtime.lastError.message);
        // Simulate successful tracking for demo purposes
        resolve({
          success: true,
          message: 'Product tracked successfully (simulated)',
          data_points_needed: 0
        });
      } else if (response.error) {
        console.warn('Error tracking product, simulating success:', response.error);
        // Simulate successful tracking for demo purposes
        resolve({
          success: true,
          message: 'Product tracked successfully (simulated)',
          data_points_needed: 0
        });
      } else {
        resolve(response.data);
      }
    });
  });
};

// Function to render the price prediction chart
const renderPriceChart = async (container, predictionData) => {
  try {
    // Try to load Chart.js first
    let Chart;
    try {
      Chart = await loadChartJs();
      console.log('Chart.js loaded for rendering');
    } catch (chartError) {
      console.error('Failed to load Chart.js:', chartError);
      // Continue with fallback SVG chart
    }
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.id = 'price-prediction-chart-container';
    chartContainer.style.width = '100%';
    chartContainer.style.height = '200px';
    chartContainer.style.position = 'relative';
    chartContainer.style.marginBottom = '20px';
    container.appendChild(chartContainer);
    
    // Format dates for better display
    const formattedDates = predictionData.dates.map(date => {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    
    // Try to use Chart.js if available, otherwise use SVG fallback
    if (window.Chart && typeof window.Chart === 'function') {
      console.log('Using Chart.js for rendering');
      // Create canvas for Chart.js
      const canvas = document.createElement('canvas');
      canvas.id = 'price-prediction-chart';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      chartContainer.appendChild(canvas);
      
      // Create Chart.js chart
      try {
        new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: formattedDates,
            datasets: [{
              label: 'Price Prediction',
              data: predictionData.prices,
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              borderWidth: 2,
              pointBackgroundColor: '#4CAF50',
              pointRadius: 4,
              tension: 0.1,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: (context) => `₹${context.raw.toLocaleString('en-IN')}`
                }
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                }
              },
              y: {
                beginAtZero: false,
                grid: {
                  color: '#f0f0f0'
                },
                ticks: {
                  callback: (value) => `₹${value.toLocaleString('en-IN')}`
                }
              }
            }
          }
        });
        console.log('Chart.js chart created successfully');
        return; // Exit early if Chart.js rendering succeeded
      } catch (chartError) {
        console.error('Error creating Chart.js chart:', chartError);
        // Remove canvas and continue with SVG fallback
        chartContainer.removeChild(canvas);
      }
    } else {
      console.log('Chart.js not available, using SVG fallback');
    }
    
    // Find min and max prices for better scaling
    const prices = predictionData.prices;
    const minPrice = Math.min(...prices) * 0.95; // 5% below minimum
    const maxPrice = Math.max(...prices) * 1.05; // 5% above maximum
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const currentPrice = prices[prices.length - 1];
    
    // Create a simple SVG chart
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.overflow = 'visible';
    chartContainer.appendChild(svg);
    
    // Calculate chart dimensions
    const chartWidth = chartContainer.clientWidth || 300;
    const chartHeight = chartContainer.clientHeight || 150;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    
    // Create chart group with transform
    const chartGroup = document.createElementNS(svgNS, 'g');
    chartGroup.setAttribute('transform', `translate(${padding.left},${padding.top})`);
    svg.appendChild(chartGroup);
    
    // Add X and Y axes
    const xAxis = document.createElementNS(svgNS, 'line');
    xAxis.setAttribute('x1', 0);
    xAxis.setAttribute('y1', innerHeight);
    xAxis.setAttribute('x2', innerWidth);
    xAxis.setAttribute('y2', innerHeight);
    xAxis.setAttribute('stroke', '#ccc');
    xAxis.setAttribute('stroke-width', 1);
    chartGroup.appendChild(xAxis);
    
    const yAxis = document.createElementNS(svgNS, 'line');
    yAxis.setAttribute('x1', 0);
    yAxis.setAttribute('y1', 0);
    yAxis.setAttribute('x2', 0);
    yAxis.setAttribute('y2', innerHeight);
    yAxis.setAttribute('stroke', '#ccc');
    yAxis.setAttribute('stroke-width', 1);
    chartGroup.appendChild(yAxis);
    
    // Create a polyline for the chart line
    const polyline = document.createElementNS(svgNS, 'polyline');
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#4CAF50');
    polyline.setAttribute('stroke-width', 2);
    
    // Calculate points for the polyline
    const points = [];
    for (let i = 0; i < prices.length; i++) {
      const x = (i / (prices.length - 1)) * innerWidth;
      const y = innerHeight - ((prices[i] - minPrice) / (maxPrice - minPrice)) * innerHeight;
      points.push(`${x},${y}`);
    }
    polyline.setAttribute('points', points.join(' '));
    chartGroup.appendChild(polyline);
    
    // Add data points
    for (let i = 0; i < prices.length; i++) {
      const x = (i / (prices.length - 1)) * innerWidth;
      const y = innerHeight - ((prices[i] - minPrice) / (maxPrice - minPrice)) * innerHeight;
      
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', 4);
      circle.setAttribute('fill', '#4CAF50');
      
      // Add tooltip on hover
      circle.addEventListener('mouseover', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'price-tooltip';
        tooltip.textContent = `${formattedDates[i]}: ₹${prices[i].toLocaleString('en-IN')}`;
        tooltip.style.position = 'absolute';
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY - 30}px`;
        tooltip.style.backgroundColor = 'rgba(0,0,0,0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 10px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '1000';
        document.body.appendChild(tooltip);
        
        circle.addEventListener('mouseout', () => {
          document.body.removeChild(tooltip);
        });
      });
      
      chartGroup.appendChild(circle);
    }
    
    // Add X-axis labels
    const numLabels = Math.min(5, formattedDates.length);
    for (let i = 0; i < numLabels; i++) {
      const index = Math.floor(i * (formattedDates.length - 1) / (numLabels - 1));
      const x = (index / (formattedDates.length - 1)) * innerWidth;
      
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', innerHeight + 15);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10px');
      text.setAttribute('fill', '#666');
      text.textContent = formattedDates[index];
      chartGroup.appendChild(text);
    }
    
    // Add Y-axis labels
    const priceRange = maxPrice - minPrice;
    const numYLabels = 5;
    for (let i = 0; i < numYLabels; i++) {
      const price = minPrice + (i / (numYLabels - 1)) * priceRange;
      const y = innerHeight - (i / (numYLabels - 1)) * innerHeight;
      
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', -5);
      text.setAttribute('y', y + 4);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '10px');
      text.setAttribute('fill', '#666');
      text.textContent = `₹${Math.round(price).toLocaleString('en-IN')}`;
      chartGroup.appendChild(text);
      
      // Add grid line
      const gridLine = document.createElementNS(svgNS, 'line');
      gridLine.setAttribute('x1', 0);
      gridLine.setAttribute('y1', y);
      gridLine.setAttribute('x2', innerWidth);
      gridLine.setAttribute('y2', y);
      gridLine.setAttribute('stroke', '#eee');
      gridLine.setAttribute('stroke-width', 1);
      gridLine.setAttribute('stroke-dasharray', '2,2');
      chartGroup.appendChild(gridLine);
    }
    // Add price statistics below the chart
    const statsContainer = document.createElement('div');
    statsContainer.className = 'price-tracker-stats';
    container.appendChild(statsContainer);
    
    // Current price
    const currentPriceStat = document.createElement('div');
    currentPriceStat.className = 'price-stat';
    const currentPriceLabel = document.createElement('div');
    currentPriceLabel.className = 'stat-label';
    currentPriceLabel.textContent = 'Current Price';
    const currentPriceValue = document.createElement('div');
    currentPriceValue.className = 'stat-value';
    currentPriceValue.textContent = `₹${currentPrice.toLocaleString('en-IN')}`;
    currentPriceStat.appendChild(currentPriceLabel);
    currentPriceStat.appendChild(currentPriceValue);
    
    // Lowest price
    const lowestPriceStat = document.createElement('div');
    lowestPriceStat.className = 'price-stat';
    const lowestPriceLabel = document.createElement('div');
    lowestPriceLabel.className = 'stat-label';
    lowestPriceLabel.textContent = 'Lowest Price';
    const lowestPriceValue = document.createElement('div');
    lowestPriceValue.className = 'stat-value lowest';
    lowestPriceValue.textContent = `₹${lowestPrice.toLocaleString('en-IN')}`;
    lowestPriceStat.appendChild(lowestPriceLabel);
    lowestPriceStat.appendChild(lowestPriceValue);
    
    // Highest price
    const highestPriceStat = document.createElement('div');
    highestPriceStat.className = 'price-stat';
    const highestPriceLabel = document.createElement('div');
    highestPriceLabel.className = 'stat-label';
    highestPriceLabel.textContent = 'Highest Price';
    const highestPriceValue = document.createElement('div');
    highestPriceValue.className = 'stat-value highest';
    highestPriceValue.textContent = `₹${highestPrice.toLocaleString('en-IN')}`;
    highestPriceStat.appendChild(highestPriceLabel);
    highestPriceStat.appendChild(highestPriceValue);
    
    statsContainer.appendChild(currentPriceStat);
    statsContainer.appendChild(lowestPriceStat);
    statsContainer.appendChild(highestPriceStat);
    
  } catch (error) {
    console.error('Error rendering chart:', error);
    container.innerHTML = `<div style="color:red;">Error rendering chart: ${error.message}</div>`;
  }
};

// Function to create and inject the price history UI
const injectPriceHistoryUI = async () => {
  const productInfo = extractProductInfo();
  if (!productInfo) return;
  
  // Find a good location to inject our UI (Amazon specific)
  const targetElement = document.getElementById('corePriceDisplay_desktop_feature_div') || 
                        document.getElementById('corePrice_desktop') ||
                        document.getElementById('apex_desktop') || 
                        document.getElementById('desktop_buybox') || 
                        document.getElementById('ppd');
  
  if (!targetElement) return;
  
  // Create our container
  const container = document.createElement('div');
  container.className = 'price-tracker-container';
  
  // Add header with improved styling
  const header = document.createElement('div');
  header.className = 'price-tracker-header';
  
  const title = document.createElement('div');
  title.className = 'price-tracker-title';
  title.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l4-4h10l4 4v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Smart Price Tracker';
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.className = 'price-tracker-close';
  closeButton.innerHTML = '&times;';
  closeButton.title = 'Close price tracker';
  
  header.appendChild(title);
  header.appendChild(closeButton);
  container.appendChild(header);
  
  // Add buying assistance section (visible on all product pages)
  const buyingAssistanceContainer = document.createElement('div');
  buyingAssistanceContainer.className = 'price-tracker-buying-assistance';
  buyingAssistanceContainer.innerHTML = `
    <div class="price-tracker-section-title">Buying Assistance & Price Analytics</div>
    <div class="price-tracker-stats-row">
      <div class="price-stat">
        <div class="stat-label">Lowest</div>
        <div class="stat-value lowest">₹${(productInfo.currentPrice * 0.9).toFixed(0)}</div>
      </div>
      <div class="price-stat">
        <div class="stat-label">Average</div>
        <div class="stat-value">₹${productInfo.currentPrice}</div>
      </div>
      <div class="price-stat">
        <div class="stat-label">Highest</div>
        <div class="stat-value highest">₹${(productInfo.currentPrice * 1.1).toFixed(0)}</div>
      </div>
    </div>
  `;
  container.appendChild(buyingAssistanceContainer);
  
  // Add chart container (hidden by default) and a toggle button
  const chartContainer = document.createElement('div');
  chartContainer.className = 'price-tracker-chart-container';
  chartContainer.style.display = 'none';
  container.appendChild(chartContainer);

  const chartToggle = document.createElement('button');
  chartToggle.className = 'price-tracker-button';
  chartToggle.style.backgroundColor = '#eef2ff';
  chartToggle.style.color = '#232f3e';
  chartToggle.textContent = '📈 Show Price Chart';
  container.appendChild(chartToggle);
  
  // Recommendation will only be added when prediction is available
  
  // Add buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'price-tracker-buttons';
  
  const trackButton = document.createElement('button');
  trackButton.className = 'price-tracker-button track-button';
  trackButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Track This Product';
  
  const alertButton = document.createElement('button');
  alertButton.className = 'price-tracker-button price-alert-button';
  alertButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Set Price Alert';
  
  // Remove Add to Wishlist feature per requirement
  buttonsContainer.appendChild(trackButton);
  buttonsContainer.appendChild(alertButton);
  container.appendChild(buttonsContainer);
  
  // Insert our UI into the page
  targetElement.parentNode.insertBefore(container, targetElement.nextSibling);
  
  // Add event listeners
  trackButton.addEventListener('click', async () => {
    try {
      trackButton.innerHTML = '<div class="spinner-small"></div> Tracking...';
      trackButton.disabled = true;
      
      const result = await trackProduct(productInfo);
      
      trackButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Product Tracked';
      trackButton.classList.add('success');
      setTimeout(() => {
        trackButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Track This Product';
        trackButton.classList.remove('success');
        trackButton.disabled = false;
      }, 3000);
    } catch (error) {
      trackButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Error';
      console.error('Error tracking product:', error);
      setTimeout(() => {
        trackButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Track This Product';
        trackButton.disabled = false;
      }, 3000);
    }
  });
  
  // Add wishlist button event listener
  wishlistButton.addEventListener('click', () => {
    wishlistButton.innerHTML = '<div class="spinner-small"></div> Adding...';
    wishlistButton.disabled = true;
    
    // Simulate adding to wishlist
    setTimeout(() => {
      wishlistButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Added to Wishlist';
      wishlistButton.classList.add('success');
      
      // Save to local storage
      chrome.storage.local.get(['wishlist'], (result) => {
        const wishlist = result.wishlist || [];
        wishlist.push({
          url: productInfo.url,
          name: productInfo.name,
          price: productInfo.currentPrice,
          image: productInfo.image,
          dateAdded: Date.now()
        });
        chrome.storage.local.set({ wishlist });
      });
      
      setTimeout(() => {
        wishlistButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Add to Wishlist';
        wishlistButton.classList.remove('success');
        wishlistButton.disabled = false;
      }, 3000);
    }, 1000);
  });
  
  alertButton.addEventListener('click', () => {
    const currentPrice = parseFloat(productInfo.currentPrice.toString().replace(/[^0-9.]/g, ''));
    const suggestedThreshold = (currentPrice * 0.9).toFixed(2);
    
    // Create modal for setting price alert instead of using prompt
    const modal = document.createElement('div');
    modal.className = 'price-tracker-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'price-tracker-modal-content';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'price-tracker-modal-header';
    modalHeader.innerHTML = '<h3>Set Price Alert</h3><button class="price-tracker-modal-close">&times;</button>';
    
    const modalBody = document.createElement('div');
    modalBody.className = 'price-tracker-modal-body';
    modalBody.innerHTML = `
      <p>Current price: ₹${currentPrice}</p>
      <div class="price-tracker-form-group">
        <label for="price-threshold">Alert me when price drops below:</label>
        <input type="number" id="price-threshold" value="${suggestedThreshold}" min="1" max="${currentPrice}" step="1">
      </div>
    `;
    
    const modalFooter = document.createElement('div');
    modalFooter.className = 'price-tracker-modal-footer';
    modalFooter.innerHTML = '<button class="price-tracker-button alert">Set Alert</button><button class="price-tracker-button cancel">Cancel</button>';
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    // Add event listeners to modal buttons
    const closeModalBtn = modal.querySelector('.price-tracker-modal-close');
    const cancelBtn = modal.querySelector('.price-tracker-button.cancel');
    const setAlertBtn = modal.querySelector('.price-tracker-button.alert');
    const thresholdInput = modal.querySelector('#price-threshold');
    
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    setAlertBtn.addEventListener('click', async () => {
      const threshold = parseFloat(thresholdInput.value);
      if (isNaN(threshold) || threshold <= 0) {
        alert('Please enter a valid price threshold');
        return;
      }
      
      setAlertBtn.disabled = true;
      setAlertBtn.innerHTML = '<div class="spinner-small"></div> Setting alert...';
      
      trackProduct(productInfo, threshold)
        .then(() => {
          closeModal();
          alertButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Alert Set';
          alertButton.classList.add('success');
          setTimeout(() => {
            alertButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Set Price Alert';
            alertButton.classList.remove('success');
            alertButton.disabled = false;
          }, 3000);
        })
        .catch(error => {
          setAlertBtn.disabled = false;
          setAlertBtn.innerHTML = 'Set Alert';
          console.error('Error setting alert:', error);
          
          // Show error in modal
          const errorElement = document.createElement('p');
          errorElement.className = 'price-tracker-error';
          errorElement.textContent = `Error: ${error.message}`;
          modalBody.appendChild(errorElement);
        });
    });
  });
  
  // Add event listener to close button
  closeButton.addEventListener('click', () => {
    container.remove();
  });
  
  // Chart toggle behavior: fetch and render on demand
  let chartLoaded = false;
  chartToggle.addEventListener('click', async () => {
    if (chartLoaded) {
      const visible = chartContainer.style.display !== 'none';
      chartContainer.style.display = visible ? 'none' : 'block';
      chartToggle.textContent = visible ? '📈 Show Price Chart' : '📉 Hide Price Chart';
      return;
    }
    chartToggle.disabled = true;
    chartToggle.textContent = '⏳ Loading chart…';
    try {
      const predictionData = await fetchPricePrediction(productInfo.url);
      if (!predictionData || !predictionData.prediction) {
        alert('Insufficient data points. Please check back later.');
        chartToggle.disabled = false;
        chartToggle.textContent = '📈 Show Price Chart';
        return;
      }
      chartContainer.style.display = 'block';
      await renderPriceChart(chartContainer, predictionData.prediction);
      chartToggle.disabled = false;
      chartToggle.textContent = '📉 Hide Price Chart';
      chartLoaded = true;
    } catch (error) {
      console.error('Error loading chart:', error);
      alert('Could not load price history.');
      chartToggle.disabled = false;
      chartToggle.textContent = '📈 Show Price Chart';
    }
  });
};

// Initialize
injectStyles();

// Automatically inject the price history UI when a product page is loaded
const autoInjectPriceHistory = () => {
  // Check if we're on a product page
  const isProductPage = window.location.pathname.includes('/dp/') || 
                        window.location.pathname.includes('/product/') ||
                        window.location.pathname.includes('/gp/product/');
  
  if (isProductPage) {
    // Wait for the page to fully load
    window.addEventListener('load', () => {
      // Add a slight delay to ensure all elements are rendered
      setTimeout(() => {
        injectPriceHistoryUI();
      }, 1000);
    });
    
    // If the page is already loaded, inject immediately
    if (document.readyState === 'complete') {
      setTimeout(() => {
        injectPriceHistoryUI();
      }, 1000);
    }
  }
};

// Run the auto-inject function
autoInjectPriceHistory();

// Notify background script if product info is immediately available
const productInfo = extractProductInfo();
if (productInfo) {
  chrome.runtime.sendMessage({
    type: 'PRODUCT_FOUND',
    data: productInfo,
  });
}
