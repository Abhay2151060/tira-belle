/**
 * TIRA Belle - Customer Offer Tracker Logic
 * Handles customer search by phone/name, stamp card rendering, privacy masking, and claim history.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.TiraDB) {
        window.TiraDB.applyGlobalBranding();
    }
    updateTrackerRuleText();
});

window.addEventListener('tira-settings-changed', () => {
    if (window.TiraDB) {
        window.TiraDB.applyGlobalBranding();
    }
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
function showToast(message, type = 'info', title = null) {
    if (window.TiraAlert) {
        return window.TiraAlert.toast({ message, type, title });
    }
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
                                ${loyalty.isEligible ? 'Eligible for Free Reward' : `${loyalty.currentCycleProgress}/${loyalty.threshold} Cups`}
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
        desc.innerHTML = `You have purchased all <strong>${loyalty.threshold} eligible cups</strong>. Visit the TIRA Belle counter anytime to claim your handcrafted free dessert!`;
    } else {
        banner.className = 'loyalty-status-banner status-in-progress';
        icon.innerHTML = `<i data-lucide="coffee" data-size="32"></i>`;
        const remaining = loyalty.cupsRemaining !== undefined ? loyalty.cupsRemaining : loyalty.purchasesRemaining;
        title.textContent = `${remaining} More Cup${remaining > 1 ? 's' : ''} To Go!`;
        desc.innerHTML = `You have purchased <strong>${loyalty.currentCycleProgress} out of ${loyalty.threshold}</strong> eligible cups in this cycle. Buy ${remaining} more to claim your free reward!`;
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
    document.getElementById('resTotalCups').textContent = loyalty.totalCupsPurchased;
    const purchasesElem = document.getElementById('resPurchasesMade');
    if (purchasesElem) purchasesElem.textContent = loyalty.completedPurchasesCount;
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

    // Auto-populate review form with customer info if found
    if (loyalty.customer) {
        autoFillReviewFromCustomer(loyalty.customer.name, loyalty.customer.phone);
    }

    // Show Result Panel smoothly
    resultPanel.classList.add('active');
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.clearLoyaltyTracker = function() {
    const input = document.getElementById('trackerInput');
    const resultPanel = document.getElementById('trackerResultPanel');
    const notFound = document.getElementById('trackerNotFound');
    const ambiguous = document.getElementById('ambiguousCustomersList');

    if (input) input.value = '';
    if (resultPanel) resultPanel.classList.remove('active');
    if (notFound) notFound.style.display = 'none';
    if (ambiguous) ambiguous.style.display = 'none';
    if (input) input.focus();
    showToast('Loyalty tracker cleared.', 'info');
};

// ==========================================================================
// Customer Review Submission Logic
// ==========================================================================
const RATING_LABELS = {
    1: '1 Star • Needs Improvement',
    2: '2 Stars • Fair',
    3: '3 Stars • Good & Enjoyable',
    4: '4 Stars • Very Good!',
    5: '5 Stars • Exceptional!'
};

function initReviewForm() {
    const starRow = document.getElementById('starRatingRow');
    const ratingInput = document.getElementById('reviewRatingVal');
    const ratingText = document.getElementById('starRatingText');
    const commentEl = document.getElementById('reviewComment');
    const charCountEl = document.getElementById('reviewCharCount');

    if (starRow && ratingInput) {
        const starBtns = starRow.querySelectorAll('.star-pick-btn');
        starBtns.forEach(btn => {
            const val = parseInt(btn.getAttribute('data-val'), 10);

            btn.addEventListener('click', () => {
                ratingInput.value = val;
                updateStarDisplay(val);
                if (ratingText) ratingText.textContent = RATING_LABELS[val] || `${val} Stars`;
            });

            btn.addEventListener('mouseenter', () => {
                highlightStarsUpTo(val);
            });
        });

        starRow.addEventListener('mouseleave', () => {
            const currentVal = parseInt(ratingInput.value, 10) || 5;
            updateStarDisplay(currentVal);
        });
    }

    if (commentEl && charCountEl) {
        commentEl.addEventListener('input', () => {
            charCountEl.textContent = `${commentEl.value.length} / 500`;
        });
    }

    const form = document.getElementById('customerReviewForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            window.submitCustomerReview();
        });
    }
}

function updateStarDisplay(rating) {
    const starRow = document.getElementById('starRatingRow');
    if (!starRow) return;
    const starBtns = starRow.querySelectorAll('.star-pick-btn');
    starBtns.forEach(btn => {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        if (val <= rating) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function highlightStarsUpTo(rating) {
    const starRow = document.getElementById('starRatingRow');
    if (!starRow) return;
    const starBtns = starRow.querySelectorAll('.star-pick-btn');
    starBtns.forEach(btn => {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        if (val <= rating) {
            btn.classList.add('hover-active');
        } else {
            btn.classList.remove('hover-active');
        }
    });
}

// Auto-fill review name & phone from loyalty tracker results
function autoFillReviewFromCustomer(name, phone) {
    const nameInput = document.getElementById('reviewName');
    const phoneInput = document.getElementById('reviewPhone');
    if (nameInput && name && !nameInput.value) {
        nameInput.value = name;
    }
    if (phoneInput && phone && !phoneInput.value) {
        phoneInput.value = phone;
    }
}

window.submitCustomerReview = function() {
    const nameInput = document.getElementById('reviewName');
    const phoneInput = document.getElementById('reviewPhone');
    const ratingInput = document.getElementById('reviewRatingVal');
    const commentInput = document.getElementById('reviewComment');
    const favRadio = document.querySelector('input[name="reviewFavorite"]:checked');
    const submitBtn = document.getElementById('btnSubmitReview');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const rating = ratingInput ? parseInt(ratingInput.value, 10) || 5 : 5;
    const comment = commentInput ? commentInput.value.trim() : '';
    const favoriteItem = favRadio ? favRadio.value : 'Tiramisu – 150 g';

    if (!name) {
        showToast('Please enter your name.', 'warning');
        if (nameInput) nameInput.focus();
        return;
    }

    if (!comment) {
        showToast('Please write a short review about your experience.', 'warning');
        if (commentInput) commentInput.focus();
        return;
    }

    if (!window.TiraDB) {
        showToast('Database is not initialized. Please refresh the page.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Submitting...</span>`;
    }

    try {
        const res = window.TiraDB.addReview({
            name: name,
            phone: phone,
            rating: rating,
            favoriteItem: favoriteItem,
            comment: comment
        });

        if (res && res.success) {
            if (window.TiraAlert && typeof window.TiraAlert.alert === 'function') {
                window.TiraAlert.alert({
                    title: 'Review Published with Love! ❤️',
                    message: `Thank you, <strong>${window.escapeHtml(name)}</strong>! Your review has been added and will appear on our homepage carousel immediately.`,
                    type: 'success',
                    buttonText: 'Awesome!'
                });
            } else {
                showToast('Thank you! Your review has been published to our homepage.', 'success', 'Review Submitted');
            }

            // Reset comment and form state
            if (commentInput) commentInput.value = '';
            const charCountEl = document.getElementById('reviewCharCount');
            if (charCountEl) charCountEl.textContent = '0 / 500';

            // Scroll gently to confirmation
            const reviewCard = document.getElementById('reviewSection');
            if (reviewCard) {
                reviewCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            showToast(res.message || 'Error submitting review.', 'error');
        }
    } catch (e) {
        console.error('Error submitting review:', e);
        showToast('An unexpected error occurred while saving your review.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i data-lucide="send" data-size="16"></i> <span>Submit Review</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

// Initialize review form when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initReviewForm();
});
