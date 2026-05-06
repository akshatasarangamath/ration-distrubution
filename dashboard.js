document.addEventListener("DOMContentLoaded", () => {

console.log("Dashboard JS Loaded");

const STORAGE_KEY = "customers";
const OFFLINE_QUEUE_KEY = "offlineQueue";

let customers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const form = document.getElementById("customerForm");
const table = document.getElementById("customerTableBody");
const search = document.getElementById("searchInput");
const filterCardType = document.getElementById("filterCardType");

const total = document.getElementById("totalCustomers");
const received = document.getElementById("receivedCount");
const pending = document.getElementById("pendingCount");
const offline = document.getElementById("offlineCount");
const aplCount = document.getElementById("aplCount");
const bplCount = document.getElementById("bplCount");
const antCount = document.getElementById("antCount");

const networkStatus = document.getElementById("networkStatus");
const syncBtn = document.getElementById("syncBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const currentMonthEl = document.getElementById("currentMonth");
const monthlyNotice = document.getElementById("monthlyNotice");
const rationInfo = document.getElementById("rationInfo");
const rationQuotaText = document.getElementById("rationQuotaText");
const maxQtyHint = document.getElementById("maxQtyHint");
const cardTypeSelect = document.getElementById("cardTypeSelect");
const quantityInput = document.getElementById("quantityInput");

// ── Auth ──
const user = JSON.parse(localStorage.getItem("currentUser"));
if (!user) window.location.href = "index.html";
userInfo.innerText = `👤 ${user.username}`;

// ── Month ──
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
currentMonthEl.innerText = now.toLocaleString("default", { month: "long", year: "numeric" });

// ── Ration Quotas ──
const RATION_QUOTA = {
    APL:       { Rice: 3,  Wheat: 2,  Sugar: 1, Oil: 1, Dal: 1, Salt: 1 },
    BPL:       { Rice: 5,  Wheat: 4,  Sugar: 2, Oil: 1, Dal: 2, Salt: 1 },
    Antyodaya: { Rice: 14, Wheat: 21, Sugar: 3, Oil: 2, Dal: 3, Salt: 2 }
};

const MAX_QTY = { APL: 8, BPL: 15, Antyodaya: 45 };

// ── Storage ──
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function getOfflineQueue() {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
}

function saveOfflineQueue(q) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
}

function addToOfflineQueue(record) {
    const q = getOfflineQueue();
    q.push(record);
    saveOfflineQueue(q);
}

// ── Render ──
function render(data) {
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#aaa;">No records found</td></tr>`;
        return;
    }
    data.forEach(c => {
        const syncStatus = c.offline
            ? `<span class="sync-dot sync-pending">⏳ Pending</span>`
            : `<span class="sync-dot sync-ok">✅ Synced</span>`;
        table.innerHTML += `
        <tr>
          <td>${c.id}</td>
          <td>${c.name}</td>
          <td>${c.ration}</td>
          <td>${c.phone}</td>
          <td><span class="badge badge-${c.cardType}">${c.cardType}</span></td>
          <td>${c.product.join(", ")}</td>
          <td>${c.quantity} kg</td>
          <td>${c.status}</td>
          <td>${c.month}</td>
          <td>${c.time}</td>
          <td>${syncStatus}</td>
          <td><button onclick="del(${c.id})">Delete</button></td>
        </tr>`;
    });
}

// ── Cards ──
function updateCards() {
    total.innerText = customers.length;
    received.innerText = customers.filter(c => c.status === "Received").length;
    pending.innerText = customers.filter(c => c.status === "Pending").length;
    offline.innerText = customers.filter(c => c.offline).length;
    aplCount.innerText = customers.filter(c => c.cardType === "APL").length;
    bplCount.innerText = customers.filter(c => c.cardType === "BPL").length;
    antCount.innerText = customers.filter(c => c.cardType === "Antyodaya").length;
}

// ── Card Type Change → Show Quota ──
cardTypeSelect.addEventListener("change", () => {
    const type = cardTypeSelect.value;
    if (!type) {
        rationInfo.style.display = "none";
        maxQtyHint.innerText = "";
        return;
    }
    const quota = RATION_QUOTA[type];
    const maxQty = MAX_QTY[type];
    rationQuotaText.innerText = Object.entries(quota).map(([item, kg]) => `${item}: ${kg}kg`).join(", ");
    rationInfo.style.display = "block";
    maxQtyHint.innerText = `⚠️ Max allowed quantity this month: ${maxQty} kg`;
    quantityInput.max = maxQty;
});

// ── Monthly Restriction ──
function checkMonthlyRestriction(rationNo) {
    return customers.find(c =>
        c.ration === rationNo &&
        c.month === currentMonth &&
        c.status === "Received"
    );
}

// ── Form Submit ──
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const cardType = cardTypeSelect.value;
    const rationNo = document.getElementById("rationNumber").value.trim();
    const qty = parseFloat(quantityInput.value);
    const maxQty = MAX_QTY[cardType];
    const status = document.getElementById("statusSelect").value;

    // Monthly restriction check
    if (status === "Received") {
        const existing = checkMonthlyRestriction(rationNo);
        if (existing) {
            monthlyNotice.style.display = "block";
            monthlyNotice.innerText = `⚠️ Ration already distributed to "${rationNo}" this month. Cannot add again.`;
            return;
        }
    }

    monthlyNotice.style.display = "none";

    // Quantity limit check
    if (qty > maxQty) {
        alert(`❌ Quantity exceeds the allowed limit of ${maxQty} kg for ${cardType} card.`);
        return;
    }

    const products = [...document.querySelectorAll(".productCheckbox:checked")].map(cb => cb.value);
    if (products.length === 0) {
        alert("Please select at least one product.");
        return;
    }

    const isOffline = !navigator.onLine;

    const obj = {
        id: Date.now(),
        name: document.getElementById("customerName").value.trim(),
        ration: rationNo,
        phone: document.getElementById("phoneNumber").value.trim(),
        cardType: cardType,
        product: products,
        quantity: qty,
        status: status,
        month: currentMonth,
        time: new Date().toLocaleString(),
        offline: isOffline
    };

    // ✅ Only queue for sync if currently offline
    if (isOffline) {
        addToOfflineQueue(obj);
    }

    customers.push(obj);
    save();
    renderFiltered();
    updateCards();
    form.reset();
    rationInfo.style.display = "none";
    maxQtyHint.innerText = "";
});

// ── Delete ──
window.del = function(id) {
    customers = customers.filter(c => c.id !== id);
    save();
    renderFiltered();
    updateCards();
};

// ── Search + Filter ──
function renderFiltered() {
    const val = search.value.toLowerCase();
    const cardFilter = filterCardType.value;
    let filtered = customers;
    if (val) {
        filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(val) ||
            c.ration.toLowerCase().includes(val)
        );
    }
    if (cardFilter !== "All") {
        filtered = filtered.filter(c => c.cardType === cardFilter);
    }
    render(filtered);
}

search.addEventListener("input", renderFiltered);
filterCardType.addEventListener("change", renderFiltered);

// ── Network Status + Sync Button State ──
function updateNetwork() {
    if (navigator.onLine) {
        networkStatus.innerText = "🟢 Online";
        syncBtn.disabled = false;
        syncBtn.title = "Click to sync offline records";
        // ✅ Auto sync only triggers when coming back online
        autoSync();
    } else {
        networkStatus.innerText = "🔴 Offline";
        syncBtn.disabled = true;
        syncBtn.title = "Cannot sync while offline";
    }
}

window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);

// ✅ AUTO SYNC — only runs when online
function autoSync() {
    if (!navigator.onLine) return; // double-check guard

    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`Auto-syncing ${queue.length} offline record(s)...`);

    customers = customers.map(c => ({ ...c, offline: false }));
    save();
    saveOfflineQueue([]);
    updateCards();
    renderFiltered();

    const notice = document.createElement("div");
    notice.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: #27ae60; color: white;
        padding: 12px 20px; border-radius: 8px;
        font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
    `;
    notice.innerText = `✅ ${queue.length} record(s) auto-synced!`;
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 3000);
}

// ✅ MANUAL SYNC — only works when online
syncBtn.onclick = () => {
    if (!navigator.onLine) {
        alert("❌ You are offline. Please connect to the internet to sync.");
        return;
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
        alert("✅ Everything is already synced!");
        return;
    }

    customers = customers.map(c => ({ ...c, offline: false }));
    save();
    saveOfflineQueue([]);
    updateCards();
    renderFiltered();
    alert(`✅ ${queue.length} record(s) synced successfully!`);
};

// ── Logout ──
logoutBtn.onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
};

// ── Init ──
function init() {
    updateNetwork();
    renderFiltered();
    updateCards();
}

init();

});