/* Init.js
 * written by Colin Kuebler 2013
 * Main entry point for the PaperSink server
 */

var log = require('./Logger.js').log('PaperSink'),
	server = require('./WebServer.js'),
	PS = require('./PS.js');

// where the server is being hosted
var HOST = undefined,
	PORT = 80;

// serve static files
var PATH = 'client/',
	STATIC = [ 'index.html', 'style.css', 'ps.js' ];

for( var i = 0; i < STATIC.length; ++i )
	server.serve( PATH, STATIC[i] );

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

server.post( 'update', function( request, respond ){
	var status = 200, body = {};
	try {
		var obj = JSON.parse( request.data );
		if( !obj.clientId ) throw "no clientId specified";
		if( !obj.states ) obj.states = []; 
		body.states = PS.update( obj.clientId, obj.states );
	} catch (e) {
		status = 404;
		log.error(e);
		body.error = e;
	}
	respond( status, 'text/json', JSON.stringify(body) );
} );

server.post( 'disconnect', function( request, respond ){
	var status = 200, body = {};
	try {
		var obj = JSON.parse( request.data );
		if( !obj.clientId ) throw "no clientId specified";
		PS.disconnect( obj.clientId );
		body.success = true;
	} catch (e) {
		status = 404;
		log.error(e);
		body.error = e;
	}
	respond( status, 'text/json', JSON.stringify(body) );
} );

// start the server!
server.init( HOST, PORT );

