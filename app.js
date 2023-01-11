var express = require('express'),
	http = require('http'),
	app = express(),
	server = http.createServer(app),
  	virtualPath = process.env.VIRTUAL_PATH || "/MWChat",
	io = require('socket.io')(server, {path: virtualPath + '/socket.io'}),  
	port = process.env.PORT || 3000;

const sql = require("mssql");
// const connectionString = "server=.;Database=ChatDB;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0};";
const pool = new sql.ConnectionPool({
	user: 'mindware',
	password: 'Mindware3355',
	database: 'ChatDB',
	server: 'localhost',
	driver: 'msnodesqlv8',
	port: 1433,
	options: {
		trustServerCertificate: true
	}
  })

app.use(virtualPath, express.static(__dirname + '/public'));

var users = new Object();

function addRoomToUser(userId, roomId){
	if (users[userId].rooms) {
		if(!users[userId].rooms.includes(roomId)){
			users[userId].rooms.push(roomId);
		}
	}
	else {
		users[userId].rooms = [ roomId ];
	}
}

function removeRoomFromUser(userId, roomId){
	if (users[userId].rooms) {
		if(users[userId].rooms.includes(roomId)){
			const index = users[userId].rooms.indexOf(roomId);
			users[userId].rooms.splice(index, 1);
		}
	}
}

async function SaveHistory(msg){
	const table = new sql.Table('ChatHistory')
	table.create = true
	table.columns.add('userid', sql.VarChar(512), {nullable: false, primary: false})
	table.columns.add('message', sql.VarChar(sql.MAX), {nullable: false, primary: false})
	table.columns.add('username', sql.VarChar(512), {nullable: false, primary: false})
	table.columns.add('datetime', sql.DateTime, {nullable: false, primary: false})
	table.columns.add('room', sql.VarChar(512), {nullable: false, primary: false})

	table.rows.add(msg.userid, msg.message, msg.username, msg.datetime, msg.room)
	
	pool.connect().then(pool => {
		return pool.request().bulk(table)
	}).then(result => {
		console.dir(result)
	}).catch(err => {
		console.dir(err)
	});
}

async function GetHistory(data){
	pool.connect().then(pool => {
		return pool.request()
			.input('room', sql.VarChar(512), data.room)
			.query('SELECT * FROM ChatHistory WHERE room = @room')
		}).then(result => {
			return result.recordset;
		}).catch(err => {
			console.dir(err)
		});
}

io.on('connection', function(socket) {
	socket.username = socket.handshake.query.username;
	socket.userid = socket.handshake.query.userid;
	if(users[socket.userid]) {
		users[socket.userid].ids.push(socket.id);
		if (users[socket.userid].rooms) {
			for (let i = 0; i < users[socket.userid].rooms.length; i++) {
				const room = users[socket.userid].rooms[i];
				socket.join(room);
			}
		}
	}
	else {
		users[socket.userid] = {};
		users[socket.userid].ids = [ socket.id ]
	}
	io.to(socket.id).emit('login', socket.id);

	socket.on('connectToRoom', function(data){
		socket.join(data.room);
		addRoomToUser(socket.userid, data.room);
		io.to(socket.id).emit('connectToRoom', data.room);
		io.sockets.in(data.room).emit('enterRoom', socket.username);
	});

    socket.on('disconnectFromRoom', function(data) {
		socket.leave(data.room);
		removeRoomFromUser(socket.userid, data.room);
		io.to(data.room).emit('disconnectFromRoom', data.room);
		io.sockets.in(data.room).emit('exitRoom', socket.username);
    })

    socket.on('message', function(data) {
		var date = new Date();
		response = {
			userid: socket.userid,
			message: data.message,
			username: socket.username,
			datetime: date.toISOString(),
			payload: data.payload,
			room: data.room
		}
		SaveHistory(response);
		io.sockets.in(data.room).emit('message', response);
	});

	socket.on('chat_message', function(data) {
		var date = new Date();
		response = {
			userid: socket.userid,
			message: data.message,
			username: socket.username,
			datetime: date.toISOString(),
			payload: data.payload,
			room: data.room
		}
		SaveHistory(response);
		io.sockets.in(data.room).emit('chat_message', response);
	});

	socket.on('file', function(data){
		var date = new Date();
		response = {
			username: socket.username,
			userid: socket.userid,
			socketid: socket.id,
			filename: data.filename,
			file: data.file,
			MIMEType: data.MIMEType,
			datetime: date.toISOString(),
			room: data.room
		}
		io.sockets.in(data.room).emit('file', response);
	});
	
	socket.on('history', function(data){
		var history = GetHistory(data);
		socket.emit('history', history);
	});

	socket.on('notification', function(data){
		var userids = users[data.id].ids;
		var date = new Date();
		response = {
			userid: socket.userid,
			message: data.message,
			username: socket.username,
			datetime: date.toISOString()
		}
		for (var i = 0; i < userids.length; i++) {
			io.to(userids[i]).emit('notification', response);
		} 
	});

	socket.on('DEBUG', function(data){
		socket.emit('DEBUG', "DEBUG IDLE");
	});
});

server.listen(port, function(){
	console.dir("Chat Server Started on port: " + port);
});