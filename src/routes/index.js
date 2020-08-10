'use-strict';
const express = require('express');
const { verifyJWT, verifyAnonymous } = require('../middlewares/auth');
const authRoutes = require('./auth.route');
const itemRoutes = require('./item.route');
const profileRoutes = require('./profile.route');
const listingsRoutes = require('./listings.route');
const homeController = require('../controller/home.controller');
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/item', itemRoutes);
router.use('/profile', profileRoutes);
router.use('/listings', listingsRoutes);
router.route('/review').post(verifyJWT(), homeController.reviewPOST);

router.get('/', verifyAnonymous(), homeController.landingGET);
router.get('/*', (req, res) => res.send("You're lost!"));

module.exports = router;
