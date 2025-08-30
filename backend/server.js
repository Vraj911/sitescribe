const express = require('express');
const cors = require('cors');
const { processCommand } = require('./controller/commandController');
const commandRoutes = require('./routes/commandRoutes');
function startServer(port = 5000) {
    try {
        const app = express();
        app.use(cors()); 
        app.use(express.json());
        app.post('/api/command/process', async (req, res) => {
            try {
                const { folder, command } = req.body;
                if (!folder || !command) {
                    return res.status(400).json({ message: 'folder and command are required' });
                }
                const result = await processCommand(folder, command);
                res.json(result);
            } catch (err) {
                console.error('Error in /api/command/process:', err);
                res.status(500).json({ message: 'Internal server error', error: err.message });
            }
        });
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
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    startServer(PORT);
}
module.exports = { startServer, processCommand };
