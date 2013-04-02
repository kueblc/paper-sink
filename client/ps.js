/* ps.js
 * written by Colin Kuebler 2013
 * Paper-Sink simple message router, client side component
 */

// how long to wait in between AJAX requests
var TIMEOUT = 250;

function PS( roomId, onconnect, onreceive, ondisconnect ){
	var self = this;
	var queue = [];
	self.send = function( data ){
		queue.push( data );
		// update immediately
		if( self.timer ) clearTimeout( self.timer );
		update();
	};
	AJAX( 'connect', JSON.stringify({'roomId':roomId}),
		function( status, text ){
			if( status === 200 ){
				// TODO more error checking
				self.clientId = JSON.parse( text ).clientId;
				// callback
				onconnect();
				// start polling routine
				self.timer = setTimeout( update, TIMEOUT );
			}
		} );
	var update = function(){
		var query = queue.length ?
			JSON.stringify({ 'clientId':self.clientId, 'states':queue }) :
			JSON.stringify({ 'clientId':self.clientId });
		queue = [];
		AJAX( 'update', query,
			function( status, text ){
				if( status === 200 ){
					// TODO more error checking
					var states = JSON.parse( text ).states;
					console.log(states);
					// callback
					for( var i = 0; i < states.length; i++ )
						onreceive( states[i] );
					// schedule next update
					self.timer = setTimeout( update, TIMEOUT );
				}
			} );
	};
	self.disconnect = function(){
		if( self.timer ) clearTimeout( self.timer );
		AJAX( 'disconnect', JSON.stringify({'clientId':self.clientId}),
			function( status, text ){
				if( status === 200 ){
					// callback
					ondisconnect();
				}
			} );
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

