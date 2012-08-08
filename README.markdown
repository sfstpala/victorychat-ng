# VictoryChat 300

This is a fork of VictoryChat (even though they don't actually
share any code), written in JavaScript:

 - CouchDB
 - Node.js (and express)
 - jQuery (and less-css)

The design goals, currently, are as follows:

 - Being able to run multiple web-servers on the same database
 - Being able to handle replicated databases without interruption
 - Handling around 3000 concurrent connections on one server / db
 - Making the UI fluent, responsive, and as solid as possible

The source code is littered with "// TODO"s. If you decide to
contribute to this code, don't hesitate to add some yourself.

If you are interested in contributing, a lot of those TODOs are
quite trivial, and - again - it is 100% JavaScript.

## Demo

http://ng.plzz.de/

## Testing

To run the sever, first install the required modules from npm:

    cd victorychat-ng
    npm install \
    bind cradle express markdown openid \
    underscore connect connect-couchdb

Then install CouchDB

    sudo apt-get install couchdb
    sudo nano /etc/couchdb/local.ini

At the bottom of local.ini, in the `[admins]` section,
add a new user with a random password.

Move `config.json.default` to `config.json`, and insert
the couchdb username, password. If you decide to change
the http port for the app, make sure to also change that
number in the openid host parameter.

After all of this, run `node main.js` and go to `http://localhost:5000`.
