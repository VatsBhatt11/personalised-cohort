import httpx
import os

AISENSY_API_KEY = os.environ.get('AISENSY_API_KEY')
AISENSY_CAMPAIGN_NAME = os.environ.get('AISENSY_CAMPAIGN_NAME') # c05oh30min1
AISENSY_API_URL = os.environ.get('AISENSY_API_URL')

async def send_whatsapp_message(
    destination: str,
    user_name: str,
    message_body: str,
    session_title: str,
    remaining_time: str,
    status: str,
    media: dict = None,
    api_key: str = AISENSY_API_KEY,
    campaign_name: str = AISENSY_CAMPAIGN_NAME
):
    if not api_key or not campaign_name:
        print("AiSensy API key or campaign name not configured.")
        return

    headers = {
        "Content-Type": "application/json"
    }

    payload = {
        "apiKey": api_key,
        "campaignName": campaign_name,
        "destination": destination,
        "userName": user_name,
        "media" : media,
        "templateParams": [session_title, user_name, message_body, remaining_time, status] 
    }

    print(payload)

    if media:
        payload["media"] = media

    try:
        async with httpx.AsyncClient() as client:
            print(f"DEBUG: AISENSY_API_URL: {AISENSY_API_URL}")
            response = await client.post(AISENSY_API_URL, headers=headers, json=payload)
            response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes
            print(f"AiSensy WhatsApp message sent to {destination}: {response.json()}")
            return response.json()
    except httpx.RequestError as e:
        print(f"An error occurred while requesting AiSensy API: {e}")
    except httpx.HTTPStatusError as e:
        print(f"AiSensy API returned an error: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

    return None