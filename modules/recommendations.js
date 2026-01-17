// Recommendation Engine - AI-powered food recommendations
const RecommendationEngine = (() => {
    // Configuration
    const config = {
        weights: {
            collaborative: 0.4,
            contentBased: 0.35,
            popularity: 0.25
        },
        minOrdersForCollaborative: 3,
        maxRecommendations: 6,
        recencyDecayDays: 30,
        similarUserCount: 10,
        recentOrderExclusionDays: 7
    };
    
    let allMenuItems = [];
    let allOrderHistory = [];
    
    // Initialize with menu data
    function init(menuData, orderHistory) {
        // Flatten menu data into single array
        allMenuItems = [];
        if (menuData.breakfast) allMenuItems.push(...menuData.breakfast);
        if (menuData.lunch) allMenuItems.push(...menuData.lunch);
        if (menuData.snacks) allMenuItems.push(...menuData.snacks);
        
        allOrderHistory = orderHistory || [];
    }
    
    // Normalize scores to 0-1 range
    function normalizeScores(scores) {
        if (scores.length === 0) return [];
        
        const max = Math.max(...scores.map(s => s.score));
        const min = Math.min(...scores.map(s => s.score));
        
        if (max === min) {
            return scores.map(s => ({ ...s, score: 1 }));
        }
        
        return scores.map(s => ({
            ...s,
            score: (s.score - min) / (max - min)
        }));
    }
    
    // Calculate recency decay factor
    function getRecencyDecay(dateString) {
        const orderDate = new Date(dateString);
        const now = new Date();
        const daysDiff = (now - orderDate) / (1000 * 60 * 60 * 24);
        
        // Exponential decay: e^(-days / decayDays)
        return Math.exp(-daysDiff / config.recencyDecayDays);
    }
    
    // Get item by ID
    function getItemById(itemId) {
        return allMenuItems.find(item => item.id === itemId);
    }
    
    // Calculate cosine similarity between two tag arrays
    function calculateTagSimilarity(tags1, tags2) {
        if (!tags1 || !tags2 || tags1.length === 0 || tags2.length === 0) {
            return 0;
        }
        
        const intersection = tags1.filter(tag => tags2.includes(tag)).length;
        const magnitude1 = Math.sqrt(tags1.length);
        const magnitude2 = Math.sqrt(tags2.length);
        
        return intersection / (magnitude1 * magnitude2);
    }
    
    // Aggregate scores from multiple strategies
    function aggregateScores(scoredItemsArray) {
        const itemScores = {};
        
        scoredItemsArray.forEach((strategyScores, index) => {
            const strategyName = ['collaborative', 'contentBased', 'popularity'][index];
            const weight = config.weights[strategyName] || 0;
            
            strategyScores.forEach(scored => {
                if (!itemScores[scored.itemId]) {
                    itemScores[scored.itemId] = {
                        itemId: scored.itemId,
                        item: scored.item,
                        score: 0,
                        strategies: {}
                    };
                }
                
                itemScores[scored.itemId].score += scored.score * weight;
                itemScores[scored.itemId].strategies[strategyName] = scored.score;
            });
        });
        
        return Object.values(itemScores);
    }
    
    // Apply diversity filter to ensure variety across categories
    function applyDiversityFilter(recommendations) {
        const categoryCounts = {};
        const maxPerCategory = Math.ceil(recommendations.length * 0.4);
        
        return recommendations.filter(rec => {
            const category = rec.item.category;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            return categoryCounts[category] <= maxPerCategory;
        });
    }
    
    // Collaborative filtering algorithm
    function collaborativeFiltering(userId) {
        const userProfile = UserProfileManager.getProfile(userId);
        const userOrders = userProfile.orderHistory || [];
        
        // Need minimum orders for collaborative filtering
        if (userOrders.length < config.minOrdersForCollaborative) {
            return [];
        }
        
        // Get user's ordered item IDs
        const userItemIds = new Set(userOrders.map(o => o.itemId));
        
        // Find similar users from global order history
        const userSimilarities = [];
        const processedUsers = new Set();
        
        allOrderHistory.forEach(order => {
            // Use phone number or order ID as user identifier
            const otherUserId = order.mpesaPhone || order.id;
            
            if (processedUsers.has(otherUserId)) return;
            processedUsers.add(otherUserId);
            
            // Get items from this order
            const otherItemIds = new Set(order.items.map(i => i.id));
            
            // Calculate similarity (Jaccard similarity)
            const intersection = [...userItemIds].filter(id => otherItemIds.has(id)).length;
            const union = new Set([...userItemIds, ...otherItemIds]).size;
            
            if (intersection > 0 && union > 0) {
                const similarity = intersection / Math.sqrt(userItemIds.size * otherItemIds.size);
                userSimilarities.push({
                    userId: otherUserId,
                    similarity: similarity,
                    items: [...otherItemIds]
                });
            }
        });
        
        // Get top K similar users
        const similarUsers = userSimilarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, config.similarUserCount);
        
        if (similarUsers.length === 0) {
            return [];
        }
        
        // Aggregate item scores from similar users
        const itemScores = {};
        similarUsers.forEach(simUser => {
            simUser.items.forEach(itemId => {
                // Don't recommend items user already ordered
                if (userItemIds.has(itemId)) return;
                
                const item = getItemById(itemId);
                if (!item || item.available === 0) return;
                
                if (!itemScores[itemId]) {
                    itemScores[itemId] = {
                        itemId: itemId,
                        item: item,
                        score: 0
                    };
                }
                
                itemScores[itemId].score += simUser.similarity;
            });
        });
        
        const scoredItems = Object.values(itemScores).map(scored => ({
            ...scored,
            reason: 'Students who ordered similar items also liked this',
            strategy: 'collaborative'
        }));
        
        return normalizeScores(scoredItems);
    }
    
    // Content-based filtering algorithm
    function contentBasedFiltering(userId) {
        const userProfile = UserProfileManager.getProfile(userId);
        const orderHistory = userProfile.orderHistory || [];
        const preferences = userProfile.preferences || {};
        
        // Build user preference vector from order history
        const userTags = {};
        orderHistory.forEach(order => {
            const item = getItemById(order.itemId);
            if (item && item.tags) {
                item.tags.forEach(tag => {
                    userTags[tag] = (userTags[tag] || 0) + 1;
                });
            }
        });
        
        // Add explicit preferences with higher weight
        if (preferences.dietary) {
            preferences.dietary.forEach(pref => {
                userTags[pref] = (userTags[pref] || 0) + 5;
            });
        }
        if (preferences.taste) {
            preferences.taste.forEach(pref => {
                userTags[pref] = (userTags[pref] || 0) + 5;
            });
        }
        
        const userTagArray = Object.keys(userTags);
        
        // Score each item based on tag similarity
        const scoredItems = allMenuItems
            .filter(item => item.available > 0)
            .map(item => {
                let score = 0;
                
                // Calculate tag similarity
                if (item.tags && userTagArray.length > 0) {
                    score = calculateTagSimilarity(item.tags, userTagArray);
                }
                
                // Boost if matches explicit preferences
                if (item.tags && preferences.dietary) {
                    const matchingDietary = item.tags.filter(tag => 
                        preferences.dietary.includes(tag)
                    ).length;
                    score *= (1 + matchingDietary * 0.5);
                }
                
                if (item.tags && preferences.taste) {
                    const matchingTaste = item.tags.filter(tag => 
                        preferences.taste.includes(tag)
                    ).length;
                    score *= (1 + matchingTaste * 0.3);
                }
                
                // Apply price preference filter
                if (preferences.priceRange) {
                    if (item.price >= preferences.priceRange.min && 
                        item.price <= preferences.priceRange.max) {
                        score *= 1.2;
                    }
                }
                
                // Filter out items that don't match dietary restrictions
                if (preferences.dietary) {
                    if (preferences.dietary.includes('vegetarian') && !item.isVegetarian) {
                        score = 0;
                    }
                    if (preferences.dietary.includes('vegan') && !item.isVegan) {
                        score = 0;
                    }
                }
                
                return {
                    itemId: item.id,
                    item: item,
                    score: score,
                    reason: 'Based on your preferences',
                    strategy: 'contentBased'
                };
            })
            .filter(scored => scored.score > 0);
        
        return normalizeScores(scoredItems);
    }
    
    // Popularity-based recommendation algorithm
    function popularityBased() {
        const scoredItems = allMenuItems
            .filter(item => item.available > 0)
            .map(item => {
                // Calculate popularity score
                const totalOrders = item.totalOrders || 0;
                
                // Calculate recent orders (last 7 days)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                const recentOrders = allOrderHistory.filter(order => {
                    const orderDate = new Date(order.timestamp);
                    return orderDate >= sevenDaysAgo && 
                           order.items.some(i => i.id === item.id);
                }).length;
                
                // Combine total and recent popularity
                const popularityScore = (totalOrders * 0.7) + (recentOrders * 10 * 0.3);
                
                return {
                    itemId: item.id,
                    item: item,
                    score: popularityScore,
                    reason: 'Popular with students',
                    strategy: 'popularity'
                };
            });
        
        return normalizeScores(scoredItems);
    }
    
    // Get personalized recommendations (hybrid approach)
    function getPersonalizedRecommendations(userId, count = 6) {
        const userProfile = UserProfileManager.getProfile(userId);
        const hasOrderHistory = userProfile.orderHistory && userProfile.orderHistory.length > 0;
        
        let recommendations = [];
        
        if (!hasOrderHistory) {
            // New user - use popularity only
            recommendations = popularityBased();
        } else {
            // Existing user - use hybrid approach
            const collabScores = collaborativeFiltering(userId);
            const contentScores = contentBasedFiltering(userId);
            const popularScores = popularityBased();
            
            // Aggregate scores
            const aggregated = aggregateScores([collabScores, contentScores, popularScores]);
            
            // Sort by final score
            recommendations = aggregated.sort((a, b) => b.score - a.score);
            
            // Apply diversity filter
            recommendations = applyDiversityFilter(recommendations);
        }
        
        // Return top N recommendations
        return recommendations.slice(0, count).map(rec => ({
            ...rec,
            confidence: rec.score
        }));
    }
    
    // Get similar items (for "Students who ordered X also liked Y")
    function getSimilarItems(itemId, count = 3) {
        const targetItem = getItemById(itemId);
        if (!targetItem) return [];
        
        // Find orders that include this item
        const ordersWithItem = allOrderHistory.filter(order => 
            order.items.some(i => i.id === itemId)
        );
        
        if (ordersWithItem.length === 0) {
            // No collaborative data - return items from same category
            return allMenuItems
                .filter(item => 
                    item.id !== itemId && 
                    item.category === targetItem.category &&
                    item.available > 0
                )
                .slice(0, count)
                .map(item => ({
                    itemId: item.id,
                    item: item,
                    score: 1,
                    reason: `Similar to ${targetItem.name}`,
                    strategy: 'category',
                    confidence: 0.5
                }));
        }
        
        // Count co-occurrences
        const coOccurrences = {};
        ordersWithItem.forEach(order => {
            order.items.forEach(item => {
                if (item.id !== itemId) {
                    coOccurrences[item.id] = (coOccurrences[item.id] || 0) + 1;
                }
            });
        });
        
        // Get items and sort by co-occurrence count
        const similarItems = Object.entries(coOccurrences)
            .map(([id, count]) => {
                const item = getItemById(parseInt(id));
                return item && item.available > 0 ? {
                    itemId: item.id,
                    item: item,
                    score: count,
                    reason: `Students who ordered ${targetItem.name} also liked this`,
                    strategy: 'collaborative',
                    confidence: Math.min(count / ordersWithItem.length, 1)
                } : null;
            })
            .filter(item => item !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, count);
        
        return similarItems;
    }
    
    return {
        config,
        init,
        normalizeScores,
        getRecencyDecay,
        getItemById,
        calculateTagSimilarity,
        aggregateScores,
        applyDiversityFilter,
        collaborativeFiltering,
        contentBasedFiltering,
        popularityBased,
        getPersonalizedRecommendations,
        getSimilarItems
    };
})();
