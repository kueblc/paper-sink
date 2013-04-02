/* PS.js
 * written by Colin Kuebler 2013
 * Paper-Sink simple message router, server side component
 */

var log = require('./Logger.js').log('PS-Router'),
	PS = exports;

// auto disconnect timeout in ms
var TIMEOUT = 5000;

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

// publishes 'states' to the client's room
// returns state queue
function update( clientId, states ){
	if(!( clientId in clients )) throw "invalid clientId";
	var client = clients[ clientId ];
	var roomId = client.roomId;
	var room = rooms[ roomId ];
	if( states && states.length ){
		log.notify( clientId + " says: " + states );
		for( var i = 0; i < room.length; i++ ){
			var neighbor = room[i];
		// TODO determine a good reason to skip messages to self
		//	if( neighbor === clientId ) continue;
			clients[ neighbor ].send( states );
		}
	}
	return clients[ clientId ].receive();
};

// updates 'clients' and 'rooms', clear timers
function disconnect( clientId ){
	var client = clients[ clientId ];
	clearTimeout( client.timer );
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
	self.send = function( states ){
		self.queue = self.queue.concat( states );
	};
	// returns the queue
	self.receive = function(){
		// reset timeout
		clearTimeout( self.timer );
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
PS.update = update;
PS.disconnect = disconnect;


