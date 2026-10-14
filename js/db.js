/**
 * TIRA Belle - Central Database & Business Rules Engine
 * Handles Data Persistence (localStorage), Transactions, Customers, Loyalty Calculations, and Settings.
 */

const STORAGE_KEY = 'TIRA_BELLE_DATA_V1';

// Cryptographic Salt & Default Credential Hashes
const CREDENTIAL_SALT = 'TIRABELLE_SALT_2026';

/**
 * Robust HTML escaping to prevent XSS across template renderings
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * SHA-256 Web Crypto hashing for credentials with salt
 */
async function hashCredential(value, salt = CREDENTIAL_SALT) {
    if (!value) return '';
    const input = String(value) + salt;
    if (window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder();
        const data = enc.encode(input);
        const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback simple numeric hash if Web Crypto unavailable (offline legacy fallback)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
}

const DEFAULT_SETTINGS = {
    businessName: 'TIRA Belle',
    tagline: 'Little Layers • Big Love',
    slogan: 'Layers of Love in Every Spoon',
    owner: 'Yash Chauhan',
    phone: '9373484198',
    whatsapp: '9373484198',
    address: 'Physical Dessert Studio & Artisan Counter',
    upiId: '9373484198@upi',
    currency: '₹',
    loyaltyThreshold: 5,
    rewardItemName: '1 Free 150g Tiramisu Cup',
    adminUsername: 'admin',
    // SHA-256('tirabelle123' + 'TIRABELLE_SALT_2026')
    adminPasswordHash: 'f2af6949747f4753b33ecc567ba642802ae0e95556ba8f865598d2c7e04cb630',
    // SHA-256('1234' + 'TIRABELLE_SALT_2026')
    adminPinHash: '155f412e269b4f6d0d8a32c70e51824a482f2fce558d1b5b2175368ab2611af0'
};

const DEFAULT_PRODUCTS = [
    {
        id: 'prod-150',
        name: 'Tiramisu – 150 g',
        shortName: '150 g Cup',
        price: 150,
        weight: '150 g',
        description: 'Handcrafted espresso-soaked savoiardi ladyfingers, velvety mascarpone cream, finished with rich Belgian cocoa dust.',
        image: 'assets/tiramisu-150g.jpg',
        badge: 'Classic Single Serve',
        countsTowardsLoyalty: true,
        isActive: true,
        createdAt: '2026-10-01T10:00:00.000Z'
    },
    {
        id: 'prod-350',
        name: 'Tiramisu – 350 g',
        shortName: '350 g Sharing Tub',
        price: 220,
        weight: '350 g',
        description: 'Generous sharing tub layered with double mascarpone cream, dark chocolate curls, and rich espresso goodness.',
        image: 'assets/tiramisu-350g.jpg',
        badge: 'Best Value • Sharing Tub',
        countsTowardsLoyalty: true,
        isActive: true,
        createdAt: '2026-10-01T10:00:00.000Z'
    }
];

// Helper to format ISO date to Local Indian Time
function getTodayDateString(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().split('T')[0];
}

const DEFAULT_CUSTOMERS = [];
const DEFAULT_SALES = [];
const DEFAULT_REDEMPTIONS = [];

const DEMO_CUSTOMERS = [
    {
        phone: '9876543210',
        name: 'Jay',
        createdAt: '2026-09-15T11:20:00.000Z'
    },
    {
        phone: '9822012345',
        name: 'Priya Sharma',
        createdAt: '2026-10-02T14:30:00.000Z'
    },
    {
        phone: '9845098765',
        name: 'Rahul Verma',
        createdAt: '2026-09-10T16:45:00.000Z'
    },
    {
        phone: '9765432109',
        name: 'Aisha Patel',
        createdAt: '2026-10-14T09:15:00.000Z'
    }
];

// Demo sample sales for optional testing
const DEMO_SALES = [
    // --- Jay's 5 Transactions ---
    {
        id: 'TXN-1001',
        customerPhone: '9876543210',
        customerName: 'Jay',
        items: [
            { productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 1, isReward: false }
        ],
        subtotal: 150,
        discount: 0,
        totalAmount: 150,
        paymentMode: 'Online',
        paidCupsCount: 1,
        timestamp: '2026-09-15T11:25:00.000Z',
        date: '2026-09-15',
        notes: 'First purchase'
    },
    {
        id: 'TXN-1002',
        customerPhone: '9876543210',
        customerName: 'Jay',
        items: [
            { productId: 'prod-350', productName: 'Tiramisu – 350 g', price: 220, quantity: 2, isReward: false }
        ],
        subtotal: 440,
        discount: 0,
        totalAmount: 440,
        paymentMode: 'Cash',
        paidCupsCount: 2,
        timestamp: '2026-09-22T15:10:00.000Z',
        date: '2026-09-22',
        notes: 'Second purchase'
    },
    {
        id: 'TXN-1003',
        customerPhone: '9876543210',
        customerName: 'Jay',
        items: [
            { productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 2, isReward: false }
        ],
        subtotal: 300,
        discount: 0,
        totalAmount: 300,
        paymentMode: 'Online',
        paidCupsCount: 2,
        timestamp: '2026-10-01T14:20:00.000Z',
        date: '2026-10-01',
        notes: 'Third purchase'
    },
    {
        id: 'TXN-1004',
        customerPhone: '9876543210',
        customerName: 'Jay',
        items: [
            { productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 1, isReward: false }
        ],
        subtotal: 150,
        discount: 0,
        totalAmount: 150,
        paymentMode: 'Online',
        paidCupsCount: 1,
        timestamp: '2026-10-08T16:00:00.000Z',
        date: '2026-10-08',
        notes: 'Fourth purchase'
    },
    {
        id: 'TXN-1005',
        customerPhone: '9876543210',
        customerName: 'Jay',
        items: [
            { productId: 'prod-350', productName: 'Tiramisu – 350 g', price: 220, quantity: 2, isReward: false }
        ],
        subtotal: 440,
        discount: 0,
        totalAmount: 440,
        paymentMode: 'Cash',
        paidCupsCount: 2,
        timestamp: new Date().toISOString(),
        date: getTodayDateString(0),
        notes: 'Fifth purchase! Reached 5 completed transactions, eligible for reward!'
    },

    // --- Priya Sharma: 3 Transactions ---
    {
        id: 'TXN-1006',
        customerPhone: '9822012345',
        customerName: 'Priya Sharma',
        items: [
            { productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 1, isReward: false }
        ],
        subtotal: 150,
        discount: 0,
        totalAmount: 150,
        paymentMode: 'Online',
        paidCupsCount: 1,
        timestamp: '2026-10-02T14:30:00.000Z',
        date: '2026-10-02',
        notes: 'First purchase'
    },
    {
        id: 'TXN-1007',
        customerPhone: '9822012345',
        customerName: 'Priya Sharma',
        items: [
            { productId: 'prod-350', productName: 'Tiramisu – 350 g', price: 220, quantity: 1, isReward: false }
        ],
        subtotal: 220,
        discount: 0,
        totalAmount: 220,
        paymentMode: 'Online',
        paidCupsCount: 1,
        timestamp: '2026-10-07T17:00:00.000Z',
        date: '2026-10-07',
        notes: 'Second purchase'
    },
    {
        id: 'TXN-1008',
        customerPhone: '9822012345',
        customerName: 'Priya Sharma',
        items: [
            { productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 1, isReward: false }
        ],
        subtotal: 150,
        discount: 0,
        totalAmount: 150,
        paymentMode: 'Cash',
        paidCupsCount: 1,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        date: getTodayDateString(0),
        notes: 'Third purchase (3/5)'
    },

    // --- Rahul Verma: 7 Transactions (Claimed 1 reward, now at 2/5 toward next reward) ---
    {
        id: 'TXN-1009',
        customerPhone: '9845098765',
        customerName: 'Rahul Verma',
        items: [{ productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 2, isReward: false }],
        subtotal: 300, discount: 0, totalAmount: 300, paymentMode: 'Cash', paidCupsCount: 2,
        timestamp: '2026-09-02T11:00:00.000Z', date: '2026-09-02', notes: 'Txn 1'
    },
    {
        id: 'TXN-1010',
        customerPhone: '9845098765',
        customerName: 'Rahul Verma',
        items: [{ productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 1, isReward: false }],
        subtotal: 150, discount: 0, totalAmount: 150, paymentMode: 'Cash', paidCupsCount: 1,
        timestamp: '2026-09-07T12:00:00.000Z', date: '2026-09-07', notes: 'Txn 2'
    },
    {
        id: 'TXN-1011',
        customerPhone: '9845098765',
        customerName: 'Rahul Verma',
        items: [{ productId: 'prod-350', productName: 'Tiramisu – 350 g', price: 220, quantity: 2, isReward: false }],
        subtotal: 440, discount: 0, totalAmount: 440, paymentMode: 'Online', paidCupsCount: 2,
        timestamp: '2026-09-12T15:00:00.000Z', date: '2026-09-12', notes: 'Txn 3'
    },
    {
        id: 'TXN-1012',
        customerPhone: '9845098765',
        customerName: 'Rahul Verma',
        items: [{ productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 1, isReward: false }],
        subtotal: 150, discount: 0, totalAmount: 150, paymentMode: 'Cash', paidCupsCount: 1,
        timestamp: '2026-09-17T18:00:00.000Z', date: '2026-09-17', notes: 'Txn 4'
    },
    {
        id: 'TXN-1013',
        customerPhone: '9845098765',
        customerName: 'Rahul Verma',
        items: [{ productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 2, isReward: false }],
        subtotal: 300, discount: 0, totalAmount: 300, paymentMode: 'Online', paidCupsCount: 2,
        timestamp: '2026-09-21T19:00:00.000Z', date: '2026-09-21', notes: 'Txn 5 (Completed 5 txns! Claimed reward on Sept 22)'
    },
    {
        id: 'TXN-1014',
        customerPhone: '9845098765',
        customerName: 'Rahul Verma',
        items: [{ productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 2, isReward: false }],
        subtotal: 300, discount: 0, totalAmount: 300, paymentMode: 'Cash', paidCupsCount: 2,
        timestamp: '2026-10-01T16:30:00.000Z', date: '2026-10-01', notes: 'Txn 6 (Cycle 2, 1/5)'
    },
    {
        id: 'TXN-1015',
        customerPhone: '9845098765',
        customerName: 'Rahul Verma',
        items: [{ productId: 'prod-350', productName: 'Tiramisu – 350 g', price: 220, quantity: 2, isReward: false }],
        subtotal: 440, discount: 0, totalAmount: 440, paymentMode: 'Online', paidCupsCount: 2,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), date: getTodayDateString(0), notes: 'Txn 7 (Cycle 2, 2/5)'
    },

    // --- Aisha Patel: 1 Transaction ---
    {
        id: 'TXN-1016',
        customerPhone: '9765432109',
        customerName: 'Aisha Patel',
        items: [
            { productId: 'prod-150', productName: 'Tiramisu – 150 g', price: 150, quantity: 1, isReward: false }
        ],
        subtotal: 150,
        discount: 0,
        totalAmount: 150,
        paymentMode: 'Cash',
        paidCupsCount: 1,
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        date: getTodayDateString(0),
        notes: 'First purchase'
    }
];

// Rahul claimed 1 reward in the past (demo)
const DEMO_REDEMPTIONS = [
    {
        id: 'RDM-501',
        customerPhone: '9845098765',
        customerName: 'Rahul Verma',
        rewardItem: '1 Free 150g Tiramisu Cup',
        redeemedAt: '2026-09-22T18:00:00.000Z',
        date: '2026-09-22',
        adminUser: 'admin',
        notes: 'Claimed over counter'
    }
];

class TiraBelleDB {
    constructor() {
        this.data = this.load();
        this.checkOneTimeCleanData();
    }

    checkOneTimeCleanData() {
        try {
            if (!localStorage.getItem('TIRA_CLEAN_PRODUCTS_ONLY_INITIALIZED')) {
                this.clearAllExceptProducts();
            }
        } catch (e) {}
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };

                // Auto-migrate legacy plaintext credentials if present
                if (settings.adminPassword && !settings.adminPasswordHash) {
                    hashCredential(settings.adminPassword).then(h => {
                        this.data.settings.adminPasswordHash = h;
                        delete this.data.settings.adminPassword;
                        this.save();
                    });
                }
                if (settings.adminPin && !settings.adminPinHash) {
                    hashCredential(settings.adminPin).then(h => {
                        this.data.settings.adminPinHash = h;
                        delete this.data.settings.adminPin;
                        this.save();
                    });
                }
                return {
                    settings: settings,
                    products: parsed.products && parsed.products.length ? parsed.products : DEFAULT_PRODUCTS,
                    customers: Array.isArray(parsed.customers) ? parsed.customers : [],
                    sales: Array.isArray(parsed.sales) ? parsed.sales : [],
                    redemptions: Array.isArray(parsed.redemptions) ? parsed.redemptions : []
                };
            }
        } catch (e) {
            console.error('Error reading localStorage, using defaults', e);
        }
        const initial = {
            settings: { ...DEFAULT_SETTINGS },
            products: [...DEFAULT_PRODUCTS],
            customers: [],
            sales: [],
            redemptions: []
        };
        this.save(initial);
        return initial;
    }

    save(data = this.data) {
        try {
            this.data = data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }
    }

    resetToDemoData() {
        const demoData = {
            settings: { ...DEFAULT_SETTINGS },
            products: [...DEFAULT_PRODUCTS],
            customers: [...DEMO_CUSTOMERS],
            sales: [...DEMO_SALES],
            redemptions: [...DEMO_REDEMPTIONS]
        };
        this.save(demoData);
        return demoData;
    }

    clearAllExceptProducts() {
        let prodsToKeep = [...DEFAULT_PRODUCTS];
        if (this.data && Array.isArray(this.data.products) && this.data.products.length >= 2) {
            prodsToKeep = this.data.products.slice(0, 2);
        }

        try {
            localStorage.clear();
        } catch (e) {}

        const cleanData = {
            settings: { ...DEFAULT_SETTINGS, ...(this.data?.settings || {}) },
            products: prodsToKeep,
            customers: [],
            sales: [],
            redemptions: []
        };
        this.data = cleanData;
        this.save(cleanData);
        try {
            localStorage.setItem('TIRA_CLEAN_PRODUCTS_ONLY_INITIALIZED', 'true');
        } catch (e) {}
        return cleanData;
    }

    // ----------------- SETTINGS & AUTHENTICATION -----------------
    getSettings() {
        return this.data.settings;
    }

    updateSettings(newSettings) {
        this.data.settings = { ...this.data.settings, ...newSettings };
        this.save();
        return this.data.settings;
    }

    async updateCredentials({ username, password, pin }) {
        if (username) {
            this.data.settings.adminUsername = username.trim();
        }
        if (password) {
            this.data.settings.adminPasswordHash = await hashCredential(password.trim());
            delete this.data.settings.adminPassword;
        }
        if (pin) {
            this.data.settings.adminPinHash = await hashCredential(pin.trim());
            delete this.data.settings.adminPin;
        }
        this.save();
        return { success: true };
    }

    async verifyAdminCredentials(user, secret) {
        if (!user || !secret) return false;
        const cleanUser = user.trim();
        const cleanSecret = secret.trim();
        const settings = this.getSettings();

        const isUserMatch = (cleanUser === settings.adminUsername || cleanUser === 'admin');
        if (!isUserMatch) return false;

        const secretHash = await hashCredential(cleanSecret);

        // Check against hashed password and hashed PIN
        const isPassMatch = settings.adminPasswordHash && secretHash === settings.adminPasswordHash;
        const isPinMatch = settings.adminPinHash && secretHash === settings.adminPinHash;

        // Legacy plaintext fallback check during migration
        const isLegacyPassMatch = settings.adminPassword && cleanSecret === settings.adminPassword;
        const isLegacyPinMatch = settings.adminPin && cleanSecret === settings.adminPin;

        return !!(isPassMatch || isPinMatch || isLegacyPassMatch || isLegacyPinMatch);
    }

    // ----------------- PRODUCTS -----------------
    getProducts(activeOnly = false) {
        if (activeOnly) {
            return this.data.products.filter(p => p.isActive);
        }
        return [...this.data.products];
    }

    getProductById(id) {
        return this.data.products.find(p => p.id === id);
    }

    saveProduct(productData) {
        if (productData.id) {
            const index = this.data.products.findIndex(p => p.id === productData.id);
            if (index !== -1) {
                this.data.products[index] = { ...this.data.products[index], ...productData, updatedAt: new Date().toISOString() };
            } else {
                this.data.products.push({ ...productData, createdAt: new Date().toISOString() });
            }
        } else {
            const newId = 'prod-' + Date.now();
            this.data.products.push({
                ...productData,
                id: newId,
                isActive: productData.isActive !== undefined ? productData.isActive : true,
                createdAt: new Date().toISOString()
            });
        }
        this.save();
        return this.data.products;
    }

    deleteProduct(id) {
        this.data.products = this.data.products.filter(p => p.id !== id);
        this.save();
        return this.data.products;
    }

    // ----------------- CUSTOMERS -----------------
    getCustomers() {
        return [...this.data.customers];
    }

    findCustomerByPhone(phone) {
        const cleanPhone = (phone || '').trim().replace(/\D/g, '');
        return this.data.customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
    }

    findCustomersByName(name) {
        const clean = (name || '').trim().toLowerCase();
        if (!clean) return [];
        return this.data.customers.filter(c => c.name.toLowerCase().includes(clean));
    }

    searchCustomer(query) {
        if (!query) return [];
        const clean = query.trim().toLowerCase();
        const cleanDigits = query.trim().replace(/\D/g, '');
        return this.data.customers.filter(c => {
            const matchName = c.name.toLowerCase().includes(clean);
            const matchPhone = cleanDigits.length >= 3 && c.phone.replace(/\D/g, '').includes(cleanDigits);
            return matchName || matchPhone;
        });
    }

    upsertCustomer(phone, name) {
        const cleanPhone = (phone || '').trim().replace(/\D/g, '');
        if (!cleanPhone) return null;
        let customer = this.findCustomerByPhone(cleanPhone);
        if (customer) {
            if (name && name.trim() && customer.name !== name.trim()) {
                customer.name = name.trim();
                customer.updatedAt = new Date().toISOString();
                this.save();
            }
            return customer;
        } else {
            customer = {
                phone: cleanPhone,
                name: (name || 'Valued Guest').trim(),
                createdAt: new Date().toISOString()
            };
            this.data.customers.push(customer);
            this.save();
            return customer;
        }
    }

    // ----------------- LOYALTY ENGINE -----------------
    getCustomerLoyalty(phone) {
        const cleanPhone = (phone || '').trim().replace(/\D/g, '');
        const customer = this.findCustomerByPhone(cleanPhone);
        const threshold = parseInt(this.data.settings.loyaltyThreshold, 10) || 5;

        // Customer's sales
        const customerSales = this.data.sales.filter(s => (s.customerPhone || '').replace(/\D/g, '') === cleanPhone);

        // Separate Metrics:
        // 1. Total Paid Cups Purchased (quantity across all orders)
        let totalCupsPurchased = 0;
        // 2. Completed Eligible Purchase Transactions (each transaction with at least 1 paid item counts as 1 purchase)
        let completedPurchasesCount = 0;

        customerSales.forEach(sale => {
            const cupsInSale = (sale.paidCupsCount || 0);
            totalCupsPurchased += cupsInSale;
            if (cupsInSale > 0 || (sale.items && sale.items.some(it => !it.isReward))) {
                completedPurchasesCount += 1;
            }
        });

        // Total rewards claimed
        const customerRedemptions = this.data.redemptions.filter(r => (r.customerPhone || '').replace(/\D/g, '') === cleanPhone);
        const claimedCount = customerRedemptions.length;

        // Total lifetime rewards earned based on completed separate purchase transactions
        const totalEarnedRewards = Math.floor(completedPurchasesCount / threshold);

        // Available rewards that can be redeemed right now
        const availableRewards = Math.max(0, totalEarnedRewards - claimedCount);
        const isEligible = availableRewards > 0;

        // Effective purchases active in the current cycle after accounting for claimed rewards
        const purchasesSinceClaimed = Math.max(0, completedPurchasesCount - (claimedCount * threshold));
        // Current cycle progress (if eligible, customer reached the threshold; otherwise remainder of active purchases)
        const currentCycleProgress = isEligible ? threshold : (purchasesSinceClaimed % threshold);
        const purchasesRemaining = isEligible ? 0 : (threshold - currentCycleProgress);

        return {
            customer: customer || { phone: cleanPhone, name: 'Guest' },
            threshold,
            totalCupsPurchased,       // Total cups bought across all transactions
            totalEligibleCups: totalCupsPurchased, // Backward compatibility for any legacy callers
            completedPurchasesCount,  // Total separate completed purchase transactions
            totalEarnedRewards,
            claimedCount,
            availableRewards,
            isEligible,
            currentCycleProgress,
            purchasesRemaining: isEligible ? 0 : purchasesRemaining,
            redemptions: customerRedemptions.sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt)),
            salesHistory: customerSales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        };
    }

    // ----------------- REDEEM REWARD -----------------
    redeemReward(phone, adminUser = 'admin', notes = '') {
        const loyalty = this.getCustomerLoyalty(phone);
        if (!loyalty.isEligible) {
            return { success: false, message: 'Customer is not eligible for a free reward yet.' };
        }

        const redemption = {
            id: 'RDM-' + Date.now().toString().slice(-6),
            customerPhone: loyalty.customer.phone,
            customerName: loyalty.customer.name,
            rewardItem: this.data.settings.rewardItemName || '1 Free 150g Tiramisu Cup',
            redeemedAt: new Date().toISOString(),
            date: getTodayDateString(0),
            adminUser: adminUser,
            notes: notes || 'Redeemed over counter'
        };

        this.data.redemptions.push(redemption);
        this.save();

        return {
            success: true,
            redemption,
            updatedLoyalty: this.getCustomerLoyalty(phone),
            message: `Successfully redeemed 1 free reward for ${loyalty.customer.name}!`
        };
    }

    // ----------------- SALES & TRANSACTIONS -----------------
    createSale({ customerPhone, customerName, items, paymentMode, notes = '', redeemFreeReward = false }) {
        const cleanPhone = (customerPhone || '').trim().replace(/\D/g, '');
        if (!cleanPhone) {
            return { success: false, message: 'Valid customer phone number is required.' };
        }

        if (!items || !items.length) {
            return { success: false, message: 'Cart cannot be empty.' };
        }

        // Upsert customer
        const customer = this.upsertCustomer(cleanPhone, customerName);

        // Check if customer wants to redeem reward with this order
        let redeemedItem = null;
        if (redeemFreeReward) {
            const currentLoyalty = this.getCustomerLoyalty(cleanPhone);
            if (currentLoyalty.isEligible) {
                const rdmResult = this.redeemReward(cleanPhone, 'admin', 'Redeemed together with Sale POS');
                if (rdmResult.success) {
                    redeemedItem = {
                        productId: 'prod-150',
                        productName: this.data.settings.rewardItemName + ' (Loyalty Reward)',
                        price: 0,
                        quantity: 1,
                        isReward: true
                    };
                }
            }
        }

        // Calculate paid items and total amount
        let subtotal = 0;
        let paidCupsCount = 0;
        const processedItems = items.map(item => {
            const product = this.getProductById(item.productId);
            const price = product ? product.price : (item.price || 0);
            const qty = parseInt(item.quantity, 10) || 1;
            const itemTotal = price * qty;
            subtotal += itemTotal;

            // Rule: Each eligible product cup counts as one purchase
            if (!item.isReward && (product ? product.countsTowardsLoyalty : true)) {
                paidCupsCount += qty;
            }

            return {
                productId: item.productId,
                productName: item.productName || (product ? product.name : 'Tiramisu'),
                weight: product ? product.weight : '',
                price: price,
                quantity: qty,
                total: itemTotal,
                isReward: !!item.isReward
            };
        });

        // Add reward item to invoice display if redeemed
        if (redeemedItem) {
            processedItems.push({
                productId: 'reward-150',
                productName: redeemedItem.productName,
                weight: '150 g',
                price: 0,
                quantity: 1,
                total: 0,
                isReward: true
            });
        }

        const saleRecord = {
            id: 'TXN-' + Date.now().toString().slice(-6),
            customerPhone: cleanPhone,
            customerName: customer.name,
            items: processedItems,
            subtotal: subtotal,
            discount: 0,
            totalAmount: subtotal, // Paid sales total excludes free rewards
            paymentMode: paymentMode || 'Cash', // Cash / Online
            paidCupsCount: paidCupsCount,
            timestamp: new Date().toISOString(),
            date: getTodayDateString(0),
            notes: notes || '',
            rewardRedeemedInSale: !!redeemedItem
        };

        this.data.sales.push(saleRecord);
        this.save();

        const updatedLoyalty = this.getCustomerLoyalty(cleanPhone);

        return {
            success: true,
            sale: saleRecord,
            loyalty: updatedLoyalty,
            message: 'Sale recorded successfully!'
        };
    }

    getSales() {
        return [...this.data.sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    getRedemptions() {
        return [...this.data.redemptions].sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt));
    }

    // ----------------- DASHBOARD ANALYTICS -----------------
    getDashboardMetrics(filterDate = 'today') {
        let targetDate = getTodayDateString(0);
        let filterFn;

        if (filterDate === 'today') {
            filterFn = sale => sale.date === targetDate;
        } else if (filterDate === 'yesterday') {
            const yesterday = getTodayDateString(1);
            filterFn = sale => sale.date === yesterday;
        } else if (filterDate === 'all') {
            filterFn = () => true;
        } else if (filterDate.startsWith('custom:')) {
            const customDate = filterDate.replace('custom:', '');
            filterFn = sale => sale.date === customDate;
        } else {
            filterFn = sale => sale.date === targetDate;
        }

        const filteredSales = this.data.sales.filter(filterFn);
        
        // Filter redemptions
        let redemptionFilterFn;
        if (filterDate === 'today') {
            redemptionFilterFn = r => r.date === targetDate;
        } else if (filterDate === 'yesterday') {
            redemptionFilterFn = r => r.date === getTodayDateString(1);
        } else if (filterDate === 'all') {
            redemptionFilterFn = () => true;
        } else if (filterDate.startsWith('custom:')) {
            const customDate = filterDate.replace('custom:', '');
            redemptionFilterFn = r => r.date === customDate;
        } else {
            redemptionFilterFn = r => r.date === targetDate;
        }
        const filteredRedemptions = this.data.redemptions.filter(redemptionFilterFn);

        let totalRevenue = 0;
        let cashCollection = 0;
        let onlineCollection = 0;
        let totalPaidQuantity = 0;
        const productSummary = {};

        // Pre-populate product summary with current products
        this.data.products.forEach(p => {
            productSummary[p.id] = {
                id: p.id,
                name: p.name,
                weight: p.weight,
                price: p.price,
                quantity: 0,
                revenue: 0
            };
        });

        filteredSales.forEach(sale => {
            totalRevenue += (sale.totalAmount || 0);
            if (sale.paymentMode === 'Cash') {
                cashCollection += (sale.totalAmount || 0);
            } else {
                onlineCollection += (sale.totalAmount || 0);
            }
            totalPaidQuantity += (sale.paidCupsCount || 0);

            sale.items.forEach(item => {
                if (!item.isReward) {
                    const pid = item.productId || 'custom';
                    if (!productSummary[pid]) {
                        productSummary[pid] = {
                            id: pid,
                            name: item.productName,
                            weight: item.weight || '',
                            price: item.price,
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productSummary[pid].quantity += item.quantity;
                    productSummary[pid].revenue += (item.total || (item.price * item.quantity));
                }
            });
        });

        return {
            totalRevenue,
            cashCollection,
            onlineCollection,
            totalPaidQuantity,
            transactionCount: filteredSales.length,
            rewardsRedeemedCount: filteredRedemptions.length,
            productSummary: Object.values(productSummary),
            recentSales: filteredSales.slice(0, 10),
            filterDate: filterDate
        };
    }

    // ----------------- BACKUP & RESTORE -----------------
    exportDatabaseJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    importDatabaseJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (!parsed.products || !parsed.sales || !parsed.settings) {
                return { success: false, message: 'Invalid backup file structure.' };
            }
            this.save(parsed);
            return { success: true, message: 'Database restored successfully!' };
        } catch (e) {
            return { success: false, message: 'Error parsing JSON: ' + e.message };
        }
    }
}

// Global utilities & singleton instance
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
    window.hashCredential = hashCredential;
    window.TiraDB = new TiraBelleDB();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TiraBelleDB,
        DEFAULT_SETTINGS,
        DEFAULT_PRODUCTS,
        DEFAULT_CUSTOMERS,
        DEFAULT_SALES,
        DEFAULT_REDEMPTIONS,
        escapeHtml,
        hashCredential
    };
}
