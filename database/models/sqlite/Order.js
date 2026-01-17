const dbConnection = require('../../sqlite-connection');

class Order {
    constructor(data = {}) {
        this.id = data.id;
        this.customer_name = data.customer_name;
        this.customer_email = data.customer_email;
        this.customer_phone = data.customer_phone;
        this.items = data.items ? 
            (typeof data.items === 'string' ? JSON.parse(data.items) : data.items) : [];
        this.total_amount = parseFloat(data.total_amount) || 0;
        this.status = data.status || 'pending';
        this.payment_method = data.payment_method;
        this.payment_status = data.payment_status || 'pending';
        this.special_instructions = data.special_instructions;
        this.estimated_completion = data.estimated_completion;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findById(id) {
        try {
            const row = await dbConnection.get(
                'SELECT * FROM orders WHERE id = ?',
                [id]
            );
            if (!row) return null;

            const order = new Order(row);
            // Load order items
            order.orderItems = await order.getOrderItems();
            return order;
        } catch (error) {
            console.error('Error finding order by ID:', error);
            throw error;
        }
    }

    static async getAll(options = {}) {
        try {
            let query = 'SELECT * FROM orders';
            const params = [];
            const conditions = [];

            if (options.status) {
                conditions.push('status = ?');
                params.push(options.status);
            }

            if (options.payment_status) {
                conditions.push('payment_status = ?');
                params.push(options.payment_status);
            }

            if (options.customer_email) {
                conditions.push('customer_email = ?');
                params.push(options.customer_email);
            }

            if (options.date_from) {
                conditions.push('created_at >= ?');
                params.push(options.date_from);
            }

            if (options.date_to) {
                conditions.push('created_at <= ?');
                params.push(options.date_to);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY created_at DESC';

            if (options.limit) {
                query += ' LIMIT ?';
                params.push(options.limit);
            }

            const rows = await dbConnection.all(query, params);
            return rows.map(row => new Order(row));
        } catch (error) {
            console.error('Error getting all orders:', error);
            throw error;
        }
    }

    static async create(orderData) {
        try {
            return await dbConnection.transaction(async (db) => {
                // Create the order
                const result = await db.run(
                    `INSERT INTO orders 
                     (customer_name, customer_email, customer_phone, items, total_amount, 
                      status, payment_method, payment_status, special_instructions, estimated_completion) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        orderData.customer_name,
                        orderData.customer_email,
                        orderData.customer_phone,
                        JSON.stringify(orderData.items || []),
                        orderData.total_amount,
                        orderData.status || 'pending',
                        orderData.payment_method,
                        orderData.payment_status || 'pending',
                        orderData.special_instructions,
                        orderData.estimated_completion
                    ]
                );

                const orderId = result.id;

                // Create order items if provided
                if (orderData.orderItems && orderData.orderItems.length > 0) {
                    for (const item of orderData.orderItems) {
                        await db.run(
                            `INSERT INTO order_items 
                             (order_id, food_item_id, quantity, unit_price, subtotal) 
                             VALUES (?, ?, ?, ?, ?)`,
                            [
                                orderId,
                                item.food_item_id,
                                item.quantity,
                                item.unit_price,
                                item.subtotal
                            ]
                        );
                    }
                }

                return await Order.findById(orderId);
            });
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    async save() {
        try {
            if (this.id) {
                // Update existing order
                await dbConnection.run(
                    `UPDATE orders 
                     SET customer_name = ?, customer_email = ?, customer_phone = ?, 
                         items = ?, total_amount = ?, status = ?, payment_method = ?, 
                         payment_status = ?, special_instructions = ?, estimated_completion = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [
                        this.customer_name,
                        this.customer_email,
                        this.customer_phone,
                        JSON.stringify(this.items),
                        this.total_amount,
                        this.status,
                        this.payment_method,
                        this.payment_status,
                        this.special_instructions,
                        this.estimated_completion,
                        this.id
                    ]
                );
                return await Order.findById(this.id);
            } else {
                // Create new order
                return await Order.create(this);
            }
        } catch (error) {
            console.error('Error saving order:', error);
            throw error;
        }
    }

    async updateStatus(status) {
        try {
            await dbConnection.run(
                'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, this.id]
            );
            this.status = status;
            return true;
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    }

    async updatePaymentStatus(paymentStatus) {
        try {
            await dbConnection.run(
                'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [paymentStatus, this.id]
            );
            this.payment_status = paymentStatus;
            return true;
        } catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    }

    async getOrderItems() {
        try {
            const query = `
                SELECT oi.*, fi.name as food_item_name, fi.description, fi.image_url
                FROM order_items oi
                JOIN food_items fi ON oi.food_item_id = fi.id
                WHERE oi.order_id = ?
                ORDER BY oi.id
            `;
            return await dbConnection.all(query, [this.id]);
        } catch (error) {
            console.error('Error getting order items:', error);
            throw error;
        }
    }

    async delete() {
        try {
            await dbConnection.transaction(async (db) => {
                // Delete order items first (foreign key constraint)
                await db.run('DELETE FROM order_items WHERE order_id = ?', [this.id]);
                // Delete the order
                await db.run('DELETE FROM orders WHERE id = ?', [this.id]);
            });
            return true;
        } catch (error) {
            console.error('Error deleting order:', error);
            throw error;
        }
    }

    static async getRecentOrders(limit = 10) {
        return await Order.getAll({ limit });
    }

    static async getPendingOrders() {
        return await Order.getAll({ status: 'pending' });
    }

    static async getOrdersByStatus(status) {
        return await Order.getAll({ status });
    }

    static async getTodaysOrders() {
        const today = new Date().toISOString().split('T')[0];
        return await Order.getAll({ 
            date_from: today + ' 00:00:00',
            date_to: today + ' 23:59:59'
        });
    }

    static async getOrderStats(dateFrom, dateTo) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(total_amount) as total_revenue,
                    AVG(total_amount) as average_order_value,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
                FROM orders
            `;
            const params = [];

            if (dateFrom && dateTo) {
                query += ' WHERE created_at BETWEEN ? AND ?';
                params.push(dateFrom, dateTo);
            }

            const result = await dbConnection.get(query, params);
            return {
                totalOrders: result.total_orders || 0,
                totalRevenue: parseFloat(result.total_revenue) || 0,
                averageOrderValue: parseFloat(result.average_order_value) || 0,
                completedOrders: result.completed_orders || 0,
                pendingOrders: result.pending_orders || 0,
                cancelledOrders: result.cancelled_orders || 0
            };
        } catch (error) {
            console.error('Error getting order stats:', error);
            throw error;
        }
    }

    static async count(options = {}) {
        try {
            let query = 'SELECT COUNT(*) as count FROM orders';
            const params = [];
            
            if (options.status) {
                query += ' WHERE status = ?';
                params.push(options.status);
            }

            const result = await dbConnection.get(query, params);
            return result.count;
        } catch (error) {
            console.error('Error counting orders:', error);
            throw error;
        }
    }
}

module.exports = Order;