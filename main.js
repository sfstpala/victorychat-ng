var express = require('express'),
    bind = require('bind'),
    fs = require('fs'),
    connect = require('connect'),
    ConnectCouchDB = require('connect-couchdb')(connect);

var config = JSON.parse(fs.readFileSync(__dirname +"/config.json"));

var app = express();

app.use(express.static('public'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(connect.session({
    secret: config.cookies.secret,
    store: new ConnectCouchDB({
        name: config.couchdb.database,
        reapInterval: 600000,
        compactInterval: -1,
        setThrottle: 60000
    })}
));
app.use(express.session({secret: config.cookies.secret}));

require(__dirname + "/chat.js")(app, config);
require(__dirname + "/login.js")(app, config);
require(__dirname + "/database.js")(app, config);

app.get('/', function (req, res) {
    if (req.session.user === undefined) {
        res.redirect("/login");
    } else {
        // TODO 1) is this cached? 2) catch the ENOENT, it crashes the server.
        bind.toFile(__dirname + '/templates/index.html', {user: req.session.user},
        function (data) { res.send(data); });
    }
});

app.listen(config.http.port);
