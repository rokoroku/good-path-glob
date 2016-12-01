'use strict';

const Stream = require('stream');
const Hoek = require('hoek');
const Minimatch = require('minimatch');

class PathGlob extends Stream.Transform {

    constructor(events, options) {

        events = events || {};
        Hoek.assert(typeof events === 'object', 'events must be an object');

        options = Object.assign({}, options, { objectMode: true });
        super(options);
        this._subscription = PathGlob.subscription(events);
    }

    _transform(data, enc, next) {

        if (PathGlob.filter(this._subscription, data)) {
            return next(null, data);
        }
        next(null);
    }

    static subscription(events) {

        const result = Object.create(null);
        const subs = Object.keys(events);

        for (let i = 0; i < subs.length; ++i) {
            const key = subs[i];
            const filter = events[key];
            const tags = {};

            if (filter && (filter.include || filter.exclude)) {
                tags.include = PathGlob.toPatternsArray(filter.include);
                tags.exclude = PathGlob.toPatternsArray(filter.exclude);
            }
            else {
                tags.include = PathGlob.toPatternsArray(filter);
                tags.exclude = [];
            }

            result[key.toLowerCase()] = tags;
        }
        return result;
    }

    static toPatternsArray(filter) {

        if (Array.isArray(filter) || (filter && filter !== '*')) {
            const tags = [].concat(filter);

            // Force everything to be a string
            for (let i = 0; i < tags.length; ++i) {
                tags[i] = '' + tags[i];
            }

            return tags;
        }

        return [];
    }

    static filter(subscription, data) {

        const path = data.path;
        const subEventPath = subscription[data.event];

        // If path is empty, skip filtering (not a valid target).
        if (!path) {
            return true;
        }

        // Check event path to see if one of them is in this reports list
        for (const exclude of subEventPath.exclude) {
            if (Minimatch(path, exclude)) {
                return false;
            }
        }

        if (subEventPath.include.length > 0) {
            for (const include of subEventPath.include) {
                if (Minimatch(path, include)) {
                    return true;
                }
            }
            return false;
        }

        return true;
    }
}

module.exports = PathGlob;
