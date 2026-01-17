// Food Item Model
const { executeQuery, executeTransaction } = require('../connection');

class FoodItem {
    // Get all food items grouped by category
    static async getAllGroupedByCategory() {
        const query = `
            SELECT 
                fi.*,
                GROUP_CONCAT(ft.tag) as tags
            FROM food_items fi
            LEFT JOIN food_tags ft ON fi.id = ft.food_item_id
            GROUP BY fi.id
            ORDER BY fi.category, fi.name
        `;
        
        const items = await executeQuery(query);
        
        // Group by category and parse tags
        const grouped = {
            breakfast: [],
            lunch: [],
            snacks: []
        };
        
        items.forEach(item => {
            const processedItem = {
                ...item,
                tags: item.tags ? item.tags.split(',') : [],
                isVegetarian: Boolean(item.is_vegetarian),
                isVegan: Boolean(item.is_vegan),
                totalOrders: item.total_orders
            };
            
            if (grouped[item.category]) {
                grouped[item.category].push(processedItem);
            }
        });
        
        return grouped;
    }
    
    // Get single food item by ID
    static async getById(id) {
        const query = `
            SELECT 
                fi.*,
                GROUP_CONCAT(ft.tag) as tags
            FROM food_items fi
            LEFT JOIN food_tags ft ON fi.id = ft.food_item_id
            WHERE fi.id = ?
            GROUP BY fi.id
        `;
        
        const [item] = await executeQuery(query, [id]);
        
        if (!item) return null;
        
        return {
            ...item,
            tags: item.tags ? item.tags.split(',') : [],
            isVegetarian: Boolean(item.is_vegetarian),
            isVegan: Boolean(item.is_vegan),
            totalOrders: item.total_orders
        };
    }
    
    // Add new food item
    static async create(itemData) {
        const { name, price, available, unit, category, tags = [], calories, isVegetarian, isVegan, spicyLevel } = itemData;
        
        const queries = [
            {
                query: `
                    INSERT INTO food_items (name, price, available, unit, category, calories, is_vegetarian, is_vegan, spicy_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                params: [name, price, available, unit, category, calories, isVegetarian, isVegan, spicyLevel]
            }
        ];
        
        const [result] = await executeTransaction(queries);
        const foodItemId = result.insertId;
        
        // Add tags if provided
        if (tags.length > 0) {
            const tagQueries = tags.map(tag => ({
                query: 'INSERT INTO food_tags (food_item_id, tag) VALUES (?, ?)',
                params: [foodItemId, tag]
            }));
            
            await executeTransaction(tagQueries);
        }
        
        return await this.getById(foodItemId);
    }
    
    // Update food item
    static async update(id, updates) {
        const { name, price, available, unit, category, tags, calories, isVegetarian, isVegan, spicyLevel } = updates;
        
        const queries = [
            {
                query: `
                    UPDATE food_items 
                    SET name = ?, price = ?, available = ?, unit = ?, category = ?, 
                        calories = ?, is_vegetarian = ?, is_vegan = ?, spicy_level = ?
                    WHERE id = ?
                `,
                params: [name, price, available, unit, category, calories, isVegetarian, isVegan, spicyLevel, id]
            }
        ];
        
        // Update tags if provided
        if (tags !== undefined) {
            // Delete existing tags
            queries.push({
                query: 'DELETE FROM food_tags WHERE food_item_id = ?',
                params: [id]
            });
            
            // Add new tags
            if (tags.length > 0) {
                tags.forEach(tag => {
                    queries.push({
                        query: 'INSERT INTO food_tags (food_item_id, tag) VALUES (?, ?)',
                        params: [id, tag]
                    });
                });
            }
        }
        
        await executeTransaction(queries);
        return await this.getById(id);
    }
    
    // Update stock quantity
    static async updateStock(id, quantity) {
        const query = 'UPDATE food_items SET available = ? WHERE id = ?';
        await executeQuery(query, [quantity, id]);
        return await this.getById(id);
    }
    
    // Decrease stock (for orders)
    static async decreaseStock(id, quantity) {
        const query = `
            UPDATE food_items 
            SET available = available - ?, total_orders = total_orders + ?
            WHERE id = ? AND available >= ?
        `;
        
        const result = await executeQuery(query, [quantity, quantity, id, quantity]);
        
        if (result.affectedRows === 0) {
            throw new Error('Insufficient stock or item not found');
        }
        
        return await this.getById(id);
    }
    
    // Delete food item
    static async delete(id) {
        const query = 'DELETE FROM food_items WHERE id = ?';
        const result = await executeQuery(query, [id]);
        return result.affectedRows > 0;
    }
    
    // Search food items
    static async search(searchTerm, category = null) {
        let query = `
            SELECT 
                fi.*,
                GROUP_CONCAT(ft.tag) as tags
            FROM food_items fi
            LEFT JOIN food_tags ft ON fi.id = ft.food_item_id
            WHERE fi.name LIKE ?
        `;
        
        const params = [`%${searchTerm}%`];
        
        if (category) {
            query += ' AND fi.category = ?';
            params.push(category);
        }
        
        query += ' GROUP BY fi.id ORDER BY fi.name';
        
        const items = await executeQuery(query, params);
        
        return items.map(item => ({
            ...item,
            tags: item.tags ? item.tags.split(',') : [],
            isVegetarian: Boolean(item.is_vegetarian),
            isVegan: Boolean(item.is_vegan),
            totalOrders: item.total_orders
        }));
    }
}

module.exports = FoodItem;