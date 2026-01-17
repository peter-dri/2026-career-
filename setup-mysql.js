#!/usr/bin/env node

// MySQL Setup Script for Tharaka Cafeteria
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🍽️  Tharaka Cafeteria - MySQL Setup\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 14) {
    console.error('❌ Node.js 14.0.0 or higher is required');
    console.log(`   Current version: ${nodeVersion}`);
    process.exit(1);
}

console.log('✅ Node.js version check passed');

// Install dependencies
console.log('\n📦 Installing MySQL dependencies...');
try {
    execSync('npm install mysql2 bcrypt', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install dependencies');
    console.error(error.message);
    process.exit(1);
}

// Check if MySQL is available
console.log('\n🔍 Checking MySQL availability...');
try {
    execSync('mysql --version', { stdio: 'pipe' });
    console.log('✅ MySQL is available');
} catch (error) {
    console.error('❌ MySQL is not installed or not in PATH');
    console.log('   Please install MySQL Server and ensure it\'s running');
    console.log('   Download from: https://dev.mysql.com/downloads/mysql/');
    process.exit(1);
}

// Check if data.json exists for migration
const hasDataToMigrate = fs.existsSync('data.json');

if (hasDataToMigrate) {
    console.log('\n📊 Found existing data.json file');
    console.log('   This will be migrated to MySQL');
} else {
    console.log('\n📊 No existing data.json found');
    console.log('   Will start with fresh database');
}

console.log('\n🎯 Next Steps:');
console.log('1. Ensure MySQL server is running');
console.log('2. Create database: CREATE DATABASE tharaka_cafeteria;');
console.log('3. Run schema: mysql -u root -p < database/schema.sql');

if (hasDataToMigrate) {
    console.log('4. Migrate data: npm run migrate');
}

console.log('5. Start server: npm start');

console.log('\n📖 For detailed instructions, see: MYSQL_SETUP.md');
console.log('\n🚀 Setup completed! Ready for MySQL migration.');