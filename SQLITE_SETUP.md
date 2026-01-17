# SQLite Database Setup for Tharaka Cafeteria

## Overview
This project has been updated to use SQLite instead of MySQL for easier setup and deployment. SQLite is a lightweight, file-based database that doesn't require a separate server installation.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
node setup-sqlite.js
```

### 3. Start the Server
```bash
npm start
```

The server will be available at:
- **Customer Interface**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

## Database Files
- **Database File**: `tharaka_cafeteria.db` (created automatically)
- **Schema**: `database/sqlite-schema.sql`
- **Connection**: `database/sqlite-connection.js`
- **Models**: `database/models/sqlite/`

## Features

### ✅ Completed
- SQLite database integration
- Admin authentication with bcrypt
- Food item management (CRUD)
- Order management system
- Database models with relationships
- Transaction support
- Automatic schema initialization
- Sample data insertion

### 🔧 Database Schema

#### Tables Created:
1. **admins** - Admin user accounts
2. **food_items** - Menu items with categories, pricing, and availability
3. **orders** - Customer orders with status tracking
4. **order_items** - Individual items within orders (normalized)
5. **reviews** - Customer reviews for food items

#### Indexes:
- Performance indexes on frequently queried columns
- Foreign key relationships with cascade deletes

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login

### Menu Management
- `GET /api/menu` - Get available menu items
- `GET /api/menu/categories` - Get food categories
- `GET /api/menu/popular` - Get popular items
- `GET /api/admin/menu` - Get all items (admin)
- `POST /api/admin/menu` - Create menu item (admin)
- `PUT /api/admin/menu/:id` - Update menu item (admin)
- `DELETE /api/admin/menu/:id` - Delete menu item (admin)

### Order Management
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `GET /api/admin/orders` - Get all orders (admin)
- `PUT /api/admin/orders/:id/status` - Update order status (admin)

### Analytics
- `GET /api/admin/stats` - Get dashboard statistics

## Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Sample Data
The setup includes sample Sri Lankan food items:
- Rice and Curry (Rs. 450)
- Kottu Roti (Rs. 380)
- Fish Curry (Rs. 520)
- Hoppers (Rs. 180)
- String Hoppers (Rs. 200)
- Traditional beverages and desserts

## File Structure
```
database/
├── sqlite-connection.js     # Database connection manager
├── sqlite-schema.sql        # Database schema
└── models/sqlite/
    ├── Admin.js            # Admin model
    ├── FoodItem.js         # Food item model
    └── Order.js            # Order model
```

## Advantages of SQLite

1. **No Installation Required** - SQLite is embedded
2. **Zero Configuration** - Works out of the box
3. **Portable** - Single file database
4. **ACID Compliant** - Full transaction support
5. **Cross-Platform** - Works on Windows, Mac, Linux
6. **Fast Setup** - Ready in seconds

## Migration from MySQL

If you were previously using MySQL, the SQLite version provides:
- Same API endpoints
- Compatible data models
- Identical functionality
- Better development experience

## Troubleshooting

### Common Issues:

1. **Port already in use**
   - Change PORT in server.js or set environment variable
   - Default port is 3000

2. **Database file permissions**
   - Ensure write permissions in project directory
   - Database file: `tharaka_cafeteria.db`

3. **Missing dependencies**
   - Run `npm install` to install all required packages

### Development Commands:

```bash
# Install dependencies
npm install

# Setup database
node setup-sqlite.js

# Start server
npm start

# Start with nodemon (development)
npm run dev
```

## Production Deployment

For production deployment:

1. Set environment variables:
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-secure-secret-key
   PORT=3000
   ```

2. The SQLite database file will be created automatically
3. Ensure the server has write permissions for the database file
4. Consider backing up the `tharaka_cafeteria.db` file regularly

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Helmet security headers
- Input validation and sanitization

## Next Steps

The SQLite setup is now complete and ready for development. You can:

1. Access the customer interface at http://localhost:3000
2. Login to admin panel at http://localhost:3000/admin
3. Start building additional features
4. Integrate with the existing AI recommendation system

The database is fully functional and ready for production use!