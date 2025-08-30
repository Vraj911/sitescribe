const express = require('express');
const { runCommand } = require('../controller/commandController');

const router = express.Router();

// POST /api/command - Execute a command on a folder
router.post('/', async (req, res) => {
    try {
        const { folder, command } = req.body;
        
        if (!folder || !command) {
            return res.status(400).json({
                success: false,
                error: 'Folder path and command are required'
            });
        }

        const result = await runCommand(folder, command);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Command execution error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
