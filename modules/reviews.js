// Reviews Module - Simple reviews
const ReviewsModule = (() => {
    let reviews = {};

    function init(reviewsData) {
        reviews = reviewsData || {};
    }

    function getStats(itemId) {
        const itemReviews = reviews[itemId] || [];
        if (itemReviews.length === 0) {
            return { average: 0, count: 0, stars: '☆☆☆☆☆' };
        }

        const avg = itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length;
        const stars = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));

        return {
            average: avg.toFixed(1),
            count: itemReviews.length,
            stars
        };
    }

    async function addReview(itemId, rating, name, text) {
        if (!reviews[itemId]) {
            reviews[itemId] = [];
        }

        reviews[itemId].push({
            rating,
            name: name || 'Anonymous',
            text,
            date: new Date().toLocaleDateString()
        });

        return true;
    }

    function getReviews(itemId) {
        return reviews[itemId] || [];
    }

    return {
        init,
        getStats,
        addReview,
        getReviews
    };
})();
