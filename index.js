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
    cookie: { maxAge: 60000 }
}));

app.get('/', (req, res) => {
    res.redirect('/home')
});

app.get('/home', (req, res) => {
    const username = req.session.username;
    if (username) {
        res.render('home');
    } else {
        res.redirect('/login');
    }
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
        res.render('login', { msg });
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
        res.render('register', { msg });
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

app.get('/stores', (req, res) => {
    const username = req.session.username;
    if (username) {
        res.render('stores');
    } else {
        res.redirect('/login');
    }
});

app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});