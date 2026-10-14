/**
 * TIRA Belle - PWA Registration & Install Manager
 * Registers the Service Worker and manages app install prompts & offline states.
 */

(function() {
    'use strict';

    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('TIRA Belle PWA ServiceWorker registered with scope:', reg.scope);
                })
                .catch(err => {
                    console.warn('TIRA Belle ServiceWorker registration failed:', err);
                });
        });
    }

    // 2. Install Prompt Handling
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
        // Prevent default mini-infobar
        e.preventDefault();
        deferredPrompt = e;

        // Show install button if present on page
        const installBtns = document.querySelectorAll('.pwa-install-btn');
        installBtns.forEach(btn => {
            btn.style.display = 'inline-flex';
            btn.onclick = () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(choiceResult => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the TIRA Belle PWA prompt');
                        }
                        deferredPrompt = null;
                        installBtns.forEach(b => b.style.display = 'none');
                    });
                }
            };
        });
    });

    window.addEventListener('appinstalled', () => {
        console.log('TIRA Belle was installed successfully');
        deferredPrompt = null;
        document.querySelectorAll('.pwa-install-btn').forEach(btn => {
            btn.style.display = 'none';
        });
    });

    // 3. Online/Offline Network Status Notifications
    function updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const banner = document.getElementById('offlineNoticeBanner');
        if (!isOnline) {
            if (!banner) {
                const b = document.createElement('div');
                b.id = 'offlineNoticeBanner';
                b.className = 'offline-notice-banner';
                b.innerHTML = `
                    <span class="offline-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" x2="23" y1="1" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg></span>
                    <span>Offline Mode Active • TIRA Belle counter and local records remain fully operational.</span>
                `;
                document.body.prepend(b);
            } else {
                banner.style.display = 'flex';
            }
        } else if (banner) {
            banner.style.display = 'none';
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    document.addEventListener('DOMContentLoaded', updateOnlineStatus);
})();
