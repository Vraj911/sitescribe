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

// New CLI Login with Device Code Flow
async function cliLogin(req, res) {
    try {
        const { deviceCode, userCode } = req.body;
        if (deviceCode && userCode) {
            // Device code verification flow
            const result = await authService.verifyDeviceCode(deviceCode, userCode);
            res.json(result);
        } else {
            // Generate device code for CLI
            const deviceFlow = await authService.generateDeviceCode();
            res.json(deviceFlow);
        }
    } catch (error) {
        console.error("CLI Login Error:", error);
        res.status(error.code || 500).json({ error: error.message });
    }
}

// Refresh Token Endpoint
async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshAccessToken(refreshToken);
        res.json(result);
    } catch (error) {
        console.error("Refresh Token Error:", error);
        res.status(error.code || 500).json({ error: error.message });
    }
}

// Token Verification for CLI
async function verifyToken(req, res) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const result = await authService.verifyAccessToken(token);
        res.json({ valid: true, user: result });
    } catch (error) {
        console.error("Token Verification Error:", error);
        res.status(401).json({ valid: false, error: error.message });
    }
}

// Token Revocation
async function revokeToken(req, res) {
    try {
        const { refreshToken } = req.body;
        await authService.revokeRefreshToken(refreshToken);
        res.json({ message: "Token revoked successfully" });
    } catch (error) {
        console.error("Token Revocation Error:", error);
        res.status(error.code || 500).json({ error: error.message });
    }
}

async function logout(req, res) {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await authService.revokeRefreshToken(refreshToken);
        }
        res.json({ message: "Logout successful" });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { 
    checkHealth, 
    register, 
    login, 
    cliLogin,
    refreshToken,
    verifyToken,
    revokeToken,
    logout 
};
