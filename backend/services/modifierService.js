const { applyActions: apply } = require('../modifier');

async function applyActions(actions) {
    return apply(actions);
}

module.exports = { applyActions };
