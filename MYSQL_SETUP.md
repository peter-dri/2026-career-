# MySQL Migration Guide

This guide will help you migrate from the JSON-based storage to MySQL database.

## Prerequisites

1. **MySQL Server** - Install MySQL 8.0 or higher
2. **Node.js** - Version 14.0.0 or higher
3. **npm** - Node package manager

## Installation Steps

### 1. Install MySQL Dependencies

```bash
npm run install-deps
# or manually:
npm install mysql2 bcrypt
```

### 2. Set Up MySQL Database

#### Option A: Using MySQL Command Line
```bash
# Login to MySQL as root
mysql -u root -p

# Create database and user (optional)
CREATE DATABASE tharaka_cafeteria;
CREATE USER 'cafeteria_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tharaka_cafeteria.* TO 'cafeteria_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Run schema setup
npm run setup-db
```

#### Option B: Using MySQL Workbench or phpMyAdmin
1. Create a new database named `tharaka_cafeteria`
2. Import the `database/schema.sql` file

### 3. Configure Database Connection

Create a `.env` file in the root directory (optional):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tharaka_cafeteria
```

If no `.env` file is provided, the system will use default values:
- Host: localhost
- User: root
- Password: (empty)
- Database: tharaka_cafeteria

### 4. Migrate Existing Data

**⚠️ Important: This will backup your current data.json file**

```bash
npm run migrate
```

This script will:
- Create a backup of your current `data.json` file
- Transfer all food items, orders, and admin accounts to MySQL
- Hash existing passwords using bcrypt
- Preserve all order history and relationships

### 5. Start the Server

```bash
npm start
```

The server will now use MySQL instead of JSON files.

## Database Schema

### Tables Created:

1. **food_items** - Menu items with categories, pricing, and nutritional info
2. **food_tags** - Tags for food items (many-to-many relationship)
3. **admin_accounts** - Admin users with hashed passwords
4. **orders** - Customer orders with payment information
5. **order_items** - Individual items within orders
6. **user_preferences** - Customer dietary preferences
7. **recommendation_metrics** - AI recommendation analytics
8. **reviews** - Customer reviews and ratings
9. **order_counter** - Auto-incrementing order numbers

## New Features with MySQL

### 🔐 **Enhanced Security**
- Passwords are now hashed with bcrypt
- SQL injection protection
- Proper data validation

### 📊 **Better Performance**
- Indexed queries for fast searches
- Optimized data relationships
- Connection pooling

### 🔍 **Advanced Queries**
- Search orders by order number or item name
- Filter food items by category, tags, dietary preferences
- Generate detailed analytics and reports

### 📈 **Scalability**
- Support for concurrent users
- Transaction support for data consistency
- Better error handling and recovery

## API Changes

The API endpoints remain the same, but now use MySQL:

- `GET /api/data` - Returns food items and recent orders
- `POST /api/order` - Creates new order with inventory validation
- `POST /api/admin/login` - Admin authentication with bcrypt
- `POST /api/food` - Add new food items
- `PUT /api/food/:id` - Update food items
- `GET /api/order/:orderNumber` - Get specific order
- `PUT /api/order/:id/payment` - Update payment status

## Troubleshooting

### Connection Issues
```bash
# Test MySQL connection
mysql -u root -p -e "SELECT 1"

# Check if database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'tharaka_cafeteria'"
```

### Migration Issues
```bash
# Check if migration completed
mysql -u root -p tharaka_cafeteria -e "SELECT COUNT(*) FROM food_items"

# View admin accounts
mysql -u root -p tharaka_cafeteria -e "SELECT username, role FROM admin_accounts"
```

### Server Issues
- Ensure MySQL service is running
- Check database credentials in connection.js
- Verify all dependencies are installed

## Rollback (if needed)

If you need to rollback to JSON storage:
1. Stop the server
2. Restore from the backup file created during migration
3. Revert server.js to use the old JSON-based code

## Performance Tips

1. **Indexes**: The schema includes optimized indexes for common queries
2. **Connection Pooling**: Configured for up to 10 concurrent connections
3. **Caching**: Consider adding Redis for session management in production
4. **Monitoring**: Use MySQL's performance schema for query optimization

## Production Deployment

For production environments:

1. Use environment variables for database credentials
2. Set up SSL connections to MySQL
3. Configure proper backup strategies
4. Monitor database performance and logs
5. Consider using a managed MySQL service (AWS RDS, Google Cloud SQL, etc.)

---

**Need Help?** Check the server logs for detailed error messages or create an issue in the project repository.