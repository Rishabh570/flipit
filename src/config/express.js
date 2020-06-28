const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const express = require('express');
const passport = require('passport');
const flash = require('express-flash');
const Sentry = require('@sentry/node');
const compress = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');

const routes = require('../routes/index');
const strategies = require('./passport');
const {
	logs,
	UPLOAD_LIMIT,
	COOKIE_SECRET,
	COOKIE_TTL,
	SENTRY_DSN,
} = require('./vars');
const { errorHandler, stagingError } = require('../middlewares/error');

const app = express();

// Initialize sentry
Sentry.init({ dsn: SENTRY_DSN });
app.use(
	Sentry.Handlers.requestHandler({
		serverName: false,
		user: ['email'],
	})
);

// request logging. dev: console | production: file
app.use(morgan(logs));

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// Setting up cookie parser
app.use(cookieParser(COOKIE_SECRET));

// parse body params and attach them to req.body
// Using raw for ONLY /v1/item/webhook (in item routes)
app.use((req, res, next) => {
	if (req.originalUrl === '/v1/item/webhook') next();
	else bodyParser.json({ limit: `${UPLOAD_LIMIT}mb` })(req, res, next);
});

app.use((req, res, next) => {
	if (req.originalUrl === '/v1/item/webhook') next();
	else
		bodyParser.urlencoded({ extended: true, limit: `${UPLOAD_LIMIT}mb` })(
			req,
			res,
			next
		);
});

// gzip compression
app.use(compress());

// lets you use HTTP verbs such as PUT or DELETE
// in places where the client doesn't support it
app.use(methodOverride());

// secure apps by setting various HTTP headers
app.use(helmet());

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
app.use(
	Sentry.Handlers.errorHandler({
		shouldHandleError(error) {
			if (error.statusCode >= 4) {
				return true;
			}
			return false;
		},
	})
);

app.use(stagingError);
app.use(errorHandler);

// EXPORTS
module.exports = app;
