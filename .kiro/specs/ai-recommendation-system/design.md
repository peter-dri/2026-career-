# AI Recommendation System - Design Document

## Overview

The AI Recommendation System enhances the Tharaka University Cafeteria platform by providing intelligent, personalized food recommendations. The system uses multiple recommendation strategies including collaborative filtering, content-based filtering, and popularity-based recommendations to suggest relevant menu items to students.

The system is designed to be lightweight, client-side focused with minimal server overhead, and seamlessly integrated into the existing architecture. It learns from order history, respects user preferences, and provides actionable insights through an admin analytics dashboard.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Recommendation UI Components                  │ │
│  │  - Recommended for You Section                         │ │
│  │  - Similar Items Section                               │ │
│  │  - Preference Settings Panel                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Recommendation Engine (Client-Side)            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │ Collaborative│  │Content-Based │  │  Popularity │ │ │
│  │  │   Filtering  │  │   Filtering  │  │    Based    │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │         Score Aggregator & Ranker                │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Local Storage Manager                     │ │
│  │  - User Preferences                                    │ │
│  │  - Order History Cache                                 │ │
│  │  - Interaction Tracking                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Server (Node.js)                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Data Storage (data.json)                  │ │
│  │  - foodData (with preference tags)                     │ │
│  │  - orderHistory (with user identifiers)                │ │
│  │  - userPreferences                                     │ │
│  │  - recommendationMetrics                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Client-Side First**: Most recommendation logic runs in the browser to minimize server load
2. **Progressive Enhancement**: System works without recommendations if data is unavailable
3. **Privacy-Conscious**: User data stored locally with minimal server-side tracking
4. **Modular**: Each recommendation strategy is independent and configurable
5. **Performance**: Recommendations generated in under 500ms
6. **Extensible**: Easy to add new recommendation algorithms

## Components and Interfaces

### 1. Recommendation Engine Module (`modules/recommendations.js`)

The core engine that orchestrates all recommendation strategies.

```javascript
const RecommendationEngine = {
    // Configuration
    config: {
        weights: {
            collaborative: 0.4,
            contentBased: 0.35,
            popularity: 0.25
        },
        minOrdersForCollaborative: 3,
        maxRecommendations: 6,
        recencyDecayDays: 30
    },
    
    // Main API
    getPersonalizedRecommendations(userId, count): Promise<RecommendedItem[]>,
    getSimilarItems(itemId, count): Promise<RecommendedItem[]>,
    recordInteraction(userId, itemId, interactionType): void,
    updateUserPreferences(userId, preferences): void,
    
    // Strategy implementations
    collaborativeFiltering(userId, allItems): ScoredItem[],
    contentBasedFiltering(userId, allItems): ScoredItem[],
    popularityBased(allItems): ScoredItem[],
    
    // Utilities
    aggregateScores(scoredItemsArray): ScoredItem[],
    applyRecencyDecay(orderDate): number,
    calculateSimilarity(user1Orders, user2Orders): number
}
```

### 2. User Profile Manager (`modules/userProfile.js`)

Manages user preferences and order history.

```javascript
const UserProfileManager = {
    // Get or create user profile
    getProfile(userId): UserProfile,
    
    // Preference management
    setPreferences(userId, preferences): void,
    getPreferences(userId): PreferenceSet,
    
    // Order history
    addOrder(userId, order): void,
    getOrderHistory(userId, limit): Order[],
    getFavoriteItems(userId): Item[],
    
    // Analytics
    getOrderFrequency(userId, itemId): number,
    getLastOrderDate(userId, itemId): Date,
    getCategoryPreference(userId): CategoryStats
}
```

### 3. Recommendation UI Module (`modules/recommendationUI.js`)

Handles rendering recommendations in the interface.

```javascript
const RecommendationUI = {
    // Render recommendation sections
    renderPersonalizedSection(recommendations): void,
    renderSimilarItemsSection(itemId, recommendations): void,
    renderPreferenceSettings(currentPreferences): void,
    
    // Interaction handlers
    onRecommendationClick(itemId): void,
    onPreferenceChange(preferences): void,
    
    // Visual feedback
    showRecommendationReason(itemId, reason): void,
    highlightMatchingPreferences(item, userPreferences): void
}
```

### 4. Analytics Module (`modules/recommendationAnalytics.js`)

Tracks recommendation effectiveness for admin dashboard.

```javascript
const RecommendationAnalytics = {
    // Track metrics
    trackRecommendationShown(userId, itemId, strategy): void,
    trackRecommendationClicked(userId, itemId): void,
    trackRecommendationOrdered(userId, itemId): void,
    
    // Calculate metrics
    getClickThroughRate(dateRange): number,
    getConversionRate(dateRange): number,
    getTopRecommendedItems(limit): Item[],
    getStrategyEffectiveness(): StrategyMetrics,
    
    // Admin dashboard data
    getAnalyticsSummary(dateRange): AnalyticsSummary
}
```

## Data Models

### Extended Food Item

```javascript
{
    id: number,
    name: string,
    price: number,
    available: number,
    unit: string,
    category: string,  // breakfast, lunch, snacks
    
    // NEW: Preference tags
    tags: string[],    // ['vegetarian', 'spicy', 'sweet', 'vegan', 'protein-rich', 'light']
    
    // NEW: Popularity metrics
    totalOrders: number,
    averageRating: number,
    
    // NEW: Nutritional info (optional)
    calories: number,
    isVegetarian: boolean,
    isVegan: boolean,
    spicyLevel: number  // 0-3
}
```

### User Profile

```javascript
{
    userId: string,  // Generated from session or phone number
    preferences: {
        dietary: string[],      // ['vegetarian', 'vegan', 'halal']
        taste: string[],        // ['spicy', 'sweet', 'savory']
        avoidances: string[],   // ['nuts', 'dairy']
        priceRange: {
            min: number,
            max: number
        }
    },
    orderHistory: [
        {
            itemId: number,
            timestamp: Date,
            quantity: number,
            rating: number  // optional
        }
    ],
    interactions: [
        {
            itemId: number,
            type: string,  // 'view', 'click_recommendation', 'add_to_cart'
            timestamp: Date
        }
    ],
    createdAt: Date,
    lastActive: Date
}
```

### Recommendation Result

```javascript
{
    itemId: number,
    item: FoodItem,
    score: number,  // 0-1
    reason: string,  // "Based on your preferences" | "Popular with students" | "Similar to items you liked"
    strategy: string,  // 'collaborative' | 'content' | 'popularity' | 'hybrid'
    confidence: number  // 0-1
}
```

### Recommendation Metrics

```javascript
{
    period: {
        start: Date,
        end: Date
    },
    totalRecommendationsShown: number,
    totalClicks: number,
    totalOrders: number,
    clickThroughRate: number,
    conversionRate: number,
    
    byStrategy: {
        collaborative: StrategyMetrics,
        contentBased: StrategyMetrics,
        popularity: StrategyMetrics
    },
    
    topRecommendedItems: [
        {
            itemId: number,
            itemName: string,
            timesRecommended: number,
            timesOrdered: number,
            conversionRate: number
        }
    ],
    
    preferenceDistribution: {
        vegetarian: number,
        vegan: number,
        spicy: number,
        sweet: number
    }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Recommendations are properly scored and ordered
*For any* user profile and menu data, when generating personalized recommendations, all items should have valid recommendation scores (0-1 range) and be displayed in descending order by score
**Validates: Requirements 1.3, 1.4**

### Property 2: Interaction recording updates profile
*For any* user and recommended item, when the user orders that item, the interaction should be recorded in the user's profile with the correct timestamp and item details
**Validates: Requirements 1.5**

### Property 3: Collaborative filtering identifies similar users correctly
*For any* two users with overlapping order histories, the similarity calculation should return a higher score than for users with no overlap
**Validates: Requirements 2.2**

### Property 4: Co-purchased items are identified
*For any* item with sufficient order history, the collaborative filtering algorithm should identify items that are frequently ordered together by the same users
**Validates: Requirements 2.3**

### Property 5: Recent orders are excluded from recommendations
*For any* user with recent order history, items ordered within the last 7 days should not appear in the "similar items" recommendations
**Validates: Requirements 2.4**

### Property 6: Preference persistence round-trip
*For any* set of user preferences, saving preferences and then retrieving them should return the same preference set
**Validates: Requirements 3.2**

### Property 7: Preference matching increases scores
*For any* menu item and user preferences, items matching more user preference tags should receive proportionally higher recommendation scores than items matching fewer tags
**Validates: Requirements 3.3, 3.4**

### Property 8: Dietary restrictions filter recommendations
*For any* user with vegetarian or vegan preferences selected, all recommended items should match those dietary restrictions (no non-vegetarian items for vegetarians, no non-vegan items for vegans)
**Validates: Requirements 3.5**

### Property 9: Order history updates profile correctly
*For any* completed order, the user's profile should be updated with all ordered items, quantities, and the order timestamp
**Validates: Requirements 4.1**

### Property 10: Recent orders weighted more heavily
*For any* user with orders at different times, when calculating recommendation scores, items similar to recent orders should contribute more to the score than items similar to older orders
**Validates: Requirements 4.2**

### Property 11: Frequent orders influence recommendations
*For any* user who has ordered the same item multiple times, the recommendation engine should identify this as a favorite and increase scores for items with similar tags or from the same category
**Validates: Requirements 4.3**

### Property 12: Multiple factors influence scoring
*For any* user profile with order history, the recommendation score calculation should incorporate order frequency, recency, and ratings (when available) such that changing any factor changes the final score
**Validates: Requirements 4.5**

### Property 13: Top recommended items aggregation
*For any* set of recommendation events across all users, the analytics system should correctly identify and rank the most frequently recommended items
**Validates: Requirements 5.2**

### Property 14: Preference distribution calculation
*For any* set of user profiles, the analytics system should correctly calculate the percentage distribution of each preference tag across the population
**Validates: Requirements 5.3**

### Property 15: Conversion tracking accuracy
*For any* recommendation that leads to an order, the analytics system should correctly increment the conversion count for that item and update the conversion rate
**Validates: Requirements 5.4**

### Property 16: Date range filtering
*For any* analytics query with a date range, only recommendation events within that date range should be included in the results
**Validates: Requirements 5.5**

### Property 17: Recommended items have full functionality
*For any* recommended item, all operations available for regular menu items (add to cart, view details, check availability) should also be available
**Validates: Requirements 6.2**

### Property 18: Recommendation reasons are generated
*For any* recommendation displayed to a user, the system should generate and include a human-readable reason string explaining why the item was recommended
**Validates: Requirements 6.5**

### Property 19: Configurable weights affect scores
*For any* set of recommendation weights (collaborative, content-based, popularity), changing the weights should change the final recommendation scores in proportion to the weight changes
**Validates: Requirements 7.2**

### Property 20: Random strategy assignment for A/B testing
*For any* set of users when A/B testing is enabled, users should be randomly assigned to different recommendation strategies with approximately equal distribution
**Validates: Requirements 7.5**

## Recommendation Algorithms

### 1. Collaborative Filtering

Uses user-user similarity to find recommendations based on what similar users have ordered.

**Algorithm:**
```
1. For target user U:
2. Find all other users who have ordered at least one item that U has ordered
3. Calculate similarity score for each user:
   similarity(U, V) = |orders(U) ∩ orders(V)| / sqrt(|orders(U)| * |orders(V)|)
4. Select top K most similar users (K = 10)
5. For each item ordered by similar users but not by U:
   score(item) = Σ(similarity(U, V) * frequency(V, item)) for all V
6. Apply recency decay: score *= exp(-days_since_order / 30)
7. Return top N items by score
```

**Strengths:**
- Discovers unexpected connections
- Works well with sufficient data
- Captures implicit preferences

**Limitations:**
- Cold start problem for new users
- Requires minimum order history
- Computationally intensive for large user bases

### 2. Content-Based Filtering

Recommends items similar to what the user has liked based on item attributes.

**Algorithm:**
```
1. For target user U:
2. Build user preference vector from order history:
   - Extract all tags from ordered items
   - Weight by order frequency and recency
3. For each menu item I:
   score(I) = cosine_similarity(user_vector, item_tags)
4. Boost score if item matches explicit preferences:
   if item.tags ∩ user.preferences:
     score *= 1.5
5. Apply price preference filter:
   if item.price in user.priceRange:
     score *= 1.2
6. Return top N items by score
```

**Strengths:**
- Works for new users with preferences set
- Transparent and explainable
- No cold start problem

**Limitations:**
- Limited discovery of new types
- Requires good item metadata
- Can create filter bubble

### 3. Popularity-Based

Recommends items that are popular among all users.

**Algorithm:**
```
1. For each menu item I:
   popularity_score(I) = (total_orders * 0.7) + (avg_rating * 0.3)
2. Apply time decay for recent popularity:
   recent_orders = orders in last 7 days
   score(I) = popularity_score * (1 + recent_orders / total_orders)
3. Filter by availability:
   if item.available == 0: score = 0
4. Return top N items by score
```

**Strengths:**
- Always works (no cold start)
- Simple and fast
- Good fallback strategy

**Limitations:**
- Not personalized
- Popularity bias
- Doesn't learn user preferences

### 4. Hybrid Approach

Combines all three strategies with configurable weights.

**Algorithm:**
```
1. Generate scores from all three strategies:
   collab_scores = collaborative_filtering(user)
   content_scores = content_based_filtering(user)
   popular_scores = popularity_based()

2. Normalize all scores to [0, 1] range

3. Combine with weights:
   final_score(item) = 
     w_collab * collab_score(item) +
     w_content * content_score(item) +
     w_popular * popular_score(item)
   
   where w_collab + w_content + w_popular = 1

4. Apply diversity filter:
   - Ensure recommendations span multiple categories
   - Limit items from same category to 40%

5. Return top N items by final_score
```

## Error Handling

### Client-Side Error Handling

1. **No Order History**
   - Fallback to popularity-based recommendations
   - Show "Popular with students" instead of "Recommended for you"

2. **Insufficient Data for Collaborative Filtering**
   - Require minimum 3 orders before using collaborative filtering
   - Use content-based + popularity until threshold met

3. **No Matching Preferences**
   - Relax preference constraints gradually
   - Show closest matches with explanation

4. **Recommendation Generation Timeout**
   - Set 500ms timeout for recommendation calculation
   - Fall back to cached popular items if timeout exceeded
   - Log timeout for performance monitoring

5. **Invalid User Profile**
   - Create new profile with default preferences
   - Use popularity-based recommendations

### Server-Side Error Handling

1. **Data Persistence Failures**
   - Retry failed writes up to 3 times
   - Log errors for admin review
   - Continue operation with in-memory data

2. **Corrupted User Data**
   - Validate profile structure on load
   - Reset corrupted profiles to defaults
   - Notify user of profile reset

3. **Analytics Calculation Errors**
   - Catch and log calculation errors
   - Return partial results when possible
   - Show error message in admin dashboard

## Testing Strategy

### Unit Testing

The system will use **Jest** as the testing framework for unit tests.

**Unit test coverage:**

1. **Recommendation Algorithm Tests**
   - Test each algorithm (collaborative, content-based, popularity) independently
   - Verify score calculations with known inputs
   - Test edge cases: empty order history, single item, all items unavailable

2. **User Profile Tests**
   - Test preference saving and retrieval
   - Test order history management
   - Test profile creation and updates

3. **Analytics Tests**
   - Test metric calculations (CTR, conversion rate)
   - Test aggregation functions
   - Test date range filtering

4. **UI Component Tests**
   - Test recommendation section rendering
   - Test preference settings UI
   - Test interaction handlers

### Property-Based Testing

The system will use **fast-check** (JavaScript property-based testing library) as the testing framework for property-based tests.

**Property-based testing requirements:**

- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with a comment referencing the correctness property from this design document
- Tag format: `// Feature: ai-recommendation-system, Property {number}: {property_text}`
- Each correctness property will be implemented by a SINGLE property-based test
- Tests will use smart generators that constrain inputs to valid ranges

**Property test coverage:**

1. **Score Calculation Properties**
   - Property 1: Scores are valid and ordered
   - Property 7: Preference matching increases scores
   - Property 10: Recent orders weighted more heavily
   - Property 12: Multiple factors influence scoring
   - Property 19: Configurable weights affect scores

2. **Data Persistence Properties**
   - Property 2: Interaction recording updates profile
   - Property 6: Preference persistence round-trip
   - Property 9: Order history updates profile correctly

3. **Filtering Properties**
   - Property 5: Recent orders excluded from recommendations
   - Property 8: Dietary restrictions filter recommendations
   - Property 16: Date range filtering

4. **Algorithm Properties**
   - Property 3: Collaborative filtering identifies similar users
   - Property 4: Co-purchased items are identified
   - Property 11: Frequent orders influence recommendations

5. **Analytics Properties**
   - Property 13: Top recommended items aggregation
   - Property 14: Preference distribution calculation
   - Property 15: Conversion tracking accuracy

6. **System Properties**
   - Property 17: Recommended items have full functionality
   - Property 18: Recommendation reasons are generated
   - Property 20: Random strategy assignment for A/B testing

### Integration Testing

1. **End-to-End Recommendation Flow**
   - User sets preferences → views menu → sees personalized recommendations
   - User orders item → profile updates → recommendations adapt

2. **Admin Analytics Flow**
   - Recommendations shown → user clicks → user orders → analytics update

3. **Cross-Module Integration**
   - Recommendation engine ↔ User profile manager
   - Recommendation UI ↔ Cart module
   - Analytics ↔ Admin dashboard

### Performance Testing

1. **Recommendation Generation Speed**
   - Target: < 500ms for recommendation calculation
   - Test with varying data sizes (10, 100, 1000 items)
   - Test with varying user history sizes

2. **Memory Usage**
   - Monitor client-side memory for large order histories
   - Implement pagination if needed

3. **Concurrent Users**
   - Test analytics aggregation with multiple simultaneous users
   - Ensure no race conditions in data updates

## Implementation Notes

### Phase 1: Core Infrastructure
- Set up data models and storage
- Implement user profile manager
- Create basic recommendation engine structure

### Phase 2: Recommendation Algorithms
- Implement popularity-based (simplest)
- Implement content-based filtering
- Implement collaborative filtering
- Create hybrid aggregator

### Phase 3: UI Integration
- Add "Recommended for You" section to menu page
- Add "Similar Items" section to item details
- Create preference settings panel
- Add visual indicators and explanations

### Phase 4: Analytics & Admin
- Implement interaction tracking
- Create analytics calculation module
- Build admin dashboard visualizations
- Add A/B testing infrastructure

### Phase 5: Optimization & Polish
- Performance optimization
- Add caching layer
- Implement progressive loading
- Polish UI animations and transitions

## Security Considerations

1. **Privacy**
   - User profiles stored locally by default
   - Optional server-side storage with user consent
   - No sharing of individual user data

2. **Data Validation**
   - Validate all user inputs (preferences, ratings)
   - Sanitize data before storage
   - Prevent injection attacks in analytics queries

3. **Rate Limiting**
   - Limit recommendation requests per user
   - Prevent analytics endpoint abuse

## Future Enhancements

1. **Machine Learning Integration**
   - Train neural network on order patterns
   - Use embeddings for item similarity
   - Implement deep learning recommendation models

2. **Real-Time Recommendations**
   - WebSocket integration for live updates
   - Real-time collaborative filtering
   - Dynamic price-based recommendations

3. **Social Features**
   - Friend recommendations
   - Group ordering suggestions
   - Social proof indicators

4. **Advanced Personalization**
   - Time-of-day preferences
   - Weather-based recommendations
   - Mood-based suggestions
   - Budget optimization

5. **Multi-Armed Bandit**
   - Exploration vs exploitation balance
   - Automatic strategy optimization
   - Adaptive weight tuning
