// Admin Model
const { executeQuery } = require('../connection');
const bcrypt = require('bcrypt');

class Admin {
    // Authenticate admin
    static async authenticate(username, password) {
        const query = `
            SELECT id, username, password_hash, role, active
            FROM admin_accounts
            WHERE username = ? AND active = TRUE
        `;
        
        const [admin] = await executeQuery(query, [username]);
        
        if (!admin) {
            throw new Error('Invalid credentials');
        }
        
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }
        
        // Return admin without password hash
        return {
            id: admin.id,
            username: admin.username,
            role: admin.role
        };
    }
    
    // Get all admins
    static async getAll() {
        const query = `
            SELECT id, username, role, active, created_at, updated_at
            FROM admin_accounts
            ORDER BY role, username
        `;
        
        return await executeQuery(query);
    }
    
    // Get admin by ID
    static async getById(id) {
        const query = `
            SELECT id, username, role, active, created_at, updated_at
            FROM admin_accounts
            WHERE id = ?
        `;
        
        const [admin] = await executeQuery(query, [id]);
        return admin || null;
    }
    
    // Create new admin
    static async create(adminData) {
        const { username, password, role } = adminData;
        
        // Check if username already exists
        const existingAdmin = await executeQuery(
            'SELECT id FROM admin_accounts WHERE username = ?',
            [username]
        );
        
        if (existingAdmin.length > 0) {
            throw new Error('Username already exists');
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        const query = `
            INSERT INTO admin_accounts (username, password_hash, role)
            VALUES (?, ?, ?)
        `;
        
        const result = await executeQuery(query, [username, passwordHash, role]);
        
        return await this.getById(result.insertId);
    }
    
    // Update admin
    static async update(id, updates) {
        const { username, password, role, active } = updates;
        
        let query = 'UPDATE admin_accounts SET ';
        const params = [];
        const setParts = [];
        
        if (username !== undefined) {
            // Check if new username already exists (excluding current admin)
            const existingAdmin = await executeQuery(
                'SELECT id FROM admin_accounts WHERE username = ? AND id != ?',
                [username, id]
            );
            
            if (existingAdmin.length > 0) {
                throw new Error('Username already exists');
            }
            
            setParts.push('username = ?');
            params.push(username);
        }
        
        if (password !== undefined) {
            const passwordHash = await bcrypt.hash(password, 10);
            setParts.push('password_hash = ?');
            params.push(passwordHash);
        }
        
        if (role !== undefined) {
            setParts.push('role = ?');
            params.push(role);
        }
        
        if (active !== undefined) {
            setParts.push('active = ?');
            params.push(active);
        }
        
        if (setParts.length === 0) {
            throw new Error('No fields to update');
        }
        
        query += setParts.join(', ') + ' WHERE id = ?';
        params.push(id);
        
        const result = await executeQuery(query, params);
        
        if (result.affectedRows === 0) {
            throw new Error('Admin not found');
        }
        
        return await this.getById(id);
    }
    
    // Delete admin (soft delete by setting active = false)
    static async delete(id) {
        // Don't allow deleting the last super admin
        const superAdmins = await executeQuery(
            'SELECT COUNT(*) as count FROM admin_accounts WHERE role = "Super Admin" AND active = TRUE'
        );
        
        const [adminToDelete] = await executeQuery(
            'SELECT role FROM admin_accounts WHERE id = ?',
            [id]
        );
        
        if (adminToDelete?.role === 'Super Admin' && superAdmins[0].count <= 1) {
            throw new Error('Cannot delete the last Super Admin');
        }
        
        const query = 'UPDATE admin_accounts SET active = FALSE WHERE id = ?';
        const result = await executeQuery(query, [id]);
        
        return result.affectedRows > 0;
    }
    
    // Change password
    static async changePassword(id, currentPassword, newPassword) {
        // Verify current password
        const [admin] = await executeQuery(
            'SELECT password_hash FROM admin_accounts WHERE id = ?',
            [id]
        );
        
        if (!admin) {
            throw new Error('Admin not found');
        }
        
        const isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash);
        
        if (!isValidPassword) {
            throw new Error('Current password is incorrect');
        }
        
        // Update password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        const query = 'UPDATE admin_accounts SET password_hash = ? WHERE id = ?';
        await executeQuery(query, [newPasswordHash, id]);
        
        return true;
    }
}

module.exports = Admin;