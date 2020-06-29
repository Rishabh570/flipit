const multer = require('multer');
const { MULTER_UPLOAD_DEST } = require('../config/vars');

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
		cb(null, file.originalname);
	},
});

const upload = multer({ storage, fileFilter: imageFilter });
module.exports = upload;
