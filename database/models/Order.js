// Order Model
const { executeQuery, executeTransaction, getNextOrderNumber } = require('../connection');

class Order {
    // Create new order
    static async create(orderData) {
        const { items, total, paymentMethod, mpesaPhone } = orderData;
        
        // Get next order number
        const orderNumber = await getNextOrderNumber();
        
        // Validate stock availability first
        for (const item of items) {
            const [stockCheck] = await executeQuery(
                'SELECT available FROM food_items WHERE id = ?',
                [item.id]
            );
            
            if (!stockCheck || stockCheck.available < item.quantity) {
                throw new Error(`Insufficient stock for item ID ${item.id}. Available: ${stockCheck?.available || 0}, Requested: ${item.quantity}`);
            }
        }
        
        const queries = [];
        
        // Insert order
        queries.push({
            query: `
                INSERT INTO orders (order_number, total, payment_method, mpesa_phone, payment_status)
                VALUES (?, ?, ?, ?, ?)
            `,
            params: [
                orderNumber,
                total,
                paymentMethod,
                mpesaPhone,
                paymentMethod === 'mpesa' ? 'Paid' : 'Pending'
            ]
        });
        
        const [orderResult] = await executeTransaction(queries);
        const orderId = orderResult.insertId;
        
        // Insert order items and update stock
        const itemQueries = [];
        
        for (const item of items) {
            // Add order item
            itemQueries.push({
                query: `
                    INSERT INTO order_items (order_id, food_item_id, food_name, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                `,
                params: [orderId, item.id, item.name, item.quantity, item.price, item.total]
            });
            
            // Update stock and order count
            itemQueries.push({
                query: `
                    UPDATE food_items 
                    SET available = available - ?, total_orders = total_orders + ?
                    WHERE id = ?
                `,
                params: [item.quantity, item.quantity, item.id]
            });
        }
        
        await executeTransaction(itemQueries);
        
        return await this.getById(orderId);
    }
    
    // Get order by ID
    static async getById(id) {
        const orderQuery = `
            SELECT * FROM orders WHERE id = ?
        `;
        
        const [order] = await executeQuery(orderQuery, [id]);
        
        if (!order) return null;
        
        // Get order items
        const itemsQuery = `
            SELECT oi.*, fi.unit, fi.category
            FROM order_items oi
            LEFT JOIN food_items fi ON oi.food_item_id = fi.id
            WHERE oi.order_id = ?
            ORDER BY oi.id
        `;
        
        const items = await executeQuery(itemsQuery, [id]);
        
        return {
            ...order,
            timestamp: order.created_at.toLocaleString(),
            items: items
        };
    }
    
    // Get order by order number
    static async getByOrderNumber(orderNumber) {
        const orderQuery = `
            SELECT * FROM orders WHERE order_number = ?
        `;
        
        const [order] = await executeQuery(orderQuery, [orderNumber]);
        
        if (!order) return null;
        
        return await this.getById(order.id);
    }
    
    // Get all orders with pagination
    static async getAll(limit = 50, offset = 0) {
        const ordersQuery = `
            SELECT o.*, COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const orders = await executeQuery(ordersQuery, [limit, offset]);
        
        // Get items for each order
        const ordersWithItems = [];
        
        for (const order of orders) {
            const itemsQuery = `
                SELECT oi.*, fi.unit, fi.category
                FROM order_items oi
                LEFT JOIN food_items fi ON oi.food_item_id = fi.id
                WHERE oi.order_id = ?
                ORDER BY oi.id
            `;
            
            const items = await executeQuery(itemsQuery, [order.id]);
            
            ordersWithItems.push({
                ...order,
                timestamp: order.created_at.toLocaleString(),
                items: items
            });
        }
        
        return ordersWithItems;
    }
    
    // Update payment status
    static async updatePaymentStatus(id, status) {
        const query = `
            UPDATE orders 
            SET payment_status = ?
            WHERE id = ?
        `;
        
        const result = await executeQuery(query, [status, id]);
        
        if (result.affectedRows === 0) {
            throw new Error('Order not found');
        }
        
        return await this.getById(id);
    }
    
    // Get order statistics
    static async getStatistics(startDate = null, endDate = null) {
        let whereClause = '';
        const params = [];
        
        if (startDate && endDate) {
            whereClause = 'WHERE o.created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        
        const query = `
            SELECT 
                COUNT(*) as total_orders,
                SUM(o.total) as total_revenue,
                AVG(o.total) as average_order_value,
                COUNT(CASE WHEN o.payment_status = 'Paid' THEN 1 END) as paid_orders,
                COUNT(CASE WHEN o.payment_method = 'mpesa' THEN 1 END) as mpesa_orders,
                COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END) as cash_orders
            FROM orders o
            ${whereClause}
        `;
        
        const [stats] = await executeQuery(query, params);
        return stats;
    }
    
    // Get popular items
    static async getPopularItems(limit = 10) {
        const query = `
            SELECT 
                oi.food_item_id,
                oi.food_name,
                SUM(oi.quantity) as total_quantity,
                COUNT(DISTINCT oi.order_id) as order_count,
                AVG(oi.unit_price) as avg_price
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.payment_status = 'Paid'
            GROUP BY oi.food_item_id, oi.food_name
            ORDER BY total_quantity DESC
            LIMIT ?
        `;
        
        return await executeQuery(query, [limit]);
    }
    
    // Search orders
    static async search(searchTerm) {
        const query = `
            SELECT o.*, COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.order_number LIKE ? OR oi.food_name LIKE ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 20
        `;
        
        const searchPattern = `%${searchTerm}%`;
        const orders = await executeQuery(query, [searchPattern, searchPattern]);
        
        // Get items for each order
        const ordersWithItems = [];
        
        for (const order of orders) {
            const itemsQuery = `
                SELECT oi.*, fi.unit, fi.category
                FROM order_items oi
                LEFT JOIN food_items fi ON oi.food_item_id = fi.id
                WHERE oi.order_id = ?
                ORDER BY oi.id
            `;
            
            const items = await executeQuery(itemsQuery, [order.id]);
            
            ordersWithItems.push({
                ...order,
                timestamp: order.created_at.toLocaleString(),
                items: items
            });
        }
        
        return ordersWithItems;
    }
}

module.exports = Order;