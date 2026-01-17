const dbConnection = require('../../sqlite-connection');

class FoodItem {
    constructor(data = {}) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.price = parseFloat(data.price) || 0;
        this.category = data.category;
        this.image_url = data.image_url;
        this.is_available = Boolean(data.is_available);
        this.preparation_time = parseInt(data.preparation_time) || 15;
        this.ingredients = data.ingredients ? 
            (typeof data.ingredients === 'string' ? JSON.parse(data.ingredients) : data.ingredients) : [];
        this.nutritional_info = data.nutritional_info ? 
            (typeof data.nutritional_info === 'string' ? JSON.parse(data.nutritional_info) : data.nutritional_info) : {};
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findById(id) {
        try {
            const row = await dbConnection.get(
                'SELECT * FROM food_items WHERE id = ?',
                [id]
            );
            return row ? new FoodItem(row) : null;
        } catch (error) {
            console.error('Error finding food item by ID:', error);
            throw error;
        }
    }

    static async getAll(options = {}) {
        try {
            let query = 'SELECT * FROM food_items';
            const params = [];
            const conditions = [];

            if (options.category) {
                conditions.push('category = ?');
                params.push(options.category);
            }

            if (options.available !== undefined) {
                conditions.push('is_available = ?');
                params.push(options.available ? 1 : 0);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY category, name';

            const rows = await dbConnection.all(query, params);
            return rows.map(row => new FoodItem(row));
        } catch (error) {
            console.error('Error getting all food items:', error);
            throw error;
        }
    }

    static async getByCategory(category) {
        return await FoodItem.getAll({ category, available: true });
    }

    static async getAvailable() {
        return await FoodItem.getAll({ available: true });
    }

    static async search(searchTerm) {
        try {
            const query = `
                SELECT * FROM food_items 
                WHERE (name LIKE ? OR description LIKE ? OR category LIKE ?) 
                AND is_available = 1
                ORDER BY name
            `;
            const searchPattern = `%${searchTerm}%`;
            const rows = await dbConnection.all(query, [searchPattern, searchPattern, searchPattern]);
            return rows.map(row => new FoodItem(row));
        } catch (error) {
            console.error('Error searching food items:', error);
            throw error;
        }
    }

    static async create(itemData) {
        try {
            const result = await dbConnection.run(
                `INSERT INTO food_items 
                 (name, description, price, category, image_url, is_available, preparation_time, ingredients, nutritional_info) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    itemData.name,
                    itemData.description,
                    itemData.price,
                    itemData.category,
                    itemData.image_url,
                    itemData.is_available ? 1 : 0,
                    itemData.preparation_time || 15,
                    JSON.stringify(itemData.ingredients || []),
                    JSON.stringify(itemData.nutritional_info || {})
                ]
            );

            return await FoodItem.findById(result.id);
        } catch (error) {
            console.error('Error creating food item:', error);
            throw error;
        }
    }

    async save() {
        try {
            if (this.id) {
                // Update existing item
                await dbConnection.run(
                    `UPDATE food_items 
                     SET name = ?, description = ?, price = ?, category = ?, image_url = ?, 
                         is_available = ?, preparation_time = ?, ingredients = ?, nutritional_info = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [
                        this.name,
                        this.description,
                        this.price,
                        this.category,
                        this.image_url,
                        this.is_available ? 1 : 0,
                        this.preparation_time,
                        JSON.stringify(this.ingredients),
                        JSON.stringify(this.nutritional_info),
                        this.id
                    ]
                );
                return await FoodItem.findById(this.id);
            } else {
                // Create new item
                return await FoodItem.create(this);
            }
        } catch (error) {
            console.error('Error saving food item:', error);
            throw error;
        }
    }

    async delete() {
        try {
            await dbConnection.run(
                'DELETE FROM food_items WHERE id = ?',
                [this.id]
            );
            return true;
        } catch (error) {
            console.error('Error deleting food item:', error);
            throw error;
        }
    }

    async updateAvailability(isAvailable) {
        try {
            await dbConnection.run(
                'UPDATE food_items SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [isAvailable ? 1 : 0, this.id]
            );
            this.is_available = isAvailable;
            return true;
        } catch (error) {
            console.error('Error updating food item availability:', error);
            throw error;
        }
    }

    static async getCategories() {
        try {
            const rows = await dbConnection.all(
                'SELECT DISTINCT category FROM food_items WHERE is_available = 1 ORDER BY category'
            );
            return rows.map(row => row.category);
        } catch (error) {
            console.error('Error getting categories:', error);
            throw error;
        }
    }

    static async count(options = {}) {
        try {
            let query = 'SELECT COUNT(*) as count FROM food_items';
            const params = [];
            
            if (options.available !== undefined) {
                query += ' WHERE is_available = ?';
                params.push(options.available ? 1 : 0);
            }

            const result = await dbConnection.get(query, params);
            return result.count;
        } catch (error) {
            console.error('Error counting food items:', error);
            throw error;
        }
    }

    // Get popular items based on order frequency
    static async getPopular(limit = 10) {
        try {
            const query = `
                SELECT fi.*, COUNT(oi.food_item_id) as order_count
                FROM food_items fi
                LEFT JOIN order_items oi ON fi.id = oi.food_item_id
                WHERE fi.is_available = 1
                GROUP BY fi.id
                ORDER BY order_count DESC, fi.name
                LIMIT ?
            `;
            const rows = await dbConnection.all(query, [limit]);
            return rows.map(row => new FoodItem(row));
        } catch (error) {
            console.error('Error getting popular food items:', error);
            throw error;
        }
    }
}

module.exports = FoodItem;