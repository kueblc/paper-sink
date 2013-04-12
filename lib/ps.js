/* ps.js
 * written by Colin Kuebler 2013
 * Paper-Sink simple message router, client side component
 */

// how long to wait in between AJAX requests in ms
var TIMEOUT = 20;

// where the PS API is being served
var SERVER = 'ps';

function PS( roomId, onconnect, onreceive, ondisconnect ){
	var self = this;
	AJAX( SERVER, JSON.stringify({
		'action': 'connect',
		'roomId': roomId }),
		function( status, text ){
			if( status === 200 ){
				// TODO more error checking
				self.clientId = JSON.parse( text ).clientId;
				// callback
				onconnect();
				// start polling routine
				self.timer = setTimeout( poll, TIMEOUT );
			} else ondisconnect();
		} );
	self.send = function( data ){
		AJAX( SERVER, JSON.stringify({
			'action': 'send',
			'clientId': self.clientId,
			'data': data }),
			function( status, text ){
				if( status !== 200 ) ondisconnect();
			} );
	};
	var poll = function(){
		AJAX( SERVER, JSON.stringify({
			'action': 'poll',
			'clientId': self.clientId }),
			function( status, text ){
				if( status === 200 ){
					// TODO more error checking
					var data = JSON.parse( text ).data;
					// callback
					for( var i = 0; i < data.length; ++i )
						onreceive( data[i] );
					// schedule next update
					clearTimeout( self.timer );
					self.timer = setTimeout( poll, TIMEOUT );
				} else ondisconnect();
			} );
	};
	self.disconnect = function(){
		clearTimeout( self.timer );
		AJAX( SERVER, JSON.stringify({
			'action': 'disconnect',
			'clientId': self.clientId }),
			ondisconnect );
	};
	return self;
};

// cross browser AJAX utility
function AJAX( url, data, callback ){
	// create the request object
	var request = window.XMLHttpRequest ?
		new XMLHttpRequest() :
		new ActiveXObject("Microsoft.XMLHTTP");
	// setup callback to fire when response is fully loaded
	request.onreadystatechange = function(){
		if( request.readyState === 4 )
			callback( request.status, request.responseText );
	};
	// open a POST connection, asynchronous
	request.open( "POST", url, true );
	// send the data, errors will be handled by onreadystatechange
	try {
		request.send( data );
	} catch(e) {}
};

