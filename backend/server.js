const express = require('express');
const commandRoutes = require('./routes/commandRoutes');
const { processCommand } = require('./controller/commandController');

function startServer(port = 5000) {
    const app = express();
    app.use(express.json());
    app.use('/api/command', commandRoutes);

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Re-export processCommand so Electron can call it directly
module.exports = { startServer, processCommand };
