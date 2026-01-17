// User Profile Manager - Manages user preferences and order history
const UserProfileManager = (() => {
    const STORAGE_KEY = 'tuc_user_profile';
    
    // Generate or retrieve user ID
    function getUserId() {
        let userId = localStorage.getItem('tuc_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('tuc_user_id', userId);
        }
        return userId;
    }
    
    // Get user profile (create if doesn't exist)
    function getProfile(userId = null) {
        if (!userId) userId = getUserId();
        
        const profileKey = `${STORAGE_KEY}_${userId}`;
        let profile = localStorage.getItem(profileKey);
        
        if (!profile) {
            profile = createDefaultProfile(userId);
            saveProfile(profile);
            return profile;
        }
        
        return JSON.parse(profile);
    }
    
    // Create default profile
    function createDefaultProfile(userId) {
        return {
            userId: userId,
            preferences: {
                dietary: [],
                taste: [],
                avoidances: [],
                priceRange: {
                    min: 0,
                    max: 200
                }
            },
            orderHistory: [],
            interactions: [],
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };
    }
    
    // Save profile to localStorage
    function saveProfile(profile) {
        const profileKey = `${STORAGE_KEY}_${profile.userId}`;
        profile.lastActive = new Date().toISOString();
        localStorage.setItem(profileKey, JSON.stringify(profile));
    }
    
    // Set user preferences
    function setPreferences(preferences, userId = null) {
        const profile = getProfile(userId);
        profile.preferences = {
            ...profile.preferences,
            ...preferences
        };
        saveProfile(profile);
        return profile.preferences;
    }
    
    // Get user preferences
    function getPreferences(userId = null) {
        const profile = getProfile(userId);
        return profile.preferences;
    }
    
    // Add order to history
    function addOrder(order, userId = null) {
        const profile = getProfile(userId);
        
        // Add each item to order history
        order.items.forEach(item => {
            profile.orderHistory.push({
                itemId: item.id,
                itemName: item.name,
                timestamp: new Date().toISOString(),
                quantity: item.quantity,
                price: item.price
            });
        });
        
        saveProfile(profile);
        return profile.orderHistory;
    }
    
    // Get order history
    function getOrderHistory(userId = null, limit = null) {
        const profile = getProfile(userId);
        const history = profile.orderHistory || [];
        
        if (limit) {
            return history.slice(-limit);
        }
        return history;
    }
    
    // Get favorite items (most frequently ordered)
    function getFavoriteItems(userId = null, limit = 5) {
        const profile = getProfile(userId);
        const history = profile.orderHistory || [];
        
        // Count frequency of each item
        const itemCounts = {};
        history.forEach(order => {
            if (!itemCounts[order.itemId]) {
                itemCounts[order.itemId] = {
                    itemId: order.itemId,
                    itemName: order.itemName,
                    count: 0,
                    lastOrdered: order.timestamp
                };
            }
            itemCounts[order.itemId].count += order.quantity;
            itemCounts[order.itemId].lastOrdered = order.timestamp;
        });
        
        // Sort by count and return top items
        return Object.values(itemCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    
    // Get order frequency for specific item
    function getOrderFrequency(itemId, userId = null) {
        const profile = getProfile(userId);
        const history = profile.orderHistory || [];
        
        return history.filter(order => order.itemId === itemId).length;
    }
    
    // Get last order date for specific item
    function getLastOrderDate(itemId, userId = null) {
        const profile = getProfile(userId);
        const history = profile.orderHistory || [];
        
        const orders = history.filter(order => order.itemId === itemId);
        if (orders.length === 0) return null;
        
        return new Date(orders[orders.length - 1].timestamp);
    }
    
    // Get category preference (which categories user orders from most)
    function getCategoryPreference(userId = null) {
        const profile = getProfile(userId);
        const history = profile.orderHistory || [];
        
        // This would need menu data to map items to categories
        // For now, return empty stats
        return {
            breakfast: 0,
            lunch: 0,
            snacks: 0
        };
    }
    
    // Record interaction (view, click, add to cart)
    function recordInteraction(itemId, interactionType, userId = null) {
        const profile = getProfile(userId);
        
        profile.interactions.push({
            itemId: itemId,
            type: interactionType,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 interactions to avoid bloat
        if (profile.interactions.length > 100) {
            profile.interactions = profile.interactions.slice(-100);
        }
        
        saveProfile(profile);
    }
    
    // Get recent interactions
    function getRecentInteractions(userId = null, limit = 20) {
        const profile = getProfile(userId);
        const interactions = profile.interactions || [];
        
        return interactions.slice(-limit);
    }
    
    // Clear profile (for testing or reset)
    function clearProfile(userId = null) {
        if (!userId) userId = getUserId();
        const profileKey = `${STORAGE_KEY}_${userId}`;
        localStorage.removeItem(profileKey);
    }
    
    return {
        getUserId,
        getProfile,
        setPreferences,
        getPreferences,
        addOrder,
        getOrderHistory,
        getFavoriteItems,
        getOrderFrequency,
        getLastOrderDate,
        getCategoryPreference,
        recordInteraction,
        getRecentInteractions,
        clearProfile
    };
})();
