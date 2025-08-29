const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Existing routes
router.get('/', authController.checkHealth);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// New CLI-specific routes
router.post('/cli-login', authController.cliLogin);
router.post('/refresh', authController.refreshToken);
router.get('/verify', authController.verifyToken);
router.post('/revoke', authController.revokeToken);

module.exports = router;
