'use-strict';
const hpp = require('hpp');
const path = require('path');
const cors = require('cors');
const csrf = require('csurf');
const helmet = require('helmet');
const morgan = require('morgan');
const express = require('express');
const nocache = require('nocache');
const passport = require('passport');
const expectCt = require('expect-ct');
const toobusy = require('toobusy-js');
const flash = require('express-flash');
const Sentry = require('@sentry/node');
const compress = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const MongoStore = require('rate-limit-mongo');
const RateLimit = require('express-rate-limit');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const express_enforces_ssl = require('express-enforces-ssl');

const routes = require('../routes/index');
const strategies = require('./passport');
const winston = require('../config/winston');
const {
	logs,
	mongo,
	UPLOAD_LIMIT,
	COOKIE_SECRET,
	COOKIE_TTL,
	SENTRY_DSN,
} = require('./vars');
const { errorHandler, stagingError } = require('../middlewares/error');
const app = express();

// Enable trust proxy, using nginx
app.set('trust proxy', 1);

// Enforces HTTPS, redirect to HTTPS if using HTTP
app.use(express_enforces_ssl());

// Tells browsers to expect Certificate Transparency
app.use(
	expectCt({
		maxAge: 30, // for 30 seconds
		enforce: false,
	})
);

// Initialize sentry
Sentry.init({ dsn: SENTRY_DSN });

// request logging. dev: console | production: file
app.use(morgan(logs, { stream: winston.stream }));

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

/**
 * Parse body params and attach them to req.body
 * Using raw for ONLY /item/webhook (override in specific route)
 */
app.use((req, res, next) => {
	if (req.originalUrl === '/item/webhook') next();
	else bodyParser.json({ limit: `${UPLOAD_LIMIT}mb` })(req, res, next);
});

app.use((req, res, next) => {
	if (req.originalUrl === '/item/webhook') next();
	else
		bodyParser.urlencoded({
			extended: true,
			limit: `${UPLOAD_LIMIT}mb`,
		})(req, res, next);
});

// Protects from HTTP parameter pollution
app.use(hpp());

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

// Hide the original X-Powered-By header,
// Show a wrong value of header
app.use(helmet.hidePoweredBy({ setTo: 'PHP 4.2.0' }));

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
			fontSrc: [
				"'self'",
				'fonts.googleapis.com',
				'fonts.gstatic.com',
				'stackpath.bootstrapcdn.com',
			],
			defaultSrc: [
				"'self'",
				'js.stripe.com',
				'*.hotjar.com',
				'fonts.googleapis.com',
				'upload.wikimedia.org',
				'raw.githubusercontent.com',
				'stackpath.bootstrapcdn.com',
			],
			imgSrc: [
				"'self' data:",
				'http://i.stack.imgur.com',
				'lh3.googleusercontent.com',
				'platform-lookaside.fbsbx.com',
				'd1azyv1vbeu0vt.cloudfront.net',
				'raw.githubusercontent.com',
			],
			styleSrc: [
				"'self'",
				"'unsafe-inline'", // TODO: change it hash later
				'cdn.jsdelivr.net',
				'fonts.googleapis.com',
				'stackpath.bootstrapcdn.com',
			],
			scriptSrc: [
				"'self'",
				'cdn.jsdelivr.net',
				'js.stripe.com',
				'*.hotjar.com',
				'ajax.googleapis.com',
				'cdnjs.cloudflare.com',
				'maxcdn.bootstrapcdn.com',
				'stackpath.bootstrapcdn.com',
				"'unsafe-inline'", // TODO: change it hash later
			],
		},
	})
);

// Sets "X-DNS-Prefetch-Control: off".
app.use(helmet.dnsPrefetchControl());

// Prevents anyone from putting this page in an iframe
// unless it's on the same origin
app.use(helmet.frameguard({ action: 'sameorigin' }));

// Sets "X-Content-Type-Options: nosniff".
app.use(helmet.noSniff());

// Adds cache-control and pragma header for no cache
app.use(nocache());

// Prevents IE from executing downloaded files in site's context
app.use(helmet.ieNoOpen());

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
		name: 'id',
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

// Enable rate limiter, prevents from DDoS attack
app.use(
	RateLimit({
		store: new MongoStore({
			uri: `${mongo.uri}`,
			expireTimeMs: 10 * 60 * 1000, // 10 minutes
		}),
		windowMs: 10 * 60 * 1000, // 10 minutes
		max: 500, // limit each IP to 200 requests per windowMs
		headers: true,
		message: 'You have exceeded the 500 requests in 10 minutes limit!',
	})
);

/** Middleware which blocks requests when the server's too busy
 * Default lag threshold: 70 ms (90-100% CPU utilization on average)
 * Default check interval: 500 ms
 */
app.use((req, res, next) => {
	if (toobusy()) {
		res.status(503).send('Server is too busy right now, sorry 🥺');
	} else {
		next();
	}
});

// Mount API routes
app.use('/', routes);

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
