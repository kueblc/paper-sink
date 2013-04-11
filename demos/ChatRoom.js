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

// implements a JSON API

server.post( 'connect', function( request, respond ){
	var status = 200, body = {};
	try {
		var obj = JSON.parse( request.data );
		if( !obj.roomId ) throw "no roomId specified"; 
		body.clientId = PS.connect( obj.roomId );
	} catch (e) {
		status = 404;
		log.error(e);
		body.error = e;
	}
	respond( status, 'text/json', JSON.stringify(body) );
} );

server.post( 'send', function( request, respond ){
	var status = 200, body = {};
	try {
		var obj = JSON.parse( request.data );
		if( !obj.clientId ) throw "no clientId specified";
		PS.send( obj.clientId, obj.data );
	} catch (e) {
		status = 404;
		log.error(e);
		body.error = e;
	}
	respond( status, 'text/json', JSON.stringify(body) );
} );

server.post( 'poll', function( request, respond ){
	var status = 200, body = {};
	try {
		var obj = JSON.parse( request.data );
		if( !obj.clientId ) throw "no clientId specified";
		PS.poll( obj.clientId, function( data ){
			body.data = data;
			respond( status, 'text/json', JSON.stringify(body) );
		} );
		// TODO detect client disconnection
		request.on( 'error', function(){
			try {
				PS.disconnect( obj.clientId );
			} catch (f) { }
		} );
	} catch (e) {
		status = 404;
		log.error(e);
		body.error = e;
		respond( status, 'text/json', JSON.stringify(body) );
	}
} );

server.post( 'disconnect', function( request, respond ){
	var status = 200, body = {};
	try {
		var obj = JSON.parse( request.data );
		if( !obj.clientId ) throw "no clientId specified";
		PS.disconnect( obj.clientId );
	} catch (e) {
		status = 404;
		log.error(e);
		body.error = e;
	}
	respond( status, 'text/json', JSON.stringify(body) );
} );

// start the server!
server.init( HOST, PORT );

