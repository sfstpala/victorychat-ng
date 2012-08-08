/*
    TODO

      - Connect delete, undelete, star, and unstar handlers
        from database.js when they're there.

      - Implement rooms. This will be done by simply adding
        another parameter to the urls - but only once the
        front-end code has been written.

*/

var fs = require('fs'),
    _ = require('underscore');

module.exports = function (app, config) {

    app.put('/send/:room', function (req, res) {
        var room = req.params.room;
        if (req.session.user === undefined) {
            res.json({'error': 'unauthorized'}, 401);
        } else if (req.body['message'].length > 0) {
            /* TODO csrf token */
            app.chat.send(room, req.body['message'],
                    req.session.user, function (err, _) {
                res.json(_);
            });
        } else {
            res.json(_);
        }
    });

    app.get('/recv/:room/:last?', function (req, res) {
        var room = req.params.room;
        if (req.session.user === undefined) {
            res.json({'error': 'unauthorized'}, 401);
        } else {
            var last = parseInt(req.params.last) || 0;
            app.chat.recv(room, last, function (err, messages) {
                if (err) {
                    res.json({'error': 'internal server error', 'reason': err}, 500);
                } else {
                    app.chat.users(room, function (err, users) {
                        res.json({
                            last: messages.last_seq,
                            messages: _.map(messages, function (i) {
                                return i.doc;
                            }),
                            users: _.map(users, function (i) {
                                var v = i.value;
                                v.id = i.id;
                                v.ping = v.ping[room];
                                return v;
                            })
                        });
                    });
                }
            });
            app.chat.ping(req.session.user._id, room, function () {});
        }
    });

};
