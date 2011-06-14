
require('./lib/global');

var TaskManager    = require('./lib/task-manager');
var SessionManager = require('./lib/session-manager');
var GroupManager = require('./lib/group');


//////////////////////////////////////////////////////////////////
// App Router

app.get(/^\/(\w+)(\/room\/(\w+))?/, function(req, res, next) {
    var type = req.params[0],
        room = req.params[2];

    if (type && 'console|client|proxy|empty'.indexOf(type) > -1) {
        res.render(type+'.jade', {layout: false});
    } else {
        next();
    }
});

app.get('/task/:taskId', function(req, res) {
    var taskId = req.params.taskId;
    console.log('taskId: ' + taskId);
    TaskManager.getTaskInfoById(taskId, function(docs) {
        res.send(docs);
    });
});

app.get('/taskview/:taskId', function(req, res) {
    var taskId = req.params.taskId;
    TaskManager.getTaskViewById(taskId, function(data) {
        res.render('task.jade', data);
    });
});

app.get('/groupview/:groupId', function(req, res) {
    var groupId = req.params.groupId;
    GroupManager.getGroupViewById(groupId, function(data) {
        res.render('group.jade', data);
    });
});

app.get('/tasks', function(req, res) {
    TaskManager.getTasksFromDB(null, function(docs) {
        res.send(docs);
    });
});

app.get('/commands', function(req, res) {
    TaskManager.getCommandsFromDB(function(docs) {
        res.send(docs);
    });
});

app.get('/clearqueue', function(req, res) {
    TaskManager.clearQueue();
    res.send('cleared!');
});

app.post('/post', function(req, res) {
    var data = req.body;
    data.result = decodeURIComponent(data.result);
    TaskManager.update(data);
    res.end('');
});

app.get('/groupadd', function(req, res) {
    var g = GroupManager.add({commands:['typeof /a/', 'typeof /b/']}, function(g){
        this.exec(g);
    });
    res.end(JSON.stringify(g));
});

app.get('/grouplist', function(req, res) {
    GroupManager.getGroups(null, function(html) {
        res.end(html);
    });
});

app.start();


//////////////////////////////////////////////////////////////////
// Socket

socket.on('connection', function(s) {
    s.on('message', function(data, self) {
        util.log('[log] message getted: ' + data);
        try {
            data = JSON.parse(data);
        } catch(e) {
            util.log('[error] message parsing failed!');
            return;
        }
        self = this;

        var updateGroup = function() {
            GroupManager.getGroups(null, function(data) {
                SessionManager.send(self, {messageType:'listGroup',data:data});
            });
        };

        switch (data.messageType) {
            case 'connect':
                SessionManager.add(self, data, TaskManager);
                break;
            case 'addTask':
                TaskManager.add(self, data, function() {
                    SessionManager.send();
                });
                break;
            case 'updateTask':
                data.sessionId = s.sessionId;
                TaskManager.update(data);
                break;
            case 'listGroup':
                updateGroup();
                break;
            case 'editGroup':
                GroupManager.getGroups(data.groupId, function(data) {
                    if (data && data[0]) {
                        SessionManager.send(self, {
                            messageType: 'editGroup',
                            data: data[0]
                        });
                    }
                });
                break;
            case 'addGroup':
                GroupManager.add(data.data, function() {
                    updateGroup();
                });
                break;
            case 'updateGroup':
                GroupManager.update(data.data, function() {
                    updateGroup();
                });
                break;
            case 'runGroup':
                GroupManager.exec(data.groupId, self);
        }
    });

    s.on('disconnect', function() {
        SessionManager.remove(this);
        TaskManager.removeQueue(this.sessionId);
    });
});

