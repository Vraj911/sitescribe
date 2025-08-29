const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/authRepository.js');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'vrajshah';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'vrajshah-refresh';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// In-memory store for device codes and refresh tokens (use Redis in production)
const deviceCodes = new Map();
const activeRefreshTokens = new Set();

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
    
    const { accessToken, refreshToken } = generateTokenPair(user);
    activeRefreshTokens.add(refreshToken);
    
    return { 
        accessToken,
        refreshToken, 
        user: { id: user.id, username: user.username, email: user.email } 
    };
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
    
    const { accessToken, refreshToken } = generateTokenPair(user);
    activeRefreshTokens.add(refreshToken);
    
    return { 
        accessToken,
        refreshToken, 
        user: { id: user.id, username: user.username, email: user.email } 
    };
}

// Device Code Flow for CLI Authentication
async function generateDeviceCode() {
    const deviceCode = crypto.randomBytes(32).toString('hex');
    const userCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const verificationUri = process.env.VERIFICATION_URI || 'http://localhost:3000/device';
    
    deviceCodes.set(deviceCode, {
        userCode,
        createdAt: Date.now(),
        verified: false,
        userId: null
    });
    
    // Clean up expired device codes after 10 minutes
    setTimeout(() => {
        deviceCodes.delete(deviceCode);
    }, 10 * 60 * 1000);
    
    return {
        deviceCode,
        userCode,
        verificationUri,
        verificationUriComplete: `${verificationUri}?user_code=${userCode}`,
        expiresIn: 600, // 10 minutes
        interval: 5 // Poll every 5 seconds
    };
}

async function verifyDeviceCode(deviceCode, userCode) {
    const deviceData = deviceCodes.get(deviceCode);
    
    if (!deviceData) {
        const error = new Error('Invalid device code');
        error.code = 400;
        throw error;
    }
    
    if (deviceData.userCode !== userCode) {
        const error = new Error('Invalid user code');
        error.code = 400;
        throw error;
    }
    
    if (!deviceData.verified || !deviceData.userId) {
        const error = new Error('Device code not yet authorized');
        error.code = 400;
        throw error;
    }
    
    const user = await userRepository.findUserById(deviceData.userId);
    const { accessToken, refreshToken } = generateTokenPair(user);
    activeRefreshTokens.add(refreshToken);
    
    // Clean up device code
    deviceCodes.delete(deviceCode);
    
    return {
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username, email: user.email }
    };
}

// Web endpoint to authorize device code
async function authorizeDeviceCode(userCode, userId) {
    for (const [deviceCode, deviceData] of deviceCodes) {
        if (deviceData.userCode === userCode) {
            deviceData.verified = true;
            deviceData.userId = userId;
            return true;
        }
    }
    return false;
}

function generateTokenPair(user) {
    const accessPayload = { 
        user: { 
            id: user.id, 
            username: user.username,
            email: user.email 
        } 
    };
    
    const refreshPayload = { 
        user: { id: user.id },
        tokenId: crypto.randomBytes(16).toString('hex')
    };
    
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { 
        expiresIn: ACCESS_TOKEN_EXPIRY 
    });
    
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { 
        expiresIn: REFRESH_TOKEN_EXPIRY 
    });
    
    return { accessToken, refreshToken };
}

async function refreshAccessToken(refreshToken) {
    if (!activeRefreshTokens.has(refreshToken)) {
        const error = new Error('Invalid refresh token');
        error.code = 401;
        throw error;
    }
    
    try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = await userRepository.findUserById(decoded.user.id);
        
        if (!user) {
            const error = new Error('User not found');
            error.code = 404;
            throw error;
        }
        
        // Generate new token pair
        const tokens = generateTokenPair(user);
        
        // Remove old refresh token and add new one
        activeRefreshTokens.delete(refreshToken);
        activeRefreshTokens.add(tokens.refreshToken);
        
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: { id: user.id, username: user.username, email: user.email }
        };
        
    } catch (error) {
        activeRefreshTokens.delete(refreshToken);
        const authError = new Error('Invalid refresh token');
        authError.code = 401;
        throw authError;
    }
}

async function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await userRepository.findUserById(decoded.user.id);
        
        if (!user) {
            const error = new Error('User not found');
            error.code = 404;
            throw error;
        }
        
        return { id: user.id, username: user.username, email: user.email };
        
    } catch (error) {
        const authError = new Error('Invalid or expired token');
        authError.code = 401;
        throw authError;
    }
}

async function revokeRefreshToken(refreshToken) {
    activeRefreshTokens.delete(refreshToken);
}

module.exports = { 
    registerUser, 
    loginUser,
    generateDeviceCode,
    verifyDeviceCode,
    authorizeDeviceCode,
    refreshAccessToken,
    verifyAccessToken,
    revokeRefreshToken
};
