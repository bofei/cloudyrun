
function Schedual(hour, minite, func, id) {
    hour = hour * 1;
    minite = minite * 1;

    var self = this;
    var now = new Date();
    var diff;

    diff = hour*60 + minite - (now.getHours()*60 + now.getMinutes());
    diff = diff*60*1000;
    if (diff < 0) {
        diff = 24*60*60*1000 - diff;
    }

    console.log('[log] diff: ' + diff);
    var timer = setTimeout(function() {
        self.func();
    }, diff);

    this.func = function() {
        func();
        self.next();
    };
    this.timer = timer;
    Schedual.instances[id] = this;
}

Schedual.instances = {};

Schedual.prototype.cancel = function() {
    console.log('cancel');
    clearTimeout(this.timer);
};

Schedual.prototype.next = function() {
    var self = this;
    this.timer = setTimeout(self.func, 24*60*60*1000);
};


module.exports = Schedual;


///////////////////////////////////////////
// Example

/*

var s = new Schedual(20, 58, function() {
    console.log('executing');
}, 'hhh');
s.cancel();

console.log(Schedual.instances);
*/

