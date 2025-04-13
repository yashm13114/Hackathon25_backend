// app.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const http = require('http');
const { OpenAI } = require("openai");
const resumeRoutes = require('./router/resume.jsx');
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
        origin: "http://localhost:8080", // your frontend address
        methods: ["GET", "POST"],
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
    origin: ['http://10.200.17.94:8080', 'http://localhost:8080', 'http://localhost:8081'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Optional: if you're using cookies or auth headers
};


app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use('/resume', resumeRoutes);
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
// Handle real-time chat messages
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    // Notify existing users about new user
    socket.broadcast.emit('user-connected', socket.id);

    // Send existing users to new user
    socket.on('get-users', (callback) => {
        const users = Array.from(io.sockets.sockets.keys()).filter(id => id !== socket.id);
        socket.emit('existing-users', users);
        if (callback) callback(users);
    });

    // WebRTC signaling
    socket.on('offer', (toId, description) => {
        socket.to(toId).emit('offer', socket.id, description);
    });

    socket.on('answer', (toId, description) => {
        socket.to(toId).emit('answer', socket.id, description);
    });

    socket.on('candidate', (toId, candidate) => {
        socket.to(toId).emit('candidate', socket.id, candidate);
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        socket.broadcast.emit('user-disconnected', socket.id);
    });

    // Existing chat message handler
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
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
app.post('/user/login', async(req, res) => {
    try {
        const { email, password } = req.body;
        const foundUser = await User.findOne({ email });

        if (!foundUser)
            return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, foundUser.password);

        if (!isMatch)
            return res.status(400).json({ message: 'Invalid password' });

        // No JWT, just return user info
        res.json({
            message: 'User logged in successfully',
            user: {
                name: foundUser.name,
                email: foundUser.email,
                _id: foundUser._id // Optional: use only if needed
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
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