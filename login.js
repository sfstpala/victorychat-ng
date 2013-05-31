var openid = require('openid'),
    bind = require('bind'),
    crypto = require('crypto'),
    fs = require('fs');

var config = JSON.parse(fs.readFileSync(__dirname +"/config.json"));

var relyingParty = new openid.RelyingParty(
    'http://' + config.openid.host + '/login/verify',
    null, false, false, [new openid.SimpleRegistration({
            "nickname" : true,
            "email" : true,
            "fullname" : true,}),
        new openid.AttributeExchange({
            "http://axschema.org/contact/email": "required",
            "http://axschema.org/namePerson/friendly": "required",
            "http://axschema.org/namePerson": "required",
            "http://axschema.org/namePerson/first": "required",
            "http://axschema.org/namePerson/last": "required"})]);

module.exports = function (app, config) {

    app.get('/logout', function (req, res) {
        delete req.session.ok;
        delete req.session.user;
        res.redirect("/");
    });

    app.get('/login', function (req, res) {
        if ((req.session.provider) && (req.session.ok)) {
            res.redirect("/login?provider=" + req.session.provider);
        }
        if (req.query.provider === undefined) {
            bind.toFile(__dirname + '/templates/login.html', {},
               function (data) { res.send(data); });
        } else {
            var provider = {
                'google': "https://www.google.com/accounts/o8/id",
                'launchpad': "https://login.launchpad.net/",
                'myopenid': "https://www.myopenid.com/",
                'stackexchange': "https://openid.stackexchange.com",
                'ubuntu': "https://login.ubuntu.com/",
                'yahoo': "https://me.yahoo.com/",
                'aol': "https://openid.aol.com/",
                'verisign': "https://pip.verisignlabs.com/",
                'claimid': "https://claimid.com/me",
            }[req.query.provider];
            if (provider === undefined) {
                delete req.session.ok;
                res.send("invalid provider", 401); /* TODO */
            } else {
                req.session.provider = req.query.provider;
                relyingParty.authenticate(
                    provider, false, function (err, url) {
                        if (err) {
                            delete req.session.ok;
                            res.send("authentication error: " + err.message, 401); /* TODO */
                        } else if (!url) {
                            delete req.session.ok;
                            res.send("authentication error", 401); /* TODO */
                        } else {
                            res.redirect(302, url + "&povider=" + provider);
                        }
                    }
                );
            }
        }
    });

    app.get('/login/verify', function (req, res) {
        relyingParty.verifyAssertion(req, function (err, result) {
            if (err) {
                delete req.session.ok;
                res.send("verification error", 401); /* TODO */
            } else {
                if (result.authenticated) {
                    req.session.ok = true;
                    req.session.claimedIdentifier = result.claimedIdentifier;
                    req.session.user = {
                        'id': result.claimedIdentifier,
                        'name': result.fullname || result.nickname || [
                            result.firstname, result.lastname].filter(
                                function (x) {
                                    return x !== undefined;
                            }).join(" ") || "Anonymous",
                        'email': result.email || "user@example.com",
                        'emailHash': crypto.createHash('md5').update(
                            result.email || "").digest("hex")
                    };
                    app.chat.user(result.claimedIdentifier, function (err, users) {
                        if ((err) || (users.length < 1)) {
                            app.chat.register(req.session.user, function (err, r) {
                                if (err) {
                                    /* TODO */
                                }
                                req.session.user._id = r._id;
                                res.redirect(302, '/');
                            });
                        } else {
                            req.session.user = users[0].value;
                            res.redirect(302, '/');
                        }
                    });
                } else {
                    delete req.session.ok;
                    res.send("authentication error", 401); /* TODO */
                }
            }
        });
    });

};
