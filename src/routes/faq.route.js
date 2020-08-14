'use-strict';
const express = require('express');
const { verifyJWT } = require('../middlewares/auth');
const faqController = require('../controller/faq.controller');
const router = express.Router();

/**
 * Profile routes
 */
router.route('/add').post(verifyJWT(), faqController.addFaq);

// EXPORTS
module.exports = router;
