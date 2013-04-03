/* PS.js
 * written by Colin Kuebler 2013
 * Paper-Sink simple message router, server side component
 */

var log = require('./Logger.js').log('PS-Router'),
	PS = exports;

// auto disconnect timeout in ms
var TIMEOUT = 500;

// length of long poll in ms
var POLL = 10000;

// maps clientId to Client object
var clients = {};

// maps roomId to list of clientIds
var rooms = {};

// creates a Client object
// updates 'clients' and 'rooms'
// returns clientId
function connect( roomId ){
	var client = new Client( roomId );
	var clientId = client.clientId;
	clients[ clientId ] = client;
	if( roomId in rooms ){
		rooms[ roomId ].push( clientId );
	} else {
		rooms[ roomId ] = [ clientId ];
		log.notify( "new room " + roomId );
	}
	log.notify( clientId + " joined " + roomId );
	return clientId;
};

// publishes data to the client's room
function send( clientId, data ){
	if(!( clientId in clients )) throw "invalid clientId";
	var client = clients[ clientId ];
	var roomId = client.roomId;
	var room = rooms[ roomId ];
	log.notify( clientId + " says: " + data );
	for( var i = 0; i < room.length; i++ ){
		var neighbor = room[i];
		clients[ neighbor ].send( data );
	}
};

// waits for data to appear in queue or heartbeat
function poll( clientId, callback ){
	if(!( clientId in clients )) throw "invalid clientId";
	log.debug( "poll from " + clientId );
	var client = clients[ clientId ];
	clearTimeout( client.timer );
	if( client.queue.length ){
		callback( client.receive() );
	} else {
		client.pending = function(){
			clearTimeout( client.longpoll );
			log.debug( "pushing to " + clientId );
			client.pending = undefined;
			callback( client.receive() );
		};
		client.longpoll = setTimeout( client.pending, POLL );
	}
};

// updates 'clients' and 'rooms', clear timers
function disconnect( clientId ){
	if(!( clientId in clients )) throw "invalid clientId";
	var client = clients[ clientId ];
	clearTimeout( client.timer );
	clearTimeout( client.longpoll );
	var roomId = client.roomId;
	var room = rooms[ roomId ];
	// remove client from room
	room.splice( room.indexOf(clientId), 1 );
	// delete client object
	delete clients[ clientId ];
	log.notify( clientId + " left " + roomId );
	// clean up empty rooms
	if( !room.length ){
		delete rooms[ roomId ];
		log.notify( "closed room " + roomId );
	}
};

// guarantee unique clientIds by keeping track of last used
var lastUsedId = 0;

// class representing a single connected client
function Client( roomId ){
	var self = this;
	// generate a new clientId utilizing 0..9, a..z
	self.clientId = (++lastUsedId).toString(36);
	// which room this client belongs to
	self.roomId = roomId;
	// shortcut to self disconnect
	self.disconnect = function(){ disconnect( self.clientId ); };
	// schedule disconnect in case of timeout
	self.timer = setTimeout( self.disconnect, TIMEOUT );
	// message queue
	self.queue = [];
	// queues a message(s) for this client
	self.send = function( data ){
		self.queue.push( data );
		self.pending && self.pending();
	};
	// returns the queue
	self.receive = function(){
		var q = self.queue;
		self.queue = [];
		// restart timeout
		self.timer = setTimeout( self.disconnect, TIMEOUT );
		return q;
	};
	return self;
};

// public API
PS.connect = connect;
PS.send = send;
PS.poll = poll;
PS.disconnect = disconnect;


