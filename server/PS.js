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

// utility for generating clientIds
var lastUsedId = 1;
function nextId(){
	return lastUsedId++;
};

// creates a Client object
// updates 'clients' and 'rooms'
// schedule disconnect in case of timeout
// returns clientId
function connect( roomId ){
	var client = new Client( roomId );
	var clientId = nextId();
	clients[ clientId ] = client;
	log.debug( (roomId in rooms) ? "connecting to room "+roomId : "new room "+roomId );
	if( roomId in rooms )
		rooms[ roomId ].push( clientId );
	else
		rooms[ roomId ] = [ clientId ];
	// schedule disconnect
	client.timer = setTimeout(
		function(){ disconnect( clientId ); },
		TIMEOUT
	);
	log.notify( "Client " + clientId + " connected" );
	return clientId;
};

// publishes 'states' to the client's room
// reschedules disconnect for timeout protection
// returns state queue
function update( clientId, states ){
	if(!( clientId in clients )) throw "invalid clientId";
	var client = clients[ clientId ];
	// reset timeout
	clearTimeout( client.timer );
	var roomId = client.roomId;
	var room = rooms[ roomId ];
	if( states && states.length ){
		log.debug( "Client " + clientId + " says: " + states );
		for( var i = 0; i < room.length; i++ ){
			var neighbor = room[i];
			if( neighbor === clientId ) continue;
			clients[ neighbor ].send( states );
		}
	}
	// restart timeout
	client.timer = setTimeout(
		function(){ disconnect( clientId ); },
		TIMEOUT
	);
	return clients[ clientId ].receive();
};

// updates 'clients' and 'rooms'
function disconnect( clientId ){
	var client = clients[ clientId ];
	// reset timeout
	clearTimeout( client.timer );
	var roomId = client.roomId;
	var room = rooms[ roomId ];
	// remove client from room
	room.splice( room.indexOf(clientId), 1 );
	// delete client object
	delete clients[ clientId ];
	log.notify( "Client " + clientId + " disconnected" );
};

// class representing a single connected client
function Client( roomId ){
	var self = this;
	// which room this client belongs to
	self.roomId = roomId;
	// timeout timer (implicit)
	//self.timer = 0;
	// message queue
	self.queue = [];
	// queues a message(s) for this client
	self.send = function( states ){
		self.queue = self.queue.concat( states );
	};
	// returns the queue
	self.receive = function(){
		var q = self.queue;
		self.queue = [];
		return q;
	};
	return self;
};

// public API
PS.connect = connect;
PS.update = update;
PS.disconnect = disconnect;


