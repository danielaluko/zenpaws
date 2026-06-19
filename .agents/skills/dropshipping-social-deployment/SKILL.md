---
name: dropshipping-social-deployment
description: Guide for deploying static storefronts, configuring webhook fulfillment endpoints, acquiring Meta/TikTok API credentials, and implementing ads compliance guardrails.
---

# Dropshipping Deployment & Social Media Automation Config Guide

This skill provides step-by-step procedures to deploy the storefront, setup order-fulfillment routing, acquire API credentials, and run ads campaigns safely.

---

## 1. Storefront Deployment

### Netlify (Drag-and-Drop)
1. Drag the project folder (`C:\Users\HP\zenpaws-brand`) directly into [Netlify Drop](https://app.netlify.com/drop).
2. Set your custom domain in the Netlify dashboard under *Domain Management*.

### Vercel (CLI)
1. Install Vercel: `npm install -g vercel`
2. Run `vercel` in the project directory:
   ```powershell
   cd C:\Users\HP\zenpaws-brand
   vercel
   ```
3. Follow the prompts to launch and link your domain.

---

## 2. Order Fulfillment Routing

### Deployment (Render / Railway)
1. Push `fulfillment_connector.js` to GitHub.
2. Deploy the repository as a Web Service on Render or Railway.
3. Configure the following environment variables in the service dashboard:
   *   `SUPPLIER_API_KEY`: AutoDS or CJ Dropshipping wholesale credentials.
   *   `SHOPIFY_WEBHOOK_SECRET`: Secret key generated from your Shopify webhook setup.

### Webhook Registration
1. In Shopify Admin, navigate to **Settings > Notifications > Webhooks**.
2. Click **Create Webhook**.
3. Select Event: `orders/paid`, Format: `JSON`.
4. URL: `https://your-deployed-service-name.onrender.com/webhooks/orders/paid`.

---

## 3. Meta & TikTok API Tokens Acquisition

### Meta Graph API Setup
1. Go to [developers.facebook.com](https://developers.facebook.com) and create a **Business App**.
2. Add product: **Instagram Graph API**.
3. In the **Graph API Explorer**, generate a User Token with scopes:
   *   `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`
4. Exchange for a 60-day long-lived User Token:
   ```http
   GET https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_LIVED_TOKEN}
   ```
5. Fetch permanent Page Access Token and Instagram Business Account ID:
   ```http
   GET https://graph.facebook.com/v18.0/me/accounts?access_token={LONG_LIVED_USER_TOKEN}
   GET https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={PAGE_ACCESS_TOKEN}
   ```
6. Format these variables into `C:\Users\HP\zenpaws-brand\social_config.json`. **Never commit this file to public Git repositories.**

---

## 4. Operational Guardrails & Platform Limits

### A. Posting Automation (social_scheduler.py)
*   **Instagram Rate Limits:** Max 25 API-published Reels per 24 hours. Space posts by **2 to 4 hours** to prevent spam bans.
*   **IP Reputation:** Run schedulers locally or use residential proxies. Do not run from public datacenter IPs (AWS, Heroku) as Meta flags them as bot nets.
*   **APIs Only:** Do not use browser emulation (Selenium/Puppeteer) to bypass login portals.

### B. Advertising Policy Compliance (Ads Manager)
*   **Wellness Claims:** Meticulously avoid promising medical "cures" or "instant joint/anxiety relief". Use supportive copy instead (e.g., "helps create a soothing space").
*   **Visual Safety:** Avoid before/after side-by-side comparison images showing distressed pets.
*   **Account Warm-Up:** Do not start new accounts with budgets over $20/day. Increase spending incrementally by 20-30% daily to build billing trust.
*   **Domain & BM Verification:** Verify your domain `zenpaws.com` in Business Settings under Brand Safety, and complete BM legal verification.
*   **Page Feedback Score:** Keep delivery speeds fast. A Page Feedback Score below 2.0 triggers ad penalties; below 1.0 causes a complete page ad ban.
