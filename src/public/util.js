
var util = {
    
    /**
     * 获取浏览器信息
     * @param ua {String} navigator.userAgent
     */
    getBrowserInfo: function(ua) {
        var res_m = [/iPad/, /iPhone/, /Android/, /Win/, /Mac/, /Ubunto/, /Linux/];
        var res_d = [
            /MS(?:(IE) ([0-9]\.[0-9]))/,
            /(Chrome)\/([0-9]+\.[0-9]+)/,
            /(Firefox)\/([0-9a-z\.]+)/,
            /(Opera).*Version\/([0-9]+\.[0-9]+)/,
            /Version\/([0-9]+\.[0-9]+).*(Safari)/
        ];

        for (var i=0; i<res_d.length; i++) {
            var md = ua.match(res_d[i]);
            if (!md) continue;

            var result = md.slice(1);
            if (md.toString().indexOf('Safari') >= 0) {
                result = [result[1], result[0]];
            }
            for (var j=0; j<res_m.length; j++) {
                var mm = ua.match(res_m[j]);
                if (mm && mm[0]) {
                    result.push('_'+mm[0]+'');
                    break;
                }
            }
            return result.join('').replace(/\./g, '').replace('0_', '_')
                    .replace('_Win', '');
        }
    },

    /**
     * Get Task Info From Command
     * @param command {String}
     */
    getTaskInfo: function(command) {
        // TODO: get typeInfo from plugins
        var typeInfos = {
            'execScript': {
                run: function(data) {
                    var result;
                    try {
                        result = Client.run(data.commandBody);
                    } catch(e) {
                        result = '[script error] ' + e.message;
                    }
                    log('execScript result: ' + result);
                    emit('updateTask', _.extend(data, {
                        result: result
                    }));
                },
                getResults: function(results) {
                    var ret = '';
                    for (var i=0; i<results.length; i++) {
                        ret += '<p class="js"><span>'+results[i].browser+'</span><b>'+results[i].result+'</b></p>';
                    }
                    return ret;
                }
            },
            'runTest': {
                queue: true,
                run: function(data) {
                    if (data.commandBody.indexOf('http') !== 0) {
                        data.commandBody = 'http://' + data.commandBody;
                    }
                    Client.iframe(data.commandBody, {
                        'taskId': data.taskId
                    });
                },
                getResults: function(results, t) {
                    var ret = '';
                    for (var i=0; i<results.length; i++) {
                        var status = 'running';
                        var content = '';
                        try {
                            var result = JSON.parse(results[i].result);
                            status = result['status'];
                            content = result['result'];
                        } catch(e) {}

                        if (status) {
                            ret += '<p class="browser browser-'+status+'"><span>'+results[i].browser+'</span><b title="'+content+'">'+status+'</b></p>';
                        } else {
                            ret += '<p class="js"><span>'+results[i].browser+'</span><b>'+content+'</b></p>';
                        }
                    }
                    ret += '<p class="detail"><a href="/task/'+t.taskId+'" target="_blank">View Details&gt;&gt;</a></p>';
                    return ret;
                }
            }
        };
        // alias
        typeInfos.run = typeInfos.runTest;

        var m = command.match(/^\:([^\s]+)\s+(.+)/);
        var taskType = 'execScript';
        var commandBody = command;

        if (m) {
            taskType = m[1];
            commandBody = m[2];
        }

        var ret = _.extend({}, typeInfos[taskType], {
            taskType: taskType,
            commandBody: commandBody
        });
        return ret;
    },

    extend: function() {
        var target = arguments[0];
        for (var i=1; i<arguments.length; i++) {
            var o = arguments[i];
            if (o) {
                for (var k in o) {
                    target[k] = o[k];
                }
            }
        }
        return target;
    },
    
    isFunction: function(o) {
        return ({}).toString.call(o) === '[object Function]';
    },
    isObject: function(o) {
        return ({}).toString.call(o) === '[object Object]';
    },
    isArray: function(o) {
        return ({}).toString.call(o) === '[object Array]';
    },
    isString: function(o) {
        return ({}).toString.call(o) === '[object String]';
    }

};

if (typeof module !== 'undefined') {
    module.exports = util;
}
