const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: 'buildsource-secret-key', // Change this in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

function loadJSON(filename) {
  const p = path.join(__dirname, 'data', filename);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error('Error loading', filename, err);
    return null;
  }
}

app.get('/', (req, res) => {
  const materials = loadJSON('materials.json');
  const projects = loadJSON('projects.json');
  res.render('index', { title: 'Home', materials: materials || [], projects: projects || [], user: req.session.user });
});

app.get('/about', (req, res) => res.render('about', { title: 'About', user: req.session.user }));
app.get('/services', (req, res) => {
  const services = loadJSON('services.json');
  res.render('services', { title: 'Services', services: services || [], user: req.session.user });
});
app.get('/projects', (req, res) => {
  const projects = loadJSON('projects.json');
  res.render('projects', { title: 'Projects', projects: projects || [], user: req.session.user });
});
app.get('/pricing', (req, res) => {
  const pricing = loadJSON('pricing.json');
  res.render('pricing', { title: 'Pricing', pricing: pricing || [], user: req.session.user });
});
app.get('/materials', (req, res) => {
  const materials = loadJSON('materials.json');
  res.render('materials', { title: 'Materials', materials: materials || [], user: req.session.user });
});
app.get('/hire', (req, res) => {
  const professionals = loadJSON('professionals.json');
  res.render('hire', { title: 'Hire Professionals', professionals: professionals || [], user: req.session.user });
});
app.get('/contact', (req, res) => res.render('contact', { title: 'Contact', user: req.session.user }));

app.get('/api/services', (req, res) => {
  const services = loadJSON('services.json');
  res.json({ success: true, data: services });
});
app.get('/api/pricing', (req, res) => {
  const pricing = loadJSON('pricing.json');
  res.json({ success: true, data: pricing });
});
app.get('/api/materials', (req, res) => {
  const materials = loadJSON('materials.json');
  res.json({ success: true, data: materials });
});
app.get('/api/materials/:id', (req, res) => {
  const materials = loadJSON('materials.json') || [];
  const id = parseInt(req.params.id, 10);
  const item = materials.find(m => m.id === id);
  if (!item) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: item });
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).render('contact', { title: 'Contact', error: 'Please fill all fields.' });
  }
  console.log('Contact form:', { name, email, message });
  res.render('contact', { title: 'Contact', success: 'Thank you! We will get back to you shortly.' });
});

app.post('/api/request-quote', (req, res) => {
  const { materialId, name, email } = req.body;
  if (!materialId || !name || !email) return res.status(400).json({ success:false, error:'Missing fields' });
  console.log('Quote requested for', materialId, 'by', name, email);
  return res.json({ success:true, message:'Quote request received.' });
});

// Sign In routes
app.get('/signin', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('signin', { title: 'Sign In', user: req.session.user });
});

// Sign Up routes
app.get('/signup', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('signup', { title: 'Create Account', user: req.session.user });
});

app.post('/signin', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.render('signin', { title: 'Sign In', error: 'All fields are required.' });
  }

  const users = loadJSON('users.json') || [];
  const user = users.find(u => u.email === email && u.role === role);

  if (!user) {
    return res.render('signin', { title: 'Sign In', error: 'Invalid email or role.' });
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.render('signin', { title: 'Sign In', error: 'Invalid password.' });
  }

  // Set session
  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  res.redirect('/');
});

// Sign Up POST route
app.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  if (!name || !email || !password || !confirmPassword || !role) {
    return res.render('signup', { title: 'Create Account', error: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.render('signup', { title: 'Create Account', error: 'Passwords do not match.' });
  }

  if (password.length < 6) {
    return res.render('signup', { title: 'Create Account', error: 'Password must be at least 6 characters long.' });
  }

  const users = loadJSON('users.json') || [];
  const existingUser = users.find(u => u.email === email);

  if (existingUser) {
    return res.render('signup', { title: 'Create Account', error: 'Email already exists.' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: users.length + 1,
    email,
    password: hashedPassword,
    role,
    name
  };

  users.push(newUser);

  // Save to file
  fs.writeFileSync(path.join(__dirname, 'data', 'users.json'), JSON.stringify(users, null, 2));

  res.render('signup', { title: 'Create Account', success: 'Account created successfully! You can now sign in.' });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/');
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

