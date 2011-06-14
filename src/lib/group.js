
var Group = db.model('Group');

var GroupManager = {

    /**
     * Add Group
     * var g = GroupManager.add({commands:['typeof /a/']}, function(g){ this.exec(g); });
     * @public
     */
    add: function(data, success) {
        var g = util.extend(new Group(), data, {
            groupId: uuid(),
            date:    new Date()
        });

        if (!this._validate(g)) {
            util.log('[error] Group not validated!');
            util.log(g);
            return null;
        }

        var self = this;
        this._save(g, function() {
            success();
            self._runSchedual(g);
        });
        return g;
    },

    update: function(data, success) {
        if (!data.groupId) return;

        var self = this;
        this._findGroups(data.groupId, function(docs) {
            var g = docs[0];
            util.extend(g, data);
            self._save(g, function() {
                success();
                self._runSchedual(g);
            });
        });
    },

    exec: function(g, consoleSession) {
        var self = this;
        if (util.isString(g)) {
            this._findGroups(g, function(docs) {
                docs[0] && self.exec(docs[0]);
            });
            return;
        }

        if (!this._validate(g)) return;

        var TaskManager = require('./task-manager');
        var taskIds = [];
        var len = g.commands.length;
        
        g.commands.forEach(function(command) {
            TaskManager.add(consoleSession, {
                'command': command
            }, function(t) {
                taskIds.push(t.taskId);
                if (taskIds.length === len) {
                    if (!g.results) {
                        g.results = [];
                    }
                    g.results.push({
                        'date': new Date(),
                        'taskIds': taskIds
                    });
                    self._save(g);

                    TaskManager.runAfterTaskComplete(taskIds, function() {
                        console.log('complete');
                        console.log(g.groupId);
                        self.getGroupViewById(g.groupId, function(data) {
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
                            html += '<div>'+data.runResultHTMLLast+'</div>';
                            console.log(html);
                            var subject = 'CloudyRun Report: ' + data.name;
                            self.sendMail(html, subject, data.mail);
                        });
                    });
                }
            });
        });
    },


    // GroupManager.sendMail('xxxx', 'hohoho', 'yunqian@taobao.com');
    sendMail: function(html, subject, address) {
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
            console.log(err||message);
        });
        console.log('mail sented');
    },

    getGroups: function(id, success) {
        var self = this;
        this._findGroups(id, function(docs) {
            // var html = self._render(docs);
            success && success.call(self, docs);
        });
    },

    _save: function(g, success) {
        var self = this;
        g.save(function(err) {
            if (err) {
                util.log('[error] Group saving error!');
                return;
            }
            success && success.call(self, g);
        });
    },

    _validate: function(g) {
        console.log(g);
        if (!g || !g.commands || !g.groupId || !util.isArray(g.commands)) {
            return false;
        }
        return true;
    },

    _findGroups: function(id, success) {
        var filter = id ? {groupId:id} : null;
        Group.find(filter, [], {sort:{date:-1}}, function(err, docs) {
            if (err || !docs) {
                return;
            }
            success && success(docs);
        });
    },

    _render: function(doc) {
        if (!doc) return;
        if (util.isArray(doc)) {
            var self = this;
            var html = '';
            doc.forEach(function(d) {
                html += self._render(d);
            });
            return html;
        }

        var html = '<div class="group" data-groupId='+doc.groupId+'>';
        html += '<h3>Commands:</h3>';
        html += '<div>' + doc.commands.join('<br>') + '</div>';
        doc.results.forEach(function(result) {
            html += '<div class="result">';
            html += '<h4>Date: ' + result.date + '</h4>';
            html += result.taskIds.join('<br>');
            html += '</div>';
        });
        html += '</div>';
        return html;
    },

    _getRunResult: function(rr, success) {
        var tasks = [];
        var TaskManager = require('./task-manager');
        for (var i=0; i<rr.taskIds.length; i++) {
            TaskManager.getTaskViewById(rr.taskIds[i], function(data) {
                tasks.push(data);
                if (tasks.length === rr.taskIds.length) {
                    success({
                        date: rr.date,
                        tasks: tasks
                    });
                }
            });
        }
    },

    _getRunResultHTML: function(data, count) {
        var html = '';
        count = count || data.length;

        for (var i=0; i<count; i++) {
            var d = data[i];
            html += '<h3>'+d.date+'</h3>';
            d.tasks.forEach(function(t) {
                if (t.taskType === 'runTest') {
                    html += '<div class="task">';
                    html += '<div>'+t.command+'</div>';
                    html += t.resultHTML;
                    html += '</div>';
                    var url = global.config.host + 'taskview/' + t.taskId;
                    html += '<div><a href="'+url+'" target="_blank">task detail..</a></div>';
                    html += '<br>';
                }
            });
        }
        return html;
    },

    getGroupViewById: function(id, success) {
        var self = this;
        this._findGroups(id, function(docs) {
            if (!docs || !docs[0]) return;

            var g = docs[0];
            var r = g.results;
            var runResult = [];

            for (var i=0; i<r.length; i++) {
                self._getRunResult(r[i], function(data) {
                    runResult.push(data);
                    if (runResult.length === r.length) {
                        console.log(runResult);
                        runResult = runResult.reverse();
                        var runResultHTML = self._getRunResultHTML(runResult);
                        var runResultHTMLLast = self._getRunResultHTML(runResult, 1);
                        success({
                            layout: false,
                            groupId: g.groupId,
                            name: g.name,
                            runHour: g.runHour || 'null',
                            runMinite: g.runMinite || 'null',
                            mail: g.mail || 'null',
                            date: g.date,
                            commands: g.commands.join('<br>'),
                            runResult: runResult,
                            runResultHTML: runResultHTML,
                            runResultHTMLLast: runResultHTMLLast
                        });
                    }
                });
            }
        });
    },

    _runSchedual: function(g) {
        if (g.runHour && g.runMinite) {
            if (Schedual.instances[g.groupId]) {
                console.log('---');
                console.log(g.groupId);
                console.log(Schedual.instances);
                console.log('---');
                Schedual.instances[g.groupId].cancel();
                delete Schedual.instances[g.groupId];
            }
            new Schedual(g.runHour, g.runMinite, function() {
                GroupManager.exec(g);
            }, g.groupId);
        }
    }
};

GroupManager._findGroups(null, function(docs) {
    console.log(docs);
    docs.forEach(function(doc) {
        GroupManager._runSchedual(doc);
    });
});

// GroupManager.sendMail('<style>.task { border: 1px solid #ccc; margin:5px 0; }.passed { background:green; color:#fff; }</style><div>name: 淘宝首页测试集</div><div>id: A1FEF58C-6130-4D1D-8082-B9E53DD8C259</div><div>mail: yunqian@taobao.com; qiaohua.taobao.com</div><div>commands: :runTest http://www.daily.taobao.net/?__cloudyrun__=/p/test/1.0/spec/fp2011/spec.js&timeout=100000<br>:runTest http://www.daily.taobao.net/index_global.php/?__cloudyrun__=/p/test/1.0/spec/fp2011/spec.js&timeout=100000</div><div>results: </div><div><h3>Thu Jun 09 2011 15:52:19 GMT+0800 (CST)</h3><div class="task"><div>:runTest http://www.daily.taobao.net/?__cloudyrun__=/p/test/1.0/spec/fp2011/spec.js&timeout=100000</div>Chrome13_Mac: <span class="passed">passed</span><br>Safari5_Mac: <span class="passed">passed</span><br></div><div class="task"><div>:runTest http://www.daily.taobao.net/index_global.php/?__cloudyrun__=/p/test/1.0/spec/fp2011/spec.js&timeout=100000</div>Chrome13_Mac: <span class="passed">passed</span><br>Safari5_Mac: <span class="passed">', 'hohoho', 'yunqian <yunqian@taobao.com>, qiaohua <qiaohua@taobao.com>');

module.exports = GroupManager;
