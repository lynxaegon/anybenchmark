#!/usr/bin/env node
'use strict';

let Metrics = require('./modules/metrics.js')
    , colors = require('colors')
    , async = require('async')
    , path = require('path')
    , os = require('os');

//
// Setup the Command-Line Interface.
//
let cli = require('commander');

cli.usage('[options] ws://localhost')
    .option('-A, --amount <connections>', 'the amount of persistent connections to generate', parseInt, 10000)
    .option('-C, --concurrent <connections>', 'how many concurrent-connections per second', parseInt, 0)
    .option('-M, --messages <messages>', 'messages to be send per connection', parseInt, 1)
    .option('-B, --buffer <size>', 'size of the messages that are send', parseInt, 1024)
    .option('-W, --workers <cpus>', 'workers to be spawned', parseInt, os.cpus().length)
    .option('-G, --generator <file>', 'custom message generators')
    .option('-P, --protocol <file>', 'protocol file')
    .version(require('./package.json').version)
    .parse(process.argv);

//
// Check if all required arguments are supplied, if we don't have a valid url we
// should bail out
//
if (!cli.args.length) return [
    'Thor:'
    , 'Odin is disappointed in you... pity human! You forgot to supply the urls.'
].forEach(function stderr(line) {
    console.error(line);
});

//
// By Odin's beard, unleash thunder!
//
let cluster = require('cluster')
    , workers = cli.workers || 1
    , ids = Object.create(null)
    , concurrents = Object.create(null)
    , connections = 0
    , received = 0
    , robin = [];

cluster.setupMaster({
    exec: path.resolve(__dirname, './modules/worker.js')
    , silent: false
    , args: [
        cli.generator ? path.resolve(process.cwd(), cli.generator) : path.resolve(__dirname, './modules/generator.js'),
        cli.protocol ? path.resolve(process.cwd(), cli.protocol) : path.resolve(__dirname, './protocols/ws.js')
    ]
});

while (workers--) cluster.fork();

Object.keys(cluster.workers).forEach(function each(id) {
    let worker = cluster.workers[id];

    worker.on('message', function message(data) {
        if ('concurrent' in data) concurrents[data.id] = data.concurrent;

        switch (data.type) {
            case 'open':
                metrics.handshaken(data);
                worker.emit('open::'+ data.id);

                // Output the connection progress
                ++connections;
                break;

            case 'close':
                delete ids[data.id];

                metrics.close(data);
                break;

            case 'error':
                delete ids[data.id];

                metrics.error(data);
                break;

            case 'message':
                received++;
                metrics.message(data);
        }

        //
        // Check if we have processed all connections so we can quit cleanly.
        //
        if (!Object.keys(ids).length) process.exit();
    });

    // Add our worker to our round robin queue so we can balance all our requests
    // across the different workers that we spawned.
    robin.push(worker);
});

//
// Output live, real-time stats.
//
function live() {
    let frames = live.frames
        , len = frames.length
        , interval = 100
        , i = 0;

    live.interval = setInterval(function tick() {
        let active = Object.keys(concurrents).reduce(function (count, id) {
            return count + (concurrents[id] || 0);
        }, 0);

        process.stdout.write('\r'+ frames[i++ % len] +' Progress :: '.white + [
            'Created '.white + connections.toString().green,
            'Active '.white + active.toString().green
        ].join(', '));
    }, interval);
}

/**
 * Live frames.
 *
 * @type {Array}
 * @api private
 */
live.frames = [
    '  \u001b[96m??? \u001b[90m'
    , '  \u001b[96m??? \u001b[90m'
    , '  \u001b[96m??? \u001b[90m'
    , '  \u001b[96m??? \u001b[90m'
    , '  \u001b[96m??? \u001b[90m'
    , '  \u001b[96m??? \u001b[90m'
];

/**
 * Stop the live stats from running.
 *
 * @api private
 */
live.stop = function stop() {
    process.stdout.write('\u001b[2K');
    clearInterval(live.interval);
};

//
// Up our WebSocket socket connections.
//
[
    ''
    , 'Thor:                                                  version: '+ cli._version
    , ''
    , 'God of Thunder, son of Odin and smasher of WebSockets!'
    , ''
    , 'Thou shall:'
    , '- Spawn '+ cli.workers +' workers.'
    , '- Create '+ (cli.concurrent || 'all the') + ' concurrent/parallel connections.'
    , '- Smash '+ (cli.amount || 'infinite') +' connections with the mighty Mj??lnir.'
    , ''
    , 'The answers you seek shall be yours, once I claim what is mine.'
    , ''
].forEach(function stdout(line) {
    console.log(line);
});

//
// Metrics collection.
//
let metrics = new Metrics(cli.amount * cli.args.length);

// Iterate over all the urls so we can target multiple locations at once, which
// is helpfull if you are testing multiple loadbalancer endpoints for example.
async.forEach(cli.args, function forEach(url, done) {
    let i = cli.amount
        , completed = 0;

    console.log('Connecting to %s', url);

    //
    // Create a simple WebSocket connection generator.
    //
    let queue = async.queue(function working(id, fn) {
        let worker = robin.shift();

        // Register the id, so we can keep track of the connections that we still
        // need to process.
        ids[id] = 1;

        // Process the connections
        worker.send({ url: url, size: cli.buffer, messages: cli.messages, id: id });
        worker.once('open::'+ id, fn);

        // Add the worker back at the end of the round robin queue.
        robin.push(worker);
    }, cli.concurrent || Infinity);

    // When all the events are processed successfully we should call.. back ;P
    queue.drain = done;

    // Add all connections to the processing queue;
    while (i--) queue.push(url +'::'+ i);
}, function established(err) {
    metrics.established();
});

//
// We are setup, everything is running
//
console.log('');
live();

process.once('SIGINT', function end() {
    robin.forEach(function nuke(worker) {
        try { worker.send({ shutdown: true }); }
        catch (e) {}
    });
});

process.once('exit', function summary() {
    live.stop();
    metrics.established().stop().summary();
});
