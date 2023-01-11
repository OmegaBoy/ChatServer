function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

var room = !getParameterByName('room') ? prompt('Please tell me your room') : getParameterByName('room');
var username = !getParameterByName('username') ? prompt('Please tell me your name') : getParameterByName('username');
var userid = !getParameterByName('userid') ? prompt('Please tell me your ID') : getParameterByName('userid');

var socket = io.connect('http://localhost/', {
	path: "/MWChat/socket.io",
	query: {
        userid: userid,
        username: username
    }
});

socket.on('login', function (data) {
	console.log("SocketID: " + data);
});

socket.emit('connectToRoom', {
	room: room
});

socket.on('connectToRoom', function (data) {
	console.log("Room: " + data);+
	socket.emit('history', {
		room: room
	});
});

socket.on('history', function(data){
	console.log(JSON.stringify(data));
	for (let i = 0; i < data.length; i++) {
		const message = data[i];
		$('#messages').append($('<li>').html('<strong>' + message.username + '</strong>: ' + message.message));
	}
});

$('form').submit(function (e) {
    e.preventDefault(); // prevents page reloading
	if ($('#txt').val().length != 0) {
		var message = {
			message: $('#txt').val(),
			username: username,
			userid: userid,
			room: room
		}
		socket.emit('chat_message', message);
		$('#txt').val('');
	}
	return false;
});

socket.on('chat_message', function (data) {
	console.log('chat_message: ' + JSON.stringify(data));
	$('#messages').append($('<li>').html('<strong>' + data.username + '</strong>: ' + data.message));
});

socket.on('enterRoom', function(data){
    console.log('enterRoom: ' + JSON.stringify(data));
	$('#messages').append($('<li>').html('<strong>' + data + '</strong> Has entered the room'));
});

socket.on('exitRoom', function(data){
    console.log('exitRoom: ' + JSON.stringify(data));
	$('#messages').append($('<li>').html('<strong>' + data + '</strong> Has left the room'));
});

socket.on('disconnectFromRoom',function(data){
    console.log('disconnectFromRoom: ' + JSON.stringify(data));
})

socket.on('notification', function(data){
    alert(data.username + ": " + data.message);
});

socket.on('DEBUG', function(data){
    console.log('DEBUG: ' + JSON.stringify(data));
});

function ExitRoom(){
    socket.emit('disconnectFromRoom', {
        room: room
    });
}

function DEBUG(){
    socket.emit('DEBUG');
}