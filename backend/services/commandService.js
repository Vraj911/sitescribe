const { indexSite } = require('./indexerService');
const { interpretCommand } = require('./llmService');
const { applyActions } = require('./modifierService');

async function processCommand(folder, command) {
    const siteIndex = indexSite(folder);
    const actions = await interpretCommand(siteIndex, command);
    const result = await applyActions(actions);
    return result;
}

module.exports = { processCommand };
