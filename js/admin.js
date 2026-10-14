/**
 * TIRA Belle - Admin Panel Core Script
 * Comprehensive Sales Recording, POS Cart, Real-Time Analytics, Product Management, Loyalty Redemptions, and QR Standee
 */

// Global State
let currentCart = [];
let currentPaymentMode = 'Cash';
let activeSection = 'dashboard';
let isAuthenticated = false;

// ----------------- TOAST SYSTEM -----------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconName = 'info';
    if (type === 'success') iconName = 'circle-check';
    if (type === 'warning') iconName = 'triangle-alert';
    if (type === 'error') iconName = 'circle-x';

    const iconHtml = window.lucide ? window.lucide.renderIcon(iconName, { size: 18 }) : '';
    toast.innerHTML = `<span class="toast-icon" style="display: flex; align-items: center;">${iconHtml}</span> <div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ----------------- MOBILE SIDEBAR TOGGLE -----------------
window.toggleAdminSidebar = function() {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('adminSidebarBackdrop');
    if (!sidebar) return;
    sidebar.classList.toggle('mobile-open');
    if (backdrop) backdrop.classList.toggle('active');
};

window.closeAdminSidebar = function() {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('adminSidebarBackdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
};

window.toggleAdminMobileNav = window.toggleAdminSidebar;
window.closeAdminMobileNav = window.closeAdminSidebar;

// ----------------- DESKTOP SIDEBAR COLLAPSE / EXPAND -----------------
window.toggleSidebarCollapse = function() {
    const layout = document.getElementById('adminMainLayout');
    const sidebar = document.getElementById('adminSidebar');
    const btn = document.getElementById('sidebarCollapseBtn');
    if (!layout || !sidebar) return;

    const isCollapsed = sidebar.classList.toggle('collapsed');
    layout.classList.toggle('sidebar-collapsed', isCollapsed);

    if (btn) {
        btn.setAttribute('title', isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar');
        btn.setAttribute('aria-label', isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar');
        btn.innerHTML = isCollapsed 
            ? '<i data-lucide="chevron-right" data-size="16"></i>'
            : '<i data-lucide="chevron-left" data-size="16"></i>';
        if (window.lucide) window.lucide.createIcons();
    }

    try {
        localStorage.setItem('TIRA_SIDEBAR_COLLAPSED', isCollapsed ? 'true' : 'false');
    } catch (e) {
        console.warn('Could not save sidebar state to localStorage', e);
    }
};

window.applySavedSidebarState = function() {
    try {
        const saved = localStorage.getItem('TIRA_SIDEBAR_COLLAPSED');
        if (saved === 'true') {
            const layout = document.getElementById('adminMainLayout');
            const sidebar = document.getElementById('adminSidebar');
            const btn = document.getElementById('sidebarCollapseBtn');
            if (layout && sidebar) {
                sidebar.classList.add('collapsed');
                layout.classList.add('sidebar-collapsed');
                if (btn) {
                    btn.setAttribute('title', 'Expand Sidebar');
                    btn.setAttribute('aria-label', 'Expand Sidebar');
                    btn.innerHTML = '<i data-lucide="chevron-right" data-size="16"></i>';
                }
                if (window.lucide) window.lucide.createIcons();
            }
        }
    } catch (e) {}
};

// ----------------- AUTHENTICATION & SECURITY -----------------
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 seconds
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

let loginAttempts = 0;
let lockoutUntil = 0;
let sessionTimer = null;

function resetSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    if (isAuthenticated) {
        sessionTimer = setTimeout(() => {
            showToast('Session timed out due to 30 minutes of inactivity.', 'warning');
            window.logoutAdmin();
        }, SESSION_TIMEOUT_MS);
    }
}

// User activity listeners to keep session alive while actively using the counter
['mousedown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => resetSessionTimer(), { passive: true });
});

function checkAdminAuth() {
    const sessionAuth = sessionStorage.getItem('TIRA_ADMIN_AUTH');
    const loginTime = parseInt(sessionStorage.getItem('TIRA_ADMIN_AUTH_TIME') || '0', 10);
    const now = Date.now();

    if (sessionAuth === 'true' && (now - loginTime < SESSION_TIMEOUT_MS)) {
        isAuthenticated = true;
        sessionStorage.setItem('TIRA_ADMIN_AUTH_TIME', now.toString());
        document.getElementById('adminLoginModal').style.display = 'none';
        document.getElementById('adminMainLayout').style.display = 'grid';
        resetSessionTimer();
        initAdminApp();
    } else {
        sessionStorage.removeItem('TIRA_ADMIN_AUTH');
        sessionStorage.removeItem('TIRA_ADMIN_AUTH_TIME');
        document.getElementById('adminLoginModal').style.display = 'flex';
        document.getElementById('adminMainLayout').style.display = 'none';
    }
}

window.handleAdminLogin = async function() {
    const now = Date.now();
    if (now < lockoutUntil) {
        const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
        showToast(`Too many failed login attempts. Please wait ${remainingSec}s before retrying.`, 'error');
        return;
    }

    const user = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    if (!user || !pass) {
        showToast('Please enter both username and password/PIN.', 'warning');
        return;
    }

    const isValid = await window.TiraDB.verifyAdminCredentials(user, pass);

    if (isValid) {
        loginAttempts = 0;
        lockoutUntil = 0;
        sessionStorage.setItem('TIRA_ADMIN_AUTH', 'true');
        sessionStorage.setItem('TIRA_ADMIN_AUTH_TIME', Date.now().toString());
        isAuthenticated = true;
        document.getElementById('adminLoginModal').style.display = 'none';
        document.getElementById('adminMainLayout').style.display = 'grid';
        showToast('Welcome to TIRA Belle Admin Portal!', 'success');
        resetSessionTimer();
        initAdminApp();
    } else {
        loginAttempts++;
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
            showToast(`Too many failed attempts. Login locked for 30 seconds.`, 'error');
        } else {
            const left = MAX_LOGIN_ATTEMPTS - loginAttempts;
            showToast(`Invalid credentials. ${left} attempt${left > 1 ? 's' : ''} remaining before lockout.`, 'error');
        }
    }
};

window.logoutAdmin = function() {
    if (sessionTimer) clearTimeout(sessionTimer);
    sessionStorage.removeItem('TIRA_ADMIN_AUTH');
    sessionStorage.removeItem('TIRA_ADMIN_AUTH_TIME');
    window.location.reload();
};

// ----------------- NAVIGATION -----------------
window.switchAdminSection = function(sectionId) {
    activeSection = sectionId;
    closeAdminSidebar();

    // Update nav buttons
    document.querySelectorAll('.admin-nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.admin-nav-item')).find(b => 
        b.getAttribute('onclick') && b.getAttribute('onclick').includes(sectionId)
    );
    if (activeBtn) activeBtn.classList.add('active');

    // Update section visibility
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    const targetSec = document.getElementById(`sec-${sectionId}`);
    if (targetSec) targetSec.classList.add('active');

    // Section specific loaders
    if (sectionId === 'dashboard') loadDashboardMetrics();
    else if (sectionId === 'pos') renderPosCatalog();
    else if (sectionId === 'products') renderProductsTable();
    else if (sectionId === 'customers') renderCustomersTable();
    else if (sectionId === 'loyalty') renderAdminLoyaltyAudit();
    else if (sectionId === 'qr') renderCounterQr();
    else if (sectionId === 'settings') populateSettingsFields();

    if (window.lucide) window.lucide.createIcons();
};

function initAdminApp() {
    applySavedSidebarState();
    loadDashboardMetrics();
    renderPosCatalog();
    renderCounterQr();
    populateSettingsFields();
    if (window.lucide) window.lucide.createIcons();
}

// ----------------- SECTION 1: DASHBOARD METRICS -----------------
window.loadDashboardMetrics = function() {
    const filterSelect = document.getElementById('dashboardDateFilter');
    const filter = filterSelect ? filterSelect.value : 'today';
    const metrics = window.TiraDB.getDashboardMetrics(filter);
    const settings = window.TiraDB.getSettings();
    const curr = settings.currency || '₹';

    // Update Metric Cards
    document.getElementById('dashTotalRevenue').textContent = `${curr}${metrics.totalRevenue.toLocaleString('en-IN')}`;
    document.getElementById('dashTxnCount').textContent = `${metrics.transactionCount} completed sales`;
    document.getElementById('dashCashCollection').textContent = `${curr}${metrics.cashCollection.toLocaleString('en-IN')}`;
    document.getElementById('dashOnlineCollection').textContent = `${curr}${metrics.onlineCollection.toLocaleString('en-IN')}`;
    document.getElementById('dashTotalPaidCups').textContent = metrics.totalPaidQuantity;
    document.getElementById('dashRewardsClaimed').textContent = metrics.rewardsRedeemedCount;

    // Product Summary Table
    const summaryTag = document.getElementById('dashProductSummaryTag');
    if (summaryTag) {
        summaryTag.textContent = filter === 'today' ? "Today's Breakdown" : (filter === 'yesterday' ? "Yesterday's Breakdown" : "All Time Breakdown");
    }

    const summaryTbody = document.getElementById('dashProductSummaryTbody');
    if (summaryTbody) {
        summaryTbody.innerHTML = '';
        if (!metrics.productSummary.length) {
            summaryTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--color-text-muted);">No sales recorded for this period.</td></tr>`;
        } else {
            metrics.productSummary.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${item.name}</strong></td>
                    <td><span class="badge" style="background: var(--color-bg);">${item.weight || 'Standard'}</span></td>
                    <td>${curr}${item.price}</td>
                    <td><strong style="color: var(--color-espresso);">${item.quantity} cups</strong></td>
                    <td><strong style="color: var(--color-caramel);">${curr}${item.revenue.toLocaleString('en-IN')}</strong></td>
                `;
                summaryTbody.appendChild(tr);
            });
        }
    }

    // Recent Sales Table
    const recentTbody = document.getElementById('dashRecentSalesTbody');
    if (recentTbody) {
        recentTbody.innerHTML = '';
        if (!metrics.recentSales.length) {
            recentTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--color-text-muted);">No recent transactions found.</td></tr>`;
        } else {
            metrics.recentSales.forEach(sale => {
                const tr = document.createElement('tr');
                const itemsStr = sale.items.map(it => `${it.productName} (x${it.quantity})`).join(', ');
                const timeStr = new Date(sale.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                const dateStr = new Date(sale.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const safeName = typeof escapeHtml === 'function' ? escapeHtml(sale.customerName || 'Guest') : (sale.customerName || 'Guest');
                const safePhone = typeof escapeHtml === 'function' ? escapeHtml(sale.customerPhone) : sale.customerPhone;
                const safeItems = typeof escapeHtml === 'function' ? escapeHtml(itemsStr) : itemsStr;
                const safeId = typeof escapeHtml === 'function' ? escapeHtml(sale.id) : sale.id;

                tr.innerHTML = `
                    <td><code>${safeId}</code></td>
                    <td>${dateStr}, ${timeStr}</td>
                    <td>
                        <strong>${safeName}</strong>
                        <div style="font-size: 0.78rem; color: var(--color-text-muted);">${safePhone}</div>
                    </td>
                    <td style="max-width: 220px; font-size: 0.85rem;">${safeItems}</td>
                    <td><strong>${sale.paidCupsCount} cups</strong></td>
                    <td><strong>${curr}${sale.totalAmount}</strong></td>
                    <td>
                        <span class="badge ${sale.paymentMode === 'Cash' ? 'badge-cash' : 'badge-online'}">
                            ${sale.paymentMode}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="viewReceipt('${safeId}')" style="display: inline-flex; align-items: center; gap: 4px;">
                            <i data-lucide="file-text" data-size="14"></i>
                            <span>Receipt</span>
                        </button>
                    </td>
                `;
                recentTbody.appendChild(tr);
            });
        }
    }
    if (window.lucide) window.lucide.createIcons();
};

// ----------------- SECTION 2: POS SALES REGISTER -----------------
window.renderPosCatalog = function() {
    const catalog = document.getElementById('posProductCatalog');
    if (!catalog) return;
    const products = window.TiraDB.getProducts(true); // Active products only
    const settings = window.TiraDB.getSettings();
    const curr = settings.currency || '₹';

    catalog.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'pos-item-card';
        card.innerHTML = `
            <img src="${p.image || 'assets/tiramisu-150g.jpg'}" alt="${p.name}" class="pos-item-img" onerror="this.src='assets/tira-belle-poster.jpg'">
            <div class="pos-item-name">${p.name}</div>
            <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 6px;">Size: ${p.weight}</div>
            <div class="pos-item-price">${curr}${p.price}</div>
            <button class="btn btn-caramel btn-sm" onclick="addToCart('${p.id}')" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                <i data-lucide="plus" data-size="14"></i>
                <span>Add to Cart</span>
            </button>
        `;
        catalog.appendChild(card);
    });
    if (window.lucide) window.lucide.createIcons();
};

window.addToCart = function(productId) {
    const product = window.TiraDB.getProductById(productId);
    if (!product) return;

    const existing = currentCart.find(item => item.productId === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        currentCart.push({
            productId: product.id,
            productName: product.name,
            weight: product.weight,
            price: product.price,
            quantity: 1,
            countsTowardsLoyalty: product.countsTowardsLoyalty
        });
    }
    updateCartUI();
};

window.updateCartQty = function(productId, delta) {
    const index = currentCart.findIndex(item => item.productId === productId);
    if (index === -1) return;

    currentCart[index].quantity += delta;
    if (currentCart[index].quantity <= 0) {
        currentCart.splice(index, 1);
    }
    updateCartUI();
};

window.clearCart = function() {
    currentCart = [];
    document.getElementById('posRedeemRewardCheckbox').checked = false;
    document.getElementById('posLoyaltyAlert').classList.remove('active');
    updateCartUI();
};

function updateCartUI() {
    const itemsList = document.getElementById('cartItemsList');
    const badge = document.getElementById('cartBadgeCount');
    const settings = window.TiraDB.getSettings();
    const curr = settings.currency || '₹';

    if (!itemsList) return;

    let subtotal = 0;
    let totalCups = 0;
    let itemCount = 0;

    if (currentCart.length === 0) {
        itemsList.innerHTML = `
            <div style="text-align: center; padding: 30px 10px; color: var(--color-text-muted); font-size: 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <i data-lucide="shopping-cart" data-size="28" style="color: var(--color-text-light);"></i>
                <span>Cart is empty. Click on any product to add!</span>
            </div>
        `;
    } else {
        itemsList.innerHTML = '';
        currentCart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'cart-item-row';
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            if (item.countsTowardsLoyalty) totalCups += item.quantity;
            itemCount += item.quantity;

            row.innerHTML = `
                <div>
                    <div class="cart-item-title">${item.productName}</div>
                    <div class="cart-item-unit">${curr}${item.price} each</div>
                </div>
                <div class="cart-qty-ctrl">
                    <button class="qty-btn" onclick="updateCartQty('${item.productId}', -1)">−</button>
                    <span style="font-weight: 700; min-width: 20px; text-align: center;">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQty('${item.productId}', 1)">+</button>
                    <span style="font-weight: 700; margin-left: 10px; min-width: 48px; text-align: right;">${curr}${itemTotal}</span>
                </div>
            `;
            itemsList.appendChild(row);
        });
    }

    // Check if free reward is selected
    const isFreeRewardSelected = document.getElementById('posRedeemRewardCheckbox')?.checked;
    if (isFreeRewardSelected) {
        const rewardRow = document.createElement('div');
        rewardRow.className = 'cart-item-row';
        rewardRow.style.background = '#eafaf1';
        rewardRow.style.padding = '8px 12px';
        rewardRow.style.borderRadius = '6px';
        rewardRow.innerHTML = `
            <div>
                <div class="cart-item-title" style="color: #27ae60; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="gift" data-size="16"></i>
                    <span>1 Free 150g Tiramisu</span>
                </div>
                <div class="cart-item-unit">Loyalty Reward Redemption</div>
            </div>
            <div style="font-weight: 800; color: #27ae60;">₹0 (Free)</div>
        `;
        itemsList.appendChild(rewardRow);
    }

    badge.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
    document.getElementById('cartSubtotal').textContent = `${curr}${subtotal}`;
    document.getElementById('cartEligibleCups').textContent = `${totalCups} cup${totalCups !== 1 ? 's' : ''}`;
    document.getElementById('cartGrandTotal').textContent = `${curr}${subtotal}`;
    if (window.lucide) window.lucide.createIcons();
}

window.setPosPaymentMode = function(mode) {
    currentPaymentMode = mode;
    document.getElementById('payModeCash').classList.toggle('active', mode === 'Cash');
    document.getElementById('payModeOnline').classList.toggle('active', mode === 'Online');
};

window.handlePosPhoneInput = function(phoneVal) {
    const cleanDigits = phoneVal.replace(/\D/g, '');
    const suggestions = document.getElementById('posCustomerSuggestions');
    const alertBox = document.getElementById('posLoyaltyAlert');

    if (cleanDigits.length >= 3) {
        const matches = window.TiraDB.searchCustomer(cleanDigits);
        if (matches.length > 0) {
            suggestions.innerHTML = '';
            matches.slice(0, 5).forEach(c => {
                const item = document.createElement('div');
                item.className = 'customer-suggest-item';
                const loyalty = window.TiraDB.getCustomerLoyalty(c.phone);
                item.innerHTML = `
                    <div><strong>${c.name}</strong> • ${c.phone}</div>
                    <span class="badge ${loyalty.isEligible ? 'badge-success' : 'badge-warning'}">
                        ${loyalty.isEligible ? 'Eligible for Free Cup!' : `${loyalty.currentCycleProgress}/${loyalty.threshold} Cups`}
                    </span>
                `;
                item.onclick = () => selectPosCustomer(c);
                suggestions.appendChild(item);
            });
            suggestions.classList.add('active');
        } else {
            suggestions.classList.remove('active');
        }
    } else {
        suggestions.classList.remove('active');
    }

    // If exact 10 digits entered, check loyalty status
    if (cleanDigits.length === 10) {
        const customer = window.TiraDB.findCustomerByPhone(cleanDigits);
        if (customer) {
            document.getElementById('posCustomerName').value = customer.name;
            checkPosLoyaltyEligibility(customer.phone);
        } else {
            alertBox.classList.remove('active');
        }
    } else {
        alertBox.classList.remove('active');
    }
};

function selectPosCustomer(customer) {
    document.getElementById('posCustomerPhone').value = customer.phone;
    document.getElementById('posCustomerName').value = customer.name;
    document.getElementById('posCustomerSuggestions').classList.remove('active');
    checkPosLoyaltyEligibility(customer.phone);
}

function checkPosLoyaltyEligibility(phone) {
    const alertBox = document.getElementById('posLoyaltyAlert');
    const alertTitle = document.getElementById('posLoyaltyAlertTitle');
    const alertDesc = document.getElementById('posLoyaltyAlertDesc');
    const checkbox = document.getElementById('posRedeemRewardCheckbox');

    const loyalty = window.TiraDB.getCustomerLoyalty(phone);
    if (loyalty.isEligible) {
        alertTitle.textContent = `${loyalty.customer.name} is Eligible for 1 Free 150g Cup!`;
        alertDesc.textContent = `Total paid cups: ${loyalty.totalEligibleCups}. Customer has ${loyalty.availableRewards} unclaimed reward(s).`;
        alertBox.classList.add('active');
    } else {
        alertBox.classList.remove('active');
        checkbox.checked = false;
    }
}

window.toggleRewardInOrder = function(checked) {
    updateCartUI();
};

window.submitPosSale = function() {
    const phone = document.getElementById('posCustomerPhone').value.trim();
    const name = document.getElementById('posCustomerName').value.trim();
    const notes = document.getElementById('posSaleNotes').value.trim();
    const redeemReward = document.getElementById('posRedeemRewardCheckbox')?.checked;

    if (!phone) {
        showToast('Please enter the customer\'s phone number to record the sale.', 'warning');
        document.getElementById('posCustomerPhone').focus();
        return;
    }

    if (currentCart.length === 0 && !redeemReward) {
        showToast('Cart is empty. Please add at least one product.', 'warning');
        return;
    }

    const result = window.TiraDB.createSale({
        customerPhone: phone,
        customerName: name,
        items: currentCart,
        paymentMode: currentPaymentMode,
        notes: notes,
        redeemFreeReward: redeemReward
    });

    if (result.success) {
        showToast(`Sale recorded successfully! Total: ₹${result.sale.totalAmount}`, 'success');
        
        // Open receipt modal
        viewReceipt(result.sale.id);

        // Reset cart and inputs
        clearCart();
        document.getElementById('posCustomerPhone').value = '';
        document.getElementById('posCustomerName').value = '';
        document.getElementById('posSaleNotes').value = '';
        document.getElementById('posLoyaltyAlert').classList.remove('active');

        // Refresh dashboard metrics
        loadDashboardMetrics();
    } else {
        showToast(result.message || 'Error recording sale', 'error');
    }
};

// ----------------- RECEIPT MODAL & PRINTING -----------------
window.viewReceipt = function(saleId) {
    const sale = window.TiraDB.getSales().find(s => s.id === saleId);
    if (!sale) return;

    const settings = window.TiraDB.getSettings();
    const curr = settings.currency || '₹';
    const loyalty = window.TiraDB.getCustomerLoyalty(sale.customerPhone);

    document.getElementById('recId').textContent = sale.id;
    document.getElementById('recDate').textContent = new Date(sale.timestamp).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('recCustName').textContent = sale.customerName || 'Valued Guest';
    document.getElementById('recCustPhone').textContent = sale.customerPhone;
    document.getElementById('recPayMode').textContent = sale.paymentMode;
    document.getElementById('recGrandTotal').textContent = `${curr}${sale.totalAmount}`;

    // Items list
    const itemsContainer = document.getElementById('recItemsList');
    itemsContainer.innerHTML = '';
    sale.items.forEach(it => {
        const row = document.createElement('div');
        row.className = 'receipt-item-row';
        row.innerHTML = `
            <span>${it.productName} x ${it.quantity}</span>
            <span>${it.isReward ? 'FREE' : `${curr}${it.total || (it.price * it.quantity)}`}</span>
        `;
        itemsContainer.appendChild(row);
    });

    // Loyalty in receipt
    const loyaltyStatus = document.getElementById('recLoyaltyStatus');
    const loyaltyNote = document.getElementById('recLoyaltyNote');
    const rewardName = settings.rewardItemName || '1 Free 150g Tiramisu';
    if (loyalty.isEligible) {
        loyaltyStatus.textContent = `Loyalty Progress: ${loyalty.threshold} / ${loyalty.threshold} Cups (Eligible!)`;
        loyaltyNote.textContent = `Customer is eligible for ${rewardName}!`;
    } else {
        loyaltyStatus.textContent = `Loyalty Progress: ${loyalty.currentCycleProgress} / ${loyalty.threshold} Cups`;
        loyaltyNote.textContent = `${loyalty.purchasesRemaining} more cup(s) to unlock your free reward!`;
    }

    document.getElementById('receiptModal').classList.add('active');
    if (window.lucide) window.lucide.createIcons();
};

window.closeReceiptModal = function() {
    document.getElementById('receiptModal').classList.remove('active');
};

window.printReceipt = function() {
    window.print();
};

// ----------------- SECTION 3: PRODUCT MANAGEMENT -----------------
window.renderProductsTable = function() {
    const tbody = document.getElementById('adminProductsTableTbody');
    if (!tbody) return;
    const products = window.TiraDB.getProducts(false); // All products
    const settings = window.TiraDB.getSettings();
    const curr = settings.currency || '₹';

    tbody.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${p.image || 'assets/tiramisu-150g.jpg'}" alt="${p.name}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;" onerror="this.src='assets/tira-belle-poster.jpg'">
            </td>
            <td>
                <strong>${p.name}</strong>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); max-width: 250px;">${p.description || ''}</div>
            </td>
            <td><span class="badge" style="background: var(--color-bg);">${p.weight}</span></td>
            <td><strong>${curr}${p.price}</strong></td>
            <td>
                <span class="badge ${p.countsTowardsLoyalty ? 'badge-success' : 'badge-warning'}">
                    ${p.countsTowardsLoyalty ? 'Eligible' : 'Excluded'}
                </span>
            </td>
            <td>
                <span class="badge ${p.isActive ? 'badge-success' : 'badge-warning'}">
                    ${p.isActive ? 'Active (Live)' : 'Hidden'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')" title="Edit Product" style="display: inline-flex; align-items: center; gap: 4px;">
                        <i data-lucide="pencil" data-size="14"></i>
                        <span>Edit</span>
                    </button>
                    <button class="btn btn-outline btn-sm" style="color: #c0392b;" onclick="deleteProduct('${p.id}')" title="Delete Product" style="display: inline-flex; align-items: center; gap: 4px;">
                        <i data-lucide="trash-2" data-size="14"></i>
                        <span>Delete</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
};

window.openProductModal = function(product = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');

    if (product) {
        title.textContent = 'Edit Product';
        document.getElementById('prodEditId').value = product.id;
        document.getElementById('prodName').value = product.name;
        document.getElementById('prodWeight').value = product.weight;
        document.getElementById('prodPrice').value = product.price;
        document.getElementById('prodImage').value = product.image || '';
        document.getElementById('prodDesc').value = product.description || '';
        document.getElementById('prodActive').checked = !!product.isActive;
        document.getElementById('prodCountsLoyalty').checked = !!product.countsTowardsLoyalty;
    } else {
        title.textContent = 'Add New Product';
        document.getElementById('prodEditId').value = '';
        document.getElementById('productForm').reset();
        document.getElementById('prodActive').checked = true;
        document.getElementById('prodCountsLoyalty').checked = true;
    }
    modal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
};

window.closeProductModal = function() {
    document.getElementById('productModal').classList.remove('active');
};

window.editProduct = function(productId) {
    const p = window.TiraDB.getProductById(productId);
    if (p) openProductModal(p);
};

window.deleteProduct = function(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        window.TiraDB.deleteProduct(productId);
        showToast('Product removed.', 'info');
        renderProductsTable();
        renderPosCatalog();
    }
};

window.saveProductSubmit = function() {
    const id = document.getElementById('prodEditId').value;
    const name = document.getElementById('prodName').value.trim();
    const weight = document.getElementById('prodWeight').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value) || 0;
    const image = document.getElementById('prodImage').value.trim() || 'assets/tiramisu-150g.jpg';
    const description = document.getElementById('prodDesc').value.trim();
    const isActive = document.getElementById('prodActive').checked;
    const countsTowardsLoyalty = document.getElementById('prodCountsLoyalty').checked;

    window.TiraDB.saveProduct({
        id: id || undefined,
        name,
        weight,
        price,
        image,
        description,
        isActive,
        countsTowardsLoyalty
    });

    closeProductModal();
    showToast('Product saved successfully!', 'success');
    renderProductsTable();
    renderPosCatalog();
};

// ----------------- SECTION 4: CUSTOMER DETAILS -----------------
window.renderCustomersTable = function() {
    const tbody = document.getElementById('adminCustomersTableTbody');
    if (!tbody) return;
    const query = document.getElementById('customerSearchInput')?.value.trim() || '';
    const customers = window.TiraDB.getCustomers();
    const sales = window.TiraDB.getSales();
    const settings = window.TiraDB.getSettings();
    const curr = settings.currency || '₹';

    const filtered = customers.filter(c => {
        if (!query) return true;
        return c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query);
    });

    tbody.innerHTML = '';
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">No customers found matching search query.</td></tr>`;
        return;
    }

    filtered.forEach(c => {
        const loyalty = window.TiraDB.getCustomerLoyalty(c.phone);
        const custSales = sales.filter(s => s.customerPhone === c.phone);
        const totalSpend = custSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const safeName = typeof escapeHtml === 'function' ? escapeHtml(c.name) : c.name;
        const safePhone = typeof escapeHtml === 'function' ? escapeHtml(c.phone) : c.phone;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${safeName}</strong></td>
            <td><code>${safePhone}</code></td>
            <td><strong>${loyalty.totalEligibleCups} cups</strong></td>
            <td><strong>${curr}${totalSpend.toLocaleString('en-IN')}</strong></td>
            <td>
                <span class="badge ${loyalty.isEligible ? 'badge-success' : 'badge-warning'}">
                    ${loyalty.isEligible ? 'Eligible for Free Reward' : `${loyalty.currentCycleProgress}/${loyalty.threshold} Cups`}
                </span>
            </td>
            <td>${loyalty.claimedCount} free cup${loyalty.claimedCount !== 1 ? 's' : ''}</td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="viewCustomerHistory('${safePhone}')" style="display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="history" data-size="14"></i>
                    <span>History</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
};

window.viewCustomerHistory = function(phone) {
    const loyalty = window.TiraDB.getCustomerLoyalty(phone);
    const settings = window.TiraDB.getSettings();
    const curr = settings.currency || '₹';

    document.getElementById('custModalName').textContent = loyalty.customer.name;
    document.getElementById('custModalPhone').textContent = `Phone: ${loyalty.customer.phone}`;

    const totalSpend = loyalty.salesHistory.reduce((acc, s) => acc + s.totalAmount, 0);
    document.getElementById('custModalTotalSpend').textContent = `${curr}${totalSpend.toLocaleString('en-IN')}`;
    document.getElementById('custModalPaidCups').textContent = `${loyalty.totalEligibleCups} Cups`;
    document.getElementById('custModalStatus').textContent = loyalty.isEligible ? 'ELIGIBLE!' : `${loyalty.currentCycleProgress}/${loyalty.threshold}`;

    const list = document.getElementById('custModalTxnList');
    list.innerHTML = '';
    if (loyalty.salesHistory.length === 0) {
        list.innerHTML = `<p style="color: var(--color-text-muted); font-size: 0.9rem;">No transactions recorded for this customer yet.</p>`;
    } else {
        loyalty.salesHistory.forEach(s => {
            const dateStr = new Date(s.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const itemNames = s.items.map(it => `${it.productName} (x${it.quantity})`).join(', ');
            const card = document.createElement('div');
            card.className = 'history-item';
            card.innerHTML = `
                <div>
                    <div><strong>${s.id}</strong> • <span style="font-size: 0.8rem; color: var(--color-text-muted);">${dateStr}</span></div>
                    <div style="font-size: 0.85rem; color: var(--color-text-main); margin-top: 2px;">${itemNames}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 800; color: var(--color-espresso);">${curr}${s.totalAmount}</div>
                    <span class="badge ${s.paymentMode === 'Cash' ? 'badge-cash' : 'badge-online'}" style="font-size: 0.7rem;">${s.paymentMode}</span>
                </div>
            `;
            list.appendChild(card);
        });
    }

    document.getElementById('customerHistoryModal').classList.add('active');
};

window.closeCustomerModal = function() {
    document.getElementById('customerHistoryModal').classList.remove('active');
};

window.exportCustomersCSV = function() {
    const customers = window.TiraDB.getCustomers();
    const sales = window.TiraDB.getSales();

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Customer Name,Phone,Total Paid Cups,Total Spend (INR),Current Cycle Progress,Threshold,Eligible For Free Reward,Total Rewards Claimed\n";

    customers.forEach(c => {
        const loyalty = window.TiraDB.getCustomerLoyalty(c.phone);
        const custSales = sales.filter(s => s.customerPhone === c.phone);
        const totalSpend = custSales.reduce((acc, s) => acc + s.totalAmount, 0);
        csvContent += `"${c.name}","${c.phone}",${loyalty.totalEligibleCups},${totalSpend},${loyalty.currentCycleProgress},${loyalty.threshold},${loyalty.isEligible ? 'YES' : 'NO'},${loyalty.claimedCount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tira_belle_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Customer records exported to CSV.', 'success');
};

// ----------------- SECTION 5: CUSTOMER LOYALTY TRACKER (ADMIN) -----------------
window.adminTrackLoyalty = function() {
    const query = document.getElementById('adminLoyaltySearchInput').value.trim();
    if (!query) {
        showToast('Please enter a phone number or customer name.', 'warning');
        return;
    }

    let customer = null;
    const cleanDigits = query.replace(/\D/g, '');
    if (cleanDigits.length >= 10) {
        customer = window.TiraDB.findCustomerByPhone(cleanDigits);
    } else {
        const matches = window.TiraDB.searchCustomer(query);
        if (matches.length > 0) customer = matches[0];
    }

    if (!customer) {
        showToast('Customer record not found.', 'warning');
        return;
    }

    renderAdminLoyaltyCard(customer.phone);
};

function renderAdminLoyaltyCard(phone) {
    const resultBox = document.getElementById('adminLoyaltyResult');
    const loyalty = window.TiraDB.getCustomerLoyalty(phone);

    document.getElementById('admResCustName').textContent = loyalty.customer.name;
    document.getElementById('admResCustPhone').textContent = `Phone: ${loyalty.customer.phone}`;

    // Redeem Action Button
    const actionContainer = document.getElementById('admResRedeemAction');
    if (loyalty.isEligible) {
        actionContainer.innerHTML = `
            <button class="btn btn-caramel btn-lg" onclick="triggerAdminRedemption('${loyalty.customer.phone}')" style="display: inline-flex; align-items: center; gap: 8px;">
                <i data-lucide="gift" data-size="18"></i>
                <span>Redeem 1 Free 150g Tiramisu Now</span>
            </button>
        `;
    } else {
        actionContainer.innerHTML = `
            <button class="btn btn-outline" disabled style="opacity: 0.6; cursor: not-allowed; display: inline-flex; align-items: center; gap: 8px;">
                <i data-lucide="lock" data-size="16"></i>
                <span>Not Eligible (Needs ${loyalty.purchasesRemaining} more cups)</span>
            </button>
        `;
    }

    // Status Alert Box
    const statusBox = document.getElementById('admResStatusBox');
    const icon = document.getElementById('admResIcon');
    const title = document.getElementById('admResTitle');
    const desc = document.getElementById('admResDesc');

    if (loyalty.isEligible) {
        statusBox.className = 'loyalty-status-banner status-eligible';
        icon.innerHTML = '<i data-lucide="award" data-size="28"></i>';
        title.textContent = `Eligible for ${window.TiraDB.getSettings().rewardItemName || 'Free 150g Tiramisu'}!`;
        desc.textContent = `Customer completed all ${loyalty.threshold} cups! Click the button above to record the free dessert redemption.`;
    } else {
        statusBox.className = 'loyalty-status-banner status-in-progress';
        icon.innerHTML = '<i data-lucide="coffee" data-size="28"></i>';
        title.textContent = `${loyalty.purchasesRemaining} Cups Remaining`;
        desc.textContent = `Customer has purchased ${loyalty.currentCycleProgress} out of ${loyalty.threshold} cups in the current reward cycle.`;
    }

    // Stamps Visual
    const stampsGrid = document.getElementById('admResStampsGrid');
    stampsGrid.innerHTML = '';
    const threshold = loyalty.threshold || 5;
    const current = loyalty.isEligible ? threshold : loyalty.currentCycleProgress;

    for (let i = 1; i <= threshold; i++) {
        const isStamped = i <= current;
        const isFinal = i === threshold;
        const box = document.createElement('div');
        box.className = `stamp-box-large ${isStamped ? (isFinal && loyalty.isEligible ? 'filled-reward' : 'filled') : ''}`;
        
        let stampIconHtml;
        if (isFinal) {
            stampIconHtml = (isStamped && loyalty.isEligible)
                ? '<i data-lucide="gift" data-size="26"></i>'
                : '<i data-lucide="award" data-size="26"></i>';
        } else {
            stampIconHtml = isStamped
                ? '<i data-lucide="coffee" data-size="26"></i>'
                : '<span style="display:inline-block; width:14px; height:14px; border-radius:50%; border:2px solid var(--color-border);"></span>';
        }

        box.innerHTML = `
            <div class="stamp-img">${stampIconHtml}</div>
            <div class="stamp-num-badge">${isFinal ? 'FREE CUP' : `Cup #${i}`}</div>
        `;
        stampsGrid.appendChild(box);
    }

    // Stats
    document.getElementById('admResTotalCups').textContent = loyalty.totalEligibleCups;
    document.getElementById('admResNeededCups').textContent = loyalty.purchasesRemaining;
    document.getElementById('admResClaimedCount').textContent = loyalty.claimedCount;

    // Redemptions History
    const list = document.getElementById('admResRedemptionsList');
    list.innerHTML = '';
    if (loyalty.redemptions.length === 0) {
        list.innerHTML = `<div style="font-size: 0.85rem; color: var(--color-text-muted);">No rewards redeemed yet.</div>`;
    } else {
        loyalty.redemptions.forEach(r => {
            const dateStr = new Date(r.redeemedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div>
                    <strong>${r.rewardItem}</strong> • <span style="font-size: 0.8rem; color: var(--color-text-muted);">${dateStr}</span>
                    <div style="font-size: 0.75rem; color: var(--color-text-light);">Staff: ${r.adminUser} • ${r.notes || 'In-store'}</div>
                </div>
                <span class="badge badge-success">Claimed</span>
            `;
            list.appendChild(item);
        });
    }

    resultBox.style.display = 'block';
    if (window.lucide) window.lucide.createIcons();
}

window.triggerAdminRedemption = function(phone) {
    if (confirm('Confirm redemption of 1 Free 150g Tiramisu Cup for this customer?')) {
        const res = window.TiraDB.redeemReward(phone, 'admin', 'Counter Claim');
        if (res.success) {
            showToast(res.message, 'success');
            renderAdminLoyaltyCard(phone);
            renderAdminLoyaltyAudit();
            loadDashboardMetrics();
        } else {
            showToast(res.message, 'error');
        }
    }
};

window.renderAdminLoyaltyAudit = function() {
    const tbody = document.getElementById('adminAllRedemptionsTbody');
    if (!tbody) return;
    const redemptions = window.TiraDB.getRedemptions();

    tbody.innerHTML = '';
    if (!redemptions.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">No reward redemptions recorded yet.</td></tr>`;
        return;
    }

    redemptions.forEach(r => {
        const dateStr = new Date(r.redeemedAt).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const safeId = typeof escapeHtml === 'function' ? escapeHtml(r.id) : r.id;
        const safeName = typeof escapeHtml === 'function' ? escapeHtml(r.customerName) : r.customerName;
        const safePhone = typeof escapeHtml === 'function' ? escapeHtml(r.customerPhone) : r.customerPhone;
        const safeItem = typeof escapeHtml === 'function' ? escapeHtml(r.rewardItem) : r.rewardItem;
        const safeNotes = typeof escapeHtml === 'function' ? escapeHtml(r.notes || 'Counter Claim') : (r.notes || 'Counter Claim');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${safeId}</code></td>
            <td>${dateStr}</td>
            <td><strong>${safeName}</strong></td>
            <td>${safePhone}</td>
            <td><strong style="color: #27ae60;">${safeItem}</strong></td>
            <td>${r.adminUser}</td>
            <td>${safeNotes}</td>
        `;
        tbody.appendChild(tr);
    });
};

// ----------------- SECTION 6: COUNTER QR STANDEE -----------------
window.renderCounterQr = function() {
    const qrContainer = document.getElementById('standeeQrContainer');
    if (!qrContainer) return;

    // Target URL: tracker.html on the current origin/path
    const trackerUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/tracker.html';

    qrContainer.innerHTML = '';
    if (window.QRCode) {
        new window.QRCode(qrContainer, {
            text: trackerUrl,
            width: 200,
            height: 200,
            colorDark: "#24140e",
            colorLight: "#ffffff"
        });
    }
};

window.printStandee = function() {
    window.print();
};

// ----------------- SECTION 7: SETTINGS -----------------
function updateStandeeAndHelpTexts(threshold, rewardItem) {
    const standeeTitle = document.getElementById('standeeOfferTitle');
    if (standeeTitle) {
        standeeTitle.innerHTML = `Buy ${threshold} Tiramisu Cups,<br>Get ${rewardItem}!`;
    }
    const helpEl = document.getElementById('setLoyaltyRuleHelp');
    if (helpEl) {
        helpEl.textContent = `Current rule: ${threshold} cups earns ${rewardItem}`;
    }
}

function populateSettingsFields() {
    const s = window.TiraDB.getSettings();
    document.getElementById('setBusinessName').value = s.businessName || 'TIRA Belle';
    document.getElementById('setTagline').value = s.tagline || '';
    document.getElementById('setOwnerName').value = s.owner || 'Yash Chauhan';
    document.getElementById('setPhone').value = s.phone || '9373484198';
    document.getElementById('setUpiId').value = s.upiId || '9373484198@upi';

    const threshold = s.loyaltyThreshold || 5;
    const rewardItem = s.rewardItemName || '1 Free 150g Tiramisu Cup';
    document.getElementById('setLoyaltyThreshold').value = threshold;
    document.getElementById('setRewardItemName').value = rewardItem;

    document.getElementById('setAdminUser').value = s.adminUsername || 'admin';
    document.getElementById('setAdminPin').value = '';
    document.getElementById('setAdminPin').placeholder = 'Enter new 4-digit PIN to change';

    updateStandeeAndHelpTexts(threshold, rewardItem);
}

window.saveBusinessSettings = function() {
    window.TiraDB.updateSettings({
        businessName: document.getElementById('setBusinessName').value.trim(),
        tagline: document.getElementById('setTagline').value.trim(),
        owner: document.getElementById('setOwnerName').value.trim(),
        phone: document.getElementById('setPhone').value.trim(),
        upiId: document.getElementById('setUpiId').value.trim()
    });
    showToast('Business details updated successfully!', 'success');
};

window.saveLoyaltySettings = function() {
    const threshold = parseInt(document.getElementById('setLoyaltyThreshold').value, 10) || 5;
    const rewardItem = document.getElementById('setRewardItemName').value.trim();

    window.TiraDB.updateSettings({
        loyaltyThreshold: threshold,
        rewardItemName: rewardItem
    });
    updateStandeeAndHelpTexts(threshold, rewardItem);
    renderCustomersTable();
    loadDashboardMetrics();
    showToast('Loyalty program rules saved! Updated across system.', 'success');
};

window.saveCredentialsSettings = async function() {
    const user = document.getElementById('setAdminUser').value.trim();
    const pass = document.getElementById('setAdminPass').value.trim();
    const pin = document.getElementById('setAdminPin').value.trim();

    if (!user) {
        showToast('Admin username cannot be blank.', 'warning');
        return;
    }

    await window.TiraDB.updateCredentials({
        username: user,
        password: pass || undefined,
        pin: pin || undefined
    });

    showToast('Admin credentials securely updated with SHA-256 hash!', 'success');
    document.getElementById('setAdminPass').value = '';
    document.getElementById('setAdminPin').value = '';
};

window.downloadBackup = function() {
    const jsonStr = window.TiraDB.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tira_belle_database_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Database exported successfully!', 'success');
};

window.importBackup = function(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const res = window.TiraDB.importDatabaseJSON(e.target.result);
        if (res.success) {
            showToast('Database restored! Reloading application...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast(res.message, 'error');
        }
    };
    reader.readAsText(file);
};

window.resetDemoData = function() {
    if (confirm('Are you sure you want to reset all data back to the default demo state? All custom transactions will be replaced with initial demo records.')) {
        window.TiraDB.resetToDemoData();
        showToast('Data reset to default demo records.', 'info');
        setTimeout(() => window.location.reload(), 1000);
    }
};

// ----------------- STARTUP -----------------
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
});
