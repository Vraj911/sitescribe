const { processCommand } = require('../services/commandService'); // renamed file for clarity

// Controller function to handle Express route
async function runCommand(req, res) {
    try {
        const { folder, command } = req.body;
        const result = await processCommand(folder, command);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = { runCommand, processCommand }; // export both
