const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import SQLite database connection and models
const dbConnection = require('./database/sqlite-connection');
const Admin = require('./database/models/sqlite/Admin');
const FoodItem = require('./database/models/sqlite/FoodItem');
const Order = require('./database/models/sqlite/Order');

// Import existing modules
const menuModule = require('./modules/menu');
const cartModule = require('./modules/cart');
const authModule = require('./modules/auth');
const adminModule = require('./modules/admin');
const paymentModule = require('./modules/payment');
const reviewsModule = require('./modules/reviews');
const recommendationsModule = require('./modules/recommendations');
const userProfileModule = require('./modules/userProfile');
const recommendationUIModule = require('./modules/recommendationUI');
const recommendationAnalyticsModule = require('./modules/recommendationAnalytics');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'your-domain.com' : '*',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('.'));

// Initialize database connection
async function initializeDatabase() {
    try {
        await dbConnection.connect();
        console.log('✅ Database connected successfully');
        
        // Check if database is initialized
        const tables = await dbConnection.all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('admins', 'food_items', 'orders')"
        );
        
        if (tables.length < 3) {
            console.log('🔧 Initializing database schema...');
            await dbConnection.initializeDatabase();
            console.log('✅ Database initialized successfully');
        }
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// ============= API ROUTES =============

// Authentication routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find admin by username
        const admin = await Admin.findByUsername(username);
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await admin.verifyPassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            admin: admin.toJSON()
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Menu routes
app.get('/api/menu', async (req, res) => {
    try {
        const { category, search } = req.query;
        let items;

        if (search) {
            items = await FoodItem.search(search);
        } else if (category) {
            items = await FoodItem.getByCategory(category);
        } else {
            items = await FoodItem.getAvailable();
        }

        res.json(items);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

app.get('/api/menu/categories', async (req, res) => {
    try {
        const categories = await FoodItem.getCategories();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.get('/api/menu/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const popularItems = await FoodItem.getPopular(limit);
        res.json(popularItems);
    } catch (error) {
        console.error('Error fetching popular items:', error);
        res.status(500).json({ error: 'Failed to fetch popular items' });
    }
});

// Admin menu management routes
app.get('/api/admin/menu', authenticateToken, async (req, res) => {
    try {
        const items = await FoodItem.getAll();
        res.json(items);
    } catch (error) {
        console.error('Error fetching admin menu:', error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

app.post('/api/admin/menu', authenticateToken, async (req, res) => {
    try {
        const item = await FoodItem.create(req.body);
        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating menu item:', error);
        res.status(500).json({ error: 'Failed to create menu item' });
    }
});

app.put('/api/admin/menu/:id', authenticateToken, async (req, res) => {
    try {
        const item = await FoodItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        Object.assign(item, req.body);
        const updatedItem = await item.save();
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

app.delete('/api/admin/menu/:id', authenticateToken, async (req, res) => {
    try {
        const item = await FoodItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        await item.delete();
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

// Order routes
app.post('/api/orders', async (req, res) => {
    try {
        const order = await Order.create(req.body);
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Admin order management routes
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const { status, limit } = req.query;
        const options = {};
        if (status) options.status = status;
        if (limit) options.limit = parseInt(limit);
        
        const orders = await Order.getAll(options);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.put('/api/admin/orders/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        await order.updateStatus(status);
        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Dashboard stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        
        const orderStats = await Order.getOrderStats(dateFrom, dateTo);
        const totalMenuItems = await FoodItem.count();
        const availableItems = await FoodItem.count({ available: true });
        const pendingOrders = await Order.count({ status: 'pending' });
        
        res.json({
            ...orderStats,
            totalMenuItems,
            availableItems,
            pendingOrders
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Legacy routes for existing modules (fallback to JSON files if needed)
app.use('/api/cart', (req, res, next) => {
    req.cartModule = cartModule;
    next();
});

app.use('/api/payment', (req, res, next) => {
    req.paymentModule = paymentModule;
    next();
});

app.use('/api/reviews', (req, res, next) => {
    req.reviewsModule = reviewsModule;
    next();
});

app.use('/api/recommendations', (req, res, next) => {
    req.recommendationsModule = recommendationsModule;
    next();
});

// Serve static pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    try {
        await dbConnection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Start server
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Tharaka Cafeteria Server running on port ${PORT}`);
            console.log(`📱 Customer Interface: http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin`);
            console.log(`\n🔐 Default admin credentials:`);
            console.log(`   Username: admin`);
            console.log(`   Password: admin123`);
            console.log(`\n📊 Database: SQLite (tharaka_cafeteria.db)`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();