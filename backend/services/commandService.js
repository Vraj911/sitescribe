const { indexSite } = require('./indexerService');
const { interpretCommand } = require('./llmService');
const { applyActions } = require('./modifierService');
/**
 * Process a command for a given folder.
 * @param {string} folder - Path to the folder to process
 * @param {string} command - Command string to interpret
 * @returns {Promise<Object>} - Result of applied actions
 */
async function processCommand(folder, command) {
    try {
        console.log('Processing command:', { folder, command });
        const siteIndex = indexSite(folder);
        console.log('Site indexed:', siteIndex);
        const actions = await interpretCommand(siteIndex, command);
        console.log('Actions interpreted:', actions);
        if (!actions || actions.length === 0) {
            console.log('No actions generated for this command.');
            return { message: 'No actions generated', results: [] };
        }
        const result = await applyActions(actions);
        console.log('Actions applied:', result);
        return { message: 'Success', results: result };
    } catch (error) {
        console.error('Error in processCommand:', error);
        return { message: 'Error processing command', error: error.message };
    }
}
module.exports = { processCommand };
