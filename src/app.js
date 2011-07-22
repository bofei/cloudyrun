///////////////////////////////////////////////////////////////////
// Global

global._ = require('underscore');
global.util = require('./public/util');
global.uuid = require('node-uuid');
global.log = function(msg, type) {
    type = type || 'log';
    var colors = {
        'err': 	'31', // red
        'log': '90',  // gray
        'info': '32', // green
        'ooo': '36'   // blue
    };
    console.log('   \033['+colors[type]+'m'+type+(type=='info'?'  ':'   ')+'-\033[39m ' + msg);
};

try {
require('./config');
} catch(e) {
require('./config.sample');
}


///////////////////////////////////////////////////////////////////
// DB

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.model('Task', new Schema({
    taskId:       String,
    taskType:     String,
    command:      String,
    results:      Array,
    date:         Date
}));

mongoose.model('Group', new Schema({
    groupId:    String,
    name:       String,
    commands:   Array,
    results:    Array,
    runHour:    String,
    runMinite:  String,
    mail:       String,
    date:       Date
}));

var mongoose = mongoose;
var Schema = Schema;
var db = mongoose.connect('mongodb://127.0.0.1/cloudyrun');
var Task  = db.model('Task');
var Group = db.model('Group');


///////////////////////////////////////////////////////////////////
// App

var express = require('express');
var app = express.createServer();
app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.static(require('path').join(__dirname, '../build')));
    app.use(express.static(__dirname + '/public'));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
});

app.get('/', function(req, res) {
    var wiki = '<a href="'+global.config.wikiURL+'" target="_blank">wiki</a>';
    res.render('console', {layout:false,wiki:wiki});
});
app.get('/console', function(req, res) {
    var wiki = '<a href="'+global.config.wikiURL+'" target="_blank">wiki</a>';
    res.render('console', {layout:false,wiki:wiki});
});
app.get('/' + global.config.clientPath, function(req, res) {
    res.render('client',  {layout:false});
});
app.get('/proxy', function(req, res) {
    res.render('proxy',   {layout:false});
});
app.get('/empty', function(req, res) {
    res.render('empty',   {layout:false});
});
app.get('/clearqueue', function(req, res) {
    clearQueue();
    res.send('cleared');
});
app.get('/commands', function(req, res) {
    getTaskCommands(function(commands) {
        res.send(commands);
    });
});
app.get('/task/:taskId', function(req, res) {
    var taskId = req.params.taskId;
    getTaskInfoById(taskId, function(data) {
        res.render('task', _.extend(data, {layout:false}));
    });
});
app.get('/group/:groupId', function(req, res) {
    var groupId = req.params.groupId;
    getGroupInfoById(groupId, function(data) {
        res.render('group', _.extend(data, {layout:false}));
    });
});
app.post('/post', function(req, res) {
    var data = req.body;
    data.result = decodeURIComponent(data.result);
    updateTask(data);
    res.end('');
});

var port = process.env.VMC_APP_PORT || process.env.PORT || 8080;
app.listen(port, function() {
    log('started @ ' + port, 'info');
});


///////////////////////////////////////////////////////////////////
// Socket

var io = require('socket.io').listen(app);
var sessions = {console:{},client:{}};

io.configure(function() {
    io.enable('browser client minification');
    io.enable('browser client etag');
    io.set('log level', 1);
    io.set('transports', ['websocket', 'flashsocket']);
});

io.sockets
    .on('connection', function(socket) {

        socket.on('init', function(data) {
            // console can be Command Line, without a 'browser' prop
            if (this._data || !data.type) {
                return;
            }
            this._data = _.extend({}, data);
            sessions[this._data['type']][this.id] = this;
            log(this._data.browser + '(' + this._data.type + ') connected');
            emitInfoToConsole();
        });

        socket.on('disconnect', function() {
            removeSession(this);
            removeSessionFromTaskQueue(this.id);

            log(this._data.browser + '(' + this._data.type + ') disconnected');
            emitInfoToConsole();
        });

        socket.on('addTask', function(data) {
            addTask(data, this);
        });

        socket.on('updateTask', function(data) {
            updateTask(data);
        });

        socket.on('listGroup', function(data) {
            listGroups(this);
        });

        socket.on('editGroup', function(data) {
            getGroupById(data.groupId, function(g) {
                emit('editGroup', [socket], g);
            });
        });

        socket.on('addGroup', function(data) {
            addGroup(data, function() {
                listGroups(socket);
            });
        });

        socket.on('updateGroup', function(data) {
            updateGroup(data, function() {
                listGroups(socket);
            });
        });

        socket.on('runGroup', function(data) {
            runGroup(data.groupId, true);
        });
    
    });

/**
 * Let Sessions to Emit Data
 * @param name {String}
 * @param type {String|Array} type can be type or sessions
 * @param data {Object} JSON style data
 */
var emit = function(name, type, data) {
    log('emit ' + name + (_.isString(type) ? (' to ' + type) : ''));
    if (type && type.emit) {
        log('emit failed: session must be array', 'err');
        return;
    }
    var items = _.isString(type) ? sessions[type] : _.isArray(type) ? type : [];
    for (var k in items) {
        items[k].emit(name, data);
    }
};

var emitInfoToConsole = function() {
    emit('updateInfo', 'console', {
        clientInfo: getClientInfo(),
        queueInfo:  getQueueInfo(),
        consoleInfo: getConsoleInfo()
    });
};

var getConsoleInfo = function() {
    var count = 0;
    for (var k in sessions['console']) {
        count ++;
    }
    return {
        count: count
    };
};

var getClientInfo = function() {
    var ret = [];
    for (var k in sessions['client']) {
        ret.push({
            id: k,
            browser: sessions['client'][k]._data.browser
        });
    }
    return ret;
};

var removeSession = function(s) {
    if (s && s._data.type && s.id) {
        delete sessions[s._data.type][s.id];
    }
};

var getClients = function(ids) {
    var tmp = getSessions('client', ids);
    var ret = [];
    var browsers = {};

    // remove same browser type in clients
    tmp.forEach(function(session) {
        var b = session._data.browser;
        if (!browsers[b]) {
            browsers[b] = true;
            ret.push(session);
        }
    });
    return ret;
};

var getSessions = function(type, ids) {
    var ret = [];
    ids = _.isString(ids) ? [ids] : ids;
    for (var k in sessions[type]) {
        var session = sessions[type][k];
        if (!ids || ids.indexOf(session.id) > -1) {
            ret.push(session);
        }
    }
    return ret;
};


///////////////////////////////////////////////////////////////////
// Task

// Flow
// addTask -> checkQueue -> checkTask -> runTask -> updateTask -> checkTask

var taskQueue = [];

var addTask = function(data, console, cb) {
    log('task inputed: ' + data.command);

    var clients = getClients(data.clientIds);
    var results = [{}];
    for (var k in clients) {
        results[0][clients[k].id] = ['', clients[k]._data.browser];
    }

    // get task info
    var t = _.extend(new Task(), util.getTaskInfo(data.command), {
        taskId:  uuid(),
        command: data.command,
        results: results,
        date:    new Date(),
        console: console
    });

    t.save(function(err) {
        if (err) {
            log('task save error: ' + err, 'err');
            return;
        }

        log('task saved: ' + t.command);
        emitTask('addTask', 'console', t);
        
        taskQueue.push(t);
        checkQueue();
        emitInfoToConsole();

        cb && cb(t);
    });
};

/**
 * Emit Task To Client or Console
 * @param name
 * @param type {String} client or console
 * @param t {Task}
 */
var emitTask = function(name, type, t) {
    var data = t;
    if (type === 'client') {
        for (var k in data.results[0]) {
            var client = getSessions('client', [k])[0];
            if (client) {
                emit(name, [client], data);
            }
        }
    } else if (type === 'console') {
        emit(name, t.console ? [t.console] : [], data);
    }
};

var updateTask = function(data) {
    if (!data.browser || !data.result) {
        log('task update failed: browser or result is falsy', 'err');
        return;
    }

    var t = getTaskById(data.taskId);
    var sessionId = getTaskSessionIdByBrowser(data.browser, t);
    if (!t || !sessionId) {
        return;
    }

    if (t.results[0][sessionId][0] !== '') {
        log('task update failed: result for '+data.browser+' existed', 'warn');
        return;
    }

    var obj = {};
    obj[sessionId] = [data.result, t.results[0][sessionId][1]];
    t.results = [_.extend({}, t.results[0], obj)];

    t.save(function(err) {
        if (err) {
            log('task update error: ' + err, 'err');
            return;
        }

        log('task updated for '+data.browser+': ' + data.result);
        emitTask('updateTask', 'console', t);
        checkTask(t);
        emitInfoToConsole();
    });
};

var checkQueue = function() {
    taskQueue.forEach(function(t, i) {
        checkTask(t);
        if (t && !t.running && (!t.queue || t.queue && i < 1)) {
            runTask(t);
        }
    });
};

var checkTask = function(t) {
    var finished = true;

    for (var k in t.results[0]) {
        // check client sessions
        if (!getSessions('client', [k])[0]) {
            delete t.results[0][k];
        }

        // check finished
        if (t.results[0][k] && !t.results[0][k][0]) {
            finished = false;
        }
    }

    if (finished) {
        taskQueue.splice(taskQueue.indexOf(t), 1);
        checkQueue();
        emitInfoToConsole();
    }
};

var runTask = function(t) {
    t.running = true;
    emitTask('runTask', 'client', t);
};

var clearQueue = function() {
    taskQueue = [];
    emitInfoToConsole();
};

var getTaskById = function(taskId) {
    for (var i=0; i<taskQueue.length; i++) {
        if (taskQueue[i] && taskQueue[i].taskId === taskId) {
            return taskQueue[i];
        }
    }
};

var getTaskSessionIdByBrowser = function(browser, t) {
    if (!t) return;
    for (var k in t.results[0]) {
        if (t.results[0][k] && t.results[0][k][1] === browser) {
            return k;
        }
    }
};

var getQueueInfo = function() {
    var ret = [];
    taskQueue.forEach(function(t) {
        if (t.queue) {
            ret.push(t.command);
        }
    });
    return ret;
};

var getTaskCommands = function(cb) {
    Task.find(null, [], {sort:{date:-1},limit:300}, function(err, docs) {
        if (err || !docs) return;
        var html = '';
        docs.forEach(function(a) {
            html += '<li style="padding-left:260px;margin-bottom:6px;"><span style="position:absolute;margin-left:-260px;font:12px/1.5 arial;">' + a.taskId + '</span>'+a.command+'</li>';
        });
        cb && cb('<ol>'+html+'</ol>');
    });
};

var getTaskInfoById = function(taskId, cb) {
    Task.find({taskId:taskId}, [], {sort:{date:-1}}, function(err, docs) {
        if (err || !docs[0]) {
            log('getTaskInfoById error: err or docs not found', 'err');
            return;
        }

        var t = docs[0];
        var results = t.results[0];
        var style = {
            'passed': 'background:green;color:#fff;',
            'failed': 'background:red;color:#fff;',
            'timeout': 'background:gray;color:#fff;'
        };
        var _status = 'passed';
        var _detail = '<table><tr><th>测试集</th><th>用例</th><th>结果</th><th>备注</th></tr>';
        var _result = '';


        try {
            for (var k in results) {
                var r = JSON.parse(results[k][0]);
                var b = results[k][1];
                var rr;
                try {
                    rr = JSON.parse(decodeURIComponent(r.result));
                } catch(e) {}

                if (r['status'] !== 'passed') {
                    _status = 'failed';
                }
                _result += b + ': <span style="'+style[r.status]+'" class="'+r.status+'">' + r.status + '</span><br>';
                _detail += '<tr class="browser"><td colspan="4">'+b+'</td></tr>';

                if (!rr || !rr.suites) {
                    _detail = null;
                    continue;
                }
                for (var kk in rr.suites) {
                    var sn = rr.suites[kk]['description'];
                    var ss = rr.suites[kk]['specs'];
                    for (var i=0; i<ss.length; i++) {
                        _detail += '<tr>' +
                        '<td>'+sn+'</td>' +
                        '<td style="font-weight:bold;">'+ss[i]['description']+'</td>' +
                        '<td class="'+ss[i]['status']+'"><b>'+ss[i]['status']+'</b></td>' +
                        '<td>'+(ss[i]['messages'][0] ? ss[i]['messages'][0].message : '-')+'</td>' +
                        '</tr>';
                    }
                }
            }
            if (_detail) {
                _detail += '</table>';
            }
        } catch(e) {
            _detail = _result = '<div style="color:red">Parsing Error</div>';
        }

        cb(_.extend(t, {
            general: JSON.stringify(t),
            detailHTML: _detail,
            resultHTML: _result
        }));
    });
};

var removeSessionFromTaskQueue = function(sessionId) {
    taskQueue.forEach(function(t) {
        for (var k in t.results[0]) {
            if (k === sessionId) {
                t.results[0][k] = [JSON.stringify({"status":"disconnected","result":"disconnected"}), 'browser'];
            }
        }
        checkTask(t);
    });
};

var waitTasksComplete = function(taskIds, cb) {
    var func = arguments.callee;
    for (var i=0; i<taskIds.length; i++) {
        if (getTaskById(taskIds[i])) {
            setTimeout(function() {
                func(taskIds, cb);
            }, 1000);
            return;
        }
    }
    cb();
}


///////////////////////////////////////////////////////////////////
// Group

var addGroup = function(data, cb) {
    var g = _.extend(new Group(), data, {
        groupId: uuid(),
        date:    new Date()
    });

    saveGroup(g, function() {
        cb();
        runGroupSchedual(g);
    });
};

var updateGroup = function(data, cb) {
    getGroupById(data.groupId, function(g) {
        _.extend(g, data);
        saveGroup(g, function() {
            cb();
            runGroupSchedual(g);
        });
    });
};

var getGroupById = function(groupId, cb) {
    Group.find({groupId:groupId}, function(err, docs) {
        if (err || !docs || !docs[0]) {
            return;
        }
        cb && cb(docs[0]);
    });
};

var saveGroup = function(g, cb) {
    g.save(function(err) {
        if (err) {
            log('group saving error: ' + err, 'err');
            return;
        }
        cb && cb(g);
    });
};

/**
 * @param g {Group|String}
 */
var runGroup = function(g, justRun) {
    if (_.isString(g)) {
        var groupId = g;
        getGroupById(groupId, function(g) {
            g && runGroup(g, justRun);
        });
        return;
    }

    var taskIds = [];
    var len = g.commands.length;

    for (var i=0; i<len; i++) {
        addTask({command:g.commands[i]}, null, function(t) {
            taskIds.push(t.taskId);
            if (taskIds.length < len) {
                return;
            }

            if (!g.results) {
                g.results = [];
            }
            g.results.push({
                'date': new Date(),
                'taskIds': taskIds
            });
            saveGroup(g);

            if (justRun) return;

            waitTasksComplete(taskIds, function() {
                getGroupInfoById(g.groupId, function(data) {
                    var html = '';
                    html += '<style>' +
                            '.task { border: 1px solid #ccc; margin:5px 0; }' +
                            '</style>';
                    var url = global.config.host + 'groupview/' + data.groupId;
                    html += '<div><b><a href="'+url+'" target="_blank">'+data.name+'</a></b></div>';
                    html += '<div><b>send mail to: </b>'+data.mail+'</div>';
                    html += '<div><b>commands: </b></div>';
                    html += '<div>'+data.commands+'</div>';
                    html += '<div><b>results: </b></div>';
                    html += '<div>'+data.lastHTML+'</div>';
                    var subject = 'CloudyRun Report: ' + data.name;

                    sendMail(html, subject, data.mail);
                });
            });
        });
    }
};

var runGroupSchedual = function(g) {
    if (!g.runHour || !g.runMinite) {
        return;
    }

    var Schedual = require('./schedual');
    if (Schedual.instances[g.groupId]) {
        Schedual.instances[g.groupId].cancel();
        delete Schedual.instances[g.groupId];
    }
    new Schedual(g.runHour, g.runMinite, function() {
        runGroup(g);
    }, g.groupId);
};

var getGroupInfoById = function(groupId, cb) {
    getGroupById(groupId, function(g) {
        var results = [];
        for (var i=0; i<g.results.length; i++) {
            getTaskInfoFromGroup(g.results[i], function(data) {
                results.push(data);
                if (results.length < g.results.length) {
                    return;
                }

                results.reverse();
                cb(_.extend({}, g, {
                    commands: g.commands.join('<br>'),
                    html: getGroupHTML(results),
                    lastHTML: getGroupHTML(results, 1)
                }));
            });
        }
    });
};

var getTaskInfoFromGroup = function(result, cb) {
    var taskInfos = [];
    for (var i=0; i<result.taskIds.length; i++) {
        getTaskInfoById(result.taskIds[i], function(data) {
            taskInfos.push(data);
            if (taskInfos.length < result.taskIds.length) {
                return;
            }
            cb({
                date: result.date,
                taskInfos: taskInfos
            });
        });
    }
};

var getGroupHTML = function(data, count) {
    var html = '';
    var len = count || data.length;

    for (var i=0; i<len; i++) {
        html += '<h3>'+data[i].date+'</h3>';
        data[i].taskInfos.forEach(function(t) {
            html += '<div class="task">';
            html += '<div>'+t.command+'</div>';
            html += t.resultHTML;
            html += '</div>';
            var url = global.config.host + 'task/' + t.taskId;
            html += '<div><a href="'+url+'" target="_blank">task detail..</a></div>';
            html += '<br>';
        });
    }

    return html;
};

var listGroups = function(session) {
    Group.find(null, function(err, docs) {
        if (!err) {
            emit('listGroup', [session], docs);
        }
    });
};

var sendMail = function(html, subject, address) {
    var mail = require('emailjs');
    var server = mail.server.connect(global.config.mail);
    var message = mail.message.create({
                text: 'hello cloudyrun',
                from: global.config.mail.from,
                to: address,
                subject: subject
            });
    message.attach_alternative(html);
    server.send(message, function(err, message) {
        log(err || 'mail sent', err ? 'err' : 'log');
    });
};


///////////////////////////////////////////////////////////////////
// Run

Group.find(null, function(err, docs) {
    if (!err) {
        docs.forEach(function(g) {
            runGroupSchedual(g);
        });
    }
});

