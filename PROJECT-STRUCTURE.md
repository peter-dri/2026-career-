# Clean Project Structure

## Files We'll Keep
```
tharaka-cafeteria/
├── index.html          # Main customer-facing page
├── admin.html          # Separate admin panel
├── styles.css          # All styles
├── server.js           # Simple backend
├── data.json           # Data storage
├── package.json        # Dependencies
└── modules/
    ├── cart.js         # Shopping cart
    ├── menu.js         # Menu display
    ├── payment.js      # Payment processing
    ├── admin.js        # Admin operations
    └── auth.js         # Simple authentication
```

## What We're Removing
- Duplicate auth modules
- Unused admin-ui.js
- Complex admin.js with mixed concerns
- Redundant receipt/review modules (add later)
- All documentation files (we'll recreate)

## Clean Architecture Principles
1. **One responsibility per module**
2. **No duplicate code**
3. **Simple before complex**
4. **Backend: Just data storage and retrieval**
5. **Frontend: Clear separation of customer vs admin**

## Build Order
1. ✅ Simple server (GET/POST data only)
2. ✅ Basic data.json structure
3. ✅ Customer index.html (view menu, add to cart)
4. ✅ Admin panel (login, manage inventory)
5. ⏳ Then add: orders, payments, reviews (one at a time)
