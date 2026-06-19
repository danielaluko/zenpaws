// Sim State
let treasury = 0;
let wholesaleCostSum = 0;
let adsCostSum = 0;
let netProfit = 0;
let population = 0;
let level = 1;
let xp = 0;
let simSpeed = 1; // 0 = pause, 1 = 1x, 2 = 2x, 3 = 3x
let simDate = new Date("2026-06-19T18:48:00");

// Products data
const mockProducts = [
    { name: "ZenPaws Orthopedic Bed", price: 69.99, cost: 18.50, sku: "ZP-BED-MED-SAGE" },
    { name: "ZenPaws Ergonomic Bowls", price: 49.99, cost: 12.00, sku: "ZP-BOWL-CER-SAGE" },
    { name: "ZenPaws Smart Dispenser", price: 89.99, cost: 24.00, sku: "ZP-LASER-DISP" }
];

const mockNames = [
    "Emily Watson", "Marcus Sterling", "Chloe Vance", "Austin Hayes",
    "Sophia Patel", "Derrick Vance", "Elena Rostova", "Nathan Drake"
];

const levelNames = [
    "Little Hamlet", "Worthy Village", "Tiny Town", "Booming Town", 
    "Prosperous City", "Grand Metropolis", "Mega City"
];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    // Clock tick
    setInterval(tickClock, 1000);
});

// Clock Logic
function tickClock() {
    if (simSpeed === 0) return;
    
    // Increment simulated time based on speed
    const minutesToIncrement = simSpeed * 5;
    simDate.setMinutes(simDate.getMinutes() + minutesToIncrement);
    
    // Format Sim Clock
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    document.getElementById("sim-clock").innerText = simDate.toLocaleDateString('en-US', options);
    
    // Small random events (organic visitors/demand) at high speeds
    if (Math.random() < (0.02 * simSpeed)) {
        addOrganicVisitor();
    }
}

function setSimSpeed(speed) {
    simSpeed = speed;
    
    // Toggle active UI button
    document.querySelectorAll(".speed-btn").forEach(btn => btn.classList.remove("active"));
    
    if (speed === 1) document.getElementById("speed-1x").classList.add("active");
    if (speed === 2) document.getElementById("speed-2x").classList.add("active");
    if (speed === 3) document.getElementById("speed-3x").classList.add("active");
    if (speed === 0) document.getElementById("speed-pause").classList.add("active");
}

// Submenu Modals
function openSubmenu(menuId) {
    // Close others
    closeSubmenu();
    document.getElementById(`submenu-${menuId}`).classList.add("open");
}

function closeSubmenu() {
    document.querySelectorAll(".submenu-modal").forEach(m => m.classList.remove("open"));
}

function toggleChirper() {
    const panel = document.getElementById("chirperPanel");
    panel.classList.toggle("open");
    
    // Reset notification alert count
    if (panel.classList.contains("open")) {
        document.getElementById("chirp-alert-count").style.display = "none";
    }
}

// Add chirp message
function addChirp(username, message, type = "") {
    const feed = document.getElementById("chirper-feed");
    const chirp = document.createElement("div");
    chirp.className = `chirp-msg ${type}`;
    chirp.innerHTML = `
        <span class="chirp-user">${username}</span>
        <p>${message}</p>
        <span class="chirp-time">Just Now</span>
    `;
    feed.insertBefore(chirp, feed.firstChild);
    
    // Trigger notification count if panel is closed
    const panel = document.getElementById("chirperPanel");
    if (!panel.classList.contains("open")) {
        const badge = document.getElementById("chirp-alert-count");
        badge.style.display = "flex";
        let cnt = parseInt(badge.innerText) || 0;
        badge.innerText = cnt + 1;
    }
}

function addOrganicVisitor() {
    population += Math.floor(Math.random() * 5) + 1;
    document.getElementById("city-population").innerText = population;
}

// Simulated Order Pipeline Execution
function triggerSimulatedSale() {
    // Pick random product and name
    const prod = mockProducts[Math.floor(Math.random() * mockProducts.length)];
    const name = mockNames[Math.floor(Math.random() * mockNames.length)];
    
    // Add population
    population += 1;
    document.getElementById("city-population").innerText = population;
    
    // Districts elements
    const resDist = document.getElementById("district-residential");
    const comDist = document.getElementById("district-commercial");
    const indDist = document.getElementById("district-industrial");
    const truck = document.getElementById("delivery-truck");
    
    // Reset highlights
    resDist.classList.remove("pulse");
    comDist.classList.remove("pulse");
    indDist.classList.remove("pulse");
    
    // Step 1: Customer Order triggers from Residential Zone
    resDist.classList.add("pulse");
    addChirp("@System", `🚨 Customer "${name}" placed order for "${prod.name}" (Retail: $${prod.price})`, "system");
    createFloatingText(resDist, `🛒 $${prod.price}`, "green");
    
    // Step 2: Payment cleared, Commercial Zone lights up
    setTimeout(() => {
        resDist.classList.remove("pulse");
        comDist.classList.add("pulse");
        
        treasury += prod.price;
        netProfit += prod.price;
        updateDashboard();
        
        addChirp("@Ultron_Orchestrator", `💳 Stripe confirmed payment of $${prod.price} from ${name}. Balance added to treasury.`, "success");
        createFloatingText(comDist, `+$${prod.price}`, "green");
        
        // Step 3: Auto-routing wholesale payment to Supplier (Industrial Zone)
        setTimeout(() => {
            comDist.classList.remove("pulse");
            indDist.classList.add("pulse");
            
            treasury -= prod.cost;
            wholesaleCostSum += prod.cost;
            netProfit -= prod.cost;
            
            // Add small marketing cost simulation to ledger
            const adCost = 2.50; // Mock ad spend per acquisition
            treasury -= adCost;
            adsCostSum += adCost;
            netProfit -= adCost;
            
            updateDashboard();
            
            addChirp("@Forge_Creator", `💸 Settled supplier wholesale cost of $${prod.cost} (SKU: ${prod.sku}). Packing box...`, "cost");
            createFloatingText(indDist, `-$${prod.cost}`, "red");
            
            // Step 4: Dispatch truck (Transit)
            setTimeout(() => {
                indDist.classList.remove("pulse");
                truck.style.display = "block";
                truck.classList.add("drive-animation");
                
                addChirp("@Cipher_Comms", `🚚 Supplier dispatched order via US Special Line DDP. Tracking ID: ZP-${Math.floor(Math.random()*90000)+10000}-US.`, "system");
                
                setTimeout(() => {
                    // Complete delivery at Residential Zone
                    truck.style.display = "none";
                    truck.classList.remove("drive-animation");
                    resDist.classList.add("pulse");
                    
                    addChirp("@System", `🎉 Package successfully delivered to ${name}! Customer satisfied.`, "success");
                    
                    // Increment XP progress
                    incrementXP(25);
                    
                    setTimeout(() => {
                        resDist.classList.remove("pulse");
                    }, 1000);
                    
                }, 4000); // Truck driving duration
                
            }, 2000);
            
        }, 2000);
        
    }, 2000);
}

function updateDashboard() {
    document.getElementById("city-treasury").innerText = treasury.toFixed(2);
    
    // Ledger updates
    document.getElementById("ledger-retail").innerText = `$${(wholesaleCostSum + netProfit + adsCostSum).toFixed(2)}`;
    document.getElementById("ledger-wholesale").innerText = `$${wholesaleCostSum.toFixed(2)}`;
    document.getElementById("ledger-ads").innerText = `$${adsCostSum.toFixed(2)}`;
    document.getElementById("ledger-profit").innerText = `$${netProfit.toFixed(2)}`;
}

// Visual Floating Coins / Costs
function createFloatingText(target, text, colorClass) {
    const rect = target.getBoundingClientRect();
    const floating = document.createElement("div");
    floating.className = `floating-bubble-text ${colorClass}`;
    floating.innerText = text;
    floating.style.left = `${rect.left + (rect.width / 2) - 30}px`;
    floating.style.top = `${rect.top}px`;
    
    document.body.appendChild(floating);
    
    setTimeout(() => {
        floating.remove();
    }, 1500);
}

// XP & Level Logic
function incrementXP(amount) {
    xp += amount;
    if (xp >= 100) {
        xp = 0;
        level += 1;
        document.getElementById("city-level-badge").innerText = level;
        
        // Pick new name
        const lvlName = levelNames[Math.min(level - 1, levelNames.length - 1)];
        document.getElementById("city-level-name").innerText = lvlName;
        
        addChirp("@System", `🌟 CONGRATULATIONS! City leveled up to Level ${level} (${lvlName})! Increased market reach.`, "system");
        
        // Trigger visual confetti/happiness animation
        const happinessVal = document.getElementById("city-happiness");
        happinessVal.classList.add("glow");
        setTimeout(() => {
            happinessVal.classList.remove("glow");
        }, 2000);
    }
    
    document.getElementById("city-xp-fill").style.width = `${xp}%`;
}
