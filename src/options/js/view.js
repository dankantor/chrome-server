var template = require('./../templates/options.hbs'),
    Library = require('./../../common/js/library.js');

module.exports = Backbone.View.extend({
    initialize: function(opts){
        this.server = opts.server;
        this.library = opts.library;
        this.render(opts.port, opts.lastScan);
        this.cacheElements();
        this.addListeners();
    },
    render: function(port, lastScan){
        var lastScanText = 'never';
        if(lastScan !== -1){
            lastScanText = this.getDateString(lastScan);
        }
        var html = template(
            {
                'port': port,
                'lastScanText': lastScanText
            }
        );
        this.$el.append(html);
    },
    cacheElements: function(){
       this.portButton = $('#port-button');
       this.portInput = $('#port-input');
       this.scanButton = $('#scan-button');
       this.scanTime = $('#scan-time');
    },
    addListeners: function(){
        this.portButton.on(
            'click',
            this.onPortButtonClick.bind(this)
        );
        this.scanButton.on(
            'click',
            this.onScanButtonClick.bind(this)
        );
    },
    onPortButtonClick: function(e){
        var port = this.portInput.val();
        if(port !== ''){
            this.portButton.attr('disabled', 'disabled');
            this.server.changePort(port).then(
                function(newPort){
                    this.portButton.removeAttr('disabled');
                    this.portInput.val(newPort);
                }.bind(this)
            );
        }
    },
    onScanButtonClick: function(e){
        this.scanButton.attr('disabled', 'disabled');
        this.library.parse().then(
            function(now){
                this.scanButton.removeAttr('disabled');
                var lastScanText = this.getDateString(now);
                this.scanTime.html('Last scanned: ' + lastScanText);
            }.bind(this)
        );
    },
    getDateString: function(dateTime){
        var date = new Date(dateTime);
        var lastScanText = dayStringsAbbreviated[date.getDay()] + ', ';
        lastScanText += monthStringsAbbreviated[date.getMonth()] + '. ';
        lastScanText += date.getDate() + ', ';
        lastScanText += date.getFullYear() + ' ';
        lastScanText += to12Hour(date.getHours()) + ':';
        lastScanText += fixZeroes(date.getMinutes());
        lastScanText += ampm(date.getHours());
        return lastScanText;
    }
});

var dayStrings = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

var dayStringsAbbreviated = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'
];

var fixMonth = function(month){
    var m = month + 1;
    if (m < 10){
        m = '0' + m;
    }
    return m;
}

var monthStrings = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

var monthStringsAbbreviated = [
    'Jan', 
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec'
];

var ampm = function(hour) {
    var m = "AM";
    if (hour > 11){
        m = "PM";
    }
    return m;
}

var to12Hour = function(hour){
    var h = hour;
    if (hour > 12){
        h = hour - 12;
    }
    if (hour == 0){
        h = 12;
    }
    return h;
}

var fixZeroes = function(minutes){
    var m = minutes;
    if (minutes < 10){
        m = '0'+minutes;
    }
    return m;
}