
var parsersObject = require('../parsers/index.js'),
    parsers = [];

for (var k in parsersObject) {
    parsers.push(parsersObject[k]);
}
parsers.sort(function(a, b) {
    return a.index > b.index;
});

var ParserManager = {

    /**
     * Get Plugin By Name
     */
    getParsers: function() {
        return parsers;
    }

};

module.exports = ParserManager;