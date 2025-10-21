import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

class Notifier:
    def __init__(self):
        self.brevo_api_key = os.getenv('BREVO_API_KEY')
        self.from_email = os.getenv('BREVO_FROM_EMAIL')
        
        if self.brevo_api_key and self.from_email:
            # Configure Brevo API
            self.configuration = sib_api_v3_sdk.Configuration()
            self.configuration.api_key['api-key'] = self.brevo_api_key
            
            # Create an instance of the API class
            api_client = sib_api_v3_sdk.ApiClient(self.configuration)
            self.brevo_api_instance = sib_api_v3_sdk.TransactionalEmailsApi(api_client)
            print("✅ Brevo Notifier configured successfully.")
        else:
            self.brevo_api_instance = None
            print("⚠️ Brevo API Key or From Email not found. Email notifications will be disabled.")

    async def send_email_alert(
        self, 
        to_email: str, 
        product_name: str, 
        current_price: float, 
        threshold: float, 
        url: str
    ) -> bool:
        """Send a price alert email using the Brevo (Sendinblue) API."""
        if not self.brevo_api_instance:
            print("Cannot send email: Brevo client is not configured.")
            return False

        # Use Indian Rupee symbol and formatting
        formatted_price = f"₹{current_price:,.2f}"
        formatted_threshold = f"₹{threshold:,.2f}"

        # If product_name is None or empty, use a more descriptive default.
        display_name = product_name if product_name and product_name.strip() else "A Tracked Product"
        subject = f'Price Alert: {display_name} is now {formatted_price}!'

        # Create the HTML content for a nicer-looking email
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Price Drop Alert! 📉</h2>
            <p>Hello!</p>
            <p>Great news! The price for <strong>{product_name}</strong> has dropped to a new low.</p>
            <table style="width: 100%; max-width: 400px; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">Current Price</td>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 1.2em; color: #28a745;">{formatted_price}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">Your Threshold</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{formatted_threshold}</td>
                </tr>
            </table>
            <a href="{url}" style="display: inline-block; padding: 12px 20px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px;">
                View Product Now
            </a>
            <p style="margin-top: 30px; font-size: 0.9em; color: #888;">Happy shopping!<br>- The Smart Price Tracker</p>
        </body>
        </html>
        """

        # Define the email payload
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"email": self.from_email, "name": "Smart Price Tracker"},
            subject=f'Price Alert: {product_name} is now {formatted_price}!',
            html_content=html_content
        )

        try:
            # Send the email
            api_response = self.brevo_api_instance.send_transac_email(send_smtp_email)
            print(f"Successfully sent email to {to_email}. Brevo response: {api_response}")
            return True
        except ApiException as e:
            print(f"An error occurred while sending email via Brevo: {e}")
            return False
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return False