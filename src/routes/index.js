'use-strict';
const express = require('express');
const { verifyJWT, verifyAnonymous } = require('../middlewares/auth');
const authRoutes = require('./auth.route');
const itemRoutes = require('./item.route');
const profileRoutes = require('./profile.route');
const listingsRoutes = require('./listings.route');
const faqRoute = require('./faq.route');
const filterRoute = require('./filter.route');
const homeController = require('../controller/home.controller');
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/item', itemRoutes);
router.use('/profile', profileRoutes);
router.use('/listings', listingsRoutes);
router.use('/faq', faqRoute);
router.use('/filter', filterRoute);
router.post('/review', verifyJWT(), homeController.reviewPOST);
router.route('/ask-seller').post(verifyJWT(), homeController.askSeller);

router.get('/', verifyAnonymous(), homeController.landingGET);
router.get('/*', (req, res) => res.send("You're lost!"));

module.exports = router;
