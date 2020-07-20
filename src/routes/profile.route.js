'use-strict';
const express = require('express');
const { verifyJWT } = require('../middlewares/auth');
const profileController = require('../controller/profile.controller');
const router = express.Router();

/**
 * Profile routes
 */
router.route('/').get(verifyJWT(), profileController.profileGET);

// EXPORTS
module.exports = router;
