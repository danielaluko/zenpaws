---
name: social-media-credentials-acquisition
description: Learn how to acquire and configure Facebook/Meta Graph API tokens, Instagram Business Account IDs, and TikTok Content Posting API credentials for the Automated Scheduler.
---

# Social Media Credentials Acquisition Skill Proposal

This proposal outlines a new skill designed to guide developers and site operators through the process of acquiring, configuring, and verifying the access credentials required by the **Automated Social Media Scheduler** (`social_scheduler.py`).

---

## 1. Skill Overview

The automated scheduler requires API access keys to publish content automatically to Meta (Instagram Reels / Facebook Pages) and TikTok. Acquiring these credentials involves setting up developer applications, requesting specific permissions/scopes, executing OAuth flows, and storing keys securely in `social_config.json`.

This skill provides step-by-step procedures to obtain:
*   **Meta Graph API:** Long-lived Page Access Tokens, User Access Tokens, and Instagram Business Account IDs.
*   **TikTok Content Posting API:** Access Tokens, Open IDs, and Refresh Tokens.

---

## 2. Meta (Facebook & Instagram) Credentials Setup

To publish Reels automatically via the Meta Graph API, you must navigate Meta's App Dashboard and Graph API Explorer.

### Prerequisites
*   A **Facebook Business Page**.
*   An **Instagram Professional/Business Account** connected to that Facebook Page.
*   A **Meta Developer Account** (register at [developers.facebook.com](https://developers.facebook.com)).

### Step 1: Create a Meta Developer App
1.  Go to the [Meta App Dashboard](https://developers.facebook.com/apps/) and click **Create App**.
2.  Choose the **Business** app type (or **Other** and select **Business** permissions).
3.  Fill in the app details (name, contact email, and connect it to your Business Manager if applicable) and click **Create App**.

### Step 2: Configure App Products
1.  In the App Dashboard, under "Add Products to Your App", locate and set up:
    *   **Instagram Graph API**
    *   **Facebook Login for Business** (for token generation)

### Step 3: Generate a Short-Lived User Access Token
1.  Navigate to the **Graph API Explorer** tool: `https://developers.facebook.com/tools/explorer/`.
2.  In the right sidebar, select your newly created app from the **Meta App** dropdown.
3.  Under **User or Page**, select **User Token**.
4.  In the **Permissions** section, add the following scopes:
    *   `instagram_basic`
    *   `instagram_content_publish`
    *   `pages_show_list`
    *   `pages_read_engagement`
    *   `pages_manage_posts` (optional, if posting to Facebook as well)
    *   `public_profile`
5.  Click **Generate Access Token**. Approve the permissions prompt in the popup window.

### Step 4: Exchange for a Long-Lived User Access Token (60 Days)
Short-lived user tokens expire in 2 hours. You must exchange it for a long-lived user token.
1.  Send a GET request to the following URL (you can run this directly in the Graph API Explorer or your terminal):
    ```http
    GET https://graph.facebook.com/v18.0/oauth/access_token?
        grant_type=fb_exchange_token&
        client_id={YOUR_APP_ID}&
        client_secret={YOUR_APP_SECRET}&
        fb_exchange_token={YOUR_SHORT_LIVED_USER_TOKEN}
    ```
2.  Copy the returned `access_token` from the JSON response. This is your **Long-Lived User Access Token**.

### Step 5: Retrieve a Permanent Page Access Token
Unlike user tokens, Page access tokens generated via a long-lived user token do not expire.
1.  Query the user accounts endpoint using your long-lived user token:
    ```http
    GET https://graph.facebook.com/v18.0/me/accounts?access_token={YOUR_LONG_LIVED_USER_TOKEN}
    ```
2.  Look for your target Facebook Page in the response data.
3.  Copy the Page `id` and the associated `access_token`. This token is permanent.

### Step 6: Locate the Instagram Business Account ID
To publish to Instagram, you must target the Instagram account linked to your Facebook page.
1.  Query the Facebook Page ID using your permanent Page access token:
    ```http
    GET https://graph.facebook.com/v18.0/{YOUR_PAGE_ID}?fields=instagram_business_account&access_token={YOUR_PAGE_ACCESS_TOKEN}
    ```
2.  Copy the ID value nested inside the `instagram_business_account` object. This is your **Instagram Business Account ID**.

---

## 3. TikTok Content Posting API Credentials Setup

TikTok uses standard 3-legged OAuth 2.0 to grant content creation permissions.

### Prerequisites
*   A **TikTok Developer Account** (register at [developers.tiktok.com](https://developers.tiktok.com)).

### Step 1: Create a TikTok Developer Application
1.  Log in to the [TikTok Developer Console](https://developers.tiktok.com/console).
2.  Click **Create App** and fill in your application details (category, platforms, redirect URIs, etc.).
3.  Request access to the **Content Posting API** product.
4.  Once approved, copy your **Client Key** and **Client Secret** from the App Settings page.
5.  In the redirect URI settings, whitelist your application's redirect URI (e.g., `https://yourdomain.com/oauth/callback` or `http://localhost:3000/callback` for local development).

### Step 2: Request User Authorization
Redirect the content owner to TikTok's authorization page to approve access:
```http
https://www.tiktok.com/v2/auth/authorize/?
    client_key={YOUR_CLIENT_KEY}&
    scope=video.upload,user.info.basic&
    response_type=code&
    redirect_uri={YOUR_WHITELISTED_REDIRECT_URI}&
    state={CSRF_STATE_STRING}
```

### Step 3: Exchange Authorization Code for Access & Refresh Tokens
Once the user authorizes the app, TikTok redirects back to your redirect URI with a `code` query parameter.
Submit a POST request to exchange the code for an access token:
```bash
curl -X POST https://open.tiktokapis.com/v2/oauth/token/ \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_key={YOUR_CLIENT_KEY}" \
     -d "client_secret={YOUR_CLIENT_SECRET}" \
     -d "code={AUTHORIZATION_CODE}" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri={YOUR_WHITELISTED_REDIRECT_URI}"
```
**Response JSON Structure:**
```json
{
  "access_token": "act.exampletoken123...",
  "refresh_token": "rft.examplerefresh123...",
  "open_id": "user-unique-openid-uuid",
  "scope": "video.upload,user.info.basic",
  "expires_in": 86400,
  "refresh_expires_in": 31536000
}
```
Copy the `access_token`, `refresh_token`, and `open_id`.

### Step 4: Token Expiration and Refresh (Operational Routine)
*   **Access Token Lifespan:** 24 hours.
*   **Refresh Token Lifespan:** 1 year.
*   To refresh your access token, invoke the following API endpoint:
    ```bash
    curl -X POST https://open.tiktokapis.com/v2/oauth/token/ \
         -H "Content-Type: application/x-www-form-urlencoded" \
         -d "client_key={YOUR_CLIENT_KEY}" \
         -d "client_secret={YOUR_CLIENT_SECRET}" \
         -d "grant_type=refresh_token" \
         -d "refresh_token={YOUR_REFRESH_TOKEN}"
    ```

---

## 4. Configuring the Automated Scheduler

Once all tokens are acquired, they must be formatted into the configuration file used by the scheduler daemon.

### Config File Path
```filepath
C:\Users\HP\zenpaws-brand\social_config.json
```

### Template File Content
Save the following format into `social_config.json`:
```json
{
    "instagram_business_account_id": "YOUR_INSTAGRAM_BUSINESS_ID",
    "facebook_page_access_token": "YOUR_PAGE_ACCESS_TOKEN",
    "tiktok_access_token": "YOUR_TIKTOK_ACCESS_TOKEN",
    "tiktok_open_id": "YOUR_TIKTOK_OPEN_ID"
}
```

> [!WARNING]
> Keep `social_config.json` secure. **Never commit this file to public Git repositories.** Add it to your `.gitignore` immediately:
> ```git
> # Ignore local secrets and credentials
> social_config.json
> ```

---

## 5. Token Verification and Testing

To verify the setup is correct before running scheduler automation, execute a test script to inspect the active tokens.

### Meta/Instagram Verification
Verify that the `facebook_page_access_token` can successfully read the `instagram_business_account_id` information:
```python
import requests

token = "YOUR_PAGE_ACCESS_TOKEN"
ig_id = "YOUR_INSTAGRAM_BUSINESS_ID"
url = f"https://graph.facebook.com/v18.0/{ig_id}?fields=username,name&access_token={token}"

response = requests.get(url)
print("Status Code:", response.status_code)
print("Response Data:", response.json())
```
A successful response will return your Instagram account name and username, proving that the token is valid and has permissions for that Instagram business profile.

---

## 6. Machine Usage & Automation Safety Guardrails

When running automated posting scripts (`social_scheduler.py`) from local machines or servers, social platforms apply strict security algorithms to detect bot activity. Adhere to these guardrails to prevent your accounts from being restricted:

### A. API Rate Limits & Posting Frequency
*   **Instagram Reels Limit:** Meta restricts business accounts to a maximum of **25 API-published posts per rolling 24-hour period**.
*   **Optimal Frequency:** Never post multiple Reels consecutively. Space out your uploads by at least **2 to 4 hours** (e.g., maximum 3–4 posts daily) to mimic natural human behavior.

### B. IP Reputation & Server Hosting
*   **Avoid Public Datacenters:** If you deploy your scheduler on generic cloud servers (e.g., AWS, DigitalOcean, Heroku), Meta or TikTok may flag the requests as coming from a "bot network" because their IP blocks are classified as datacenters.
*   **Best Practice:** Run the script locally on your home computer (using your residential IP) or use a **Residential Proxy** service if hosting on a cloud server.

### C. Meta App "Development" vs. "Live" Mode
*   **Development Mode (Default):** While your Meta App is in Development Mode, the scheduler can **only** post to Instagram accounts that are registered as Administrators, Developers, or Testers inside your App Dashboard.
*   **Live Mode (Public Launch):** To post to any general account, you must switch your app to "Live Mode" in the Meta App Dashboard. This requires entering a Privacy Policy URL and completing a basic Business Verification.

### D. Use Official APIs (No Browser Emulation)
*   **Why our script is safe:** The provided script utilizes **Official Graph APIs** rather than browser automation (like Selenium or Puppeteer). Official API calls do not trigger browser fingerprint checks (such as screen resolution or canvas hashes) and are highly trusted by Meta's security filters.

---

## 7. Meta & TikTok Ads Policy Compliance & Restriction Guardrails

When launching paid advertising campaigns, platforms employ strict automated AI models to review ads, landing pages, and accounts. A single policy violation can trigger a permanent Business Manager or Ad Account restriction. Adhere to these guardrails to safeguard your advertising assets:

### A. Ad Copy & Creative Compliance (Wellness Claims)
Since ZenPaws is a pet wellness brand, the ad creatives and copywriting must avoid high-risk policy flags:
*   **No Unsubstantiated Health Claims:** Meticulously avoid language promising medical "cures" or "instant relief" for pet anxiety or joint pain.
    *   *Mislabeled (High Risk):* "Cures dog joint pain in 7 days." / "Guaranteed to stop cat anxiety."
    *   *Compliant (Safe):* "Supports natural joint comfort." / "Helps create a soothing environment for nervous cats."
*   **No Before-and-After Imagery:** Do not use side-by-side comparison images showing an injured/anxious pet vs. a healthy pet. Meta's image classifier flags these automatically.
*   **Avoid Sensational/Shock Content:** Do not feature distressed, crying, or neglected pets in the creative to gain attention. Meta and TikTok restrict ads depicting suffering.

### B. Business Manager & Domain Reputation
*   **Complete Business Verification:** Verify your Meta Business Manager with official company incorporation/registration documents and utility bills. Unverified BMs launching high-budget ads are frequently restricted.
*   **Domain Verification:** Verify the `zenpaws.com` domain inside the Meta Business Settings (under Brand Safety) by adding a TXT DNS record. Meta flags ads linking to unverified or new domains as untrusted.
*   **Customer Feedback Score Protection:** Once ads run, Meta polls buyers on delivery speed and product quality. If your Page Feedback Score falls below **2.0**, your ad reach will be penalized; if it falls below **1.0**, the Page is banned.
    *   *Guardrail:* Ensure dropshipping fulfillment (tracking info upload) happens within 48 hours and set realistic shipping timelines (e.g., 7–14 days) in the ad copy/landing page.

### C. Ad Account Warm-up & Spending Patterns
*   **Avoid Sudden Budget Spikes:** Do not start a brand-new ad account with a $500/day budget. This triggers Meta's automated payment and spam security alerts.
*   **Incremental Scaling:** Begin with a low budget ($10 to $20 per day) for 5–7 days to build trust. Once the first billing threshold is successfully charged, scale budgets by no more than **20–30% daily**.
*   **Clear Card History:** Use a credit card with the same name and address as your Business Manager profile. Mismatched billing names or cards associated with previously banned accounts will cause immediate, automatic bans.

### D. Safe Operations (IP and Muted Login Locations)
*   **Consistently Access from a Single Location:** Mismatch of IP addresses (e.g., logging into Meta Ads Manager from a VPN or remote server) triggers security checkpoints.
*   **Guardrail:** Mute VPNs or keep them set to your home/business residential location when managing Ads Manager. Ensure anyone else managing the ads uses their own Facebook account invited via the BM rather than sharing login credentials.


