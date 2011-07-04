if (typeof console === 'undefined') {
    console = {log:function() {}};
}
var log = function(msg, type) {
    if (g_config.type === 'console') return;
    if (msg && typeof msg === 'object' && typeof JSON !== 'undefined') {
        msg = JSON.stringify(msg);
    }
    type = type || 'log';
    document.getElementById('output').innerHTML += ' - ' + type + ': ' + msg + '<br>';
};

var base = {
    type:    g_config['type'],
    browser: util.getBrowserInfo(navigator.userAgent)
};
var emit = function(name, data) {
    data = _.extend({}, base, data);
    socket.emit(name, data);
};

var socket = io.connect('', {
    'transports': ['websocket', 'flashsocket', 'xhr-polling'], // 'htmlfile'
    'reconnection delay': 500,
    'max reconnection attempts': 10000
});

////////////////////////////
// client & console message

socket.on('connect', function() {
    log('connected');
    emit('init');

    if (g_config.type === 'console') {
        $('#command').attr('disabled', false).val('');
    }
});

socket.on('disconnect', function() {
    log('disconnected');
    console.log('disconnect');
    if (g_config.type === 'console') {
        $('#command').attr('disabled', true).val('disconnected');
        $('#browser-list').html('disconnected');
    }
});

socket.on('updatebase', function(data) {
    base = _.extend(base, data);
    log('[act] base updated: ' + JSON.stringify(data));
});

////////////////////////////
// client message

socket.on('runTask', function(data) {
    log('run task: ' + data.command);
    data = _.extend(data, util.getTaskInfo(data.command));
    data.run(data);
});

////////////////////////////
// console message

socket.on('addTask', function(t) {
    var taskInfo = util.getTaskInfo(t.command);
    var html = '' +
        '<div class="task task-'+t.taskType+'" id="'+t.taskId+'">' +
        '<h3>:'+taskInfo.taskType+' '+taskInfo.commandBody+'</h3>' +
        '<div class="task-bd">' +
        taskInfo.getResults(prepareResults(t.results[0]), t) +
        '</div>' +
        '</div>';
    $('#output').prepend(html);
});

socket.on('updateTask', function(t) {
    var taskInfo = util.getTaskInfo(t.command);
    var bd = jQuery('#'+t.taskId+' div.task-bd');
    if (bd[0]) {
        console.log(prepareResults(t.results[0]));
        bd.html(taskInfo.getResults(prepareResults(t.results[0]), t));
    }
});

socket.on('updateInfo', function(data) {
    // update browsers
    if (data.clientInfo) {
        var clientInfo = [];
        var obj = {}, arr = [];
        for (var k in data.clientInfo) {
            var b = data.clientInfo[k].browser;
            obj[b] = (obj[b] || 0) + 1;
        }
        for (var k in obj) {
            arr.push(k + (obj[k] > 1 ? '('+obj[k]+')' : ''));
        }
        arr.sort();
        var consoleInfo = data.consoleInfo && data.consoleInfo.count && data.consoleInfo.count > 1
                ? '<b class="console" title="console count">'+data.consoleInfo.count+'</b>'
                : '';
        jQuery('#browser-list').html('clients: <b>' + arr.join('</b>, <b>') + '</b>' + consoleInfo);
    }

    // update queue
    if (data.queueInfo) {
        jQuery('#queue').html('' +
            '<h2>Queue</h2>' +
            '<ol><li>'+data.queueInfo.join('</li><li>')+'</li></ol>');
    }
});

socket.on('listGroup', function(data) {
    GroupManager.list(data);
});

socket.on('editGroup', function(data) {
    console.log(data);
    GroupManager.edit(data);
});

var prepareResults = function(results) {
    var ret = [];
    for (var k in results) {
        ret.push({
            browser: results[k][1],
            result: results[k][0]
        });
    }
    return ret.sort(function(a,b) {
        return a.browser.toLowerCase() < b.browser.toLowerCase();
    });
};
