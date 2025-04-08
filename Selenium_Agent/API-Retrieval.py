import requests

# URL for the analytics endpoint
url = "https://create.fortnite.com/api/analytics/v1/analytics-device/8234-1352-6956?fromTs=1738195201000&toTs=1740787199999"

# Construct the headers with sensitive data redacted
headers = {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "cookie": ("EPIC_DEVICE=REDACTED; "
               "fortnite-session=REDACTED; "
               "EPIC_CSRF_TOKEN_CP=REDACTED; "
               "EPIC_SSO_RM=REDACTED; "
               "EPIC_SESSION_CP=REDACTED; "
               "__cf_bm=REDACTED; "
               "EPIC_SSO=REDACTED; "
               "EPIC_BEARER_TOKEN=REDACTED; "
               "cf_clearance=REDACTED"),
    "referer": "https://create.fortnite.com/a3b74a06-0c43-44da-b990-418620b5f388/projects/1c497b06-a3df-4faa-b136-3c236a8f762d/analytics",
    "sec-ch-ua": '"Not:A-Brand";v="24", "Chromium";v="134"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "x-csrf-token": "REDACTED",
}

# Make the GET request using a session to handle cookies and persistent settings
session = requests.Session()

response = session.get(url, headers=headers)

# Check the response
print("Status Code:", response.status_code)
print("Response Body:", response.text)
