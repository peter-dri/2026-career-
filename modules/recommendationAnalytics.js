// Recommendation Analytics Module - Tracks recommendation effectiveness
const RecommendationAnalytics = (() => {
    const STORAGE_KEY = 'tuc_recommendation_analytics';
    
    // Get analytics data
    function getAnalyticsData() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            return {
                events: [],
                summary: {
                    totalShown: 0,
                    totalClicked: 0,
                    totalOrdered: 0,
                    byStrategy: {
                        collaborative: { shown: 0, clicked: 0, ordered: 0 },
                        contentBased: { shown: 0, clicked: 0, ordered: 0 },
                        popularity: { shown: 0, clicked: 0, ordered: 0 }
                    }
                }
            };
        }
        return JSON.parse(data);
    }
    
    // Save analytics data
    function saveAnalyticsData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    
    // Track recommendation shown
    function trackRecommendationShown(userId, itemId, strategy) {
        const data = getAnalyticsData();
        
        data.events.push({
            type: 'shown',
            userId: userId,
            itemId: itemId,
            strategy: strategy,
            timestamp: new Date().toISOString()
        });
        
        data.summary.totalShown++;
        if (data.summary.byStrategy[strategy]) {
            data.summary.byStrategy[strategy].shown++;
        }
        
        saveAnalyticsData(data);
    }
    
    // Track recommendation clicked
    function trackRecommendationClicked(userId, itemId) {
        const data = getAnalyticsData();
        
        // Find the most recent 'shown' event for this item
        const shownEvent = [...data.events].reverse().find(e => 
            e.type === 'shown' && e.itemId === itemId && e.userId === userId
        );
        
        const strategy = shownEvent ? shownEvent.strategy : 'unknown';
        
        data.events.push({
            type: 'clicked',
            userId: userId,
            itemId: itemId,
            strategy: strategy,
            timestamp: new Date().toISOString()
        });
        
        data.summary.totalClicked++;
        if (data.summary.byStrategy[strategy]) {
            data.summary.byStrategy[strategy].clicked++;
        }
        
        saveAnalyticsData(data);
    }
    
    // Track recommendation ordered
    function trackRecommendationOrdered(userId, itemId) {
        const data = getAnalyticsData();
        
        // Find the most recent 'shown' event for this item
        const shownEvent = [...data.events].reverse().find(e => 
            e.type === 'shown' && e.itemId === itemId && e.userId === userId
        );
        
        const strategy = shownEvent ? shownEvent.strategy : 'unknown';
        
        data.events.push({
            type: 'ordered',
            userId: userId,
            itemId: itemId,
            strategy: strategy,
            timestamp: new Date().toISOString()
        });
        
        data.summary.totalOrdered++;
        if (data.summary.byStrategy[strategy]) {
            data.summary.byStrategy[strategy].ordered++;
        }
        
        saveAnalyticsData(data);
    }
    
    // Calculate click-through rate
    function getClickThroughRate(dateRange = null) {
        const data = getAnalyticsData();
        let events = data.events;
        
        if (dateRange) {
            events = filterByDateRange(events, dateRange);
        }
        
        const shown = events.filter(e => e.type === 'shown').length;
        const clicked = events.filter(e => e.type === 'clicked').length;
        
        return shown > 0 ? (clicked / shown) * 100 : 0;
    }
    
    // Calculate conversion rate
    function getConversionRate(dateRange = null) {
        const data = getAnalyticsData();
        let events = data.events;
        
        if (dateRange) {
            events = filterByDateRange(events, dateRange);
        }
        
        const shown = events.filter(e => e.type === 'shown').length;
        const ordered = events.filter(e => e.type === 'ordered').length;
        
        return shown > 0 ? (ordered / shown) * 100 : 0;
    }
    
    // Get top recommended items
    function getTopRecommendedItems(limit = 10) {
        const data = getAnalyticsData();
        const itemCounts = {};
        
        data.events.forEach(event => {
            if (event.type === 'shown') {
                if (!itemCounts[event.itemId]) {
                    itemCounts[event.itemId] = {
                        itemId: event.itemId,
                        timesRecommended: 0,
                        timesClicked: 0,
                        timesOrdered: 0
                    };
                }
                itemCounts[event.itemId].timesRecommended++;
            } else if (event.type === 'clicked') {
                if (itemCounts[event.itemId]) {
                    itemCounts[event.itemId].timesClicked++;
                }
            } else if (event.type === 'ordered') {
                if (itemCounts[event.itemId]) {
                    itemCounts[event.itemId].timesOrdered++;
                }
            }
        });
        
        return Object.values(itemCounts)
            .map(item => ({
                ...item,
                conversionRate: item.timesRecommended > 0 
                    ? (item.timesOrdered / item.timesRecommended) * 100 
                    : 0
            }))
            .sort((a, b) => b.timesRecommended - a.timesRecommended)
            .slice(0, limit);
    }
    
    // Get strategy effectiveness
    function getStrategyEffectiveness() {
        const data = getAnalyticsData();
        const strategies = {};
        
        Object.keys(data.summary.byStrategy).forEach(strategy => {
            const stats = data.summary.byStrategy[strategy];
            strategies[strategy] = {
                shown: stats.shown,
                clicked: stats.clicked,
                ordered: stats.ordered,
                ctr: stats.shown > 0 ? (stats.clicked / stats.shown) * 100 : 0,
                conversionRate: stats.shown > 0 ? (stats.ordered / stats.shown) * 100 : 0
            };
        });
        
        return strategies;
    }
    
    // Get analytics summary
    function getAnalyticsSummary(dateRange = null) {
        const data = getAnalyticsData();
        let events = data.events;
        
        if (dateRange) {
            events = filterByDateRange(events, dateRange);
        }
        
        const shown = events.filter(e => e.type === 'shown').length;
        const clicked = events.filter(e => e.type === 'clicked').length;
        const ordered = events.filter(e => e.type === 'ordered').length;
        
        return {
            totalRecommendationsShown: shown,
            totalClicks: clicked,
            totalOrders: ordered,
            clickThroughRate: shown > 0 ? (clicked / shown) * 100 : 0,
            conversionRate: shown > 0 ? (ordered / shown) * 100 : 0,
            topItems: getTopRecommendedItems(5),
            strategyEffectiveness: getStrategyEffectiveness()
        };
    }
    
    // Filter events by date range
    function filterByDateRange(events, dateRange) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        
        return events.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= start && eventDate <= end;
        });
    }
    
    // Get preference distribution
    function getPreferenceDistribution() {
        // This would aggregate preferences across all users
        // For now, return mock data
        return {
            vegetarian: 45,
            vegan: 20,
            spicy: 35,
            sweet: 40,
            savory: 60
        };
    }
    
    return {
        trackRecommendationShown,
        trackRecommendationClicked,
        trackRecommendationOrdered,
        getClickThroughRate,
        getConversionRate,
        getTopRecommendedItems,
        getStrategyEffectiveness,
        getAnalyticsSummary,
        getPreferenceDistribution
    };
})();
