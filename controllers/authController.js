const pool = require('../databases/postgres'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sendEmail = require('../middlewares/passwordResetEmail');
require('dotenv').config();

const token_expiration = '6h';

// Generate a random 6-digit code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Controller to sign up a new user
const userSignUp = async (req, res) => {
    const { name, email, password, organization } = req.body;
    try {
        const result = await pool.query('SELECT email FROM users WHERE email = $1', [email]);
        if (result.rows.length < 1) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const insertResult = await pool.query('INSERT INTO users (user_name, email, password_hash, user_organization) VALUES ($1, $2, $3, $4) RETURNING *', [name, email, hashedPassword, organization]);
            const userId = insertResult.rows[0].id;
            const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: token_expiration });
            res.status(201).json({ token, name: name});  
        }
        else {
            res.status(409).json({ error: 'Email is already used' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller to sign in as a user
const userSignIn = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const userId = result.rows[0].id;
            const username = result.rows[0].user_name;
            const userPassword = result.rows[0].password_hash;
            const isMatch = await bcrypt.compare(password, userPassword);
            if (isMatch) {
                const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: token_expiration });
                res.status(201).json({ token, name: username });
            }
            else {
                res.status(409).json({ message: 'Incorrect email/password.' });
            }
        }
        else {
            res.status(409).json({ message: 'Incorrect email/password.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller to sign out a user
const userSignOut = async (req, res) => {
    res.status(204).json({ message: 'Sign Out' })
};

// Controlle when user forgot their password
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Please enter email!' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const code = generateCode();
            sendEmail(email, code);
            const reset_token = jwt.sign({ email: email, code: code }, process.env.JWT_RESET, { expiresIn: '10m' });
            return res.status(201).json({ message: 'Please check your email for your reset code!', reset_token });
        }
        res.status(201).json({ message: 'Please check your email for your reset code!', reset_token: '' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller to verify referral code
const verifyCode = async (req, res) => {
    const email = req.user.email;
    const code = req.user.code;
    if (code !== req.body.code) {
        return res.status(400).json({ message: 'Invalid code' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const userId = result.rows[0].id;
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller to reset password
const resetPassword = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const { new_password, confirm_new_password } = req.body;
    if (new_password !== confirm_new_password) {
        return res.status(400).json({ message: 'Failed! Password did not match!' });
    }
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(new_password, saltRounds);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
        res.status(200).json({ message: 'Password reset successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    userSignUp, 
    userSignIn, 
    userSignOut, 
    forgotPassword, 
    verifyCode, 
    resetPassword 
};