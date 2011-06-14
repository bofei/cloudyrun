
if (typeof socket === 'undefined') {
    alert('[error] socket is undefined!');
}

var TaskManager = {

    /**
     * 添加任务
     */
    add: function(command, client) {
        socket.sendData({
            'messageType': 'addTask',
            'command': command,
            'client': client
        });
    }
};


$('#command').focus();
$('#frm').submit(function() {
    var val = $.trim($('#command').val());

    if (val === '') {
        return false;
    }

    if (val === ':clear') {
        $('#output div.task:not(.task-help)').remove();
        $('#command').val('');
        return false;
    }

    if (val === ':group') {
        $('#group').show();
        socket.sendData({ 'messageType': 'listGroup' });
        $('#command').val('');
        return false;
    }

    if (!$('#browser-list b')[0]) {
        alert('[warn] no client connected!');
        return false;
    }
    
    TaskManager.add(val);
    $('#command').val('');
    return false;
});

$(document).keydown(function(e) {
    if (e.keyCode === 27) {
        $('#group').hide();
    }
});

////////////////////////////////////////////////////////////
// Group

var GroupManager = {
    list: function(data) {
        $('#group-bd').html('');
        data.forEach(function(d) {
            var html = '<div class="group">';
            html += d.name;
            html += '<div class="group-action">';
            html += '<a href="#" class="group-edit">edit</a>';
            html += '<a href="#" class="group-run">run</a>';
            html += '<a href="groupview/'+d.groupId+'" target="_blank"' +
            ' class="group-report">report</a>';
            html += '</div></div>';
            var group = $(html);
            group.data('commands', d.commands);
            group.data('groupId', d.groupId);
            $('#group-bd').append(group);
        });
    },
    add: function() {
        $('#group-bd').
            html('<form id="group-form">'+$('#group-form-fragment').html()+'</form>');
        $('#group-form').bind('submit', this.submit);
    },
    edit: function(data) {
        $('#group-bd').
            html('<form id="group-form">'+$('#group-form-fragment').html()+'</form>');
        var frm = $('#group-form')[0];
        frm['groupname'].value = data.name || '';
        frm['runHour'].value = data.runHour || '';
        frm['runMinite'].value = data.runMinite || '';
        frm['groupId'].value = data.groupId || '';
        frm['mail'].value = data.mail || '';
        var afterEl = $('#commands-label');
        data.commands.forEach(function(command) {
            var el = $('<input name="commands" size="50" value="'+command+'" />');
            var el2 = $('<a href="#" class="command-remove">remove</a>');
            afterEl.after(el);
            el.after(el2);
            afterEl = el2;
        });
        $('#group-form').bind('submit', this.submit);
    },
    submit: function() {
        var frm = $('#group-form')[0];
        var data = {
            name: $.trim(frm['groupname'].value),
            runHour: $.trim(frm['runHour'].value),
            runMinite: $.trim(frm['runMinite'].value),
            mail: $.trim(frm['mail'].value),
            groupId: $.trim(frm['groupId'].value),
            commands: []
        };
        $(frm['commands']).each(function() {
            var val = $.trim(this.value);
            if (val !== '') {
                data.commands.push(val);
            }
        });
        socket.sendData({
            messageType: data.groupId ? 'updateGroup' : 'addGroup',
            data: data
        });
        return false;
    },
    update: function() {}
};

$('#group').click(function(e) {
    var tg = e.target;
    switch (true) {
        case $(tg).hasClass('group-list'):
            socket.sendData({ 'messageType': 'listGroup' });
            break;
        case $(tg).hasClass('group-add'):
            GroupManager.add();
            break;
        case $(tg).hasClass('group-edit'):
            var groupId = $(tg).parent().parent().data('groupId');
            socket.sendData({ 'messageType': 'editGroup', 'groupId': groupId });
            break;
        case $(tg).hasClass('group-run'):
            var groupId = $(tg).parent().parent().data('groupId');
            socket.sendData({'messageType': 'runGroup', 'groupId': groupId});
                /*
            var commands = $(tg).parent().parent().data('commands');
            for (var i=0; i<commands.length; i++) {
                (function() {
                    var command = commands[i];
                    setTimeout(function() {
                        console.log(command);
                        TaskManager.add(command);
                    }, 500*i);
                })();
            } */
            break;
        case $(tg).hasClass('command-remove'):
            $(tg).prev().remove().end().remove();
            break;
        case $(tg).hasClass('command-add'):
            $('#commands-label').parent().find('a.command-remove:last')
.after('<input name="commands" size="50" /><a href="#" class="command-remove">remove</a>');
            break;
    }
});
