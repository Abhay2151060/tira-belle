/**
 * TIRA Belle - Public Website Script
 * Loads active products dynamically from central DB, handles menu interactions, and on-page quick offer tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    renderStorefrontBranding();
    renderPublicProducts();
    renderPublicLoyaltyInfo();
    renderPublicReviews();
});

// Re-render when business settings change centrally or cross-tab
window.addEventListener('tira-settings-changed', () => {
    renderStorefrontBranding();
    renderPublicProducts();
    renderPublicLoyaltyInfo();
});

// Re-render when customer reviews are added or deleted
window.addEventListener('tira-reviews-changed', () => {
    renderPublicReviews();
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
        if (window.TiraAlert) {
            window.TiraAlert.warning('Please enter your mobile phone number or name to look up your tiramisu loyalty stamps.', 'Loyalty Tracker');
        } else {
            alert('Please enter your phone number or name to track your loyalty progress.');
        }
        if (input) input.focus();
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

// ==========================================================================
// Customer Reviews Horizontal Scrolling Carousel
// ==========================================================================
let reviewsAutoPlayTimer = null;

function renderPublicReviews() {
    const track = document.getElementById('reviewsCarouselTrack');
    const dotsContainer = document.getElementById('reviewsCarouselDots');
    const prevBtn = document.getElementById('revBtnPrev');
    const nextBtn = document.getElementById('revBtnNext');

    if (!track) return;
    if (!window.TiraDB) return;

    const reviews = window.TiraDB.getReviews();
    track.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    if (!reviews || reviews.length === 0) {
        track.innerHTML = `
            <div class="review-empty-state">
                <i data-lucide="sparkles" data-size="36" style="color: var(--color-caramel); margin-bottom: 10px;"></i>
                <h4 style="font-family: var(--font-heading); color: var(--color-espresso); margin-bottom: 6px;">Be the First to Review!</h4>
                <p style="color: var(--color-text-muted); font-size: 0.9rem; max-width: 380px; margin: 0 auto 16px;">
                    Have you tasted our handcrafted tiramisu? Leave a review and let others know about your experience.
                </p>
                <a href="tracker.html#reviewSection" class="btn btn-caramel btn-sm">
                    <i data-lucide="star" data-size="14"></i>
                    <span>Leave a Review</span>
                </a>
            </div>
        `;
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    if (prevBtn) prevBtn.style.display = 'flex';
    if (nextBtn) nextBtn.style.display = 'flex';

    // Pastel gradient avatars for variety
    const AVATAR_GRADIENTS = [
        'linear-gradient(135deg, #b7793d, #824f21)',
        'linear-gradient(135deg, #24140e, #4a2818)',
        'linear-gradient(135deg, #935116, #b7793d)',
        'linear-gradient(135deg, #512e1e, #824f21)',
        'linear-gradient(135deg, #784212, #a05a1c)'
    ];

    reviews.forEach((rev, idx) => {
        const rating = Math.max(1, Math.min(5, rev.rating || 5));
        let starsHtml = '';
        for (let s = 1; s <= 5; s++) {
            if (s <= rating) {
                starsHtml += `<span class="star-icon filled">★</span>`;
            } else {
                starsHtml += `<span class="star-icon empty">☆</span>`;
            }
        }

        // Initials avatar
        const initials = rev.name
            ? rev.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
            : 'TB';
        const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

        // Format Date
        let dateDisplay = '';
        if (rev.date) {
            try {
                const parts = rev.date.split('-');
                if (parts.length === 3) {
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    dateDisplay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } else {
                    dateDisplay = rev.date;
                }
            } catch (e) {
                dateDisplay = rev.date;
            }
        }

        const safeName = typeof escapeHtml === 'function' ? escapeHtml(rev.name) : rev.name;
        const safeComment = typeof escapeHtml === 'function' ? escapeHtml(rev.comment) : rev.comment;
        const safeFav = typeof escapeHtml === 'function' ? escapeHtml(rev.favoriteItem || 'Classic Cup') : (rev.favoriteItem || 'Classic Cup');

        const card = document.createElement('div');
        card.className = 'review-card';
        card.setAttribute('data-index', idx);
        card.innerHTML = `
            <div class="review-card-top">
                <div class="review-stars-wrap">${starsHtml}</div>
                <div class="review-quote-mark">“</div>
            </div>
            
            <p class="review-comment-text">${safeComment}</p>
            
            <div class="review-card-footer">
                <div class="review-avatar" style="background: ${grad};">${initials}</div>
                <div class="review-author-meta">
                    <div class="review-author-name">
                        <span>${safeName}</span>
                        ${rev.verified ? `<span class="review-verified-badge" title="Verified Customer"><i data-lucide="badge-check" data-size="13"></i> Verified Guest</span>` : ''}
                    </div>
                    <div class="review-extra-tags">
                        <span class="review-cup-tag"><i data-lucide="coffee" data-size="12"></i> ${safeFav}</span>
                        ${dateDisplay ? `<span class="review-date-tag">${dateDisplay}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        track.appendChild(card);

        // Dot for navigation
        if (dotsContainer) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Go to review ${idx + 1}`);
            dot.onclick = () => {
                scrollToReviewCard(idx);
            };
            dotsContainer.appendChild(dot);
        }
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Attach Carousel Navigation Event Listeners
    setupReviewsCarouselInteractions(track, prevBtn, nextBtn, dotsContainer);
}

function setupReviewsCarouselInteractions(track, prevBtn, nextBtn, dotsContainer) {
    if (!track) return;

    function getCardWidth() {
        const firstCard = track.querySelector('.review-card');
        if (firstCard) {
            return firstCard.offsetWidth + 20; // width + gap
        }
        return 340;
    }

    function scrollNext() {
        const step = getCardWidth();
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScroll - 10) {
            // Loop back to start smoothly
            track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: step, behavior: 'smooth' });
        }
    }

    function scrollPrev() {
        const step = getCardWidth();
        if (track.scrollLeft <= 10) {
            // Loop to end smoothly
            track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: -step, behavior: 'smooth' });
        }
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            stopReviewsAutoPlay();
            scrollNext();
        };
    }

    if (prevBtn) {
        prevBtn.onclick = () => {
            stopReviewsAutoPlay();
            scrollPrev();
        };
    }

    // Update active dot based on current scroll position
    track.addEventListener('scroll', () => {
        if (!dotsContainer) return;
        const step = getCardWidth();
        const activeIdx = Math.round(track.scrollLeft / step);
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => {
            if (i === activeIdx) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }, { passive: true });

    // Keyboard navigation when track is focused
    track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            scrollPrev();
        } else if (e.key === 'ArrowRight') {
            scrollNext();
        }
    });

    // Auto-play timer (advances every 4.5 seconds, pauses on hover)
    startReviewsAutoPlay(scrollNext);

    track.addEventListener('mouseenter', stopReviewsAutoPlay);
    track.addEventListener('mouseleave', () => startReviewsAutoPlay(scrollNext));
    track.addEventListener('touchstart', stopReviewsAutoPlay, { passive: true });
    track.addEventListener('touchend', () => startReviewsAutoPlay(scrollNext), { passive: true });
}

function scrollToReviewCard(index) {
    const track = document.getElementById('reviewsCarouselTrack');
    if (!track) return;
    const cards = track.querySelectorAll('.review-card');
    if (cards[index]) {
        cards[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function startReviewsAutoPlay(scrollFn) {
    stopReviewsAutoPlay();
    const track = document.getElementById('reviewsCarouselTrack');
    if (!track) return;
    // Don't auto-scroll if only 1 card or screen width shows all cards
    if (track.scrollWidth <= track.clientWidth) return;

    reviewsAutoPlayTimer = setInterval(() => {
        if (typeof scrollFn === 'function') {
            scrollFn();
        }
    }, 4500);
}

function stopReviewsAutoPlay() {
    if (reviewsAutoPlayTimer) {
        clearInterval(reviewsAutoPlayTimer);
        reviewsAutoPlayTimer = null;
    }
}

