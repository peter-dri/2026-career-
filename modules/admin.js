// Admin Module - All admin operations
const AdminModule = (() => {
    let appData = null;
    let posCart = [];

    async function loadData() {
        const response = await fetch('/api/data');
        appData = await response.json();
        return appData;
    }

    async function saveData() {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        return response.ok;
    }

    // POS Functions
    function renderPOSMenu(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        let totalAvailableItems = 0;

        for (let category in appData.foodData) {
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryTitle.style.cssText = 'color: #2E3192; margin-top: 1rem; margin-bottom: 0.5rem;';
            
            // Filter available items in this category
            const availableItems = appData.foodData[category].filter(item => item.available > 0);
            
            if (availableItems.length > 0) {
                container.appendChild(categoryTitle);
                totalAvailableItems += availableItems.length;

                availableItems.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.style.cssText = 'background: white; padding: 1rem; border-radius: 0.375rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;';
                    itemDiv.onmouseover = () => itemDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    itemDiv.onmouseout = () => itemDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    
                    itemDiv.innerHTML = `
                        <div>
                            <strong style="display: block; margin-bottom: 0.25rem;">${item.name}</strong>
                            <span style="color: #718096; font-size: 0.875rem;">${item.available} ${item.unit} available</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #2E3192; font-weight: 700; font-size: 1.125rem;">KSh ${item.price}</div>
                            <button class="btn btn-primary btn-sm" onclick="AdminModule.addToPOSCart(${item.id}, '${item.name}', ${item.price})" style="margin-top: 0.5rem;">Add</button>
                        </div>
                    `;
                    container.appendChild(itemDiv);
                });
            }
        }

        // Show message if no items available
        if (totalAvailableItems === 0) {
            container.innerHTML = '<p class="no-items" style="text-align: center; color: #718096; padding: 2rem;">All items are currently sold out. Please restock inventory.</p>';
        }
    }

    function addToPOSCart(id, name, price) {
        const existing = posCart.find(item => item.id === id);
        
        if (existing) {
            existing.quantity++;
        } else {
            posCart.push({ id, name, price, quantity: 1 });
        }
        
        renderPOSCart();
    }

    function removePOSItem(id) {
        posCart = posCart.filter(item => item.id !== id);
        renderPOSCart();
    }

    function updatePOSQuantity(id, change) {
        const item = posCart.find(item => item.id === id);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removePOSItem(id);
            } else {
                renderPOSCart();
            }
        }
    }

    function renderPOSCart() {
        const container = document.getElementById('posCart');
        const totalEl = document.getElementById('posTotal');

        if (posCart.length === 0) {
            container.innerHTML = '<p style="color: #718096; text-align: center; padding: 2rem 0;">No items added</p>';
            totalEl.textContent = '0';
            return;
        }

        container.innerHTML = '';
        let total = 0;

        posCart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'padding: 0.75rem; background: #F7FAFC; border-radius: 0.375rem; margin-bottom: 0.5rem;';
            itemDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong style="font-size: 0.875rem;">${item.name}</strong>
                    <button onclick="AdminModule.removePOSItem(${item.id})" style="background: none; border: none; color: #E53E3E; cursor: pointer; font-size: 1.25rem;">&times;</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="btn-icon" onclick="AdminModule.updatePOSQuantity(${item.id}, -1)">-</button>
                        <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
                        <button class="btn-icon" onclick="AdminModule.updatePOSQuantity(${item.id}, 1)">+</button>
                    </div>
                    <span style="font-weight: 600;">KSh ${itemTotal}</span>
                </div>
            `;
            container.appendChild(itemDiv);
        });

        totalEl.textContent = total;
    }

    async function placePOSOrder() {
        if (posCart.length === 0) {
            alert('Please add items to the order');
            return;
        }

        const method = document.getElementById('posPaymentMethod').value;
        const mpesaPhone = method === 'mpesa' ? document.getElementById('posMpesaPhone').value : null;

        if (method === 'mpesa' && (!mpesaPhone || mpesaPhone.trim() === '')) {
            alert('Please enter customer phone number for M-Pesa payment');
            return;
        }

        const orderItems = posCart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
        }));

        const total = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        try {
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

            if (result.success) {
                const paymentInstructions = method === 'mpesa' 
                    ? `Customer will receive M-Pesa prompt on ${mpesaPhone}\n\n✓ Order will be automatically marked as PAID once M-Pesa confirms.`
                    : `💵 COLLECT CASH: KSh ${result.order.total}\n\n⚠️ IMPORTANT: After receiving cash, go to the Orders tab and click "Mark as Paid" button for order #${result.order.orderNumber}`;
                
                alert(`✓ Order placed successfully!\n\nOrder Number: ${result.order.orderNumber}\nTotal: KSh ${result.order.total}\nPayment: ${result.order.paymentMethod} - ${result.order.paymentStatus}\n\n${paymentInstructions}`);
                posCart = [];
                renderPOSCart();
                await loadData();
                renderPOSMenu('posMenu');
            } else {
                alert('Error: ' + (result.error || 'Failed to place order'));
            }
        } catch (error) {
            alert('Error placing order: ' + error.message);
        }
    }

    function clearPOSOrder() {
        if (posCart.length > 0 && !confirm('Clear current order?')) return;
        posCart = [];
        renderPOSCart();
    }

    function renderInventory(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        const displayedIds = new Set();

        for (let cat in appData.foodData) {
            appData.foodData[cat].forEach(item => {
                if (displayedIds.has(item.id)) return;
                displayedIds.add(item.id);

                const isSoldOut = item.available === 0;
                const soldOutBadge = isSoldOut ? '<span style="background: #E53E3E; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">SOLD OUT</span>' : '';
                const itemStyle = isSoldOut ? 'opacity: 0.6; border-left: 3px solid #E53E3E;' : '';

                const div = document.createElement('div');
                div.className = 'admin-item';
                div.style.cssText = itemStyle;
                div.innerHTML = `
                    <div>
                        <strong>${item.name}${soldOutBadge}</strong>
                        <p>Current: ${item.available} ${item.unit || 'plates'}</p>
                    </div>
                    <div class="admin-actions">
                        <input type="number" id="qty-${item.id}" value="${item.available}" min="0" style="width: 80px;">
                        <button class="btn btn-primary btn-sm" onclick="AdminModule.updateQuantity(${item.id})">Update</button>
                        <button class="btn btn-secondary btn-sm" onclick="AdminModule.deleteItem(${item.id})">Delete</button>
                    </div>
                `;
                container.appendChild(div);
            });
        }
    }

    async function updateQuantity(itemId) {
        const newQty = parseInt(document.getElementById(`qty-${itemId}`).value);
        
        for (let cat in appData.foodData) {
            const item = appData.foodData[cat].find(i => i.id === itemId);
            if (item) {
                item.available = newQty;
            }
        }

        await saveData();
        alert('Quantity updated!');
    }

    async function deleteItem(itemId) {
        if (!confirm('Delete this item?')) return;

        for (let cat in appData.foodData) {
            appData.foodData[cat] = appData.foodData[cat].filter(i => i.id !== itemId);
        }

        await saveData();
        await loadData();
        renderInventory('inventoryList');
        alert('Item deleted!');
    }

    async function addFood(name, price, quantity, unit, categories) {
        let maxId = 0;
        for (let cat in appData.foodData) {
            appData.foodData[cat].forEach(i => {
                if (i.id > maxId) maxId = i.id;
            });
        }

        const newId = maxId + 1;
        categories.forEach(cat => {
            appData.foodData[cat].push({ 
                id: newId, 
                name, 
                price, 
                available: quantity, 
                unit 
            });
        });

        await saveData();
        return true;
    }

    function renderOrders(containerId, orders = null) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        const ordersToRender = orders || appData.orderHistory;

        if (ordersToRender.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>No orders yet</h3>
                    <p>Orders will appear here once customers start placing them</p>
                </div>
            `;
            return;
        }

        ordersToRender.forEach(order => {
            const div = document.createElement('div');
            div.className = 'order-card';
            const itemsList = order.items.map(i => 
                `<li>${i.name} × ${i.quantity} = KSh ${i.total || (i.price * i.quantity)}</li>`
            ).join('');

            const badgeClass = order.paymentStatus === 'Paid' ? 'paid' : 'pending';
            const paymentBadge = `<span class="status-badge ${badgeClass}">${order.paymentStatus}</span>`;
            
            // Add verify payment button for pending cash orders
            const verifyButton = (order.paymentStatus === 'Pending' && order.paymentMethod === 'cash') 
                ? `<button class="btn btn-primary btn-sm" onclick="AdminModule.verifyPayment('${order.orderNumber}')" style="margin-left: 0.5rem;">✓ Mark as Paid</button>`
                : '';

            div.innerHTML = `
                <div class="order-header">
                    <strong>Order #${order.orderNumber}</strong>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span>KSh ${order.total}</span>
                        <button class="print-btn" onclick="AdminModule.printReceipt('${order.orderNumber}')">🖨️ Print</button>
                    </div>
                </div>
                <p class="order-time">${order.timestamp}</p>
                <ul>${itemsList}</ul>
                <p style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <strong>Payment:</strong> ${order.paymentMethod} ${paymentBadge}
                    ${order.mpesaPhone ? `<span style="color: #718096; font-size: 0.875rem;">(${order.mpesaPhone})</span>` : ''}
                    ${verifyButton}
                </p>
            `;
            container.appendChild(div);
        });
    }

    function searchOrder(orderNumber) {
        const resultContainer = document.getElementById('orderSearchResult');
        
        if (!orderNumber || orderNumber.trim() === '') {
            resultContainer.innerHTML = '<p style="color: #E53E3E; padding: 1rem; background: #FED7D7; border-radius: 0.375rem;">Please enter an order number</p>';
            return;
        }

        const order = appData.orderHistory.find(o => 
            o.orderNumber.toLowerCase() === orderNumber.toLowerCase().trim()
        );

        if (!order) {
            resultContainer.innerHTML = `
                <div style="padding: 1.5rem; background: #FED7D7; border-radius: 0.375rem; border-left: 4px solid #E53E3E;">
                    <h4 style="color: #E53E3E; margin-bottom: 0.5rem;">❌ Order Not Found</h4>
                    <p style="color: #742A2A;">No order found with number: <strong>${orderNumber}</strong></p>
                </div>
            `;
            return;
        }

        // Order found - display verification card
        const itemsList = order.items.map(i => 
            `<li style="padding: 0.5rem 0; border-bottom: 1px solid #E2E8F0;">${i.name} × ${i.quantity} = KSh ${i.total || (i.price * i.quantity)}</li>`
        ).join('');

        const isPaid = order.paymentStatus === 'Paid';
        const statusColor = isPaid ? '#2E3192' : '#F59E0B';
        const statusBg = isPaid ? '#EDE7F6' : '#FEF3C7';
        const statusIcon = isPaid ? '✅' : '⏳';

        resultContainer.innerHTML = `
            <div style="padding: 1.5rem; background: ${statusBg}; border-radius: 0.375rem; border-left: 4px solid ${statusColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="color: ${statusColor}; margin-bottom: 0.5rem;">${statusIcon} Order Found</h4>
                        <p style="font-size: 1.25rem; font-weight: 700; color: #2D3748;">Order #${order.orderNumber}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${statusColor};">KSh ${order.total}</div>
                        <div style="background: ${statusColor}; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; margin-top: 0.5rem; font-weight: 600;">
                            ${order.paymentStatus}
                        </div>
                    </div>
                </div>
                
                <div style="background: white; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem;">
                    <p style="color: #718096; font-size: 0.875rem; margin-bottom: 0.5rem;">Order Time: ${order.timestamp}</p>
                    <p style="color: #718096; font-size: 0.875rem; margin-bottom: 1rem;">
                        Payment Method: <strong>${order.paymentMethod}</strong>
                        ${order.mpesaPhone ? ` | Phone: <strong>${order.mpesaPhone}</strong>` : ''}
                    </p>
                    <h5 style="margin-bottom: 0.5rem; color: #2D3748;">Order Items:</h5>
                    <ul style="list-style: none; padding: 0;">${itemsList}</ul>
                </div>

                ${isPaid ? 
                    '<p style="color: #2E3192; font-weight: 600; text-align: center;">✓ Payment Verified - Order can be fulfilled</p>' : 
                    `<div style="text-align: center;">
                        <p style="color: #F59E0B; font-weight: 600; margin-bottom: 1rem;">⚠ Payment Pending - Verify payment before fulfilling order</p>
                        ${order.paymentMethod === 'cash' ? 
                            `<button class="btn btn-primary" onclick="AdminModule.verifyPayment('${order.orderNumber}')" style="padding: 0.75rem 2rem; font-size: 1rem;">
                                ✓ Mark as Paid (Cash Received)
                            </button>` : 
                            '<p style="color: #718096; font-size: 0.875rem;">Waiting for M-Pesa confirmation...</p>'
                        }
                    </div>`
                }
            </div>
        `;
    }

    function clearOrderSearch() {
        document.getElementById('orderSearchInput').value = '';
        document.getElementById('orderSearchResult').innerHTML = '';
    }

    function renderAnalytics(containerId) {
        const container = document.getElementById(containerId);
        
        if (appData.orderHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <h3>No analytics data yet</h3>
                    <p>Statistics will appear once orders are placed</p>
                </div>
            `;
            return;
        }

        const totalOrders = appData.orderHistory.length;
        const totalRevenue = appData.orderHistory.reduce((sum, o) => sum + o.total, 0);
        const avgOrder = Math.round(totalRevenue / totalOrders);
        const paidOrders = appData.orderHistory.filter(o => o.paymentStatus === 'Paid').length;
        const pendingOrders = totalOrders - paidOrders;
        const paidPercentage = Math.round((paidOrders / totalOrders) * 100);
        const paidDegrees = (paidPercentage / 100) * 360;

        // Calculate category sales
        const categorySales = { breakfast: 0, lunch: 0, snacks: 0 };
        appData.orderHistory.forEach(order => {
            order.items.forEach(item => {
                for (let cat in appData.foodData) {
                    if (appData.foodData[cat].find(f => f.id === item.id)) {
                        categorySales[cat] = (categorySales[cat] || 0) + (item.total || item.price * item.quantity);
                    }
                }
            });
        });

        const maxSales = Math.max(...Object.values(categorySales));

        // Calculate best-selling items
        const itemSales = {};
        appData.orderHistory.forEach(order => {
            order.items.forEach(item => {
                if (!itemSales[item.name]) {
                    itemSales[item.name] = { quantity: 0, revenue: 0 };
                }
                itemSales[item.name].quantity += item.quantity;
                itemSales[item.name].revenue += (item.total || item.price * item.quantity);
            });
        });
        const bestSellers = Object.entries(itemSales)
            .sort((a, b) => b[1].quantity - a[1].quantity)
            .slice(0, 5);

        // Calculate peak hours
        const hourCounts = {};
        appData.orderHistory.forEach(order => {
            const hour = new Date(order.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        const peakHourDisplay = peakHour ? `${peakHour[0]}:00 - ${parseInt(peakHour[0]) + 1}:00` : 'N/A';

        // Low stock alerts
        const lowStockItems = [];
        for (let cat in appData.foodData) {
            appData.foodData[cat].forEach(item => {
                if (item.available <= 10 && item.available > 0) {
                    lowStockItems.push({ ...item, category: cat });
                } else if (item.available === 0) {
                    lowStockItems.unshift({ ...item, category: cat, outOfStock: true });
                }
            });
        }

        container.innerHTML = `
            <!-- Low Stock Alerts (Priority) -->
            ${lowStockItems.length > 0 ? `
                <div class="chart-container" style="border-left: 4px solid #E53E3E; background: linear-gradient(90deg, #FED7D7 0%, white 100%);">
                    <h3 class="chart-title" style="color: #E53E3E;">⚠️ Inventory Alerts (${lowStockItems.length})</h3>
                    <div style="display: grid; gap: 0.75rem;">
                        ${lowStockItems.slice(0, 5).map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: white; border-radius: 0.5rem; border-left: 3px solid ${item.outOfStock ? '#E53E3E' : '#F59E0B'};">
                                <div>
                                    <strong style="color: #2D3748;">${item.name}</strong>
                                    <span style="color: #718096; font-size: 0.875rem; margin-left: 0.5rem;">(${item.category})</span>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 700; color: ${item.outOfStock ? '#E53E3E' : '#F59E0B'};">
                                        ${item.outOfStock ? '❌ OUT OF STOCK' : `⚠️ ${item.available} ${item.unit} left`}
                                    </div>
                                    <div style="font-size: 0.75rem; color: #718096;">
                                        ${item.outOfStock ? 'Restock immediately' : 'Low stock warning'}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Stats Cards -->
            <div class="analytics-grid">
                <div class="stat-card">
                    <h3>${totalOrders}</h3>
                    <p>Total Orders</p>
                </div>
                <div class="stat-card">
                    <h3>KSh ${totalRevenue.toLocaleString()}</h3>
                    <p>Total Revenue</p>
                </div>
                <div class="stat-card">
                    <h3>KSh ${avgOrder.toLocaleString()}</h3>
                    <p>Average Order</p>
                </div>
                <div class="stat-card">
                    <h3>${paidPercentage}%</h3>
                    <p>Payment Rate</p>
                </div>
                <div class="stat-card">
                    <h3>${peakHourDisplay}</h3>
                    <p>Peak Order Time</p>
                </div>
                <div class="stat-card">
                    <h3>${lowStockItems.length}</h3>
                    <p>Low Stock Items</p>
                </div>
            </div>

            <!-- Best Selling Items -->
            <div class="chart-container">
                <h3 class="chart-title">🏆 Top 5 Best-Selling Items</h3>
                <div style="display: grid; gap: 1rem;">
                    ${bestSellers.map(([name, data], index) => {
                        const maxRevenue = bestSellers[0][1].revenue;
                        const percentage = (data.revenue / maxRevenue) * 100;
                        return `
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="font-size: 1.5rem; font-weight: 800; color: #2E3192; min-width: 30px;">
                                    ${index + 1}
                                </div>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                        <strong style="color: #2D3748;">${name}</strong>
                                        <span style="color: #2E3192; font-weight: 700;">KSh ${data.revenue.toLocaleString()}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <div style="flex: 1; height: 12px; background: #E2E8F0; border-radius: 1rem; overflow: hidden;">
                                            <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #2E3192, #00BCD4); border-radius: 1rem; transition: width 1s ease;"></div>
                                        </div>
                                        <span style="color: #718096; font-size: 0.875rem; min-width: 80px;">${data.quantity} sold</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Payment Status Donut Chart -->
            <div class="chart-container">
                <h3 class="chart-title">Payment Status Distribution</h3>
                <div class="donut-chart">
                    <div class="donut" style="--paid-deg: ${paidDegrees}deg;">
                        <div class="donut-center">
                            <div class="donut-value">${paidPercentage}%</div>
                            <div class="donut-label">Paid</div>
                        </div>
                    </div>
                    <div class="donut-legend">
                        <div class="legend-item">
                            <div class="legend-color" style="background: #2E3192;"></div>
                            <div class="legend-text">
                                <div class="legend-name">Paid Orders</div>
                                <div class="legend-value">${paidOrders} orders (${paidPercentage}%)</div>
                            </div>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #F59E0B;"></div>
                            <div class="legend-text">
                                <div class="legend-name">Pending Orders</div>
                                <div class="legend-value">${pendingOrders} orders (${100 - paidPercentage}%)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Category Sales Bar Chart -->
            <div class="chart-container">
                <h3 class="chart-title">Sales by Category</h3>
                <div class="bar-chart">
                    <div class="bar-item">
                        <div class="bar" style="height: ${(categorySales.breakfast / maxSales) * 200}px;">
                            <div class="bar-value">KSh ${categorySales.breakfast.toLocaleString()}</div>
                        </div>
                        <div class="bar-label">🌅 Breakfast</div>
                    </div>
                    <div class="bar-item">
                        <div class="bar" style="height: ${(categorySales.lunch / maxSales) * 200}px;">
                            <div class="bar-value">KSh ${categorySales.lunch.toLocaleString()}</div>
                        </div>
                        <div class="bar-label">🍛 Lunch</div>
                    </div>
                    <div class="bar-item">
                        <div class="bar" style="height: ${(categorySales.snacks / maxSales) * 200}px;">
                            <div class="bar-value">KSh ${categorySales.snacks.toLocaleString()}</div>
                        </div>
                        <div class="bar-label">🍪 Snacks</div>
                    </div>
                </div>
            </div>

            <!-- Payment Method Progress Chart -->
            <div class="chart-container">
                <h3 class="chart-title">💳 Payment Methods</h3>
                <div class="progress-chart">
                    ${generatePaymentMethodChart()}
                </div>
            </div>

            <!-- Inventory Prediction -->
            <div class="chart-container">
                <h3 class="chart-title">📦 Inventory Insights & Predictions</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${generateInventoryPredictions()}
                </div>
            </div>

            <!-- Business Insights -->
            <div class="chart-container">
                <h3 class="chart-title">💡 Business Insights</h3>
                <div style="display: grid; gap: 1rem;">
                    ${generateBusinessInsights()}
                </div>
            </div>
        `;

        function generatePaymentMethodChart() {
            const methods = {};
            appData.orderHistory.forEach(order => {
                methods[order.paymentMethod] = (methods[order.paymentMethod] || 0) + 1;
            });

            return Object.entries(methods).map(([method, count]) => {
                const percentage = Math.round((count / totalOrders) * 100);
                return `
                    <div class="progress-item">
                        <div class="progress-label">
                            <span>${method === 'mpesa' ? '📱 M-Pesa' : '💵 Cash'}</span>
                            <span>${count} orders (${percentage}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${percentage}%;">
                                ${percentage}%
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function generateInventoryPredictions() {
            const predictions = [];
            
            // Calculate average daily sales per item
            const itemDailySales = {};
            appData.orderHistory.forEach(order => {
                order.items.forEach(item => {
                    itemDailySales[item.name] = (itemDailySales[item.name] || 0) + item.quantity;
                });
            });

            // Predict days until stockout
            for (let cat in appData.foodData) {
                appData.foodData[cat].forEach(item => {
                    const dailySales = itemDailySales[item.name] || 0;
                    if (dailySales > 0 && item.available > 0) {
                        const daysLeft = Math.floor(item.available / dailySales);
                        if (daysLeft <= 7) {
                            predictions.push({
                                name: item.name,
                                daysLeft,
                                available: item.available,
                                dailySales,
                                unit: item.unit
                            });
                        }
                    }
                });
            }

            predictions.sort((a, b) => a.daysLeft - b.daysLeft);

            if (predictions.length === 0) {
                return '<p style="color: #718096; text-align: center; padding: 2rem;">All items have sufficient stock for the week ahead! ✅</p>';
            }

            return predictions.slice(0, 6).map(pred => `
                <div style="padding: 1.25rem; background: ${pred.daysLeft <= 2 ? '#FED7D7' : '#FEF3C7'}; border-radius: 0.75rem; border-left: 4px solid ${pred.daysLeft <= 2 ? '#E53E3E' : '#F59E0B'};">
                    <div style="font-weight: 700; color: #2D3748; margin-bottom: 0.5rem;">${pred.name}</div>
                    <div style="font-size: 0.875rem; color: #718096; margin-bottom: 0.75rem;">
                        Current: ${pred.available} ${pred.unit} | Avg: ${pred.dailySales}/day
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="font-size: 1.5rem;">${pred.daysLeft <= 2 ? '🔴' : '🟡'}</div>
                        <div>
                            <div style="font-weight: 700; color: ${pred.daysLeft <= 2 ? '#E53E3E' : '#F59E0B'};">
                                ~${pred.daysLeft} day${pred.daysLeft !== 1 ? 's' : ''} left
                            </div>
                            <div style="font-size: 0.75rem; color: #718096;">
                                ${pred.daysLeft <= 2 ? 'Restock urgently!' : 'Plan restock soon'}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function generateBusinessInsights() {
            const insights = [];

            // Revenue trend
            const revenuePerOrder = totalRevenue / totalOrders;
            if (revenuePerOrder > 100) {
                insights.push({
                    icon: '📈',
                    title: 'High Average Order Value',
                    message: `Your average order is KSh ${avgOrder.toLocaleString()}, which is excellent! Customers are buying multiple items.`,
                    type: 'success'
                });
            }

            // Payment preference
            const mpesaOrders = appData.orderHistory.filter(o => o.paymentMethod === 'mpesa').length;
            const mpesaPercentage = Math.round((mpesaOrders / totalOrders) * 100);
            if (mpesaPercentage > 60) {
                insights.push({
                    icon: '📱',
                    title: 'Digital Payment Preference',
                    message: `${mpesaPercentage}% of customers prefer M-Pesa. Consider promoting digital payments further.`,
                    type: 'info'
                });
            }

            // Best category
            const categorySales = { breakfast: 0, lunch: 0, snacks: 0 };
            appData.orderHistory.forEach(order => {
                order.items.forEach(item => {
                    for (let cat in appData.foodData) {
                        if (appData.foodData[cat].find(f => f.id === item.id)) {
                            categorySales[cat] = (categorySales[cat] || 0) + (item.total || item.price * item.quantity);
                        }
                    }
                });
            });
            const bestCategory = Object.entries(categorySales).sort((a, b) => b[1] - a[1])[0];
            insights.push({
                icon: '🏆',
                title: 'Top Performing Category',
                message: `${bestCategory[0].charAt(0).toUpperCase() + bestCategory[0].slice(1)} generates the most revenue (KSh ${bestCategory[1].toLocaleString()}). Focus on expanding this category.`,
                type: 'success'
            });

            // Low stock warning count
            if (lowStockItems.length > 5) {
                insights.push({
                    icon: '⚠️',
                    title: 'Inventory Management Alert',
                    message: `${lowStockItems.length} items need restocking. Review inventory tab to prevent stockouts.`,
                    type: 'warning'
                });
            }

            return insights.map(insight => `
                <div style="display: flex; gap: 1rem; padding: 1.25rem; background: ${
                    insight.type === 'success' ? '#F0FFF4' : 
                    insight.type === 'warning' ? '#FEF3C7' : '#EBF8FF'
                }; border-radius: 0.75rem; border-left: 4px solid ${
                    insight.type === 'success' ? '#48BB78' : 
                    insight.type === 'warning' ? '#F59E0B' : '#00BCD4'
                };">
                    <div style="font-size: 2rem;">${insight.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: #2D3748; margin-bottom: 0.25rem;">${insight.title}</div>
                        <div style="color: #4A5568; font-size: 0.875rem;">${insight.message}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    function printReceipt(orderNumber) {
        const order = appData.orderHistory.find(o => o.orderNumber === orderNumber);
        if (!order) return;

        const itemsList = order.items.map(i => 
            `${i.name} × ${i.quantity} = KSh ${i.total || (i.price * i.quantity)}`
        ).join('\n');

        const receiptContent = `
            <div class="print-area" style="padding: 2rem; font-family: monospace;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2>🍽️ THARAKA UNIVERSITY CAFETERIA</h2>
                    <p>Official Receipt</p>
                </div>
                <hr style="margin: 1rem 0;">
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Date:</strong> ${order.timestamp}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <p><strong>Status:</strong> ${order.paymentStatus}</p>
                ${order.mpesaPhone ? `<p><strong>Phone:</strong> ${order.mpesaPhone}</p>` : ''}
                <hr style="margin: 1rem 0;">
                <h3>Items:</h3>
                <pre style="white-space: pre-wrap;">${itemsList}</pre>
                <hr style="margin: 1rem 0;">
                <h3 style="text-align: right;">TOTAL: KSh ${order.total}</h3>
                <hr style="margin: 1rem 0;">
                <p style="text-align: center; margin-top: 2rem;">Thank you for your order!</p>
                <p style="text-align: center;">Education for Freedom</p>
            </div>
        `;

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Receipt - ' + orderNumber + '</title>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(receiptContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }

    function renderAdmins(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (!appData.adminAccounts || appData.adminAccounts.length === 0) {
            container.innerHTML = '<p class="no-items">No admins found</p>';
            return;
        }

        const currentAdmin = AuthModule.getCurrentAdmin();

        appData.adminAccounts.forEach(admin => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            
            const statusBadge = admin.active 
                ? '<span style="color: #2E3192; font-weight: 600;">● Active</span>' 
                : '<span style="color: #718096;">● Inactive</span>';
            
            const isCurrentUser = admin.id === currentAdmin.id;
            const deleteBtn = isCurrentUser 
                ? '' 
                : `<button class="btn btn-secondary btn-sm" onclick="AdminModule.removeAdmin(${admin.id})">Remove</button>`;

            div.innerHTML = `
                <div>
                    <strong>${admin.username}</strong>
                    <p>${admin.role} ${statusBadge} ${isCurrentUser ? '(You)' : ''}</p>
                </div>
                <div class="admin-actions">
                    ${deleteBtn}
                </div>
            `;
            container.appendChild(div);
        });
    }

    async function addAdmin(username, password, role) {
        if (!appData.adminAccounts) {
            appData.adminAccounts = [];
        }

        // Check if username already exists
        const exists = appData.adminAccounts.find(a => a.username === username);
        if (exists) {
            throw new Error('Username already exists');
        }

        // Get max ID
        let maxId = 0;
        appData.adminAccounts.forEach(a => {
            if (a.id > maxId) maxId = a.id;
        });

        const newAdmin = {
            id: maxId + 1,
            username,
            password,
            role,
            active: true
        };

        appData.adminAccounts.push(newAdmin);
        await saveData();
        return true;
    }

    async function removeAdmin(adminId) {
        if (!confirm('Are you sure you want to remove this admin?')) return;

        const currentAdmin = AuthModule.getCurrentAdmin();
        if (adminId === currentAdmin.id) {
            alert('You cannot remove yourself!');
            return;
        }

        appData.adminAccounts = appData.adminAccounts.filter(a => a.id !== adminId);
        await saveData();
        await loadData();
        renderAdmins('adminsList');
        alert('Admin removed successfully!');
    }

    // Verify payment for cash orders
    async function verifyPayment(orderNumber) {
        const order = appData.orderHistory.find(o => o.orderNumber === orderNumber);
        
        if (!order) {
            alert('Order not found!');
            return;
        }
        
        if (order.paymentStatus === 'Paid') {
            alert('This order is already marked as paid.');
            return;
        }
        
        if (!confirm(`Confirm that you have received KSh ${order.total} in cash from the customer?`)) {
            return;
        }
        
        // Update payment status
        order.paymentStatus = 'Paid';
        
        // Save to server
        await saveData();
        
        // Refresh the orders display
        renderOrders('ordersList');
        
        alert(`✓ Payment verified!\n\nOrder #${orderNumber} is now marked as PAID.\nTotal: KSh ${order.total}`);
    }

    return {
        loadData,
        saveData,
        renderInventory,
        updateQuantity,
        deleteItem,
        addFood,
        renderOrders,
        renderAnalytics,
        renderAdmins,
        addAdmin,
        removeAdmin,
        renderPOSMenu,
        addToPOSCart,
        removePOSItem,
        updatePOSQuantity,
        renderPOSCart,
        placePOSOrder,
        clearPOSOrder,
        searchOrder,
        clearOrderSearch,
        printReceipt,
        verifyPayment
    };
})();
