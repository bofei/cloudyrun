(function() {

    var online = document.domain.indexOf('taobao.com') > -1;
    var domain = online ? 'taobao.com' : 'taobao.net';
    var domain2 = online ? 'taobao.com' : 'daily.taobao.net';
    document.domain = domain;

    jasmine.taobao.login = function(username, password) {
        _login(username, password);
    };

    jasmine.taobao.logout = function() {
        _logout();
    };

    function _logout() {
        var img = new Image();
        img.src = 'http://login.'+domain2+'/member/logout.jhtml?f=top&t='+(+new Date());
        setTimeout(function() {
            location.reload();
        }, 1000);
    }

    function _login(username, password) {
        var ifrSrc = 'http://login.'+domain2+'/member/login.jhtml?style=minisimple&from=jianghu' +
                '&full_redirect=&redirect_url='+encodeURI(location.href);
        var ifr = $('<iframe src="'+ifrSrc+'" style="background:#fff;position:absolute;left:0;top:0;"></iframe>');
        ifr.appendTo('body');

        (function() {
            try {
                var doc = ifr[0].contentWindow.document;
                var forms = doc ? doc.getElementsByTagName('form') : null;
                if (!forms || !forms[0]) {
                    setTimeout(arguments.callee, 200);
                    return;
                }

                forms[0]['TPL_username'].value = username;
                forms[0]['TPL_password'].value = password;
                forms[0].submit();
            } catch(e) {
                setTimeout(arguments.callee, 200);
            }
        })();
    }

})();