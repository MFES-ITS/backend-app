const pool = require('../databases/postgres'); 
const bcrypt = require('bcrypt');
require('dotenv').config();

// Validate the date format
function dateFormat(dateString) {
    const regex  =/^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
        return false;
    }
    // Checking the validity of the month
    const [year, month, day] = dateString.split('-').map(Number);
    if (month < 1 || month > 12) {
        return false;
    }
    // Checking the validity of the day based on month and year
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
        return false;
    }

    return true;
} 

// Controller for user profile
const userProfile = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    try {
        const result = await pool.query('SELECT id, user_name, email, user_organization FROM users WHERE id = $1', [userId]);
        const data = result.rows[0];
        res.status(200).json({ user: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for updating profile name
const updateProfileName = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const { name, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const userPassword = result.rows[0].password_hash;
        const isMatch = await bcrypt.compare(password, userPassword);
        if (isMatch) {
            await pool.query('UPDATE users SET user_name = $1 WHERE id = $2', [name, userId]);
            res.status(204).json({ message: 'Updated' });
        }
        else {
            res.status(409).json({ message: 'Incorrect password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for updating user password
const updateProfilePassword = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const { password, newPassword } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const userPassword = result.rows[0].password_hash;
        const isMatch = await bcrypt.compare(password, userPassword);
        if (isMatch) {
            const saltRounds = 10;
            const newUserPassword = await bcrypt.hash(newPassword, saltRounds);
            await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newUserPassword, userId]);
            res.status(204).json({ message: 'Updated' });
        }
        else {
            res.status(409).json({ message: 'Incorrect password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for dashboard
const userDashboard = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    try {
        const userName = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const name = userName.rows[0].user_name
        const athletes = await pool.query('SELECT COUNT(*) AS total FROM athletes WHERE user_id = $1', [userId]);
        const countAthletes = athletes.rows[0].total;
        const devices = await pool.query('SELECT COUNT(*) AS total FROM devices WHERE user_id = $1', [userId]);
        const countDevices = devices.rows[0].total;
        const session = await pool.query('SELECT * FROM sessions WHERE user_id = $1', [userId]);
        let activeSession = null;
        if (session.rows.length > 0) {
             activeSession = session.rows[0].session_date;
        }
        res.status(200).json({ name: name, number_of_athletes: countAthletes, number_of_devices: countDevices, active_session: activeSession });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for starting training session
const startSession = async (req, res) => {
    const userId = req.user.id; // Requires authrization
    const { date } = req.body;
    if (date && !dateFormat(date)) {
        return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
    }
    try {
        const activeSession = await pool.query('SELECT * FROM sessions WHERE user_id = $1', [userId]);
        if (activeSession.rows.length < 1) {
            await pool.query('INSERT INTO sessions (user_id, session_date) VALUES ($1, $2)', [userId, date]);
            res.status(201).json({ message: 'Success' });
        }
        else {
            res.status(400).json({ error: 'Please end ongoing session before starting a new one' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for ending training session
const endSession = async (req, res) => {
    const userId = req.user.id; // Requires authoriation
    try { 
        const current_status = 'Paired' 
        const device_status = 'Unpaired'
        await pool.query('UPDATE devices SET device_status = $1 WHERE user_id = $2 AND device_status = $3', [device_status, userId, current_status]);
        await pool.query('DELETE FROM pairs WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        res.status(204).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for signing athletes
const assignAthlete = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const { name, birthdate, age, gender, height, weight, team } = req.body;
    const athleteBirthdate = birthdate ?? null;
    const athleteAge = age ?? null;
    const athleteGender = gender ?? null;
    const athleteHeight = height ?? null;
    const athleteWeight = weight ?? null;
    const athleteTeam = team ?? null;
    if (!name) {
        res.status(400).json({ message : 'Name is required' });
    }
    // Validate the date format
    if (birthdate && !dateFormat(birthdate)) {
        return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
    }
    try {
        await pool.query('INSERT INTO athletes (athlete_name, athlete_birthdate, athlete_age, athlete_gender, athlete_height, athlete_weight, athlete_team, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [name, athleteBirthdate, athleteAge, athleteGender, athleteHeight, athleteWeight, athleteTeam, userId]);
        res.status(201).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for list of athletes
const listAthlete = async (req, res) => {
    const userId = req.user.id // Requires authorization
    const { name, team } = req.query; // Look up by name or team or both
    try {
        let result;
        if (!name && !team) {
            result = await pool.query('SELECT * FROM athletes WHERE user_id = $1 ORDER BY athlete_name ASC', [userId]);
        }
        else if (name && team) {
            result = await pool.query('SELECT * FROM athletes WHERE user_id = $1 AND athlete_name ILIKE $2 AND athlete_team ILIKE $3 ORDER BY athlete_name ASC', [userId, `%${name}%`, `%${team}%`]);
        }
        else {
            result = await pool.query('SELECT * FROM athletes WHERE user_id = $1 AND athlete_name ILIKE $2 OR athlete_team ILIKE $3 ORDER BY athlete_name ASC', [userId, `%${name}%`, `%${team}%`]);
        }
        const athletes = result.rows;
        res.status(200).json({ message: 'Success', athletes: athletes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for signing athletes
const updateAthlete = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const { id, name, birthdate, age, gender, height, weight, team } = req.body;
    const athleteName = name ?? null;
    const athleteBirthdate = birthdate ?? null;
    const athleteAge = age ?? null;
    const athleteGender = gender ?? null;
    const athleteHeight = height ?? null;
    const athleteWeight = weight ?? null;
    const athleteTeam = team ?? null;
    if (birthdate && !dateFormat(birthdate)) {
        return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
    }
    try {
        if (athleteName) {
            await pool.query('UPDATE athletes SET athlete_name = $1 WHERE athlete_id = $2 AND user_id = $3', [athleteName, id, userId]);
        }
        if (athleteBirthdate) {
            await pool.query('UPDATE athletes SET athlete_birthdate = $1 WHERE athlete_id = $2 AND user_id = $3', [athleteBirthdate, id, userId]);
        }
        if (athleteAge) {
            await pool.query('UPDATE athletes SET athlete_age = $1 WHERE athlete_id = $2 AND user_id = $3', [athleteAge, id, userId]);
        }
        if (athleteGender) {
            await pool.query('UPDATE athletes SET athlete_gender = $1 WHERE athlete_id = $2 AND user_id = $3', [athleteGender, id, userId]);
        }
        if (athleteHeight) {
            await pool.query('UPDATE athletes SET athlete_height = $1 WHERE athlete_id = $2 AND user_id = $3', [athleteHeight, id, userId]);
        }
        if (athleteWeight) {
            await pool.query('UPDATE athletes SET athlete_weight = $1 WHERE athlete_id = $2 AND user_id = $3', [athleteWeight, id, userId]);
        }
        if (athleteTeam) {
            await pool.query('UPDATE athletes SET athlete_team = $1 WHERE athlete_id = $2 AND user_id = $3', [athleteTeam, id, userId]);
        }
        res.status(204).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for deleting athlete
const deleteAthlete = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const athleteId = req.params.id; // Requires id parameter
    try {
        await pool.query('DELETE FROM athletes WHERE athlete_id = $1 AND user_id = $2', [athleteId, userId]);
        res.status(204).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for posting device
const setDevice = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const { serial_number } = req.body;
    const deviceStatus = 'Unpaired';
    //need serial number validation//
    try {
        await pool.query('INSERT INTO devices (device_serial_number, device_status, user_id) VALUES ($1, $2, $3)', [serial_number, deviceStatus, userId]);
        res.status(201).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.messsage });
    }
};

// Controller for listing devices
const listDevice = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    try {
        const result = await pool.query('SELECT * FROM devices WHERE user_id = $1 ORDER BY device_id ASC', [userId]);
        const device = result.rows;
        res.status(200).json({ message: 'Success', devices: device});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for updating devices
const updateDevice = async (req, res) =>{
    const userId = req.user.id; // Requires authoriation
    const { id, color } = req.body;
    const deviceColor = color ?? null;
    try {
        if (deviceColor) {
            await pool.query('UPDATE devices SET device_color = $1 WHERE device_id = $2 AND user_id = $3', [deviceColor, id, userId]);
        }
        res.status(204).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for deleting device
const deleteDevice = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const deviceId = req.params.id; // Requires device id parameter
    try {
        await pool.query('DELETE FROM devices WHERE device_id = $1 AND user_id = $2', [deviceId, userId]);
        res.status(204).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controller for pairing athlete with device
const createPair = async (req, res) => {
    const userId = req.user.id; // Requiresauthorization
    const { athlete_id, device_id } = req.body;
    try {
        const activeSession = await pool.query('SELECT * FROM sessions WHERE user_id = $1', [userId]);
        const inSession = activeSession.rows[0];
        if (!inSession) {
            return res.status(400).json({ message: 'Please start a session' });
        }
        const session_id = inSession.session_id;
        await pool.query('DELETE FROM pairs WHERE device_id = $1 AND user_id = $2', [device_id, userId]);
        await pool.query('INSERT INTO pairs (athlete_id, device_id, session_id, user_id) VALUES ($1, $2, $3, $4)', [athlete_id, device_id, session_id, userId]);
        const device_status = 'Paired';
        await pool.query('UPDATE devices SET device_status = $1 WHERE device_id = $2 AND user_id = $3', [device_status, device_id, userId]);
        res.status(201).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Controller for getting all pair
const listPair = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    try {
        const allPairs = await pool.query('SELECT pairs.pair_id, devices.device_id, devices.device_serial_number, devices.device_color, athletes.athlete_id, athletes.athlete_name FROM pairs JOIN devices ON pairs.device_id = devices.device_id JOIN athletes ON pairs.athlete_id = athletes.athlete_id WHERE pairs.user_id = $1', [userId]);
        const pairs = allPairs.rows
        res.status(200).json({ message: 'Success', pairs: pairs});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

//Controller for updating athlete and device pair
const updatePair = async (req, res) => {
    const userId = req.user.id; // requires authorization
    const { pair_id, athlete_id } = req.body;
    try {
        await pool.query('UPDATE pairs SET athlete_id = $1 WHERE pair_id = $2 AND user_id = $3', [athlete_id, pair_id, userId]);
        res.status(204).json({ message: 'Success' });
    } catch (error) {
        res.statu(500).json({ error: error.message });
    }
}

// Controller for updating pair
const deletePair = async (req, res)  => {
    const userId = req.user.id; // Requires authorization
    const pairId = req.params.id;
    try {
        await pool.query('DELETE FROM pairs WHERE pair_id = $1 AND user_id = $2', [pairId, userId]);
        res.status(204).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Controller for storing recorded test result
const recordTestResult = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const { athlete_id, result_data } = req.body;
    try {
        const session_date = await pool.query('SELECT session_date FROM sessions WHERE user_id = $1', [userId]);
        if (session_date.rows < 1) {
            return res.status(400).json({ message: 'Please start a session' })
        }
        const supervised_athlete = await pool.query('SELECT athlete_id FROM athletes WHERE athlete_id = $1 AND user_id = $2', [athlete_id, userId]);
        if (supervised_athlete.rows < 1) {
            return res.status(400).json({ message: 'Can not find such athlete under supervision' })
        }
        await pool.query('INSERT INTO results (athlete_id, session_date, result_data) VALUES ($1, $2, $3::jsonb)', [athlete_id, session_date.rows[0].session_date, JSON.stringify(result_data)]);
        res.status(201).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Controller for getting test result from athlete
const getTestResultAthlete = async (req, res) => {
    const userId = req.user.id; // Requires auhtorization
    const athlete_id = req.params.id;
    try {
        const athlete = await pool.query('SELECT athlete_name FROM athletes WHERE athlete_id = $1 AND user_id = $2', [athlete_id, userId]);
        if (athlete.rows < 1) {
            return res.status(400).json({ message: 'Can not find such athlete under supervision' })
        }
        const athlete_name = athlete.rows[0].athlete_name;
        const result_data = await pool.query('SELECT result_id, session_date, result_data FROM results WHERE athlete_id = $1 ORDER BY result_id ASC', [athlete_id]);
        res.status(200).json({ message: 'Success', athlete_name: athlete_name, results: result_data.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Controller for getting test result in a session
const getTestResultSession = async (req, res) => {
    const userId = req.user.id; // Requires authorization
    const session_date = req.params.date;
    try {
        const result_data = await pool.query('SELECT results.result_id, athletes.athlete_name, results.result_data FROM results JOIN athletes ON results.athlete_id = athletes.athlete_id WHERE results.session_date = $1 AND athletes.user_id = $2 ORDER BY athletes.athlete_name ASC', [session_date, userId]);
        res.status(200).json({ message: 'Success', session: session_date, results: result_data.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Controller for deleting test result
const deleteTestResult = async (req, res) => {
    const resultId = req.params.id; // Require result id parameter
    try {
        await pool.query('DELETE FROM results WHERE result_id = $1', [resultId]);
        res.status(204).json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { 
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
};