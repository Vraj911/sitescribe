const User = require('../models/users');
async function findUserByUsername(username) {
    return await User.findOne({ username });
}
async function createUser({ username, password, email }) {
    const user = new User({ username, password, email });
    await user.save();
    return user;
}
module.exports = {
    findUserByUsername,
    createUser
};
