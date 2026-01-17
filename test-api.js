const http = require('http');

function testAPI(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Tharaka Cafeteria API...\n');

    try {
        // Test 1: Get menu items
        console.log('1. Testing GET /api/menu');
        const menuResult = await testAPI('/api/menu');
        console.log(`   Status: ${menuResult.status}`);
        console.log(`   Items found: ${Array.isArray(menuResult.data) ? menuResult.data.length : 'N/A'}`);
        if (Array.isArray(menuResult.data) && menuResult.data.length > 0) {
            console.log(`   Sample item: ${menuResult.data[0].name} - Rs. ${menuResult.data[0].price}`);
        }

        // Test 2: Get categories
        console.log('\n2. Testing GET /api/menu/categories');
        const categoriesResult = await testAPI('/api/menu/categories');
        console.log(`   Status: ${categoriesResult.status}`);
        console.log(`   Categories: ${Array.isArray(categoriesResult.data) ? categoriesResult.data.join(', ') : 'N/A'}`);

        // Test 3: Admin login
        console.log('\n3. Testing POST /api/admin/login');
        const loginResult = await testAPI('/api/admin/login', 'POST', {
            username: 'admin',
            password: 'admin123'
        });
        console.log(`   Status: ${loginResult.status}`);
        if (loginResult.data.token) {
            console.log(`   Login successful! Token received.`);
            console.log(`   Admin: ${loginResult.data.admin.username}`);
        } else {
            console.log(`   Login failed: ${loginResult.data.error || 'Unknown error'}`);
        }

        // Test 4: Create a test order
        console.log('\n4. Testing POST /api/orders');
        const orderResult = await testAPI('/api/orders', 'POST', {
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            customer_phone: '+94771234567',
            items: [
                { id: 1, name: 'Rice and Curry', price: 450, quantity: 1 }
            ],
            total_amount: 450,
            payment_method: 'cash'
        });
        console.log(`   Status: ${orderResult.status}`);
        if (orderResult.data.id) {
            console.log(`   Order created! ID: ${orderResult.data.id}`);
            console.log(`   Customer: ${orderResult.data.customer_name}`);
            console.log(`   Total: Rs. ${orderResult.data.total_amount}`);
        } else {
            console.log(`   Order creation failed: ${orderResult.data.error || 'Unknown error'}`);
        }

        console.log('\n✅ API tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Make sure the server is running: npm start');
    }
}

runTests();