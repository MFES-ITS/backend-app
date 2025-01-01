const express = require('express');  // Import Express
const app = express();               // Initialize Express
app.use(express.json());             // Middleware to parse json request

const PORT = 5532;

// Inport routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

// Use the routes (all routes will be handled here)
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Handle invalid routes (404)
app.get('/', (req, res) => {
  res.send('Server is currently running.');
});
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
