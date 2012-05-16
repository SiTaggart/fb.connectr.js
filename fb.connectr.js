var fbc = fbc || {};

/**
* A Facebook API wrapper to hopefully make life easier and more expected
* @method fbc.connectr
* @param opts
* @return self
*/
fbc.connectr = function (opts) {

	//default options for the object
	this.options = {
		apiKey: '',
		appSecret: '',
		authToken: '',
		userID: '',
		appStatus: '',
		graphBaseUrl: 'https://graph.facebook.com/me/',
		graphBase: 'https://graph.facebook.com/',
		channelURL: ''
	};

	//reference this for later
	var self = this;

	//extend defaults with user options
	$.extend(this.options, opts);

	/**
	* Mehtod used to authorise an application with facebook
	* @method authApp
	* @for connectr
	* @param opts - Default options used to authorise an app
	*/
	this.authApp = function (opts) {

		//default auth options for scope, what do you need?
		var options = {
			scope: ''
		}
		//extend with users
		$.extend(options, opts);

		//scope options can be found http://developers.facebook.com/docs/reference/api/permissions/

		//Facebook login method, returns a response object. takes scope options for permissions required
		FB.login(function(response) {
			// handle the response
		}, {scope: options.scope});

	}

	/**
	* Method used to revoke the apps permissions for the current user
	* @method revokeApp
	* @for connectr
	*/
	this.revokeApp = function () {
		//Facebook api method, and selecting the revokeauthorisation action
		FB.api({ method: 'Auth.revokeAuthorization' }, function (response) {
			//call the resetApp method which can be override per application. This might reset the ui to pre auth
			self.resetApp();
		});
	}

	/**
	* Method to check the logged in status and auth of the current page for the current user.
	* Can be used at any point in the app flow, not automatically called upon auth
	* @method checkLogin
	* @for connectr
	*/
	this.checkLogin = function () {
		var status;

		//Facebook get login status and auth response for app
		FB.getLoginStatus(handleSessionResponse);

		//callback methos for async login status check
		function handleSessionResponse(response) {
			//grab the connection status
			status = response.status;
			//and set it to the object options
			self.options.appStatus = status;
			//if connected, set the auth token and userID for later use by the app	
			if (status == 'connected') {
				self.options.authToken = response.authResponse.accessToken;
				self.options.userID = response.authResponse.userID;
			}
		}

	}

	/**
	* Method used after an app in successfully authorised. can be overridden by the 
	* constructor to perform more app specific functions
	* @method setApp
	* @for connectr
	*/
	this.setApp = function () {
		alert('do something');
	}

	/**
	* Method used after an app in successfully deauthorised. can be overridden by the 
	* constructor to perform more app specific functions like resetting the ui to pre auth state
	* @method resetApp
	* @for connectr
	*/
	this.resetApp = function () {
		alert('reset something');
	}

	/**
	* Method used to get graph data about the user, from the "me" open graph object
	* Will be the most commonly used for user details like photos and albums
	* @method getGraphData
	* @for connectr
	* @param opts - options to specify type of data and limit
	* url - override url from the base me specific url (https://graph.facebook.com/me/)
	* @return $.ajax object
	*/
	this.getGraphData = function (opts, url) {
		//default options
		var options = {
			type: 'photos',
			limit: '12'
		}
		//extend the options to users
		$.extend(options, opts);

		//choose the base url to call on whether one has been supplied
		var callUrl = (url) ? url : this.options.graphBaseUrl;
		//build the url based on the options and auth token in the object
		callUrl += options.type + '?limit=' + options.limit + '&access_token=' + this.options.authToken;
		//create an ajax object to be returned and handled by the constructor
		var response = $.ajax({
			type: 'POST',
			dataType: 'jsonp',
			url: callUrl
		});
		return response;
	}

	/**
	* Method used to call the open graph but by a specific url
	* @method getGraphDataByUrl
	* @for connectr
	* @param url - to call
	* @return $.ajax object
	*/
	this.getGraphDataByUrl = function (url) {
		//create an ajax object to be return and handled by the constructor
		return $.ajax({
			type: 'GET',
			dataType: 'jsonp',
			url: url
		});
	}

	/**
	* Method used to set the canvas height of the iframe using the facebook api.
	* @method setFrameHeightAuto
	* @for connectr
	* @param opts - facebook specific height and width options supplied in the format of { width: 640, height: 480 }
	*/
	this.setFrameSize = function (opts) {
		//opts can be as { width: 640, height: 480 }
		FB.Canvas.setSize(opts);
	}

	/**
	* Method used to initialise the object
	* @method init
	* @for connecr
	*/
	this.init = function () {

		//facebooks async init function attached to the window.
		window.fbAsyncInit = function() {
			//initialise the SDK with supplied option
			log('fb.init called');
			/*
			FB.init({
				appId      : self.options.apiKey, // App ID
				channelUrl : self.options.channelURL, // Channel File
				oauth	   : true,
				status     : false, // check login status
				cookie     : true, // enable cookies to allow the server to access the session
				xfbml      : true  // parse XFBML
			});
			*/

			//ie hacks
			if($.browser.msie) {
				FB.UIServer.setActiveNode = function (a, b) { FB.UIServer._active[a.id] = b; }; // IE hacks to correct FB bugs -- http://bugs.developers.facebook.net/show_bug.cgi?id=19042 & 20168
				FB.UIServer.setLoadedNode = function (a, b) { FB.UIServer._loadedNodes[a.id] = b; };
			}

			//Facebook event to catch status change in app authorisation. Upon auth, cal the setApp method
			//This is then caught at a later stage in the flow of the app if auth isn't requested immediately
			FB.Event.subscribe('auth.statusChange', function(response){
				//grab the app status
				var status;
				status = response.status;
				//set the app status to the object options
				self.options.appStatus = status;
				//if connected store the auth token and userId to options for later use and set the app
				if (status == 'connected') {
					self.options.authToken = response.authResponse.accessToken;
					self.options.userID = response.authResponse.userID;
					//call the setApp method to perform ui changes with granted access.
					self.setApp();
				}

			});

			//track like events and send events in GA
			FB.Event.subscribe('edge.create', function(targetUrl) {
				_gaq.push(['_trackSocial', 'facebook', 'like', targetUrl]);
			});
			FB.Event.subscribe('edge.remove', function(targetUrl) {
				_gaq.push(['_trackSocial', 'facebook', 'unlike', targetUrl]);
			});
			FB.Event.subscribe('message.send', function(targetUrl) {
				_gaq.push(['_trackSocial', 'facebook', 'send', targetUrl]);
			});
		};
		
	}

	this.init();

	return true;
}