/*
    TODO

        Chat.prototype.edit = function (id, message, callback)
            simply update the document, but take great care to deal
            with edit conflicts correctly (at the moment, you can
            run an arbitrary number of servers on the same database,
            and I want to keep it that way).

        Chat.prototype.star = function (id, user, callback)
        Chat.prototype.unstar = function (id, user, callback)
            These will most likely be a new document type ("star")
            which these methods create and deleted. It depends on
            the front end.

        Chat.prototype.delete = function (id, callback)
        Chat.prototype.undelete = function (id, callback)
            These two toggle the 'show' attribute of message type
            documents. They'll be implemented with update handlers,
            and - even so - the code both on the server and the db
            must be able to detect and handle edit conflicts.
            Rememeber that, because a button will trigger this
            method, edit conflicts are not unlikely.
*/

var cradle = require('cradle'),
    markdown = require('markdown'),
    _ = require('underscore'),
    fs = require('fs');


module.exports = function (app, config) {

    var connection = new(cradle.Connection)(config.couchdb.host,
            config.couchdb.port, {auth: {username: config.couchdb.username,
                password: config.couchdb.password}
    });

    function Chat (db) {
        this.db = db;
    }

    Chat.prototype.send = function (room, message, user, callback) {
        var db = this.db;
        db.post({
            type: 'message',
            user: user,
            room: room,
            date: (new Date()).getTime(),
            text: message,
            html: markdown.markdown.toHTML(message),
        }, callback);
    };

    Chat.prototype.user = function (id, callback) {
        var db = this.db;
        db.view("users/id", {key: id}, function (err, res) {
            callback(err, res);
        });
    };

    Chat.prototype.register = function (user, callback) {
        var db = this.db;
        db.post({
            type: 'user',
            name: user['name'],
            email: user['email'],
            emailHash: user['emailHash'],
            id: user['id'],
            date: (new Date()).getTime(),
            ping: {},
        }, callback);
    };

    Chat.prototype.ping = function (doc_id, room, callback) {
        var db = this.db;
        db.put("_design/users/_update/ping/" + doc_id, {room: room},
            callback || function (err, res) {});
    };

    Chat.prototype.users = function (room, callback) {
        var db = this.db;
        db.view("users/room", {key: room}, callback);
    };

    Chat.prototype.recv = function (room, seq, callback) {
        // TODO change the filter such that it only returns
        // items from, say, the past 24 hours. Make that
        // an option in config.json too.
        var db = this.db;
        db.get("_changes", {
            filter: 'messages/room',
            room: room,
            feed: 'longpoll',
            since: seq,
            style: 'all_docs',
        }, function (err, res) {
            last_seq = res ? res.last_seq : seq;
            if ((err) || (res.length == 0)) {
                callback(err, res);
            } else {
                var docs = _.map(res, function (i) { return i.id; });
                db.get(docs, {include_docs: true}, function (err, res) {
                    res.last_seq = last_seq;
                    callback(err, res);
                });
            }
        });
    };

    var init = function (callback) {
        messages = {
            filters: {
                room: function (doc, req) {
                    return ( // TODO limit the number of changes by
                             // setting a maximum age
                        (doc.room == req.query.room) &&
                        (doc.type == "message")
                    )
                }
            },
            views: {
                recent: function (doc) {
                    emit(doc._id, doc);
                }
            }
        };
        users = {
            views: {
                id: {
                    map: function (doc) {
                        if (doc.type == "user") { emit(doc.id, doc); }
                    }
                },
                room: {
                    map: function (doc) {
                        if (doc.type == "user") {
                            for (var i in doc.ping) {
                                var d = eval(uneval(doc));
                                delete d._id;
                                delete d._rev;
                                delete d.email;
                                delete d.date;
                                delete d.type;
                                delete d.id;
                                emit(i, d);
                            }
                        }
                    }
                }
            },
            updates: {
                ping: function (doc, req) {
                    doc.ping[JSON.parse(req.body).room] = (new Date()).getTime();
                    return [doc, "pong"];
                }
            }
        };
        // callback takes (err, db)
        var setup = function (db, callback) {
            // initialize design documents
            db.save('_design/messages', messages, function (err, res) {
                if (err) {
                    callback(err, null);
                } else {
                    db.save('_design/users', users, function (err, res) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, new Chat(db));
                        }
                    });
                }
            });
        };
        var db = connection.database(config.couchdb.database);
        // if the database doesn't exist, we try to create it
        db.exists(function (err, exists) {
            if (err) {
                callback(err, null);
            } else if (!exists) {
                db.create(function (err, res) {
                    if (err) {
                        callback(err, null);
                    } else {
                        setup(db, callback);
                    }
                });
            } else {
                setup(db, callback);
            }
        });
    };

    init(function (err, chat) {
        app.chat = chat;
        if (err) {
            console.log(err);
        }
    });
}
