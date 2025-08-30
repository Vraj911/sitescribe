const { indexSite } = require('./indexerService');
const { interpretCommand } = require('./llmService');
const { applyActions } = require('./modifierService');

async function processCommand(folder, command) {
    try {
        console.log('Processing command:', { folder, command });
        const siteIndex = indexSite(folder);
        console.log('Site indexed:', siteIndex);
        const actions = await interpretCommand(siteIndex, command);
        console.log('Actions interpreted:', actions);
        const result = await applyActions(actions);
        console.log('Actions applied:', result);
        return result;
    } catch (error) {
        console.error('Error in processCommand:', error);
        throw error;
    }
}

module.exports = { processCommand };
