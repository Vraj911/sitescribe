const express = require('express');
const commandRoutes = require('./routes/commandRoutes');
const { processCommand } = require('./controller/commandController');

function startServer(port = 5000) {
    try {
        const app = express();
        app.use(express.json());
        app.use('/api/command', commandRoutes);

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        }).on('error', (err) => {
            console.error('Server error:', err);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

// Start the server automatically when this module is required
startServer();

// Re-export processCommand so Electron can call it directly
module.exports = { startServer, processCommand };
