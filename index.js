const express = require('express');
const session = require('express-session');
const app = express();
const { QuickDB } = require('quick.db');
const db = new QuickDB({
    filePath: './database.sqlite'
});
const port = 5000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: '4pOGPX5C6Wxs5YeAMImC0jk3iRBCIMQctJyoz4oz',
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: 60000000 },
    rolling: true,
    name: 'session'
}));

app.get('/', (req, res) => {
    res.redirect('/home')
});

app.get('/home', (req, res) => {
    res.render('home', { req: req });
});

app.get('/login', (req, res) => {
    const username = req.session.username;
    if (username) {
        res.redirect('/home');
    } else {
        let error = req.query.error;
        let msg = false;
        if (error) {
            switch (error) {
                case '0':
                    msg = 'Account created successfully. Please login';
                    break;
                case '1':
                    msg = 'Invalid username or password';
                    break;
                default:
                    break;
            }
        }
        res.render('login', { msg, req: req });
    }
});

app.post('/login', async (req, res) => {
    const username = req.session.username;
    if (username) {
        res.redirect('/home');
    } else {
        const { username, password } = req.body;
        if (username) {
            let check = await db.get(`users.${username}`);
            if (check && check.password === password) {
                req.session.username = username;
                req.session.coords = check.coordinates;
                if (check.accountType == 'admin') {
                    req.session.admin = true;
                } else {
                    req.session.admin = false;
                }
                if (check.accountType == 'seller') {
                    req.session.seller = true;
                } else {
                    req.session.seller = false;
                }
                // Save session to cookie so user can stay logged in
                req.session.save();
                res.redirect('/home');
            } else {
                res.redirect('/login?error=1');
            }
        } else {
            res.redirect('/login?error=1');
        }
    }
});

app.get('/register', (req, res) => {
    const username = req.session.username;
    if (username) {
        res.redirect('/home');
    } else {
        let error = req.query.error;
        let msg = false;
        if (error) {
            switch (error) {
                case '0':
                    msg = 'Invalid username';
                    break;
                case '1':
                    msg = 'Username already exists';
                    break;
                case '2':
                    msg = 'Passwords do not match';
                    break;
                case '3':
                    msg = 'Password must be at least 6 characters long';
                    break;
                default:
                    break;
            }
        }
        res.render('register', { msg, req: req });
    }
});

app.post('/register', async (req, res) => {
    const username = req.session.username;
    if (username) {
        res.redirect('/home');
    } else {
        const { username, contact, email, coordinates, accountType, password, confirmPassword } = req.body;
        if (username) {
            let check = await db.get(`users.${username}`);
            if (check) {
                res.redirect('/register?error=1');
            } else if (password !== confirmPassword) {
                res.redirect('/register?error=2');
            } else if (password.length < 6) {
                res.redirect('/register?error=3');
            } else {
                await db.set(`users.${username}`, { contact, email, coordinates, accountType, password });
                res.redirect('/login?error=0');
            }
        } else {
            res.redirect('/register?error=0');
        }
    }
});

app.get('/stores', async (req, res) => {
    let { sortBy, distance } = req.query;
    if (!sortBy) sortBy = 1
    else sortBy = parseInt(sortBy); // 1, 2, 3 (random, ascending, descending)
    if (!distance) distance = 0
    else distance = parseInt(distance); // 10, 50, 100 (km)
    let stores = await db.get('stores') || [
        {
            name: 'Store 1',
            seller: 'seller1',
            coordinates: '1,1',
            products: [
                {
                    id: 1,
                    name: 'Product 1',
                    price: 100,
                    store: 'Store 1',
                    description: 'Description 1',
                    image: 'https://via.placeholder.com/150'
                },
                {
                    id: 2,
                    name: 'Product 2',
                    price: 200,
                    store: 'Store 1',
                    description: 'Description 2',
                    image: 'https://via.placeholder.com/150'
                }
            ]
        },
        {
            name: 'Store 2',
            seller: 'seller2',
            coordinates: '2,2',
            products: [
                {
                    id: 1,
                    name: 'Product 1',
                    price: 100,
                    store: 'Store 2',
                    description: 'Description 1',
                    image: 'https://via.placeholder.com/150'
                },
                {
                    id: 2,
                    name: 'Product 2',
                    price: 200,
                    store: 'Store 2',
                    description: 'Description 2',
                    image: 'https://via.placeholder.com/150'
                }
            ]
        },
        {
            name: 'Store 3',
            seller: 'seller3',
            coordinates: '3,3',
            products: [
                {
                    id: 1,
                    name: 'Product 1',
                    price: 100,
                    store: 'Store 3',
                    description: 'Description 1',
                    image: 'https://via.placeholder.com/150'
                },
                {
                    id: 2,
                    name: 'Product 2',
                    price: 200,
                    store: 'Store 3',
                    description: 'Description 2',
                    image: 'https://via.placeholder.com/150'
                }
            ]
        }
    ]
    let username = req.session.username;
    if (username) {
        let user = await db.get(`users.${username}`);
        let coordinates = user.coordinates;
        if (coordinates) {
            let [lat, lon] = coordinates.split(',');
            // Filter stores by distance based on get parameter
            if (distance > 0) {
                stores = stores.filter(store => {
                    let [storeLat, storeLon] = store.coordinates.split(',');
                    // Calculate distance between user and store based on coordinates using euclidean distance
                    let dis = Math.sqrt((storeLat - lat) ** 2 + (storeLon - lon) ** 2);
                    dis = Math.floor(dis / 10);
                    store.distance = dis;
                    // console.log(dis, distance, dis <= distance)
                    return dis <= distance;
                });
            }
            stores = stores.sort((a, b) => {
                switch (sortBy) {
                    case 2:
                        return b.distance - a.distance;
                    case 3:
                        return a.distance - b.distance;
                    default:
                        return Math.random() - 0.5;
                }
            });
        } else {
            stores = stores.sort((a, b) => {
                if (sortBy === 2) {
                    return a.name.localeCompare(b.name);
                } else if (sortBy === 3) {
                    return b.name.localeCompare(a.name);
                } else {
                    return Math.random() - 0.5;
                }
            });
        }
    } else {
        stores = stores.sort((a, b) => {
            if (sortBy === 2) {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 3) {
                return b.name.localeCompare(a.name);
            } else {
                return Math.random() - 0.5;
            }
        });
    }
    res.render('stores', { stores, sortBy, distance, req: req });
});

app.get('/profile', async (req, res) => {
    let username = req.session.username;
    if (username) {
        let user = await db.get(`users.${username}`);
        let orders = await db.get(`orders.${username}`) || [
            {
                store: 'Store 1',
                date: '2021-01-01',
                products: ["Product 1", "Product 2"],
                total: 400
            },
            {
                store: 'Store 2',
                date: '2021-01-02',
                products: ["Product 1", "Product 2"],
                total: 400
            }
        ];
        res.render('profile', { user, req: req, orders });
    } else {
        res.redirect('/login');
    }
});

app.post('/editProfile', async (req, res) => {
    let username = req.session.username;
    if (username) {
        let { contact, email, coordinates, password } = req.body;
        let user = await db.get(`users.${username}`);
        if (user) {
            let newUser = { ...user, contact, email, coordinates, password };
            await db.set(`users.${username}`, newUser);
        }
        res.redirect('/profile');
    } else {
        res.status(403).send('Forbidden');
    }
});

app.get('/manage', async (req, res) => {
    let username = req.session.username;
    if (username) {
        let user = await db.get(`users.${username}`);
        let success = req.query.success || false;
        let error = req.query.error || false;
        let msg = false;
        if (success) {
            msg = 'Operation successful';
        } else if (error) {
            switch (error) {
                case '1':
                    msg = 'Store with that ID already exists';
                    break;
                case '2':
                    msg = 'Product with that ID already exists';
                    break;
                case '3':
                    msg = 'Profile with that Username already exists';
                    break;
                case '4':
                    msg = 'Store not found';
                    break;
                default:
                    break;
            }
        }
        if (user.accountType === 'admin') {
            let stores = await db.get('stores') || [];
            res.render('manage', { stores, req: req, msg });
        } else if (user.accountType === 'seller') {
            let stores = await db.get('stores') || [];
            stores = stores.filter(store => store.seller === username);
            res.render('manage', { stores, req: req, msg });
        } else {
            res.status(403).send('Forbidden');
        }
    } else {
        res.redirect('/login');
    }
});

app.post('/addStore', async (req, res) => {
    let username = req.session.username;
    if (username) {
        if (!req.session.admin && !req.session.seller) {
            res.status(403).send('Forbidden');
        }
        let { name, coordinates, id, url } = req.body;
        let stores = await db.get('stores') || [];
        let check = stores.find(s => s.id === id);
        if (check) {
            return res.redirect('/manage?error=1');
        }
        let store = { name, seller: username, coordinates, id, url, products: [] };
        await db.push('stores', store);
        res.redirect('/manage?success=1');
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/addProduct', async (req, res) => {
    let username = req.session.username;
    if (username) {
        if (!req.session.seller && !req.session.admin) {
            res.status(403).send('Forbidden');
        }
        let { store_id, product_id, product_name, product_description, product_price, product_image } = req.body;
        let stores = await db.get('stores') || [];
        let check = stores.find(s => s.id === store_id);
        if (!check) {
            return res.redirect('/manage?error=1');
        }
        let check2 = check.products.find(p => p.id === product_id);
        if (check2) {
            return res.redirect('/manage?error=2');
        }
        let product = { store: store_id, id: product_id, name: product_name, description: product_description, price: product_price, image: product_image };
        check.products.push(product);
        await db.set('stores', stores);
        res.redirect('/manage?success=1');
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/removeStore', async (req, res) => {
    let username = req.session.username;
    if (username) {
        if (!req.session.seller && !req.session.admin) {
            res.status(403).send('Forbidden');
        }
        let store = req.body.store;
        let stores = await db.get('stores') || [];
        let check = stores.find(s => s.name === store);
        if (check.seller === username || req.session.admin) {
            stores = stores.filter(s => s.name !== store);
            await db.set('stores', stores);
            res.redirect('/manage?success=1');
        } else {
            res.status(403).send('Forbidden');
        }
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/removeProduct', async (req, res) => {
    let username = req.session.username;
    if (username) {
        if (!req.session.seller && !req.session.admin) {
            res.status(403).send('Forbidden');
        }
        let { store, product } = req.body;
        let stores = await db.get('stores') || [];
        let check = stores.find(s => s.id === store);
        if (!check) return res.redirect('/manage?error=4')
        if (check.seller === username || req.session.admin) {
            check.products = check.products.filter(p => p.name !== product);
            await db.set('stores', stores);
            res.redirect('/manage?success=1');
        } else {
            res.status(403).send('Forbidden');
        }
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/addProfile', async (req, res) => {
    if (!req.session.admin) return res.status(403).send('Forbidden');
    let { username, contact, email, coordinates, password } = req.body;
    let check = await db.get(`users.${username}`);
    if (check) {
        return res.redirect('/manage?error=3');
    }
    await db.set(`users.${username}`, { contact, email, coordinates, password });
    res.redirect('/manage?success=1');
});

app.post('/removeProfile', async (req, res) => {
    if (!req.session.admin) return res.status(403).send('Forbidden');
    let username = req.body.username;
    let check = await db.get(`users.${username}`);
    if (check) {
        await db.delete(`users.${username}`);
    }
    res.redirect('/manage?success=1');
});

app.get('/product/:id', async (req, res) => {
    let id = req.params.id;
    let error = req.query.error || false;
    let success = req.query.success || false;
    let stores = await db.get('stores') || [];
    await new Promise((resolve, reject) => {
        for (let store of stores) {
            let product = store.products.find(p => p.id === id);
            if (product) {
                return res.render('product', { store, req: req, product, error, success });
            }
        }
        res.status(404).send('Not found');
    });
    res.redirect('/stores');
});

app.get('/cart', async (req, res) => {
    let username = req.session.username;
    if (username) {
        let cart = await db.get(`cart.${username}`) || []
        let total = 0;
        cart.forEach(element => {
            total += element.price * element.quantity;
        });
        res.render('cart', { products: cart, req: req, total });
    } else {
        res.redirect('/login');
    }
});

app.post('/cart', async (req, res) => {
    let username = req.session.username;
    if (username) {
        let { store, productId, buyNow, price, image, name } = req.body;
        let cart = await db.get(`cart.${username}`) || [];
        // Check if product is from the same store
        let check = cart[0] ? cart[0].store === store : true;
        if (!check) {
            return res.redirect(`/product/${productId}?error=1`);
        } else {
            // Check if product is already in cart
            let check2 = cart.find(p => p.productId === productId);
            let quantity = 1;
            if (check2) {
                quantity = check2.quantity + 1;
                cart = cart.filter(p => p.productId !== productId);
            }
            let product = { productId, quantity, price, image, store, name };
            cart.push(product);
            await db.set(`cart.${username}`, cart);
            if (buyNow == 'true') {
                res.redirect('/checkout');
            } else {
                res.redirect(`/product/${productId}?success=1`);
            }
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/removeCart', async (req, res) => {
    let username = req.session.username;
    if (username) {
        let productId = req.query.productId;
        let cart = await db.get(`cart.${username}`) || [];
        cart = cart.filter(p => p.productId === productId);
        await db.set(`cart.${username}`, cart);
        res.redirect('/cart');
    } else {
        res.redirect('/login');
    }
})

app.get('/checkout', async (req, res) => {
    let username = req.session.username;
    if (username) {
        let cart = await db.get(`cart.${username}`) || [];
        let total = 0;
        cart.forEach(element => {
            total += element.price * element.quantity;
        });
        res.render('checkout', { products: cart, req: req, total, order: false });
    } else {
        res.redirect('/login');
    }
});

app.post('/checkout', async (req, res) => {
    const username = req.session.username;
    if (!username) return res.sendStatus(403).send("Forbidden")
    let cart = await db.get(`cart.${username}`) || [];
    if (!cart) return res.redirect("/cart?error=1")
    let { address, payment } = req.body;
    let total = 0;
    let pods = []
    let store = cart[0].store;
    cart.forEach(element => {
        total += element.price * element.quantity;
        pods.push(element.name);
    });
    let date = new Date();
    // Format date into human readable form
    date = date.toISOString().split('T')[0];
    let order = { address, payment, store, total, products: pods, date: date };
    let orders = await db.get(`orders.${username}`) || [];
    orders.push(order);
    await db.set(`orders.${username}`, orders);
    await db.delete(`cart.${username}`);
    res.render('checkout', { products: cart, req: req, total, order });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/home');
})

app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});