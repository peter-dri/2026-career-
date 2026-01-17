// Cart Module - Shopping cart functionality
const CartModule = (() => {
    let items = [];

    function init() {
        updateCount();
    }

    function add(id, name, price, available) {
        const existing = items.find(item => item.id === id);
        
        if (existing) {
            // Check if we can add more
            if (existing.quantity >= available) {
                showNotification(`Cannot add more ${name} - only ${available} available!`);
                return;
            }
            existing.quantity++;
        } else {
            items.push({ id, name, price, quantity: 1, available });
        }

        updateCount();
        showNotification(`${name} added to cart!`);
        
        // Update button state
        const cartItem = items.find(item => item.id === id);
        if (cartItem && typeof MenuModule !== 'undefined') {
            MenuModule.updateButtonState(id, cartItem.quantity, available);
        }
    }

    function remove(id) {
        const item = items.find(item => item.id === id);
        items = items.filter(item => item.id !== id);
        updateCount();
        show(); // Refresh cart display
        
        // Update button state when item removed
        if (item && typeof MenuModule !== 'undefined') {
            MenuModule.updateButtonState(id, 0, item.available);
        }
    }

    function updateQuantity(id, change) {
        const item = items.find(item => item.id === id);
        if (item) {
            const newQuantity = item.quantity + change;
            
            // Check if exceeding available
            if (newQuantity > item.available) {
                showNotification(`Cannot add more - only ${item.available} available!`);
                return;
            }
            
            item.quantity = newQuantity;
            if (item.quantity <= 0) {
                remove(id);
            } else {
                show(); // Refresh cart display
                // Update button state
                if (typeof MenuModule !== 'undefined') {
                    MenuModule.updateButtonState(id, item.quantity, item.available);
                }
            }
        }
        updateCount();
    }

    function updateCount() {
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cartCount').textContent = count;
    }

    function getTotal() {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    function getItems() {
        return items;
    }

    function clear() {
        // Update all button states before clearing
        if (typeof MenuModule !== 'undefined') {
            items.forEach(item => {
                MenuModule.updateButtonState(item.id, 0, item.available);
            });
        }
        items = [];
        updateCount();
    }

    function show() {
        const modal = document.getElementById('cartModal');
        const container = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <h3>Your cart is empty</h3>
                    <p>Add some delicious items from our menu!</p>
                </div>
            `;
            totalEl.textContent = '0';
        } else {
            container.innerHTML = '';
            items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <div class="cart-item-info">
                        <strong>${item.name}</strong>
                        <p>KSh ${item.price} × ${item.quantity} = KSh ${item.price * item.quantity}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn-icon" onclick="CartModule.updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="btn-icon" onclick="CartModule.updateQuantity(${item.id}, 1)">+</button>
                        <button class="btn btn-sm" onclick="CartModule.remove(${item.id})">Remove</button>
                    </div>
                `;
                container.appendChild(itemEl);
            });
            totalEl.textContent = getTotal();
        }

        modal.style.display = 'flex';
    }

    function showNotification(message) {
        // Simple notification (you can enhance this)
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    return {
        init,
        add,
        remove,
        updateQuantity,
        show,
        clear,
        getItems,
        getTotal
    };
})();
