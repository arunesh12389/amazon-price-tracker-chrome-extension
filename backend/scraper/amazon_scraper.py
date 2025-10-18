from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re
from typing import Optional

class AmazonScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    async def get_price_and_details(self, url: str) -> dict:
        """Extracts price, name, and image URL from an Amazon product page."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                await page.set_extra_http_headers(self.headers)
                await page.goto(url, wait_until='domcontentloaded', timeout=60000)
                
                # Wait for the main price or the title to ensure the page is loaded
                await page.wait_for_selector('#productTitle, .a-price-whole', timeout=15000)
                
                content = await page.content()
                soup = BeautifulSoup(content, 'html.parser')
                
                # --- Extract Price ---
                price_whole_elem = soup.select_one('.a-price-whole')
                price_fraction_elem = soup.select_one('.a-price-fraction')
                price = 0.0
                if price_whole_elem:
                    whole = re.sub(r'[^0-9]', '', price_whole_elem.text)
                    fraction = re.sub(r'[^0-9]', '', price_fraction_elem.text) if price_fraction_elem else '00'
                    price = float(f"{whole}.{fraction}")

                # --- Extract Name ---
                name_elem = soup.select_one('#productTitle')
                name = name_elem.text.strip() if name_elem else "Product Name Not Found"

                # --- Extract Image ---
                image_elem = soup.select_one('#landingImage')
                image_url = image_elem['src'] if image_elem and 'src' in image_elem.attrs else None
                
                if not price or not name:
                    raise ValueError("Could not extract essential product details (name or price).")

                return {
                    'price': price,
                    'name': name,
                    'image_url': image_url
                }
            
            except Exception as e:
                print(f"Error scraping Amazon page {url}: {str(e)}")
                raise
            
            finally:
                await browser.close()