// Products catalog data
const products = [
    {
        id: 1,
        title: "ZenPaws Calming Orthopedic Bed",
        emoji: "💤",
        image: "calming_bed.jpg",
        desc: "Premium, human-grade memory foam base with self-warming, anxiety-soothing bolsters.",
        price: 69.99,
        wholesaleCost: 18.50
    },
    {
        id: 2,
        title: "ZenPaws Ergonomic Bowl System",
        emoji: "🥣",
        image: "bowl_system.jpg",
        desc: "Veterinarian-recommended elevated bowl setup with a 15-degree tilt for seamless digestion.",
        price: 49.99,
        wholesaleCost: 12.00
    },
    {
        id: 3,
        title: "ZenPaws Smart Interactive Dispenser",
        emoji: "🤖",
        image: "smart_dispenser.jpg",
        desc: "Keep your pet active and rewarded with automated laser play and treat launching features.",
        price: 89.99,
        wholesaleCost: 24.00
    }
];

// API configuration (Replace with your deployed backend URL in production)
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://your-production-backend.onrender.com';

// App State
let cart = [];
let totalRevenue = 0;
let totalCost = 0;
let totalProfit = 0;

// On Load
document.addEventListener("DOMContentLoaded", () => {
    renderCatalog();
    updateDashboardUI();
});

// Render Catalog Grid
function renderCatalog() {
    const listElement = document.getElementById("product-list");
    listElement.innerHTML = "";

    products.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <div class="product-thumb">
                <img src="${p.image}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div class="product-body">
                <h3>${p.title}</h3>
                <p>${p.desc}</p>
                <div class="product-footer">
                    <span class="product-price">$${p.price.toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">Add To Cart</button>
                </div>
            </div>
        `;
        listElement.appendChild(card);
    });
}

// Cart Drawer Actions
function toggleCart() {
    const sidebar = document.getElementById("cartSidebar");
    sidebar.classList.toggle("open");
}

function addToCart(productId) {
    const prod = products.find(p => p.id === productId);
    if (prod) {
        cart.push(prod);
        updateCartUI();
        // Show notification or cart open
        const sidebar = document.getElementById("cartSidebar");
        if (!sidebar.classList.contains("open")) {
            sidebar.classList.add("open");
        }
        logConsole(`Added "${prod.title}" to cart (Retail Price: $${prod.price.toFixed(2)})`, "system");
    }
}

function quickAdd(productId) {
    addToCart(productId);
}

function removeFromCart(index) {
    const removed = cart.splice(index, 1)[0];
    updateCartUI();
    logConsole(`Removed "${removed.title}" from cart`, "system");
}

function updateCartUI() {
    // Update badge count
    document.querySelector(".cart-count").innerText = cart.length;

    // Render list
    const list = document.getElementById("cartItemsList");
    if (cart.length === 0) {
        list.innerHTML = `<div class="empty-cart-message">Your cart is empty.</div>`;
        document.getElementById("cartTotalVal").innerText = "$0.00";
        return;
    }

    list.innerHTML = "";
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price;
        const itemEl = document.createElement("div");
        itemEl.className = "cart-item";
        itemEl.innerHTML = `
            <div class="cart-item-thumb">
                <img src="${item.image}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
            </div>
            <div class="cart-item-info">
                <h4>${item.title}</h4>
                <span>$${item.price.toFixed(2)}</span>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">Remove</button>
        `;
        list.appendChild(itemEl);
    });

    document.getElementById("cartTotalVal").innerText = `$${total.toFixed(2)}`;
}

// Live Console Log
function logConsole(message, type = "") {
    const consoleBody = document.getElementById("console-logs");
    const line = document.createElement("div");
    line.className = `log-line ${type}`;
    line.innerHTML = `> [${new Date().toLocaleTimeString()}] ${message}`;
    consoleBody.appendChild(line);
    consoleBody.scrollTop = consoleBody.scrollHeight;
}

// Checkout Modal Actions
function closeModal() {
    document.getElementById("checkoutModal").classList.remove("open");
    // Reset modal content view
    document.getElementById("checkout-phase-form").style.display = "block";
    document.getElementById("checkout-phase-pipeline").style.display = "none";
}

async function checkoutCart() {
    if (cart.length === 0) {
        alert("Please add products to your cart before checking out.");
        return;
    }
    
    logConsole("Initializing secure Stripe checkout redirect...", "system");
    
    try {
        const response = await fetch(`${API_URL}/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: cart })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create payment session.');
        }
        
        const data = await response.json();
        logConsole(`Redirecting to Stripe Session: ${data.id}`, "success");
        
        // Redirect customer to Stripe Checkout Page
        window.location.href = data.url;
    } catch (err) {
        console.error(err);
        logConsole("Payment server offline. Redirecting to mock simulation checkout.", "error");
        // Fallback to local mock simulation modal if backend is offline
        toggleCart();
        document.getElementById("checkoutModal").classList.add("open");
    }
}

// Trigger simulated checkout process directly
function startSimulatedCheckout() {
    // Add default product if empty
    if (cart.length === 0) {
        cart.push(products[0]); // Calming bed
        updateCartUI();
    }
    document.getElementById("checkoutModal").classList.add("open");
}

// Simulated Pipeline Sequence
function submitMockOrder(event) {
    event.preventDefault();

    // Prepare elements
    document.getElementById("checkout-phase-form").style.display = "none";
    const pipelineView = document.getElementById("checkout-phase-pipeline");
    pipelineView.style.display = "block";

    // Stepper visual resets
    const c1 = document.getElementById("step-c1");
    const c2 = document.getElementById("step-c2");
    const c3 = document.getElementById("step-c3");
    const l1 = document.getElementById("step-l1");
    const l2 = document.getElementById("step-l2");
    const stTitle = document.getElementById("stepper-title");
    const stDesc = document.getElementById("stepper-desc");
    const footer = document.getElementById("modal-footer-actions");

    c1.className = "step-circle s1 active";
    c2.className = "step-circle s2";
    c3.className = "step-circle s3";
    l1.className = "step-line sl1";
    l2.className = "step-line sl2";
    footer.style.visibility = "hidden";

    // Calculate totals of current order
    let orderRetail = 0;
    let orderWholesale = 0;
    cart.forEach(item => {
        orderRetail += item.price;
        orderWholesale += item.wholesaleCost;
    });
    let orderProfit = orderRetail - orderWholesale;

    document.getElementById("acc-retail").innerText = `$${orderRetail.toFixed(2)}`;
    document.getElementById("acc-wholesale").innerText = `$${orderWholesale.toFixed(2)}`;
    document.getElementById("acc-profit").innerText = `$${orderProfit.toFixed(2)}`;

    // STAGE 1: Clear Payment
    stTitle.innerText = "Processing Customer Payment";
    stDesc.innerText = `Clearing $${orderRetail.toFixed(2)} via Stripe Credit Card gateway...`;
    logConsole(`Stripe payment gateway authorization triggered for $${orderRetail.toFixed(2)}`, "system");

    setTimeout(() => {
        // Complete Stage 1
        c1.className = "step-circle s1 success";
        l1.className = "step-line sl1 active";
        stTitle.innerText = "Payment Cleared Successfully";
        stDesc.innerText = `Customer card charged. Transferred $${orderRetail.toFixed(2)} to ZenPaws account.`;
        logConsole(`Payment completed. Card ending 4242 charged. Account Balance: +$${orderRetail.toFixed(2)}`, "success");

        // Update Dashboard totals
        totalRevenue += orderRetail;
        updateDashboardUI();

        // Transition to STAGE 2
        setTimeout(() => {
            c2.className = "step-circle s2 active";
            stTitle.innerText = "Auto-Routing Order to Supplier";
            stDesc.innerText = "Triggering backend API. Purchasing wholesale item from supplier dashboard...";
            logConsole(`AutoDS API Sync triggered. Order detail for John Doe sent to regional supplier.`, "system");

            setTimeout(() => {
                c2.className = "step-circle s2 success";
                l2.className = "step-line sl2 active";
                stTitle.innerText = "Wholesale Cost Settled";
                stDesc.innerText = `Paid supplier wholesale cost of $${orderWholesale.toFixed(2)}.`;
                logConsole(`Wholesale order placed. Transferred $${orderWholesale.toFixed(2)} to warehouse account.`, "cost");

                totalCost += orderWholesale;
                totalProfit += orderProfit;
                updateDashboardUI();

                // Transition to STAGE 3
                setTimeout(() => {
                    c3.className = "step-circle s3 active";
                    stTitle.innerText = "Warehouse Fulfillment";
                    stDesc.innerText = "Supplier packing item. Generating shipping label and tracking ID...";
                    logConsole(`US supplier processed parcel at Seattle, WA fulfillment center.`, "system");

                    setTimeout(() => {
                        c3.className = "step-circle s3 success";
                        stTitle.innerText = "Order Dispatched & Tracking Synced";
                        stDesc.innerText = "Tracking number ZP-98317-US assigned. Dispatch confirmation email sent.";
                        logConsole(`Order fully dispatched. Tracking ID: ZP-98317-US. Email notification triggered.`, "success");
                        logConsole(`Pipeline complete. Net profit kept: +$${orderProfit.toFixed(2)}!`, "success");

                        // Show close action and clear cart
                        footer.style.visibility = "visible";
                        cart = [];
                        updateCartUI();
                    }, 2500);

                }, 2000);

            }, 2500);

        }, 2000);

    }, 2000);
}

// Update dashboard panel stats
function updateDashboardUI() {
    document.getElementById("dash-revenue").innerText = `$${totalRevenue.toFixed(2)}`;
    document.getElementById("dash-cost").innerText = `$${totalCost.toFixed(2)}`;
    document.getElementById("dash-profit").innerText = `$${totalProfit.toFixed(2)}`;
}
