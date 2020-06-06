
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRATION_MINUTES, RESET_TOKEN_EXPIRATION_MINUTES } = require('../config/vars');


/**
 * User Schema
 */
const userSchema = new mongoose.Schema(
{
    email: {
		type: String,
		match: /^\S+@\S+\.\S+$/,
		required: true,
		unique: true,
		trim: true,
		lowercase: true,
		index: { unique: true }
    },
    password: {
		type: String,
		required: true,
		minlength: 6,
		maxlength: 128
	},
    name: {
		type: String,
		maxlength: 128,
		index: true,
		trim: true
    },
    services: {
		google: String,
		facebook: String
    },
    picture: {
		type: String,
		trim: true
    }
},
{
    timestamps: true
}
);

/**
 * Pre-save Hooks
 */
userSchema.pre('save', async function save(next) {
	try {
		// Encrypt the password if it's modified
		const rounds = 12;
		if (this.isModified('password')) {
			const hash = await bcrypt.hash(this.password, rounds);
			this.password = hash;
		}
		
		return next(); // normal save
	} 
	catch (error) {
		return next(error);
	}
});



/**
 * Methods
 */
userSchema.method({
	token() {
		const playtheload = {
			exp: moment()
				.add(JWT_EXPIRATION_MINUTES, 'minutes')	// expires in 1 week but stays in cookie for 30 days
				.unix(),
			iat: moment().unix(),
			sub: this._id
		};
		return jwt.sign(playtheload, JWT_SECRET);
	},

	/**
	 * This token is issued for forgot password requests
	 * Expires early to prevent misuse.
	 */
	resetToken() {
		const playtheload = {
			exp: moment()
				.add(RESET_TOKEN_EXPIRATION_MINUTES, 'minutes') 	// expires in 10 min
				.unix(),
			iat: moment().unix(),
			sub: this._id
		};
		return jwt.sign(playtheload, JWT_SECRET);
	},

	async passwordMatches(password) {
		return bcrypt.compare(password, this.password);
	},

});



/**
 * Statics
 */
userSchema.statics = {
	/**
	 *	Find user by email and tries to generate a JWT token
	 *	It successfully generates the token in two cases:
	 *	1. During login when user has provided correct email and password, and
	 *	2. When provided with an email and refreshObject to generate a new token after it has expired.
	 */
	async findAndGenerateToken(options) {
		const { email, refreshObject, password } = options;
		if (!email) {
			throw new Error("An email is required to generate a token");
		}

		const user = await this.findOne({ email }).exec();
		const err = {
			status: httpStatus.UNAUTHORIZED,
			isPublic: true
		};

		if(!user) {
			err.message = 'Incorrect Email';
			throw new Error(err);
		}

		if (password) {
			if (await user.passwordMatches(password)) {
				return { user, accessToken: user.token() };
			}
			err.message = 'Incorrect password';
		}
		else if (refreshObject && refreshObject.userEmail === email) {
			if (moment(refreshObject.expires).isBefore((new Date().getTime())/1000)) {
				err.message = 'Invalid refresh token.';
			} else {
				console.log("refresh token...");
				return { user, accessToken: user.token() };
			}
		} 
		else {
			err.message = 'Some error occured :(';
		}
		throw new Error(err);
	},

	/**
	 * TODO: To be done with error handler work.
	 * Return new validation error
	 * if error is a mongoose duplicate key error
	 */
	checkDuplicateEmail(error) {
		if (error.name === 'MongoError' && error.code === 11000) {
			console.log("In duplicate email error");
			throw new Error("A user with same email already exists!");
		}
		return error;
	},

	/**
	 * Oauth Login for User
	 * Creates a new entry in DB if it doesn't exist
	 */
	async oAuthLogin(service, id, email, displayName, picture) {
		console.log("In User model oAuthLogin...");
		const user = await this.findOne({ $or: [{ [`services.${service}`]: id }, { email }] });
		if (user) {
			user.services[service] = id;
			if (!user.name) {
				user.name = displayName;
			}
			if (!user.picture) {
				user.picture = picture;
			}
			return user.save();
		}
		const password = email;

		return this.create({
			services: { [service]: id },
			email,
			password,
			name: displayName,
			picture
		});
	},

};


/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);
module.exports = User;
