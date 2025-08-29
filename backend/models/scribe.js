const mongoose = require('mongoose');
const scribeModel = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
});
module.exports = mongoose.model('Scribe', scribeModel);
