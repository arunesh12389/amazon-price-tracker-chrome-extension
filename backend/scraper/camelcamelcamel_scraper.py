"""
CamelCamelCamel scraper for real historical Amazon price data.
Uses Playwright headless browser to bypass 403 blocking and scrape price history charts.
"""

import re
import json
import asyncio
from typing import Optional, List, Dict
from datetime import datetime
from playwright.async_api import async_playwright, Page


class CamelCamelCamelScraper:
    """Scrapes real historical price data from CamelCamelCamel using Playwright browser automation."""
    
    def __init__(self):
        self.base_url = "https://camelcamelcamel.com"
        self.browser = None
        self.context = None
    
    @staticmethod
    def extract_asin(url: str) -> Optional[str]:
        """Extract ASIN from Amazon URL."""
        import re
        match = re.search(r'/dp/([A-Z0-9]{10})', url)
        if match:
            return match.group(1)
        return None
    
    def get_price_history(self, asin: str, amazon_domain: str = "amazon.in") -> Optional[List[Dict]]:
        """
        Fetch price history from CamelCamelCamel using Playwright browser automation.
        Bypasses 403 blocking by rendering page as real browser.
        """
        try:
            # Check if there's already a running event loop (FastAPI context)
            try:
                loop = asyncio.get_running_loop()
                # If we're here, we're in an async context - shouldn't happen in sync call
                # Fall back to subprocess approach
                return self._get_price_history_subprocess(asin, amazon_domain)
            except RuntimeError:
                # No running loop, create one
                result = asyncio.run(self._async_get_price_history(asin, amazon_domain))
                return result
        except Exception as e:
            print(f"❌ Playwright error: {e}")
            return None
    
    def _get_price_history_subprocess(self, asin: str, amazon_domain: str) -> Optional[List[Dict]]:
        """Fallback: Run Playwright in subprocess to avoid event loop conflicts."""
        import subprocess
        import sys
        try:
            code = f"""
import asyncio
from playwright.async_api import async_playwright

async def scrape():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_viewport_size({{"width": 1280, "height": 720}})
        await page.goto('https://camelcamelcamel.com/product/{asin}', wait_until='networkidle', timeout=30000)
        await page.wait_for_timeout(2000)
        html = await page.content()
        await browser.close()
        return html

html = asyncio.run(scrape())
print(html)
"""
            result = subprocess.run(
                [sys.executable, '-c', code],
                capture_output=True,
                timeout=40,
                text=True
            )
            if result.returncode == 0:
                html_content = result.stdout
                return self._extract_from_html(html_content)
        except Exception as e:
            print(f"⚠️ Subprocess approach failed: {e}")
        return None
    
    async def _async_get_price_history(self, asin: str, amazon_domain: str) -> Optional[List[Dict]]:
        """Async method to fetch price history using Playwright."""
        if not asin:
            print("❌ Invalid ASIN")
            return None
        
        ccc_url = f"{self.base_url}/product/{asin}"
        print(f"🔗 Scraping CamelCamelCamel with Playwright for ASIN {asin}")
        
        async with async_playwright() as p:
            try:
                # Launch browser
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Set viewport to avoid detection
                await page.set_viewport_size({"width": 1280, "height": 720})
                
                # Navigate to page
                await page.goto(ccc_url, wait_until='networkidle', timeout=30000)
                
                print("✅ Page loaded successfully with Playwright")
                
                # Wait for chart to load
                await page.wait_for_timeout(2000)
                
                # Extract price data from the page
                price_data = await self._extract_price_data_from_page(page)
                
                await browser.close()
                
                if price_data:
                    print(f"✅ Extracted {len(price_data)} price points from CamelCamelCamel")
                    return price_data
                else:
                    print("⚠️ No price data found on page")
                    return None
                    
            except Exception as e:
                print(f"❌ Playwright browser error: {e}")
                return None
    
    async def _extract_price_data_from_page(self, page: Page) -> Optional[List[Dict]]:
        """Extract price history data from rendered CamelCamelCamel page."""
        try:
            # Try to find price history in JavaScript context
            price_data = await page.evaluate("""() => {
                // Look for chart data in window object
                if (window.chart_data) return window.chart_data;
                if (window.price_history) return window.price_history;
                
                // Try to extract from script tags
                const scripts = document.querySelectorAll('script');
                for (let script of scripts) {
                    const text = script.textContent;
                    if (text && text.includes('price')) {
                        // Try to find JSON array patterns
                        const match = text.match(/\\[\\s*\\[\\d+,\\d+\\]/);
                        if (match) return match[0];
                    }
                }
                
                // Try to get from visible text - look for price table/list
                const priceElements = document.querySelectorAll('[class*="price"]');
                if (priceElements.length > 0) {
                    return Array.from(priceElements).map(el => ({
                        date: el.getAttribute('data-date') || new Date().toISOString(),
                        price: parseFloat(el.textContent.replace(/[^0-9.]/g, ''))
                    })).filter(p => !isNaN(p.price));
                }
                
                return null;
            }""")
            
            if price_data:
                return self._normalize_price_data(price_data)
            
            # Fallback: Try to scrape visible price table
            print("⚠️ Could not extract from JavaScript, trying HTML parsing...")
            html_content = await page.content()
            return self._extract_from_html(html_content)
            
        except Exception as e:
            print(f"⚠️ Data extraction error: {e}")
            return None
    
    def _normalize_price_data(self, raw_data) -> Optional[List[Dict]]:
        """Normalize raw price data into consistent format."""
        if isinstance(raw_data, list):
            prices = []
            for entry in raw_data:
                try:
                    if isinstance(entry, dict) and 'price' in entry:
                        prices.append({
                            'date': entry.get('date', datetime.now().isoformat()),
                            'price': float(entry['price'])
                        })
                    elif isinstance(entry, (list, tuple)) and len(entry) >= 2:
                        timestamp = entry[0]
                        price = entry[1]
                        if timestamp > 1000000000000:
                            timestamp = timestamp / 1000
                        date = datetime.fromtimestamp(timestamp)
                        prices.append({'date': date.isoformat(), 'price': float(price)})
                except (ValueError, TypeError):
                    continue
            
            return sorted(prices, key=lambda x: x['date']) if prices else None
        return None
    
    def _extract_from_html(self, html: str) -> Optional[List[Dict]]:
        """Extract price data from HTML content."""
        from bs4 import BeautifulSoup
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Look for price data in table rows
            prices = []
            for row in soup.find_all(['tr', 'div'], class_=re.compile('price|history|row')):
                cells = row.find_all(['td', 'span'])
                if len(cells) >= 2:
                    try:
                        date_text = cells[0].get_text(strip=True)
                        price_text = cells[1].get_text(strip=True)
                        price = float(price_text.replace('₹', '').replace(',', '').strip())
                        prices.append({'date': date_text, 'price': price})
                    except (ValueError, AttributeError):
                        continue
            
            return sorted(prices, key=lambda x: x['date']) if prices else None
        except Exception as e:
            print(f"⚠️ HTML extraction error: {e}")
            return None
    
