'use-strict';
const express = require('express');
const { verifyJWT } = require('../middlewares/auth');
const filterController = require('../controller/filter.controller');
const router = express.Router();

/**
 * Bill filter route
 */
router.route('/bill').get(verifyJWT(), filterController.bill);

// EXPORTS
module.exports = router;
