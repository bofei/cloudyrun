/**
 * Config File
 * @author chencheng (sorrycc@gmail.com)
 */


//////////////////////////////////////////////////////////////////
// app

var express = require('express'),
    path = require('path'),
    app = express.createServer(),
    io = require('socket.io'),
    socket = io.listen(app, {log: null});

app.configure(function() {
    // app.use(express.logger({format: ':method :url'}));
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, '../public')));
    app.use(express.static(path.join(__dirname, '../lib')));
});

app.set('view engine', 'jade');
app.set('views', path.join(__dirname, '../views'));

app.start = function() {
    var port = process.env.PORT || 8080;
    this.listen(port);
    console.log('[log] server started at '+port);
};

global.app = app;
global.socket = socket;


//////////////////////////////////////////////////////////////////
// db

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.model('Task', new Schema({
    taskId:       String,
    taskType:     String,
    command:      String,
    client:       Array,
    clientStatus: Array,
    console:      Array,
    date:         Date
}));

global.mongoose = mongoose;
global.Schema = Schema;
global.db = mongoose.connect('mongodb://127.0.0.1/cloudyrun');


//////////////////////////////////////////////////////////////////
// other

global.util = require('./util');
global.uuid = require('node-uuid');

// Ä¬ÈÏ·¿¼äºÅ
global.DEFAULT_ROOM_NAME = 'CLOUDYRUN_DEFAULT_ROOM';

