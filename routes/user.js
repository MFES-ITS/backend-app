const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/token');
const { 
    userProfile, 
    updateProfileName, 
    updateProfilePassword, 
    userDashboard,
    startSession,
    endSession, 
    assignAthlete, 
    listAthlete, 
    updateAthlete, 
    deleteAthlete, 
    setDevice,
    listDevice,
    updateDevice,
    deleteDevice,
    createPair,
    listPair,
    updatePair,
    deletePair,
    recordTestResult,
    getTestResultAthlete,
    getTestResultSession,
    deleteTestResult
} = require('../controllers/userController');

// Define routes and link them to controller methods
router.get('/profile', authenticateToken, userProfile);
router.put('/profile', authenticateToken, updateProfileName);
router.put('/password', authenticateToken, updateProfilePassword);

router.get('/dashboard', authenticateToken, userDashboard);
router.post('/session', authenticateToken, startSession);
router.delete('/session', authenticateToken, endSession);

router.post('/athlete', authenticateToken, assignAthlete);
router.get('/athlete', authenticateToken, listAthlete);
router.put('/athlete', authenticateToken, updateAthlete);
router.delete('/athlete/:id', authenticateToken, deleteAthlete);

router.post('/device', authenticateToken, setDevice);
router.get('/device', authenticateToken, listDevice);
router.put('/device', authenticateToken, updateDevice);
router.delete('/device/:id', authenticateToken, deleteDevice);

router.post('/pair', authenticateToken, createPair);
router.get('/pair', authenticateToken, listPair);
router.put('/pair', authenticateToken, updatePair);
router.delete('/pair/:id', authenticateToken, deletePair);

router.post('/test', authenticateToken, recordTestResult);
router.get('/test/athlete/:id', authenticateToken, getTestResultAthlete);
router.get('/test/session/:date', authenticateToken, getTestResultSession);
router.delete('/test/:id', authenticateToken, deleteTestResult);

module.exports = router;