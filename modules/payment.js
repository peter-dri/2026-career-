// Payment Module - Handle payments
const PaymentModule = (() => {
    
    function showPaymentModal(cart, total) {
        const modal = document.getElementById('paymentModal');
        document.getElementById('paymentTotal').textContent = total;
        
        const summary = cart.map(item => 
            `<div>${item.name} × ${item.quantity} = KSh ${item.price * item.quantity}</div>`
        ).join('');
        
        document.getElementById('paymentSummary').innerHTML = summary;
        modal.style.display = 'flex';
    }

    async function processPayment(method, cart, total, mpesaPhone = null) {
        const orderItems = cart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
        }));

        const response = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: orderItems,
                total,
                paymentMethod: method,
                mpesaPhone
            })
        });

        const result = await response.json();
        
        // Add response status to result
        result.status = response.status;
        
        // If order successful, update user profile and track recommendations
        if (response.ok && result.success) {
            // Update user profile with order
            if (typeof UserProfileManager !== 'undefined') {
                UserProfileManager.addOrder({
                    items: orderItems,
                    total: total,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Track recommended items that were ordered
            if (typeof RecommendationAnalytics !== 'undefined' && typeof UserProfileManager !== 'undefined') {
                const userId = UserProfileManager.getUserId();
                orderItems.forEach(item => {
                    RecommendationAnalytics.trackRecommendationOrdered(userId, item.id);
                });
            }
        }
        
        return result;
    }

    return {
        showPaymentModal,
        processPayment
    };
})();
