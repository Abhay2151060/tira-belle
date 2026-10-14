/**
 * TIRA Belle - Public Website Script
 * Loads active products dynamically from central DB, handles menu interactions, and on-page quick offer tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    renderStorefrontBranding();
    renderPublicProducts();
    renderPublicLoyaltyInfo();
});

// Re-render when business settings change centrally or cross-tab
window.addEventListener('tira-settings-changed', () => {
    renderStorefrontBranding();
    renderPublicProducts();
    renderPublicLoyaltyInfo();
});

function initMobileNav() {
    const toggle = document.getElementById('mobileNavToggle');
    const links = document.getElementById('primaryNavLinks');
    if (toggle && links) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('mobile-open');
        });

        // Close on link click
        links.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                links.classList.remove('mobile-open');
            });
        });
    }
}

function renderPublicLoyaltyInfo() {
    if (!window.TiraDB) return;
    const settings = window.TiraDB.getSettings();
    const threshold = parseInt(settings.loyaltyThreshold, 10) || 5;
    const rewardItem = settings.rewardItemName || '1 Free 150g Tiramisu';

    // 1. Hero floating badge
    const heroTitle = document.getElementById('heroOfferTitle');
    if (heroTitle) {
        heroTitle.textContent = `Buy ${threshold} Cups, Get 1 Free!`;
    }

    // 2. Loyalty Section Title
    const loyaltyTitle = document.getElementById('loyaltyOfferTitle');
    if (loyaltyTitle) {
        loyaltyTitle.textContent = `Buy ${threshold} Cups, Get 1 Free!`;
    }

    // 3. Step 2
    const step2Title = document.getElementById('loyaltyStep2Title');
    if (step2Title) {
        step2Title.textContent = `Collect ${threshold} Stamps`;
    }

    // 4. Step 3
    const step3Title = document.getElementById('loyaltyStep3Title');
    if (step3Title) {
        step3Title.textContent = `Claim ${rewardItem}!`;
    }

    // 5. Preview card badge
    const cardBadge = document.getElementById('loyaltyCardBadge');
    if (cardBadge) {
        cardBadge.textContent = `${threshold} Stamps = 1 Free Cup`;
    }

    // 6. Preview Stamp Row (render threshold slots)
    const stampsRow = document.getElementById('loyaltyPreviewStampsRow');
    if (stampsRow) {
        stampsRow.innerHTML = '';
        for (let i = 1; i <= threshold; i++) {
            const isReward = i === threshold;
            const slot = document.createElement('div');
            slot.className = `stamp-slot ${isReward ? 'reward-slot stamped' : 'stamped'}`;
            slot.innerHTML = `
                <span class="stamp-icon">${isReward ? '<i data-lucide="gift" data-size="20"></i>' : '<i data-lucide="coffee" data-size="18"></i>'}</span>
                <span class="stamp-number">${isReward ? 'FREE' : `#${i}`}</span>
            `;
            stampsRow.appendChild(slot);
        }
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function renderPublicProducts() {
    const container = document.getElementById('publicProductsGrid');
    if (!container) return;

    const products = window.TiraDB.getProducts(true); // Active products only
    const settings = window.TiraDB.getSettings();
    const curr = settings.currency || '₹';

    container.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-media">
                <img src="${p.image || 'assets/tiramisu-150g.jpg'}" alt="${p.name}" onerror="this.src='assets/tira-belle-poster.jpg'">
                <span class="product-weight-tag">${p.weight}</span>
                ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
            </div>
            <div class="product-content">
                <h3 class="product-name">${p.name}</h3>
                <p class="product-desc">${p.description}</p>
                <div class="product-footer">
                    <div class="product-price-box">
                        <span class="price-label">Counter Price</span>
                        <span class="product-price">${curr}${p.price}</span>
                    </div>
                    <div>
                        <span class="counter-tag"><i data-lucide="check" data-size="13"></i> Fresh at Counter</span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Handle quick tracker input on home page
window.handleQuickTrack = function() {
    const input = document.getElementById('quickTrackerInput');
    const val = input ? input.value.trim() : '';
    if (!val) {
        alert('Please enter your phone number or name to track your loyalty progress.');
        return;
    }
    // Redirect to tracker.html with query parameter
    window.location.href = `tracker.html?phone=${encodeURIComponent(val)}`;
};

function renderStorefrontBranding() {
    if (!window.TiraDB) return;
    const settings = window.TiraDB.getSettings();
    window.TiraDB.applyGlobalBranding(settings);

    // Dynamic WhatsApp contact items in Visit Our Dessert Studio section
    const contactsContainer = document.getElementById('publicStorefrontContactLinks');
    if (contactsContainer) {
        const phone1 = settings.phone || '9373484198';
        const phone2 = settings.phoneSecondary || '';
        const owner = settings.owner || 'Yash Chauhan & Tejas Chauhan';
        const bizName = settings.businessName || 'TIRA Belle';

        let html = `
            <div style="font-weight: 700; color: var(--color-espresso);">WhatsApp &amp; Direct Orders</div>
            <div style="font-size: 0.92rem; color: var(--color-text-main);">
                <strong>Primary:</strong> <a href="https://wa.me/91${phone1.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello! I would like to order ${bizName} tiramisu`)}" target="_blank" style="color: var(--color-caramel); font-weight: 600;">${phone1}</a>
            </div>
        `;
        if (phone2) {
            html += `
                <div style="font-size: 0.92rem; color: var(--color-text-main);">
                    <strong>Secondary:</strong> <a href="https://wa.me/91${phone2.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello! I would like to order ${bizName} tiramisu`)}" target="_blank" style="color: var(--color-caramel); font-weight: 600;">${phone2}</a>
                </div>
            `;
        }
        contactsContainer.innerHTML = html;
    }

    // Dynamic Action CTA buttons
    const btnContainer = document.getElementById('publicStorefrontActionButtons');
    if (btnContainer) {
        const phone1 = settings.phone || '9373484198';
        const phone2 = settings.phoneSecondary || '';
        const bizName = settings.businessName || 'TIRA Belle';

        let btnsHtml = `
            <a href="https://wa.me/91${phone1.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello! I would like to order ${bizName} tiramisu`)}" target="_blank" class="btn btn-caramel btn-lg">
                <i data-lucide="phone" data-size="18"></i>
                <span>WhatsApp Order</span>
            </a>
        `;
        if (phone2) {
            btnsHtml += `
                <a href="https://wa.me/91${phone2.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello! I would like to order ${bizName} tiramisu`)}" target="_blank" class="btn btn-caramel btn-lg">
                    <i data-lucide="phone" data-size="18"></i>
                    <span>Contact #${phone2}</span>
                </a>
            `;
        }
        btnsHtml += `
            <a href="tracker.html" class="btn btn-outline btn-lg">
                <i data-lucide="award" data-size="18"></i>
                <span>Check Loyalty Status</span>
            </a>
        `;
        btnContainer.innerHTML = btnsHtml;
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
