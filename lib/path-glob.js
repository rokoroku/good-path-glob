'use strict';

const Stream = require('stream');
const Hoek = require('hoek');
const Minimatch = require('minimatch').Minimatch;

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
                tags.include = PathGlob.toMinimatchArray(filter.include);
                tags.exclude = PathGlob.toMinimatchArray(filter.exclude);
            }
            else {
                tags.include = PathGlob.toMinimatchArray(filter);
                tags.exclude = [];
            }

            result[key.toLowerCase()] = tags;
        }
        return result;
    }

    static toMinimatchArray(filter) {

        if (Array.isArray(filter) || (filter && filter !== '*')) {
            const patterns = [].concat(filter);

            // Force everything to be a string
            for (let i = 0; i < patterns.length; ++i) {
                patterns[i] = '' + patterns[i];
            }

            return patterns.map((pattern) => new Minimatch(pattern));
        }

        return [];
    }

    static filter(subscription, data) {

        const path = data.path;
        const subEventPatterns = subscription[data.event];

        // If the subscription is empty, block the pipeline.
        if (!subEventPatterns) {
            return false;
        }

        // If the event path is empty, skip filtering (not a valid target).
        if (!path) {
            return true;
        }

        // Check event path to see if one of them is in this reports list
        for (const exclude of subEventPatterns.exclude) {
            if (exclude.match(path, { debug: false })) {
                return false;
            }
        }

        if (subEventPatterns.include.length > 0) {
            for (const include of subEventPatterns.include) {
                if (include.match(path, { debug: false })) {
                    return true;
                }
            }
            return false;
        }

        return true;
    }
}

module.exports = PathGlob;
