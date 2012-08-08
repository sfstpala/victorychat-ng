var last = 0; /* the id of the last message received */
var send = function (message, success, error) {
    /*
    Send a message to the server.

    Arguments:
        message         The message to be sent (a string)
        success         callback for when the message has been
                        sent successfully (takes one argument,
                        the jqxhr data object)
        error           Callback for an error response (takes
                        one argument, the jqxhr error object)

    */
    $.ajax({
        type: 'put',
        url: '/send/one', /* TODO */
        dataType: 'json',
        data: {message: message},
        success: (success || function (res) {})
    }).error(error || function (err) {});
};
var recv = function (callbackMessage, callbackUser, successTimeout, errorTimeout) {
    /*
    Wait for updates from the server (long polling).

    Once started, this function will continuosly poll the server,
    expecting it to wait until it answers requests that have no
    urgent response, and execute the callback with the message
    received.

    Arguments:
        callbackMessage A function that takes one argument (message),
                        called on every message received from the server.
        callbackUser    A function that takes one argument (user),
                        called on every user-update received from the server.
        successTimeout  Time to wait on success (default 50 ms)
        errorTimeout    Time to wait when the previous poll has returned
                        an error (default 2000 ms)

    Example:

        recv(function (message) {
            console.log(message);
        });

    */
    $.ajax({
        type: 'get',
        url: '/recv/one/' + last.toString(), /* TODO */
        success: function (res) {
            // the server returns no new last value and an empty message array
            // after a certain amount of time.
            if (res.last) {
                last = res.last;
                for (var i = 0; i < res.messages.length; i++) {
                    callbackMessage(res.messages[i]);
                }
                for (var i = 0; i < res.users.length; i++) {
                    callbackUser(res.users[i]);
                }
            }
            setTimeout(function () {
                    recv(callbackMessage, callbackUser, successTimeout, errorTimeout);
                }, successTimeout || 50);
        }
    }).error(function (err) {
        setTimeout(function () {
                recv(callbackMessage, callbackUser, successTimeout, errorTimeout);
            }, errorTimeout || 2000);
    });
};
var hideTimes = function (secs) {
    /*
    Hide certain time values when the previous ones are too close to them.
    Also hides any span.date if that date is today's.

    Arguments:
        secs            Maximum delta in seconds for which the time is
                        shown.

    */
    var today = $(ISODateString(new Date)).text();
    var tx = 0;
    $(".t").each(function () {
        var e = $(this), t = parseInt($(this).attr("data-time"));
        if ((t - tx) < ((secs || 60 * 5) * 1000)) {
            $(e).text("");
        }
        if (today == e.find("span.date").text()) {
            $(e).find("span.date").hide();
        }
        tx = t;
    });
};

var ISODateString = function (d) {
    /*
    Convert a Date object into something like the ISO format.
    I.e. "<span class=date>2012-08-06</span> 07:27" (the real
    ISO format would be "2012-08-06 07:27:00Z")

    */
    function pad(n){return n < 10 ? '0' + n : n}
    return "<span class=date>" + d.getUTCFullYear() + '-'
        + pad(d.getUTCMonth() + 1)+'-'
        + pad(d.getUTCDate()) + '</span> '
        + pad(d.getUTCHours()) + ':'
        + pad(d.getUTCMinutes()) + '';
}

var adjustScroll = function (lastElement) {
    $("html,body").scrollTop($("body").height());
};

$(function () {
    var currentUsers = [];
    recv(function (message) {
        var el = $("table.chat tr:first").clone().removeClass("hidden");
        el.find(".m").html(message["html"]);
        el.find(".t").html(ISODateString(new Date(message["date"])));
        el.find(".t").attr("data-time", message["date"]);
        el.find(".n").text(message["user"]["name"]);
        el.find("img.g").attr("src", "http://www.gravatar.com/avatar/"
            + message["user"]["emailHash"] + "?s=16&d=identicon");
        $("table.chat").append(el);
        hideTimes();
        setTimeout(function () { adjustScroll(el)}, 40);
    }, function (user) {
        var add = function () {
            var el = $("ul.users li:first").clone().removeClass("hidden");
            el.find("img.g").attr("src", "http://www.gravatar.com/avatar/"
                + user["emailHash"] + "?s=32&d=identicon");
            el.find("a").attr("title", user["name"]);
            el.attr("data-ping", user["ping"]).attr("data-id", user["id"]);
            $("ul.users").append(el);
            currentUsers.push(user["id"]);
        };
        var seen = false;
        for (var i = 0; i < currentUsers.length; i++) {
            if (currentUsers[i] == user["id"]) { seen = true; break; }
        }
        if (!seen) {
            add();
        } else {
            $("[data-id=" + user["id"] + "]").attr("data-ping", user["ping"]);
        }
        $("[data-ping]").each(function (i) {
            var age = ((new Date).getTime()) - parseInt($(this).attr("data-ping"));
            age = age / 1000 / 60 / 5;
            age = (1 - (age > 1 ? 1 : age)) * 100; // staleness in per cent
            if ((Math.round(age * 10) / 10) == 0) {
                $(this).hide();
            } else {
                $(this).find("img").css({'opacity': age / 100}).show();
            };
        });
    });
    var returnDisabled = false;
    $("button[name=send]").click(function (e) {
        var textarea = $("textarea[name=message]");
            send(textarea.val(), function () {
                returnDisabled = false;
            $("textarea[name=message]").removeClass("disabled");
                textarea.val("").focus();
            });
            e.preventDefault();
    });
    $("textarea[name=message]").bind('keypress', function (e) {
        // user presses return or enter.
        if ((e.keyCode == 13) && (!e.shiftKey) && (!returnDisabled)) {
            returnDisabled = true;
            $("textarea[name=message]").addClass("disabled");
            e.preventDefault();
            $("button[name=send]").click();
        } else if ((e.keyCode == 13) && (!e.shiftKey)) {
            e.preventDefault();
        }
    });
});
