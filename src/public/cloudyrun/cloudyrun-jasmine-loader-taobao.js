
(function() {

    var $ = jQuery;
    var SPLITER = '__cloudyrun__=';
    var spec;
    try {
        spec = location.href.split(SPLITER)[1].split('&')[0];
    } catch(e) {}

    if (!CloudyRun || !spec) {
        return;
    }

    var nick = getCookie('_nk_');
    var tracknick = getCookie('tracknick');
    var isLogin = !!(getCookie('_l_g_') && nick || getCookie('ck1') && trackNick);

    switch(spec) {
        case 'ui/build':
            buildLayoutUI();
            break;
        default:
            spec = buildPath(spec);
            CloudyRun.runJasmine(spec, function() {
                var loginInfo = jasmine.taobao.config.login;
                if (loginInfo === false && isLogin) {
                    jasmine.taobao.logout();
                    return false;
                } else if (util.isString(loginInfo) && loginInfo.split(':').length === 2) {
                    var username = loginInfo.split(':')[0];
                    var password = loginInfo.split(':')[1];
                    if (!isLogin || (nick || tracknick) !== username) {
                        jasmine.taobao.login(username, password);
                        return false;
                    }
                }
                return true;
            });
            break;
    }


    ////////// Helper //////////

    function buildLayoutUI() {
        var html = '<form draggable=t\rue id="cloudyrun-ui-build-form" style="position:absolute;width:410px;left:50%;background:#fff;' +
                'margin-left:-210px;top:100px;border:3px solid lightgreen;padding:10px;' +
                'border-radius:10px;box-shadow:0 0 10px lightgray;z-index:99999;">' +
                '<h2 style="font:bold 18px/1.5 arial;margin:5px 0 10px;">Get Layout Data</h2>' +
                '<div><textarea style="width:400px;height:70px;" placeholder="include selector, separated by comma or linebreak"></textarea></div>' +
                '<div><textarea style="width:400px;height:70px;" placeholder="exclude selector, separated by comma or linebreak"></textarea></div>' +
                '<div><button type="submit">Build</button></div>' +
                '<br>' +
                '<div><textarea style="width:400px;height:120px;" placeholder="output"></textarea></div>' +
                '</form>';
        var form = $(html);
        var textareas = $('textarea', form);
        var include = textareas[0];
        var exclude = textareas[1];
        var output  = textareas[2];
        $(form).submit(function() {
            var i = include.value.replace(/,/g, '\n').split('\n');
            var e = exclude.value.replace(/,/g, '\n').split('\n');
            e.push('#cloudyrun-ui-build-form > div');
            output.value = jasmine.getLayout(i, e);
            return false;
        });

        form.bind('dragend', function(e) {
            $(this).css({
                left: e.pageX,
                top: e.pageY - $(this).height(),
                marginLeft: 0,
                marginTop: 0
            });
        });
        form.appendTo('body');
    }

    function buildPath(path) {

        if (path.indexOf('http://') === 0) {
            return path;
        }

        var base = '/p/cloudy/1.0/spec/', ret = [],
            get = function(a, b) {
                // spec completion
                if (a.lastIndexOf('.js') !== a.length - 3) {
                    a = a + '/spec.js';
                }

                if (a.indexOf('/') !== 0) {
                    if (a.indexOf('./') === 0) {
                        a = a.replace('./', '');
                    }
                    while (a.indexOf('../') === 0) {
                        a = a.replace('../', '');
                        b = b.replace(/[^\/]+\/?$/, '');
                    }
                    a = b + a;
                }
                a = a.replace('spec/spec/', 'spec/');
                if (a.indexOf('http://') === -1) {
                    a = a.replace(/\/\//g, '/');
                }
                a = a.replace(/^\//, '');
                return a;
            };

        if (path.indexOf('||') > -1) {
            path = path.split('||');
            base = path[0];
            path = path[1];
        }

        if (path.indexOf('~/') === 0) {
            var p = location.href.split('?')[0];
            base = p.slice(0, p.lastIndexOf('/')+1);
            path = path.replace('~/', '');
        }

        path = path.split(',');
        for (var i=0; i<path.length; i++) {
            ret.push(get(path[i], base));
        }

        ret = ret.join(',');
        if (ret.indexOf('http://') === -1) {
            ret = 'http://assets.daily.taobao.net/' + ret;
        }

        return ret;
    }

    function getCookie(name) {
        var m = document.cookie.match('(?:^|;)\\s*' + name + '=([^;]*)');
        return m && m[0] ? decodeURIComponent(m[1]) : '';
    }

})();