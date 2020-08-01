'use-strict';
const express = require('express');
const upload = require('../middlewares/upload');
const { verifyJWT } = require('../middlewares/auth');
const profileController = require('../controller/profile.controller');
const router = express.Router();

/**
 * Profile routes
 */
router
	.route('/')
	.get(verifyJWT(), profileController.profileGET)
	.post(verifyJWT(), profileController.profilePOST);

router
	.route('/update-avatar')
	.post(
		verifyJWT(),
		upload.array('avatarInput', 1),
		profileController.updateAvatar
	);

// EXPORTS
module.exports = router;
