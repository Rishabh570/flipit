const express = require("express");
const {verifyJWT} = require('../middlewares/auth');
const authRoutes = require('./auth.route');
const router = express.Router();

/**
 * GET v1/status
 */
router.route('/status')
.get(verifyJWT(), (req, res) => {
	res.render('status', {user: req.user, account: req.account});
})

router.get('/user', (req, res) => res.send(req.user));
router.use('/auth', authRoutes);


module.exports = router;
