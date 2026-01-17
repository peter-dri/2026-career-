# Tharaka University Cafeteria

Clean, simple cafeteria management system.

## Quick Start

```bash
node server.js
```

Then open: `http://localhost:8000`

## Admin Access

Go to: `http://localhost:8000/admin.html`

- Username: `admin`
- Password: `admin123`

## Project Structure

```
├── index.html       # Customer menu
├── admin.html       # Admin panel
├── styles.css       # All styles
├── server.js        # Backend (simple!)
├── data.json        # Data storage
└── modules/
    ├── menu.js      # Display menu
    ├── cart.js      # Shopping cart
    ├── admin.js     # Admin functions
    └── auth.js      # Login
```

## Features

### Customer Side
- View menu by category
- Add items to cart
- Place orders

### Admin Side
- Login required
- Update inventory
- View orders
- Add/remove items

## That's it! Simple and clean. 🎯
