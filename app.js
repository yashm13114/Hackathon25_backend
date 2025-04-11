const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

console.log('Mongo URI:', process.env.MONGO_URI); // 👈 Add this

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// Sample Schema and Model
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
});

const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
    res.send('Hello from Express + MongoDB!');
});

app.post('/users', async(req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});