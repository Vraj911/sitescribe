const authService = require('../services/authService');
async function checkHealth(req, res) {
    res.send("Authentication Backend is working ✅");
}
async function register(req, res) {
    try {
        const result = await authService.registerUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error("Register Error:", error);
        res.status(error.code || 500).json({ error: error.message });
    }
}
async function login(req, res) {
    try {
        const result = await authService.loginUser(req.body);
        res.json(result);
    } catch (error) {
        console.error("Login Error:", error);
        res.status(error.code || 500).json({ error: error.message });
    }
}
async function logout(req, res) {
    res.json({ message: "Logout successful" });
}

module.exports = { checkHealth, register, login, logout };
