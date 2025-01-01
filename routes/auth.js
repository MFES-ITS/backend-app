const express = require('express');
const router = express.Router();
const authenticateReset = require('../middlewares/reset');
const authenticateToken = require('../middlewares/token');
const { 
    userSignUp, 
    userSignIn, 
    userSignOut,
    forgotPassword, 
    verifyCode, 
    resetPassword
} = require('../controllers/authController');

// Define routes and link them to controller methods
router.post('/register', userSignUp);
router.post('/login', userSignIn);
router.post('/logout', userSignOut);

router.post('/forgot-password', forgotPassword);
router.post('/verify-code', authenticateReset, verifyCode);
router.post('/reset-password', authenticateToken, resetPassword);

module.exports = router;