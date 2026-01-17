const dbConnection = require('../../sqlite-connection');
const bcrypt = require('bcrypt');

class Admin {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.password = data.password;
        this.email = data.email;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findById(id) {
        try {
            const row = await dbConnection.get(
                'SELECT * FROM admins WHERE id = ?',
                [id]
            );
            return row ? new Admin(row) : null;
        } catch (error) {
            console.error('Error finding admin by ID:', error);
            throw error;
        }
    }

    static async findByUsername(username) {
        try {
            const row = await dbConnection.get(
                'SELECT * FROM admins WHERE username = ?',
                [username]
            );
            return row ? new Admin(row) : null;
        } catch (error) {
            console.error('Error finding admin by username:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const row = await dbConnection.get(
                'SELECT * FROM admins WHERE email = ?',
                [email]
            );
            return row ? new Admin(row) : null;
        } catch (error) {
            console.error('Error finding admin by email:', error);
            throw error;
        }
    }

    static async create(adminData) {
        try {
            // Hash password before saving
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

            const result = await dbConnection.run(
                `INSERT INTO admins (username, password, email) 
                 VALUES (?, ?, ?)`,
                [adminData.username, hashedPassword, adminData.email]
            );

            return await Admin.findById(result.id);
        } catch (error) {
            console.error('Error creating admin:', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            const rows = await dbConnection.all(
                'SELECT id, username, email, created_at, updated_at FROM admins ORDER BY created_at DESC'
            );
            return rows.map(row => new Admin(row));
        } catch (error) {
            console.error('Error getting all admins:', error);
            throw error;
        }
    }

    async save() {
        try {
            if (this.id) {
                // Update existing admin
                await dbConnection.run(
                    `UPDATE admins 
                     SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [this.username, this.email, this.id]
                );
                return await Admin.findById(this.id);
            } else {
                // Create new admin
                return await Admin.create(this);
            }
        } catch (error) {
            console.error('Error saving admin:', error);
            throw error;
        }
    }

    async updatePassword(newPassword) {
        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

            await dbConnection.run(
                'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, this.id]
            );

            return true;
        } catch (error) {
            console.error('Error updating admin password:', error);
            throw error;
        }
    }

    async delete() {
        try {
            await dbConnection.run(
                'DELETE FROM admins WHERE id = ?',
                [this.id]
            );
            return true;
        } catch (error) {
            console.error('Error deleting admin:', error);
            throw error;
        }
    }

    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password);
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    }

    // Return admin data without password
    toJSON() {
        const { password, ...adminData } = this;
        return adminData;
    }

    static async count() {
        try {
            const result = await dbConnection.get('SELECT COUNT(*) as count FROM admins');
            return result.count;
        } catch (error) {
            console.error('Error counting admins:', error);
            throw error;
        }
    }
}

module.exports = Admin;