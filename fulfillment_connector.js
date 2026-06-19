/**
 * ZenPaws — Shopify Order Webhook to Supplier API Connector (AutoDS/CJ Dropshipping)
 * 
 * This Node.js service automates dropshipping fulfillment:
 * 1. Listens for Shopify's 'orders/paid' webhook.
 * 2. Verifies the Shopify signature for security.
 * 3. Maps the order details to our supplier's catalog (AutoDS/CJ API).
 * 4. Places the wholesale order automatically, initiating DDP shipping to the US.
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf; // Keep raw body for signature verification
    }
}));

// Environment Configuration (To be set in hosting dashboard)
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || 'your_shopify_secret_key';
const SUPPLIER_API_KEY = process.env.SUPPLIER_API_KEY || 'your_autods_or_cj_api_key';
const SUPPLIER_API_URL = process.env.SUPPLIER_API_URL || 'https://api.autods.com/v1/orders';

// SKU mapping between Shopify and the Supplier
const SKU_MAPPING = {
    'ZP-BED-MED-SAGE': { supplierProductId: 'SUPP-BED-10294', cost: 18.50 },
    'ZP-BOWL-CER-SAGE': { supplierProductId: 'SUPP-BOWL-88412', cost: 12.00 },
    'ZP-LASER-DISP': { supplierProductId: 'SUPP-LASER-55319', cost: 24.00 }
};

// Webhook listener for Shopify
app.post('/webhooks/orders/paid', async (req, res) => {
    // 1. Verify webhook signature
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    if (!verifyShopifySignature(req.rawBody, hmacHeader)) {
        console.error('⚠️ Unauthorized webhook attempt detected.');
        return res.status(401).send('Signature Verification Failed');
    }

    const order = req.body;
    console.log(`📦 Processing Paid Order #${order.order_number} for customer ${order.shipping_address.name}`);

    // 2. Iterate through items and build supplier payloads
    const lineItemsToFulfill = [];
    for (const item of order.line_items) {
        const mapping = SKU_MAPPING[item.sku];
        if (mapping) {
            lineItemsToFulfill.push({
                product_id: mapping.supplierProductId,
                quantity: item.quantity,
                retailPrice: parseFloat(item.price),
                wholesaleCost: mapping.cost
            });
        }
    }

    if (lineItemsToFulfill.length === 0) {
        console.log(`ℹ️ Order #${order.order_number} has no dropshipped SKUs. Skipping.`);
        return res.status(200).send('No dropshipped items');
    }

    // 3. Construct payload for the Supplier API (DDP Express Line to US)
    const supplierPayload = {
        api_key: SUPPLIER_API_KEY,
        shipping_address: {
            first_name: order.shipping_address.first_name,
            last_name: order.shipping_address.last_name,
            address1: order.shipping_address.address1,
            address2: order.shipping_address.address2 || '',
            city: order.shipping_address.city,
            province: order.shipping_address.province, // State
            zip: order.shipping_address.zip,
            country: 'US', // Target US market
            phone: order.shipping_address.phone || '0000000000'
        },
        items: lineItemsToFulfill.map(item => ({
            sku: item.product_id,
            quantity: item.quantity
        })),
        shipping_method: 'US_SPECIAL_LINE_DDP' // Force fast special line DDP
    };

    // 4. Send purchase request to Supplier API
    try {
        console.log(`💸 Dispatching order to supplier. Paying wholesale cost...`);
        const response = await axios.post(SUPPLIER_API_URL, supplierPayload);
        
        console.log(`✅ Supplier accepted order. Supplier Order ID: ${response.data.supplier_order_id}`);
        
        // Return 200 response to Shopify to clear the webhook queue
        return res.status(200).json({
            status: 'success',
            supplier_order_id: response.data.supplier_order_id
        });
    } catch (error) {
        console.error('❌ Failed to route order to supplier:', error.response ? error.response.data : error.message);
        // Alert developer or store admin for manual intervention
        return res.status(500).send('Fulfillment API routing failure');
    }
});

// Helper: HMAC SHA256 Signature Verification
function verifyShopifySignature(rawBody, hmacHeader) {
    if (!hmacHeader) return false;
    const hash = crypto
        .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
        .update(rawBody, 'utf8')
        .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ZenPaws Fulfillment Adapter running on port ${PORT}`);
});
