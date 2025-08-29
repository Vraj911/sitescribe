const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/authRepository.js');
const dotenv = require('dotenv');
const JWT_SECRET = process.env.JWT_SECRET || 'vrajshah';
async function registerUser({ username, password, email }) {
        console.log('JWT_SECRET inside registerUser:', JWT_SECRET); 
    const existingUser = await userRepository.findUserByUsername(username);
    if (existingUser) {
        const error = new Error('User already exists');
        error.code = 400;
        throw error;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.createUser({ username, password: hashedPassword, email });
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: 360000 });
    return { token, user: { id: user.id, username: user.username, email: user.email } };
}
async function loginUser({ username, password }) {
    const user = await userRepository.findUserByUsername(username);
    if (!user) {
        const error = new Error('Invalid credentials');
        error.code = 400;
        throw error;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error('Invalid credentials');
        error.code = 400;
        throw error;
    }
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: 360000 });
    return { token, user: { id: user.id, username: user.username, email: user.email } };
}
module.exports = { registerUser, loginUser };
