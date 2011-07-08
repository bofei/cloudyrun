/**
 * @depends jQuery, util.js
 */

var CloudyRun = {
    version: '0.2'
};

(function() {

    window.CloudyRun = {};
    var $ = jQuery;

    var host = 'wiki.ued.taobao.net:8080';
    var scripts = document.getElementsByTagName('script');
    var lastScript = scripts[scripts.length - 1];
    if (lastScript.getAttribute('data-host')) {
        host = lastScript.getAttribute('data-host');
    }

    util.extend(CloudyRun, {

        _config: {},

        _init: function() {
            var url = location.href;
            try {
                util.extend(this._config, {
                    taskId: decodeURIComponent(url.split('taskId=')[1].split('&')[0]),
                    server: decodeURIComponent(url.split('server=')[1].split('&')[0]),
                    sessionId: decodeURIComponent(url.split('sessionId=')[1].split('&')[0]),
                    browser: decodeURIComponent(url.split('browser=')[1].split('&')[0])
                });
            } catch(e) {}
        },

        /**
         * post 数据到 server
         * @param server {String}
         * @param data {Object}
         */
        _post: function(server, data) {
            if (!util.isObject(data)) {
                util.log('[error] post failed: data id not an Object!');
                return;
            }

            var id = 'formPost_'+(+new Date());
            var form = $('<form target='+id+' action="'+server+'" method="post"></form>');
            var iframe = $('<iframe name='+id+' id='+id+' style="display:none;"></iframe>');

            for (var k in data) {
                var hidden = $('<input type="hidden" name="'+k+'" value="'+data[k]+'" />');
                hidden.appendTo(form);
            }

            form.appendTo('body');
            iframe.appendTo('body');
            form.submit();
        },

        /**
         * 配置属性
         * @param options {Object}
         */
        config: function(options) {
            for (var k in options) {
                this._config[k] = options[k];
            }
        },

        /**
         * 发送结果到服务器
         * @param data {String|Object}
         */
        sendResult: function(data) {
            if (util.isString(data)) {
                data = {
                    'result': data
                };
            }

            if (typeof data.status !== 'undefined' && data.status !== 'failed') {
                data.status = data.status ? 'passed' : 'failed';
            }

            data = util.extend({}, this._config, {
                result: encodeURIComponent(JSON.stringify(data))
            });
            
            if (self === top && !(window.opener && location.href.indexOf('__newwindow__') > -1)) {
                var command = encodeURIComponent(':run '+location.href);
                $('<a href="http://'+host+'/?command='+command+'" title="Run In CloudyRun" style="position:fixed;right:10px;top:10px;z-index:1000001;width:32px;height:32px;"><img src="http://img02.taobaocdn.com/tps/i2/T1r3KiXlRcXXXXXXXX-32-32.png" /></a>').appendTo('body');
            } else {
                var server = this._config.server;
                this._post(server + 'post', data);

                if (window.opener) {
                    setTimeout(function() {
                        window.close();
                    }, 500);
                } else {
                    $('<iframe src="'+server+'proxy?taskId='+this._config.taskId+'"></iframe>').appendTo('body');
                }
            }
        }
    });


    // 初始化 CloudyRun
    CloudyRun._init();

})();
