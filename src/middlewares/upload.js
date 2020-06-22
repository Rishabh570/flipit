const multer = require("multer");

const imageFilter = (req, file, cb) => {
	if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
		cb("Please upload only images.", false);
	} else {
    	cb(null, true);
	}
};

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, __dirname + "/../../uploads");
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	},
});

const upload = multer({ storage: storage, fileFilter: imageFilter });
module.exports = upload;
