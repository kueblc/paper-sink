/* ChatRoom.js
 * written by Colin Kuebler 2013
 * Demonstrates PaperSink by implementing a multi-room chat
 */

var log = require('../utils/Logger.js').log('ChatRoom'),
	server = require('../utils/WebServer.js'),
	PS = require('../lib/PS.js');

// where the server is being hosted
var HOST = undefined,
	PORT = 8124;

// serve static files
var PATH = 'chatroom/',
	STATIC = [ 'index.html', 'style.css' ];

for( var i = 0; i < STATIC.length; ++i )
	server.serve( PATH, STATIC[i] );

// serve client side PS library
server.serve( '../lib/', 'ps.js' );

// serve the API
server.post( 'ps', PS.requestHandler );

// start the server!
server.init( HOST, PORT );

