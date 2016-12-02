'use strict';

// Load modules

const Stream = require('stream');
const Minimatch = require('minimatch').Minimatch;

const Code = require('code');
const Lab = require('lab');

const PathGlob = require('..').PathGlob;

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const describe = lab.describe;
const it = lab.it;

const internals = {
    readStream() {

        const stream = new Stream.Readable({ objectMode: true });
        stream._read = () => { };
        return stream;
    }
};

describe('Squeeze', () => {

    describe('subscription()', () => {

        it('converts *, null, undefined, 0, and false to an empty include/exclude object, indicating all tags are acceptable', { plan: 5 }, (done) => {

            const tags = ['*', null, undefined, false, 0];
            for (let i = 0; i < tags.length; ++i) {

                const result = PathGlob.subscription({ error: tags[i] });

                expect(result.error).to.equal({
                    include: [],
                    exclude: []
                });
            }
            done();
        });

        it('converts a single tag to an include/exclude object', { plan: 1 }, (done) => {

            const result = PathGlob.subscription({ request: 'hapi' });
            expect(result.request).to.equal({
                include: [new Minimatch('hapi')],
                exclude: []
            });
            done();
        });

        it('converts an array to an include/exclude object', { plan: 1 }, (done) => {

            const result = PathGlob.subscription({ request: ['*.hapi', '*.error'] });
            expect(result.request).to.equal({
                include: [new Minimatch('*.hapi'), new Minimatch('*.error')],
                exclude: []
            });
            done();
        });

        it('adds excluded tags to exclude array in map', (done) => {

            const result = PathGlob.subscription({ request: { exclude: ['sensitive'] } });
            expect(result.request).to.equal({
                include: [],
                exclude: [new Minimatch('sensitive')]
            });
            done();
        });
    });

    describe('filter()', () => {

        it('returns false if the subscription does not contain event type', { plan: 1 }, (done) => {

            const subscription = PathGlob.subscription({ request: '*' });
            expect(PathGlob.filter(subscription, { event: 'response', path: 'path/to/response' })).to.be.false();
            done();
        });

        it('returns true if the event is matched', { plan: 2 }, (done) => {

            const subscription = PathGlob.subscription({ request: '*' });
            expect(PathGlob.filter(subscription, { event: 'request', path: 'any/path' })).to.be.true();
            expect(PathGlob.filter(subscription, { event: 'request', path: 'another/path' })).to.be.true();
            done();
        });

        it('returns true if the event path matches glob pattern', { plan: 3 }, (done) => {

            const subscription = PathGlob.subscription({ response: { include: ['/accept/**/true'] } });
            expect(PathGlob.filter(subscription, { event: 'response', path: '/accept/true' })).to.be.true();
            expect(PathGlob.filter(subscription, { event: 'response', path: '/accept/me/true' })).to.be.true();
            expect(PathGlob.filter(subscription, { event: 'response', path: '/accept/me/so/true' })).to.be.true();
            done();
        });

        it('returns false if the event path matches exclude glob pattern', { plan: 3 }, (done) => {

            const subscription = PathGlob.subscription({ response: { exclude: ['/disallow/**/false'] } });
            expect(PathGlob.filter(subscription, { event: 'response', path: '/allow/me/true' })).to.be.true();
            expect(PathGlob.filter(subscription, { event: 'response', path: '/disallow/me/false' })).to.be.false();
            expect(PathGlob.filter(subscription, { event: 'response', path: '/disallow/false' })).to.be.false();
            done();
        });

        it('returns true if the event path matches glob brace pattern', { plan: 4 }, (done) => {

            const subscription = PathGlob.subscription({ response: ['/accept/{1..3}/true'] });
            expect(PathGlob.filter(subscription, { event: 'response', path: '/accept/1/true' })).to.be.true();
            expect(PathGlob.filter(subscription, { event: 'response', path: '/accept/2/true' })).to.be.true();
            expect(PathGlob.filter(subscription, { event: 'response', path: '/accept/3/true' })).to.be.true();
            expect(PathGlob.filter(subscription, { event: 'response', path: '/accept/4/true' })).to.be.false();
            done();
        });

        it('returns true by default', { plan: 1 }, (done) => {

            const subscription = PathGlob.subscription({ request: 'hapi' });
            expect(PathGlob.filter(subscription, { event: 'request' })).to.be.true();
            done();
        });
    });

    it('does not forward events if "filter()" is false', { plan: 1 }, (done) => {

        const stream = new PathGlob({ request: '/allow/*' });
        const result = [];

        stream.on('data', (data) => {

            result.push(data);
        });

        stream.on('end', () => {

            expect(result).to.equal([{
                event: 'request',
                id: 1,
                path: '/allow/me'
            }]);
            done();
        });

        const read = internals.readStream();

        read.pipe(stream);

        read.push({ event: 'request', id: 1, path: '/allow/me' });
        read.push({ event: 'request', id: 2, path: '/do/not/allow/me' });
        read.push(null);
    });

    it('remains open as long as the read stream does not end it', { plan: 1 }, (done) => {

        const stream = new PathGlob({ request: '*' });
        const result = [];

        stream.on('data', (data) => {

            result.push(data);
        });

        stream.on('end', () => {

            expect.fail('End should never be called');
        });

        const read = internals.readStream();

        read.pipe(stream);

        read.push({ event: 'request', id: 1 });
        read.push({ event: 'request', id: 2 });

        setTimeout(() => {

            read.push({ event: 'request', id: 3 });
            read.push({ event: 'request', id: 4 });

            expect(result).to.equal([
                { event: 'request', id: 1 },
                { event: 'request', id: 2 },
                { event: 'request', id: 3 },
                { event: 'request', id: 4 }
            ]);
            done();
        }, 500);
    });

    it('throws an error if "events" not a truthy object', { plan: 2 }, (done) => {

        expect(() => {

            new PathGlob('request');
        }).to.throw('events must be an object');
        expect(() => {

            new PathGlob(1);
        }).to.throw('events must be an object');

        done();
    });

    it('allows empty event arguments', { plan: 1 }, (done) => {

        const stream = new PathGlob(null);

        expect(stream._subscription).to.equal(Object.create(null));
        done();
    });
});
