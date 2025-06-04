export default function registerServiceWorker() {
    if (!navigator.serviceWorker) return Promise.resolve(false);
    
    return navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then(function(registration) {
            console.log('Service Worker registered successfully:', registration);
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content is available, notify user
                        console.log('New content is available; please refresh.');
                    }
                });
            });
            
            // Optional: Set up push notifications
            if ('PushManager' in window) {
                return navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                    return serviceWorkerRegistration.pushManager.getSubscription()
                        .then(function(subscription) {
                            if (subscription) {
                                return subscription;
                            }
                            // Only subscribe if user hasn't explicitly denied
                            if (Notification.permission === 'granted') {
                                return serviceWorkerRegistration.pushManager.subscribe({
                                    userVisibleOnly: true,
                                });
                            }
                            return null;
                        });
                });
            }
            
            return registration;
        })
        .then(function(subscriptionOrRegistration) {
            if (subscriptionOrRegistration && subscriptionOrRegistration.endpoint) {
                // Handle push subscription
                const subscription = subscriptionOrRegistration;
                const rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
                const key = rawKey
                    ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey)))
                    : '';
                const rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
                const authSecret = rawAuthSecret
                    ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret)))
                    : '';
                return {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: key,
                        auth: authSecret,
                    },
                };
            }
            return subscriptionOrRegistration;
        })
        .catch(function(error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        });
}
