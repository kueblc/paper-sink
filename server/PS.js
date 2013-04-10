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
	var client = new Client();
	var clientId = client.clientId;
	clients[ clientId ] = client;
	addClientToRoom( clientId, roomId );
	return clientId;
};

// publishes data to the client's room
function send( clientId, data ){
	if(!( clientId in clients )) throw "invalid clientId";
	broadcastToRoom( clientId, data );
};

// waits for data to appear in queue or heartbeat
function poll( clientId, callback ){
	if(!( clientId in clients )) throw "invalid clientId";
	log.debug( "poll from " + clientId );
	var client = clients[ clientId ];
	client.poll( callback );
};

// updates 'clients' and 'rooms', clear timers
function disconnect( clientId ){
	if(!( clientId in clients )) throw "invalid clientId";
	var client = clients[ clientId ];
	client.disconnect();
};

function addClientToRoom( clientId, roomId ){
	var client = clients[ clientId ];
	client.roomId = roomId;
	if( roomId in rooms ){
		rooms[ roomId ].push( clientId );
	} else {
		rooms[ roomId ] = [ clientId ];
		log.notify( "new room " + roomId );
	}
	log.notify( clientId + " joined " + roomId );
};

function broadcastToRoom( clientId, data ){
	var client = clients[ clientId ];
	var roomId = client.roomId;
	var room = rooms[ roomId ];
	log.notify( clientId + " says: " + data );
	for( var i = 0; i < room.length; i++ ){
		var neighbor = room[i];
		clients[ neighbor ].send( data );
	}
};

function removeClientFromRoom( clientId ){
	var client = clients[ clientId ];
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
function Client(){
	var self = this;
	// generate a new clientId utilizing 0..9, a..z
	self.clientId = (++lastUsedId).toString(36);
	
	/* timeout handling */
	var disconnectTimer;
	// schedules disconnect if client is inactive for TIMEOUT
	self.setTimeout = function(){
		clearTimeout( disconnectTimer );
		disconnectTimer = setTimeout( self.disconnect, TIMEOUT );
	};
	self.setTimeout();
	// disable timeout until setTimeout is called again
	self.clearTimeout = function(){
		clearTimeout( disconnectTimer );
	};
	
	// message queue
	var queue = [], pending;
	// queues a message(s) for this client
	self.send = function( data ){
		queue.push( data );
		pending && pending();
	};
	// returns and resets the queue
	self.receive = function(){
		var q = queue;
		queue = [];
		self.setTimeout();
		return q;
	};
	
	// waits for new messages to arrive or timeout
	var pollTimer;
	self.poll = function( callback ){
		self.clearTimeout();
		if( queue.length ){
			callback( self.receive() );
		} else {
			pending = function(){
				clearTimeout( pollTimer );
				log.debug( "pushing to " + self.clientId );
				pending = undefined;
				callback( self.receive() );
			};
			pollTimer = setTimeout( pending, POLL );
		}
	};
	
	// cleans up timers and calls disconnect routine
	self.disconnect = function(){
		self.clearTimeout();
		clearTimeout( pollTimer );
		removeClientFromRoom( self.clientId );
	};
	
	return self;
};

// public API
PS.connect = connect;
PS.send = send;
PS.poll = poll;
PS.disconnect = disconnect;


