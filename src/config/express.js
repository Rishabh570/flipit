const fs = require('fs');
const path = require('path');
const cors = require('cors');
const csrf = require('csurf');
const helmet = require('helmet');
const morgan = require('morgan');
const express = require('express');
const passport = require('passport');
const toobusy = require('toobusy-js');
const flash = require('express-flash');
const Sentry = require('@sentry/node');
const compress = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const express_enforces_ssl = require('express-enforces-ssl');

const routes = require('../routes/index');
const strategies = require('./passport');
const {
	env,
	logs,
	UPLOAD_LIMIT,
	COOKIE_SECRET,
	COOKIE_TTL,
	SENTRY_DSN,
} = require('./vars');
const { errorHandler, stagingError } = require('../middlewares/error');
const app = express();

// Enforces HTTPS, redirect to HTTPS if using HTTP
app.use(express_enforces_ssl());

// Initialize sentry
Sentry.init({ dsn: SENTRY_DSN });

// request logging. dev: console | production: file
app.use((req, res, next) => {
	if (env === 'production') {
		const accessLogStream = fs.createWriteStream(
			path.join(__dirname, '../../access.log'),
			{ flags: 'a' } // append mode
		);
		morgan(logs, { stream: accessLogStream })(req, res, next);
	} else {
		morgan(logs)(req, res, next);
	}
});

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

/** Middleware which blocks requests when the server's too busy
 * Default lag threshold: 70 ms (90-100% CPU utilization on average)
 * Default check interval: 500 ms
 */
app.use((req, res, next) => {
	if (toobusy()) {
		res.send(503, 'Server is too busy right now, sorry 🥺');
	} else {
		next();
	}
});

/**
 * Parse body params and attach them to req.body
 * Using raw for ONLY /v1/item/webhook (override in specific route)
 */
app.use((req, res, next) => {
	if (req.originalUrl === '/v1/item/webhook') next();
	else bodyParser.json({ limit: `${UPLOAD_LIMIT}mb` })(req, res, next);
});

app.use((req, res, next) => {
	if (req.originalUrl === '/v1/item/webhook') next();
	else
		bodyParser.urlencoded({
			extended: true,
			limit: `${UPLOAD_LIMIT}mb`,
		})(req, res, next);
});

// Setting up cookie parser
app.use(cookieParser(COOKIE_SECRET));

/**
 * Enable CSRF protection and add a single global csrfToken
 * to res.locals so that all the views can access its value
 */
app.use(csrf({ cookie: true }));
app.use((req, res, next) => {
	res.locals.csrfToken = req.csrfToken();
	next();
});

// gzip compression
app.use(compress());

// lets you use HTTP verbs such as PUT or DELETE
// in places where the client doesn't support it
app.use(methodOverride());

// Hide X-Powered-By header
app.disable('x-powered-by');

// Tells browser to visit only HTTPS,
// doesn't redirect HTTP to HTTPS though
app.use(
	helmet.hsts({
		maxAge: 5184000, // 60 days in sec
		includeSubDomains: false,
	})
);

// Sets "X-XSS-Protection: 1; mode=block".
app.use(helmet.xssFilter());

// Whitelisted Content Security Policy directives
app.use(
	helmet.contentSecurityPolicy({
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", 'cdn.jsdelivr.net'],
			scriptSrc: [
				"'self'",
				'cdn.jsdelivr.net',
				"'unsafe-inline'", // Unsafe-inline is temp, change to hash
			],
		},
	})
);

// Sets "X-DNS-Prefetch-Control: off".
app.use(helmet.dnsPrefetchControl());

// Sets "X-Content-Type-Options: nosniff".
app.use(helmet.noSniff());

// Sets "Referrer-Policy: same-origin".
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Set static files folder
app.use(express.static(path.join(__dirname, '../../public')));

// Setting up sessions (These are stored on the client)
// V2 can introduce a separate storage for sessions using express-session
// DON'T SET COOKIE_KEY IF SECRET IS THERE (REQ.USER WILL BE UNDEFINED OTHERWISE)
// PASS THE SAME SECRET TO COOKIE PARSER AS WELL!
app.use(
	cookieSession({
		secret: COOKIE_SECRET,
		name: 'cook-sess',
		maxAge: COOKIE_TTL, // cookies will be removed after 30 days
		secure: true,
		httpOnly: true,

		// 'strict' doesn't work when you have to redirect to google/fb page to enter credentials
		// but when you're already logged in to google/fb, it works just fine.
		sameSite: 'lax',
	})
);

// Enable express-flash
app.use(flash());

// Enable passport authentication, session and plug strategies
app.use(passport.initialize());
app.use(passport.session());
passport.use('jwt', strategies.jwt);
passport.use('google', strategies.google);
passport.use('facebook', strategies.facebook);

// Mount API v1 routes
app.use('/v1', routes);
app.use('/*', (req, res) => res.send("You're lost!"));

// Error handlers
process.on('unhandledRejection', (err) => {
	console.log('UNHANDLED REJECTION! 💥 Shutting down...');
	console.log(err.name, err.message);
	process.exit(1);
});

process.on('uncaughtException', (err) => {
	console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
	console.log(err.name, err.message);
	process.exit(1);
});
app.use(stagingError);
app.use(errorHandler);

// EXPORTS
module.exports = app;
