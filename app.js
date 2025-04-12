// app.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const http = require('http');
const { OpenAI } = require("openai");
const openai = new OpenAI({
    apiKey: "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",
    baseURL: "https://openrouter.ai/api/v1",
});

// Load environment variables
dotenv.config();

// App setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Models
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
});
const facultySchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
});
const User = mongoose.model('User', userSchema);
const Faculty = mongoose.model('Faculty', facultySchema);

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
    res.send('🔥 Backend is up and running!');
});

// User Signup
app.post('/user/signup', async(req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', user: { name, email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Login
app.post('/user/login', async(req, res) => {
    try {
        const { email, password } = req.body;
        const foundUser = await User.findOne({ email });
        if (!foundUser) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

        res.json({ message: 'User logged in', user: { name: foundUser.name, email: foundUser.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Faculty Signup
app.post('/faculty/signup', async(req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingFaculty = await Faculty.findOne({ email });
        if (existingFaculty) return res.status(400).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newFaculty = new Faculty({ name, email, password: hashedPassword });
        await newFaculty.save();

        res.status(201).json({ message: 'Faculty registered', faculty: { name, email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Faculty Login
app.post('/faculty/login', async(req, res) => {
    try {
        const { email, password } = req.body;
        const foundFaculty = await Faculty.findOne({ email });
        if (!foundFaculty) return res.status(404).json({ error: 'Faculty not found' });

        const isMatch = await bcrypt.compare(password, foundFaculty.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

        res.json({ message: 'Faculty logged in', faculty: { name: foundFaculty.name, email: foundFaculty.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dummy list of users for real-time chat demo (no DB)
const users = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
    { id: '4', name: 'Daisy' },
    { id: '5', name: 'Ethan' },
];

// Start Server
server.listen(PORT, () => {
    console.log(`🚀Server running at http: localhost: $ { PORT }`);
});
// // app.js
// const express = require('express');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const bcrypt = require('bcrypt');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const { Server } = require('socket.io');
// const http = require('http');
// const { OpenAI } = require("openai");
// const openai = new OpenAI({
//     apiKey: "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",
//     baseURL: "https://openrouter.ai/api/v1",
// });

// // Load environment variables
// dotenv.config();

// // App setup
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: '*',
//         methods: ['GET', 'POST'],
//     },
// });
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(bodyParser.json());
// app.use(express.urlencoded({ extended: true }));

// // MongoDB Models
// const userSchema = new mongoose.Schema({
//     name: String,
//     email: { type: String, unique: true },
//     password: String,
// });
// const facultySchema = new mongoose.Schema({
//     name: String,
//     email: { type: String, unique: true },
//     password: String,
// });
// const User = mongoose.model('User', userSchema);
// const Faculty = mongoose.model('Faculty', facultySchema);

// // MongoDB Connection
// mongoose
//     .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => console.log('✅ Connected to MongoDB'))
//     .catch((err) => console.error('❌ MongoDB connection error:', err));

// // Routes
// app.get('/', (req, res) => {
//     res.send('🔥 Backend is up and running!');
// });

// // User Signup
// app.post('/user/signup', async(req, res) => {
//     try {
//         const { name, email, password } = req.body;
//         const existingUser = await User.findOne({ email });
//         if (existingUser) return res.status(400).json({ error: 'Email already registered' });

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const newUser = new User({ name, email, password: hashedPassword });
//         await newUser.save();

//         res.status(201).json({ message: 'User registered successfully', user: { name, email } });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // User Login
// app.post('/user/login', async(req, res) => {
//     try {
//         const { email, password } = req.body;
//         const foundUser = await User.findOne({ email });
//         if (!foundUser) return res.status(404).json({ error: 'User not found' });

//         const isMatch = await bcrypt.compare(password, foundUser.password);
//         if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

//         res.json({ message: 'User logged in', user: { name: foundUser.name, email: foundUser.email } });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // Faculty Signup
// app.post('/faculty/signup', async(req, res) => {
//     try {
//         const { name, email, password } = req.body;
//         const existingFaculty = await Faculty.findOne({ email });
//         if (existingFaculty) return res.status(400).json({ error: 'Email already registered' });

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const newFaculty = new Faculty({ name, email, password: hashedPassword });
//         await newFaculty.save();

//         res.status(201).json({ message: 'Faculty registered', faculty: { name, email } });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // Faculty Login
// app.post('/faculty/login', async(req, res) => {
//     try {
//         const { email, password } = req.body;
//         const foundFaculty = await Faculty.findOne({ email });
//         if (!foundFaculty) return res.status(404).json({ error: 'Faculty not found' });

//         const isMatch = await bcrypt.compare(password, foundFaculty.password);
//         if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

//         res.json({ message: 'Faculty logged in', faculty: { name: foundFaculty.name, email: foundFaculty.email } });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // Dummy list of users for real-time chat demo (no DB)
// const users = [
//     { id: '1', name: 'Alice' },
//     { id: '2', name: 'Bob' },
//     { id: '3', name: 'Charlie' },
//     { id: '4', name: 'Daisy' },
//     { id: '5', name: 'Ethan' },
// ];



// // Start Server
// server.listen(PORT, () => {
//     console.log(`🚀Server running at http: localhost: $ { PORT }`);
// });