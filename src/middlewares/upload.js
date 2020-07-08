'use-strict';
const multer = require('multer');
const crypto = require('crypto');
const {
	MULTER_UPLOAD_DEST,
	MULTER_UPLOAD_MAX_FILE_SIZE_ALLOWED,
} = require('../config/vars');

const imageFilter = (req, file, cb) => {
	if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
		cb('Please upload only images.', false);
	} else {
		cb(null, true);
	}
};

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, MULTER_UPLOAD_DEST);
	},
	filename: (req, file, cb) => {
		cb(null, crypto.randomBytes(24).toString('hex') + file.originalname);
	},
});

const upload = multer({
	storage,
	fileFilter: imageFilter,
	limits: {
		// This doesn't work, multer doesn't actually support this. Wait for it maybe.
		fileSize: MULTER_UPLOAD_MAX_FILE_SIZE_ALLOWED,
	},
});
module.exports = upload;
