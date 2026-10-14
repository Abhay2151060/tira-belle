/**
 * TIRA Belle - Customer Offer Tracker Logic
 * Handles customer search by phone/name, stamp card rendering, privacy masking, and claim history.
 */

document.addEventListener('DOMContentLoaded', () => {
    updateTrackerRuleText();
});

function updateTrackerRuleText() {
    if (!window.TiraDB) return;
    const settings = window.TiraDB.getSettings();
    const threshold = parseInt(settings.loyaltyThreshold, 10) || 5;
    const rewardItem = settings.rewardItemName || '1 Free 150g Tiramisu';
    const threshEl = document.getElementById('trackerRuleThreshold');
    const rewardEl = document.getElementById('trackerRuleReward');
    if (threshEl) threshEl.textContent = threshold;
    if (rewardEl) rewardEl.textContent = rewardItem;
}

// Helper to mask phone number for customer privacy (e.g. 9876543210 -> 98765 •••• 10)
function maskPhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 6) return clean;
    const start = clean.substring(0, 5);
    const end = clean.substring(clean.length - 2);
    return `${start} •••• ${end}`;
}

// Show Toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="bell" data-size="16"></i> <div>${message}</div>`;
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Main search loyalty function
window.searchLoyalty = function(specifiedPhone = null) {
    const input = document.getElementById('trackerInput');
    const query = specifiedPhone || (input ? input.value.trim() : '');

    const ambiguousContainer = document.getElementById('ambiguousCustomersList');
    const ambiguousCards = document.getElementById('ambiguousCardsContainer');
    const notFoundBox = document.getElementById('trackerNotFound');
    const resultPanel = document.getElementById('trackerResultPanel');

    // Reset visibility
    if (ambiguousContainer) ambiguousContainer.style.display = 'none';
    if (notFoundBox) notFoundBox.style.display = 'none';
    if (resultPanel) resultPanel.classList.remove('active');

    if (!query) {
        showToast('Please enter a phone number or name to track your offer.', 'warning');
        return;
    }

    const cleanDigits = query.replace(/\D/g, '');
    let matchedPhone = null;

    if (specifiedPhone) {
        matchedPhone = specifiedPhone;
    } else if (cleanDigits.length >= 10) {
        // Direct phone lookup
        const found = window.TiraDB.findCustomerByPhone(cleanDigits);
        if (found) {
            matchedPhone = found.phone;
        }
    } else {
        // Search by name or partial phone
        const matches = window.TiraDB.searchCustomer(query);
        if (matches.length === 1) {
            matchedPhone = matches[0].phone;
        } else if (matches.length > 1) {
            // Multiple customers found with this name -> Show prompt to select phone
            if (ambiguousContainer && ambiguousCards) {
                ambiguousCards.innerHTML = '';
                matches.forEach(c => {
                    const loyalty = window.TiraDB.getCustomerLoyalty(c.phone);
                    const safeName = typeof escapeHtml === 'function' ? escapeHtml(c.name) : c.name;
                    const safePhone = typeof escapeHtml === 'function' ? escapeHtml(maskPhone(c.phone)) : maskPhone(c.phone);
                    const btn = document.createElement('div');
                    btn.className = 'history-item';
                    btn.style.cursor = 'pointer';
                    btn.style.border = '1px solid var(--color-border)';
                    btn.innerHTML = `
                        <div>
                            <strong>${safeName}</strong> • 
                            <span style="color: var(--color-text-muted); font-size: 0.85rem;">${safePhone}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge ${loyalty.isEligible ? 'badge-success' : 'badge-warning'}">
                                ${loyalty.currentCycleProgress}/${loyalty.threshold} Cups
                            </span>
                            <span class="btn btn-sm btn-outline">Select</span>
                        </div>
                    `;
                    btn.onclick = () => window.searchLoyalty(c.phone);
                    ambiguousCards.appendChild(btn);
                });
                ambiguousContainer.style.display = 'block';
                return;
            }
        }
    }

    if (!matchedPhone) {
        if (notFoundBox) notFoundBox.style.display = 'block';
        return;
    }

    // Retrieve full loyalty details
    const loyalty = window.TiraDB.getCustomerLoyalty(matchedPhone);
    renderLoyaltyResult(loyalty);
};

// Render the detailed result panel
function renderLoyaltyResult(loyalty) {
    const resultPanel = document.getElementById('trackerResultPanel');
    if (!resultPanel) return;

    // Header info
    const safeCustomerName = typeof escapeHtml === 'function' ? escapeHtml(loyalty.customer.name || 'Valued Guest') : (loyalty.customer.name || 'Valued Guest');
    document.getElementById('resCustomerName').textContent = safeCustomerName;
    document.getElementById('resCustomerPhone').innerHTML = `<i data-lucide="phone" data-size="14"></i> <span>${maskPhone(loyalty.customer.phone)}</span>`;

    // Status Banner
    const banner = document.getElementById('resStatusBanner');
    const icon = document.getElementById('resStatusIcon');
    const title = document.getElementById('resStatusTitle');
    const desc = document.getElementById('resStatusDesc');

    const settings = window.TiraDB ? window.TiraDB.getSettings() : {};
    const rewardItem = settings.rewardItemName || '1 Free 150g Tiramisu';
    const safeRewardItem = typeof escapeHtml === 'function' ? escapeHtml(rewardItem) : rewardItem;

    if (loyalty.isEligible) {
        banner.className = 'loyalty-status-banner status-eligible';
        icon.innerHTML = `<i data-lucide="award" data-size="32"></i>`;
        title.innerHTML = `Congratulations! You've Earned ${safeRewardItem}!`;
        desc.innerHTML = `You have completed all <strong>${loyalty.threshold} eligible cup purchases</strong>. Visit the TIRA Belle counter anytime to claim your handcrafted free dessert!`;
    } else {
        banner.className = 'loyalty-status-banner status-in-progress';
        icon.innerHTML = `<i data-lucide="coffee" data-size="32"></i>`;
        const remaining = loyalty.purchasesRemaining;
        title.textContent = `${remaining} More Cup${remaining > 1 ? 's' : ''} To Go!`;
        desc.innerHTML = `You have made <strong>${loyalty.currentCycleProgress} out of ${loyalty.threshold}</strong> eligible purchases in this cycle. Buy ${remaining} more to claim your free reward!`;
    }

    // Stamp Fraction text
    const fraction = document.getElementById('resStampFraction');
    if (fraction) {
        if (loyalty.isEligible) {
            fraction.textContent = `${loyalty.threshold} / ${loyalty.threshold} Cups • READY!`;
            fraction.style.color = '#27ae60';
        } else {
            fraction.textContent = `${loyalty.currentCycleProgress} / ${loyalty.threshold} Cups`;
            fraction.style.color = 'var(--color-caramel)';
        }
    }

    // Render 5 Stamps Grid
    const stampsGrid = document.getElementById('resStampsGrid');
    if (stampsGrid) {
        stampsGrid.innerHTML = '';
        const threshold = loyalty.threshold || 5;
        const currentStamps = loyalty.isEligible ? threshold : loyalty.currentCycleProgress;

        for (let i = 1; i <= threshold; i++) {
            const isStamped = i <= currentStamps;
            const isFinalReward = i === threshold;

            const box = document.createElement('div');
            box.className = `stamp-box-large ${isStamped ? (isFinalReward && loyalty.isEligible ? 'filled-reward' : 'filled') : ''}`;
            
            let stampIcon = '<i data-lucide="coffee" data-size="26"></i>';
            if (isFinalReward) stampIcon = isStamped && loyalty.isEligible ? '<i data-lucide="gift" data-size="26"></i>' : '<i data-lucide="award" data-size="26"></i>';
            else if (isStamped) stampIcon = '<i data-lucide="coffee" data-size="26"></i>';

            box.innerHTML = `
                <div class="stamp-img">${stampIcon}</div>
                <div class="stamp-num-badge">${isFinalReward ? 'FREE' : `Cup #${i}`}</div>
            `;
            stampsGrid.appendChild(box);
        }
    }

    // Numbers & Stats
    document.getElementById('resTotalCups').textContent = loyalty.totalEligibleCups;
    document.getElementById('resRemainingCups').textContent = loyalty.purchasesRemaining;
    document.getElementById('resClaimedRewards').textContent = loyalty.claimedCount;

    // Previous Redemptions History
    const redemptionsSection = document.getElementById('resRedemptionSection');
    const redemptionsList = document.getElementById('resRedemptionsList');

    if (loyalty.redemptions && loyalty.redemptions.length > 0) {
        redemptionsSection.style.display = 'block';
        redemptionsList.innerHTML = '';
        loyalty.redemptions.forEach(r => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const dateStr = new Date(r.redeemedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const safeRdmItem = typeof escapeHtml === 'function' ? escapeHtml(r.rewardItem) : r.rewardItem;
            const safeRdmNotes = typeof escapeHtml === 'function' ? escapeHtml(r.notes || 'Redeemed over counter') : (r.notes || 'Redeemed over counter');
            item.innerHTML = `
                <div>
                    <strong>${safeRdmItem}</strong>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted);">${safeRdmNotes}</div>
                </div>
                <div style="text-align: right;">
                    <span class="history-badge"><i data-lucide="check" data-size="12"></i> Claimed</span>
                    <div style="font-size: 0.75rem; color: var(--color-text-light); margin-top: 3px;">${dateStr}</div>
                </div>
            `;
            redemptionsList.appendChild(item);
        });
    } else {
        redemptionsSection.style.display = 'none';
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Show Result Panel smoothly
    resultPanel.classList.add('active');
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
