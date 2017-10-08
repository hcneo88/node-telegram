// Reference : https://core.telegram.org/bots/samples
// https://github.com/yagop/node-telegram-bot-api
// https://github.com/hosein2398/node-telegram-bot-api-tutorial

//********************************************************************************************************************************************
// Telegram MQTT-Sensor Integration
// Revision History :
// Date : 
// (1) 6 Oct 2017 (initial release)
// (2) 7 Oct 2017  :
//  Added MP3 player.
//CUSTOMIZATION SPECIFICATIONS  - Search for *** DEFINE ***
// (a) Identify the MQTT topic emitted as acknowlegement from the sensor and define them in "mqttClient.Connect" as subscribed message
// (b) Define MQTT message handling for the subscribed message
// (c) Define bot commmand - 2 modes in bot.onText API //     
// (d) Define bot message handler 
//     (i) inline keyboard  -  Telegram transmits query_callback message 
//     (ii) keyboard - Telegram transmits message to be handled in bot.on API.   
//********************************************************************************************************************************************
// Available command for Telegram BOT WebThingsCC
// /start		: start the bot
// /relay		: Control WEMOS Relay
// /radio		: Control WEMOS Analog FM Radio
// /music		: Control WEMOS MP3 player
// /inlinekeyboard : turns on inline keyboard mode.  Paramter : on | off

const config = require('./settings.js');
//var contains = require('./node_modules/lodash/collection/contains');   //Usage : _.contains([1, 2, 3], 3);

//var mqtt = require('/apps/nodejs/npm-g/node_modules/mqtt');
var mqtt = require('mqtt');
var mqttClient  = mqtt.connect('mqtt://webthings.duckdns.org');								      
var isMQTTConnected = false;
var botChatId = 0 ;    
var inlineKeyboard = false;

const TelegramBot = require('node-telegram-bot-api'); 
const bot = new TelegramBot(config.token, {polling: true});

function isAdmin(id) {
	return (id == config.botOwnerChatId) ;
}

function isAuthorized(id) {
	return true ;
};

//http://codebzrk.com/2016/12/11/inline-keyboard-telegram-bot/
function keyboardMarkUp(btn, type) {  //type : inline_keyboard | keyboard ;  btn = Array of button attributes
	
	var keyboard ;	
	var markup;	
	markup = '{"reply_markup" :{ "' + type  + '": [' + btn +  ']}}';
	keyboard = JSON.parse(markup) ;
	return keyboard ;
	
}

bot.sendMessage(
	config.botOwnerChatId , 
    "WebThings BOT restarted.  To begin, issue /start command." 
/*	,{ "reply_markup": {
						"keyboard": [[{"text":"/start"}]]
					  }
	} */
) 
			

//bot.sendContact(config.chatId, "96652494", "Neo");

// (a) *** DEFINE ***
mqttClient.on('connect', function () {
  
  //FM Radio Frequency Webthings
  mqttClient.subscribe('/espDev/741648/cmd/fm/setfrequency');
  mqttClient.subscribe('/espAck/espDev/741648/cmd/fm/setfrequency/#');
  
  //Relay.  Get Status
  mqttClient.subscribe("/3975860/relayStatus");   //GetRelay Status
  
  // Music. Get Status
  mqttClient.subscribe("/espAck/espDev/740256/cmd/mp3/#") ;
  
  
  isMQTTConnected = true;
})

mqttClient.on('disconnect', function () { 
   isMQTTConnected = false;
   console.log('Connection to MQTT broken.');
});

// (b) *** DEFINE ***
mqttClient.on('message', function (topic, message) { 
   //console.log(topic) ;  
   console.log(message.toString()); 
   
   // For radio station selection
  if (topic.indexOf("espAck/espDev/741648") > 0 & message.indexOf("Tuned") > 0 ) {
    if (botChatId > 0) {
	   bot.sendMessage(botChatId, message.toString()); 
	   //botChatId = 0 ;
	};	
	return ;
  };
  
  // For relay Control = Get Status
  if (topic.indexOf ("relayStatus") > 0) {
    if (botChatId > 0) {
	   retMsg = "Relay Status:" +   message.toString() ;
	   bot.sendMessage(botChatId, retMsg); 	   
	}; 
	return ;
  };
  
  if (topic.indexOf("espAck/espDev/740256") > 0   && message.indexOf("mqttCB") < 0) {
	if (botChatId > 0) {
	   retMsg = "Music Status:" +   message.toString() ;
	   bot.sendMessage(botChatId, retMsg);
	}
	
  } ;
  
});

bot.onText(/\/start/, (msg) => {
    if (! isAuthorized) return ;
	retMsg = "Availble commands:" + "\r\n" ;
	retMsg = retMsg + "/start : initiate menu display" + "\r\n" ;
	retMsg = retMsg + "/inlinekeyboard on|off: turn on|off inline keyboard" + "\r\n" ;
	bot.sendMessage(msg.chat.id, retMsg) ;
	botChatId = msg.chat.id ;
});

bot.onText(/\/inlinekeyboard/, (msg) => {
	if (! isAdmin(msg.chat.id)) 
		return ;
		
	if (msg.text.indexOf(" on") > 0) {
			inlineKeyboard = true ;			
	} else 
		{
			if (msg.text.indexOf(" off") > 0){
				inlineKeyboard = false ;								
			} else {
				bot.sendMessage(msg.chat.id, "Please use valid settings : on | off") ;			
				return ;
			} ;
		};
		
	bot.sendMessage(msg.chat.id, "Configuration done.");	
	
}) ;

//*** (c) DEFINE ***
// To model after radio command.  See below
// bot.onText() 

bot.onText(/\/relay/, (msg) => {
	if (! isAuthorized) return ;
	
	if (inlineKeyboard) { // / reply_markup => (a) "keyboard" :  Message Generatd.  (b) "inline_keyboard" : callback_query is triggered
		bot.sendMessage(msg.chat.id, "Relay Control", {	
			"reply_markup": {
				"inline_keyboard": [[{"text":"Toggle Relay",       "callback_data":"Toggle Relay"}]]
			}
		});
	} else {
		bot.sendMessage(msg.chat.id, "Relay Control", {	
			"reply_markup": {
					"keyboard": [[{"text":"Toggle Relay",       "callback_data":"Toggle Relay"}]]
			}
		});
	}	;	
	
}) 

bot.onText(/\/radio/, (msg) => {
    if (! isAuthorized) return ;
	
	if (inlineKeyboard) { // / reply_markup => (a) "keyboard" :  Message Generatd.  (b) "inline_keyboard" : callback_query is triggered
		bot.sendMessage(msg.chat.id, "Radio Stations", {	
			"reply_markup": {
				"inline_keyboard": [
					[   {"text":"GOLD",       "callback_data":"90.5"},
						{"text":"Kiss",       "callback_data":"92.0"},
						{"text":"Symphony",   "callback_data":"92.4"}
					],   
					[	{"text":"Y.E.S",      "callback_data":"93.3"},
						{"text":"Live",       "callback_data":"93.8"},
						{"text":"Class 95FM", "callback_data":"95.0"}
					], 
					[	{"text":"Capital",    "callback_data":"95.8"},
						{"text":"Love",       "callback_data":"97.2"},
						{"text":"UFM",        "callback_data":"100.3"}
					]
				]
			}
		});
    } else { 
		bot.sendMessage(msg.chat.id, "Radio Stations", {	
			"reply_markup": {
					"keyboard": [
						[   {"text":"GOLD",       "callback_data":"90.5"},
							{"text":"Kiss",       "callback_data":"92.0"},
							{"text":"Symphony",   "callback_data":"92.4"}
						],   
						[	{"text":"Y.E.S",      "callback_data":"93.3"},
							{"text":"Live",       "callback_data":"93.8"},
							{"text":"Class 95FM", "callback_data":"95.0"}
						], 
						[	{"text":"Capital",    "callback_data":"95.8"},
							{"text":"Love",       "callback_data":"97.2"},
							{"text":"UFM",        "callback_data":"100.3"}
						]
					]
			}
		});
	}
});

bot.onText(/\/music/, (msg) => {
    if (! isAuthorized) return ;
	
	var command = 	' [ {"text":"Prev",       "callback_data":"prev"},   			\
						{"text":"Play",       "callback_data":"play"},			   	\
						{"text":"Next",       "callback_data":"next"}				\
					   ],															\
					   [{"text":"Pause",      "callback_data":"pause"},  			\
						{"text":"Resume",     "callback_data":"resume"}  			\
					   ],											     			\
					   [ {"text":"VolumeUp",   "callback_data":"volumeup"},			\
						{"text":"VolumeDown",   "callback_data":"volumedown"}		\
					   ]'
					 
	
	if (inlineKeyboard) { // / reply_markup => (a) "keyboard" :  Message Generatd.  (b) "inline_keyboard" : callback_query is triggered
		bot.sendMessage(msg.chat.id, "Music Jukebox", keyboardMarkUp(command, "inline_keyboard"));
    } else { 
		bot.sendMessage(msg.chat.id, "Music Jukebox", keyboardMarkUp(command, "keyboard"))
	}
});

bot.onText(/\/setfreq/, (msg) => {
	if (! isAuthorized) return ;
	
	console.log(msg.text.slice(9)) ;
	if (! isNaN(parseFloat(msg.text.slice(9)))) {
		freq =  parseFloat(msg.text.slice(9)) ;
		json = '{"freq":' + freq + '}' ;
		mqttClient.publish('/espDev/741648/cmd/fm/setfrequency', json) ;
	}
}) ;

bot.on("callback_query", function(msg) {    //This functions get called when the reply_markup = inline_keyboard. Telegram does not send messag 
	
   console.log(msg) ;
// *** (d)(i) DEFINE ***
	switch (msg.message.text) {
		
		case  	"Radio Stations" 		:    //defined in the sendMessage 2nd paramter with reply_markup of type inline_keyboard.
					console.log(msg.data);	
					json = '{"freq":' + msg.data + '}' ;
					mqttClient.publish('/espDev/741648/cmd/fm/setfrequency', json) ;	
					var retMsg = "Tuning to " + msg.data + " MHZ" ;
					bot.answerCallbackQuery(msg.id, retMsg) ;  //Very Importantot
					return;		
		
		case	"Music Jukebox"			: 
					console.log("Jukebox");
					topic = "/espDev/740256/cmd/mp3/"  + msg.data ;
					msg = '{"cmd":"' + msg.data  + '"}'    // Not used.  but needed by API convention
					mqttClient.publish(topic,msg) ;
					var retMsg = "Issued command :" + msg.data ;
					bot.answerCallbackQuery(msg.id, retMsg) ;
					return ;
		
		case 	"Relay Control"			:     //defined in the sendMessage 2nd paramter with reply_markup of type inline_keyboard					
					mqttClient.publish("/3975860/relayCtrl", "1");
					bot.answerCallbackQuery(msg.id,  "Toggled") ;
					return ;			

		
	} ;
	
});
 

bot.on('message', (msg) => {
 
    botChatId  = msg.chat.id ;   //Used in MQTT onMessage.
	
	//console.log(msg);
	
	var topic = "";
	var freq = 0.0 ;
	switch (msg.text) {   
		
		//response when reply_markup = keyboard for command /radio
		case "GOLD" 			: 	freq = 90.5 ;
									break;
		case "Kiss" 			: 	freq = 92.0 ;
									break;
		case "Symphony" 		: 	freq = 92.4 ;
									break;
		case "Y.E.S" 			: 	freq = 93.3 ;
									break;
		case "Live" 			: 	freq = 93.8 ;
									break;
		case "Class 95FM" 		: 	freq = 95.0 ;
									break;
		case "Capital" 			: 	freq = 95.8 ;
									break;
		case "Love" 			: 	freq = 97.2;
									break;
		case "UFM" 				: 	freq = 100.3  ;
									break;				//The above will flow into freq > 0.0 logic below.
		
		//response when reply_markup = keyboard for command /music
		case "Play" 			:	topic = "/espDev/740256/cmd/mp3/play"  
									msg = '{"cmd":"play"}'    				// Not used.  but needed by API convention									
									break ;

		case "Pause"			:	topic = "/espDev/740256/cmd/mp3/pause"  
									msg = '{"cmd":"pause"}'    				// Not used.  but needed by API convention									
									break ;
		
		case "Resume"			:	topic = "/espDev/740256/cmd/mp3/resume"  
									msg = '{"cmd":"resume"}'    				// Not used.  but needed by API convention									
									break ;
									
		case "Next"				:	topic = "/espDev/740256/cmd/mp3/next"  
									msg = '{"cmd":"next"}'    				// Not used.  but needed by API convention									
									break ;
		
		case "Prev"				:	topic = "/espDev/740256/cmd/mp3/prev"  
									msg = '{"cmd":"prev"}'    				// Not used.  but needed by API convention									
									break ;
		
		case "VolumeUp"			:	topic = "/espDev/740256/cmd/mp3/volume"  
									msg = '{"volctrl":"up"}'    				//NEED TO HAVE THE CORRECT JSON 								
									break ;		
									
		case "VolumeDown"		:	topic = "/espDev/740256/cmd/mp3/volume"  
									msg = '{"volctrl":"down"}'    				//NEED TO HAVE THE CORRECT JSON 									
									break ;						// The above will flow into topic != ""
		
		//response when reply_markup = keyboard for command /relay
		case "Toggle Relay" 	:	mqttClient.publish("/3975860/relayCtrl", "1");
								    return ;
									
		// *** (d)(ii) DEFINE ***								
	}
	
	
	if (freq > 0.0) {		
		console.log(freq) ;
		json = '{"freq":' + freq + '}' ;
		mqttClient.publish('/espDev/741648/cmd/fm/setfrequency', json) ;
	}
	
	if (topic != "") {
		mqttClient.publish(topic,msg) ;	
	}
	
 
//bot.sendMessage(msg.chat.id,"Hello dear user");
}) ; 
    
