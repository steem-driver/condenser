class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observers = {};
        this.isSupported = 'performance' in window && 'PerformanceObserver' in window;
        
        if (this.isSupported) {
            this.initObservers();
        }
    }

    initObservers() {
        // Observe navigation timing
        if ('getEntriesByType' in performance) {
            this.observeNavigationTiming();
        }

        // Observe resource timing
        try {
            const resourceObserver = new PerformanceObserver((list) => {
                this.handleResourceEntries(list.getEntries());
            });
            resourceObserver.observe({ entryTypes: ['resource'] });
            this.observers.resource = resourceObserver;
        } catch (e) {
            console.warn('Resource timing observer not supported');
        }

        // Observe paint timing
        try {
            const paintObserver = new PerformanceObserver((list) => {
                this.handlePaintEntries(list.getEntries());
            });
            paintObserver.observe({ entryTypes: ['paint'] });
            this.observers.paint = paintObserver;
        } catch (e) {
            console.warn('Paint timing observer not supported');
        }

        // Observe largest contentful paint
        try {
            const lcpObserver = new PerformanceObserver((list) => {
                this.handleLCPEntries(list.getEntries());
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.lcp = lcpObserver;
        } catch (e) {
            console.warn('LCP observer not supported');
        }

        // Observe first input delay
        try {
            const fidObserver = new PerformanceObserver((list) => {
                this.handleFIDEntries(list.getEntries());
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
            this.observers.fid = fidObserver;
        } catch (e) {
            console.warn('FID observer not supported');
        }
    }

    observeNavigationTiming() {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            this.metrics.navigation = {
                dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                tcp: navigation.connectEnd - navigation.connectStart,
                ssl: navigation.secureConnectionStart > 0 ? 
                     navigation.connectEnd - navigation.secureConnectionStart : 0,
                ttfb: navigation.responseStart - navigation.requestStart,
                download: navigation.responseEnd - navigation.responseStart,
                domParsing: navigation.domContentLoadedEventStart - navigation.responseEnd,
                domReady: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                pageLoad: navigation.loadEventEnd - navigation.navigationStart,
            };
        }
    }

    handleResourceEntries(entries) {
        entries.forEach(entry => {
            if (entry.name.includes('.js') || entry.name.includes('.css')) {
                const resourceType = entry.name.includes('.js') ? 'script' : 'style';
                if (!this.metrics.resources) this.metrics.resources = {};
                if (!this.metrics.resources[resourceType]) this.metrics.resources[resourceType] = [];
                
                this.metrics.resources[resourceType].push({
                    name: entry.name,
                    duration: entry.duration,
                    size: entry.transferSize || entry.encodedBodySize,
                    cached: entry.transferSize === 0 && entry.encodedBodySize > 0,
                });
            }
        });
    }

    handlePaintEntries(entries) {
        entries.forEach(entry => {
            if (entry.name === 'first-paint') {
                this.metrics.firstPaint = entry.startTime;
            } else if (entry.name === 'first-contentful-paint') {
                this.metrics.firstContentfulPaint = entry.startTime;
            }
        });
    }

    handleLCPEntries(entries) {
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
    }

    handleFIDEntries(entries) {
        const firstEntry = entries[0];
        this.metrics.firstInputDelay = firstEntry.processingStart - firstEntry.startTime;
    }

    // Custom timing marks
    mark(name) {
        if (this.isSupported) {
            performance.mark(name);
        }
    }

    measure(name, startMark, endMark) {
        if (this.isSupported) {
            try {
                performance.measure(name, startMark, endMark);
                const measure = performance.getEntriesByName(name, 'measure')[0];
                return measure ? measure.duration : null;
            } catch (e) {
                console.warn('Performance measure failed:', e);
                return null;
            }
        }
        return null;
    }

    // Get current metrics
    getMetrics() {
        return { ...this.metrics };
    }

    // Report metrics to analytics or monitoring service
    reportMetrics() {
        const metrics = this.getMetrics();
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.group('Performance Metrics');
            console.table(metrics.navigation);
            if (metrics.firstPaint) console.log('First Paint:', metrics.firstPaint + 'ms');
            if (metrics.firstContentfulPaint) console.log('First Contentful Paint:', metrics.firstContentfulPaint + 'ms');
            if (metrics.largestContentfulPaint) console.log('Largest Contentful Paint:', metrics.largestContentfulPaint + 'ms');
            if (metrics.firstInputDelay) console.log('First Input Delay:', metrics.firstInputDelay + 'ms');
            console.groupEnd();
        }

        // Send to analytics service (implement as needed)
        this.sendToAnalytics(metrics);
    }

    sendToAnalytics(metrics) {
        // Implement analytics reporting here
        // Example: Google Analytics, custom endpoint, etc.
        if (window.gtag) {
            // Report Core Web Vitals to Google Analytics
            if (metrics.largestContentfulPaint) {
                window.gtag('event', 'LCP', {
                    event_category: 'Web Vitals',
                    value: Math.round(metrics.largestContentfulPaint),
                    non_interaction: true,
                });
            }
            
            if (metrics.firstInputDelay) {
                window.gtag('event', 'FID', {
                    event_category: 'Web Vitals',
                    value: Math.round(metrics.firstInputDelay),
                    non_interaction: true,
                });
            }
        }
    }

    // Calculate Cumulative Layout Shift (CLS)
    observeCLS() {
        if (!this.isSupported) return;
        
        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries = [];

        try {
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        const firstSessionEntry = sessionEntries[0];
                        const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

                        if (sessionValue && 
                            entry.startTime - lastSessionEntry.startTime < 1000 &&
                            entry.startTime - firstSessionEntry.startTime < 5000) {
                            sessionValue += entry.value;
                            sessionEntries.push(entry);
                        } else {
                            sessionValue = entry.value;
                            sessionEntries = [entry];
                        }

                        if (sessionValue > clsValue) {
                            clsValue = sessionValue;
                            this.metrics.cumulativeLayoutShift = clsValue;
                        }
                    }
                }
            });

            clsObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.cls = clsObserver;
        } catch (e) {
            console.warn('CLS observer not supported');
        }
    }

    // Clean up observers
    disconnect() {
        Object.values(this.observers).forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-report metrics after page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Wait a bit for all metrics to be collected
        setTimeout(() => {
            performanceMonitor.observeCLS();
            performanceMonitor.reportMetrics();
        }, 1000);
    });
}

export default performanceMonitor;