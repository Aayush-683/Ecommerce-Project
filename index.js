const express = require('express');
const session = require('express-session');
const app = express();
const { QuickDB } = require('quick.db');
const db = new QuickDB({
    filePath: './database.sqlite'
});
const port = 3000;

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
                if (check.accountType === 'admin') {
                    req.session.admin = true;
                } else {
                    req.session.admin = false;
                }
                if (check.accountType === 'seller') {
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
            coordinates: '1,1',
            products: [
                {
                    name: 'Product 1',
                    price: 100
                },
                {
                    name: 'Product 2',
                    price: 200
                }
            ]
        },
        {
            name: 'Store 2',
            coordinates: '2,2',
            products: [
                {
                    name: 'Product 1',
                    price: 100
                },
                {
                    name: 'Product 2',
                    price: 200
                }
            ]
        },
        {
            name: 'Store 3',
            coordinates: '3,3',
            products: [
                {
                    name: 'Product 1',
                    price: 100
                },
                {
                    name: 'Product 2',
                    price: 200
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

app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});