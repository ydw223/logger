var path = require('path');
var Logger = require('./lib/logger');

module.exports = function() {
    delete require.cache[__filename];

    if (!module.parent) {
        return new Logger(__dirname);
    }

    return new Logger(path.dirname(module.parent.filename));
}();
