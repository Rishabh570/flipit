'use-strict';
const express = require('express');
const { verifyJWT } = require('../middlewares/auth');
const homeController = require('../controller/home.controller');

const router = express.Router();

/**
 * Route for fetching all the listings
 */
router.route('/').get(verifyJWT(), homeController.homeGET);

// EXPORTS
module.exports = router;
