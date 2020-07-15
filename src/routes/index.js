'use-strict';
const express = require('express');
const { verifyJWT, verifyAnonymous } = require('../middlewares/auth');
const authRoutes = require('./auth.route');
const itemRoutes = require('./item.route');
const homeController = require('../controller/home.controller');
const router = express.Router();

/**
 * GET v1/status (temporary route)
 */
router.route('/status').get(verifyJWT(), (req, res) => {
	res.render('status', { user: req.user });
});

/**
 * Other routes
 */
router.use('/auth', authRoutes);
router.use('/item', itemRoutes);
router.get('/user', (req, res) => res.send(req.user));
router.get('/listings', verifyJWT(), homeController.homeGET);
router.get('/', verifyAnonymous(), homeController.landingGET);

module.exports = router;
