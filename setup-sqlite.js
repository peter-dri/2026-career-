const dbConnection = require('./database/sqlite-connection');
const fs = require('fs');
const path = require('path');

async function setupSQLiteDatabase() {
    try {
        console.log('🚀 Setting up SQLite database for Tharaka Cafeteria...');
        
        // Connect to database
        await dbConnection.connect();
        console.log('✅ Connected to SQLite database');
        
        // Initialize database with schema
        await dbConnection.initializeDatabase();
        console.log('✅ Database schema created successfully');
        
        // Verify setup by checking tables
        const tables = await dbConnection.all(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        );
        
        console.log('\n📋 Created tables:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });
        
        // Check if sample data was inserted
        const foodItemCount = await dbConnection.get('SELECT COUNT(*) as count FROM food_items');
        const adminCount = await dbConnection.get('SELECT COUNT(*) as count FROM admins');
        
        console.log('\n📊 Sample data:');
        console.log(`   - Food items: ${foodItemCount.count}`);
        console.log(`   - Admins: ${adminCount.count}`);
        
        console.log('\n🎉 SQLite database setup completed successfully!');
        console.log('\n📝 Default admin credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n🚀 You can now start the server with: npm start');
        
    } catch (error) {
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    } finally {
        await dbConnection.close();
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupSQLiteDatabase();
}

module.exports = setupSQLiteDatabase;