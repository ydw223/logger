var fs = require('fs');
var path = require('path');
var util = require('util');

var Syslog = require('node-syslog');

if (process.env.NODE_ENV != 'production') {
    var log = Syslog.log;
    Syslog.log = function(level, message) {
        log.call(Syslog, level, message);
        console.log(new Date() + ' ' + message);
    };
}

Syslog.init('dahora', Syslog.LOG_PID | Syslog.LOG_ODELAY, Syslog.LOG_LOCAL6);

var Logger = function(name) {
    this.name = name;
};

Logger.EMERG = Syslog.LOG_EMERG;
Logger.ALERT = Syslog.LOG_ALERT;
Logger.CRIT = Syslog.LOG_CRIT;
Logger.ERROR = Syslog.LOG_ERR;
Logger.WARN = Syslog.LOG_WARNING;
Logger.NOTICE = Syslog.LOG_NOTICE;
Logger.INFO = Syslog.LOG_INFO;
Logger.DEBUG = Syslog.LOG_DEBUG;

[
    {tag: 'DEBUG', level: Logger.DEBUG},
    {tag: 'INFO ', level: Logger.INFO},
    {tag: 'NOTI ', level: Logger.NOTICE},
    {tag: 'WARN ', level: Logger.WARN},
    {tag: 'ERROR', level: Logger.ERROR},
    {tag: 'CRIT ', level: Logger.CRIT},
    {tag: 'ALERT', level: Logger.ALERT},
    {tag: 'EMERG', level: Logger.EMERG}
].forEach(function(log) {
    Logger.prototype[log.tag.trim().toLowerCase()] = function(message) {
        write(this.name, log.level, log.tag, message);
    };
});

function write(name, level, tag, message) {
    Syslog.log(level, '[' + tag + '] <' + name + '> ' + getStackTraceOrInspect(message));
}

function getStackTraceOrInspect(message) {
    if (message.stack) {
        return message.stack;
    } else {
        return inspect(message);
    }
}

function inspect(message) {
    if (message instanceof Object) {
        message = util.inspect(message);
    }
    return message;
}

var loggers = {};
var common = new Logger('common');

module.exports = function(key) {
    if (loggers[key]) {
        return loggers[key];
    }

    var dir = key;
    var config = null;

    do {
        var files = fs.readdirSync(dir);

        for (var i = 0, length = files.length; i < length; i++) {
            var file = path.join(dir, files[i]);

            write('logger', Logger.INFO, 'INFO ', 'find  : ' + file);

            if (files[i] == 'package.json' && file != __dirname) {
                write('logger', Logger.INFO, 'INFO ', 'try   : ' + file);

                try {
                    config = require(file);
                    write('logger', Logger.INFO, 'INFO ', 'found : ' + file);
                    break;
                } catch (e) {
                    write('logger', Logger.ERROR, 'ERROR', e);
                }
            }
        }

        if (config || dir == '/') {
            break;
        }
    } while (dir = path.resolve(dir, '..'));
    
    if (!config || !config.name) {
        write('logger', Logger.WARN, 'WARN ', 'warn  : not found');
        return common;
    }

    write('logger', Logger.INFO, 'INFO ', 'load  : ' + config.name);
    write('logger', Logger.INFO, 'INFO ', 'result: ' + JSON.stringify(config));

    return loggers[key] = new Logger(config.name);
};

process.on('uncaughtException', function(error) {
    common.crit(error);
    common.crit((new Error()).stack);
});
