const express = require("express");
const morgan = require('morgan');
const bodyParser = require('body-parser');
const compress = require('compression');
const methodOverride = require('method-override');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const routes = require('../routes/index');
const { logs, UPLOAD_LIMIT, COOKIE_SECRET } = require('./vars');
const strategies = require('./passport');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const path = require("path");

const app = express();

// request logging. dev: console | production: file
app.use(morgan(logs));

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// Setting up cookie parser
app.use(cookieParser(COOKIE_SECRET))

// parse body params and attach them to req.body
app.use(bodyParser.json({ limit: `${UPLOAD_LIMIT}mb` }));
app.use(bodyParser.urlencoded({ extended: true, limit: `${UPLOAD_LIMIT}mb` }));

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
// TODO: v2 can introduce a separate storage for sessions using express-session
// DON'T SET COOKIE_KEY IF SECRET IS THERE (REQ.USER WILL BE UNDEFINED OTHERWISE)
// PASS THE SAME SECRET TO COOKIE PARSER AS WELL!
app.use(cookieSession({
	secret: COOKIE_SECRET,
	name: 'cook-sess',
	maxAge: 30*24*60*60*1000,	// cookies will be removed after 30 days
	secure: true
}))


// Enable passport authentication, session and plug strategies
app.use(passport.initialize());
app.use(passport.session());
passport.use('jwt', strategies.jwt);
passport.use('google', strategies.google);
passport.use('facebook', strategies.facebook);


// Mount API v1 routes
app.use('/v1', routes);
app.use('/*', (req, res) => res.send("You're lost!"))

module.exports = app;
