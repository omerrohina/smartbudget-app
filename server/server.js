const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SmartBudget API is running' });
});

// Initialize database and start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SmartBudget server running on port ${PORT}`);
      console.log(`API Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;