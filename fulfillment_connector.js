/**
 * ZenPaws — Production Payment & Dropshipping Fulfillment Routing Service
 * 
 * This service handles:
 * 1. Stripe Live Checkout Session creation.
 * 2. Stripe 'checkout.session.completed' webhook signature verification.
 * 3. Extracting customer details & line items from Stripe Session.
 * 4. Auto-routing wholesale orders to CJ Dropshipping/AutoDS API.
 */

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_live_dummy');
const axios = require('axios');

const app = express();

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf; // Preserve raw body for Stripe signature checks
    }
}));

// Environment Settings
const SUPPLIER_API_KEY = process.env.SUPPLIER_API_KEY || 'your_supplier_api_key';
const SUPPLIER_API_URL = process.env.SUPPLIER_API_URL || 'https://api.autods.com/v1/orders';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy';
const STORE_DOMAIN = process.env.STORE_DOMAIN || 'http://localhost:8000';

// SKU mapping between Stripe product name/id and supplier SKUs
const SKU_MAPPING = {
    'ZenPaws Calming Orthopedic Bed': { supplierProductId: 'SUPP-BED-10294', cost: 18.50 },
    'ZenPaws Ergonomic Bowl System': { supplierProductId: 'SUPP-BOWL-88412', cost: 12.00 },
    'ZenPaws Smart Interactive Dispenser': { supplierProductId: 'SUPP-LASER-55319', cost: 24.00 }
};

// 1. Endpoint: Create Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { items } = req.body; // Array of product objects from storefront cart
        
        if (!items || items.length === 0) {
            return res.status(400).send('Cart is empty');
        }

        // Map cart items to Stripe line items structure
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title,
                    description: item.desc || '',
                },
                unit_amount: Math.round(item.price * 100), // Stripe expects amounts in cents
            },
            quantity: 1,
        }));

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            shipping_address_collection: {
                allowed_countries: ['US'], // Focus on American economy
            },
            success_url: `${STORE_DOMAIN}/dashboard.html?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${STORE_DOMAIN}/index.html`,
        });

        console.log(`💳 Created Stripe session ${session.id} for amount $${(session.amount_total/100).toFixed(2)}`);
        res.json({ id: session.id, url: session.url });
    } catch (err) {
        console.error('❌ Stripe checkout session error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Endpoint: Stripe Webhook Listener
app.post('/webhooks/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the payment completion event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`💰 Payment succeeded for Session: ${session.id}`);

        // Fetch detailed session with line items (stripe SDK doesn't return them by default in webhook event)
        try {
            const sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, {
                expand: ['line_items']
            });

            await handleFulfillment(sessionWithItems);
        } catch (fulfillmentErr) {
            console.error('❌ Failed to route fulfillment order:', fulfillmentErr.message);
            // Alert operator or store admin for manual checkout fallback
        }
    }

    res.json({ received: true });
});

// Helper: Place order on CJ / AutoDS API
async function handleFulfillment(session) {
    const customer = session.shipping_details;
    const items = session.line_items.data;

    console.log(`📦 Processing fulfillment for buyer: ${customer.name}`);

    // Map items to supplier IDs
    const lineItemsToFulfill = [];
    for (const item of items) {
        const mapping = SKU_MAPPING[item.description]; // Stripe description matches product title
        if (mapping) {
            lineItemsToFulfill.push({
                product_id: mapping.supplierProductId,
                quantity: item.quantity,
                cost: mapping.cost
            });
        }
    }

    if (lineItemsToFulfill.length === 0) {
        console.warn('⚠️ No dropshipped items mapped in Stripe session.');
        return;
    }

    // Split customer name into first/last
    const nameParts = customer.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    // Supplier API payload
    const supplierPayload = {
        api_key: SUPPLIER_API_KEY,
        shipping_address: {
            first_name: firstName,
            last_name: lastName,
            address1: customer.address.line1,
            address2: customer.address.line2 || '',
            city: customer.address.city,
            province: customer.address.state,
            zip: customer.address.postal_code,
            country: customer.address.country,
            phone: '0000000000'
        },
        items: lineItemsToFulfill.map(item => ({
            sku: item.product_id,
            quantity: item.quantity
        })),
        shipping_method: 'US_SPECIAL_LINE_DDP'
    };

    console.log(`💸 Transferring wholesale fund to supplier API...`);
    const response = await axios.post(SUPPLIER_API_URL, supplierPayload);
    console.log(`✅ Dropship Order Dispatched! Supplier Order ID: ${response.data.supplier_order_id}`);
}

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ZenPaws Payment & Fulfillment Server running on port ${PORT}`);
});
