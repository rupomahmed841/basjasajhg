const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Store rooms and their data
const rooms = new Map(); // roomId -> { name, users, messages }

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
}

io.on('connection', (socket) => {
    let currentRoom = null;
    let currentUser = null;

    console.log('User connected:', socket.id);

    socket.on('create room', (data) => {
        console.log('Create room request:', data);
        
        const roomId = generateRoomId();
        const roomData = {
            id: roomId,
            name: data.roomName,
            users: new Set(),
            messages: []
        };

        rooms.set(roomId, roomData);
        console.log('Room created:', roomId, roomData);

        // Send room data back to creator
        socket.emit('room created', {
            roomId: roomId,
            roomName: data.roomName
        });

        // Auto join the room after creating
        joinRoom(socket, {
            roomId: roomId,
            nickname: data.nickname
        });
    });

    socket.on('join room', (data) => {
        console.log('Join room request:', data);
        if (!data.roomId || !data.nickname) {
            socket.emit('join error', { message: 'Invalid room ID or nickname' });
            return;
        }
        joinRoom(socket, data);
    });

    function joinRoom(socket, data) {
        console.log('Processing join room:', data);
        
        const roomData = rooms.get(data.roomId);
        if (!roomData) {
            console.log('Room not found:', data.roomId);
            socket.emit('join error', { message: 'Room not found' });
            return;
        }

        // Leave current room if any
        if (currentRoom) {
            leaveRoom(socket);
        }

        // Join new room
        currentRoom = data.roomId;
        currentUser = data.nickname;
        socket.join(data.roomId);
        roomData.users.add(data.nickname);

        console.log('User joined room:', currentUser, currentRoom);

        // Send success response with room name
        socket.emit('join success', {
            roomId: data.roomId,
            roomName: roomData.name,
            users: Array.from(roomData.users)
        });

        // Send message history
        roomData.messages.forEach(msg => {
            socket.emit('chat message', msg);
        });

        // Notify others
        socket.to(data.roomId).emit('user joined', {
            user: data.nickname,
            users: Array.from(roomData.users)
        });
    }

    function leaveRoom(socket) {
        if (!currentRoom || !currentUser) return;

        const roomData = rooms.get(currentRoom);
        if (roomData) {
            roomData.users.delete(currentUser);
            socket.leave(currentRoom);
            
            io.to(currentRoom).emit('user left', {
                user: currentUser,
                users: Array.from(roomData.users)
            });

            // Clean up empty rooms
            if (roomData.users.size === 0) {
                console.log('Removing empty room:', currentRoom);
                rooms.delete(currentRoom);
            }
        }
    }

    socket.on('typing', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('typing', {
            user: currentUser,
            isTyping: data.isTyping
        });
    });

    socket.on('stop typing', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('stop typing', {
            user: currentUser,
            roomId: currentRoom
        });
    });

    socket.on('chat message', (msg) => {
        if (!currentRoom || !currentUser) {
            console.log('No current room or user for message:', msg);
            return;
        }

        const roomData = rooms.get(currentRoom);
        if (!roomData) {
            console.log('Room not found for message:', currentRoom);
            return;
        }

        const messageData = {
            id: Date.now().toString(),
            sender: currentUser,
            text: msg.text,
            timestamp: new Date().toISOString(),
            edited: false
        };

        // Store message in room history
        roomData.messages.push(messageData);

        // Broadcast to all users in the room
        io.to(currentRoom).emit('chat message', messageData);
    });

    socket.on('edit message', (data) => {
        if (!currentRoom || !currentUser) return;

        const roomData = rooms.get(currentRoom);
        if (!roomData) return;

        const message = roomData.messages.find(m => m.id === data.messageId);
        if (message && message.sender === currentUser) {
            message.text = data.newText;
            message.edited = true;
            message.editedAt = new Date().toISOString();

            io.to(currentRoom).emit('message edited', {
                messageId: data.messageId,
                newText: data.newText,
                editedAt: message.editedAt
            });
        }
    });

    socket.on('delete message', (data) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;

        // Find and remove the message
        const messageIndex = room.messages.findIndex(msg => msg.id === data.messageId);
        if (messageIndex !== -1) {
            room.messages.splice(messageIndex, 1);
            // Broadcast deletion to all users in the room
            io.to(currentRoom).emit('message deleted', { messageId: data.messageId });
        }
    });

    socket.on('get messages', (roomId) => {
        if (rooms.has(roomId)) {
            const roomData = rooms.get(roomId);
            socket.emit('message history', roomData.messages);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        leaveRoom(socket);
        currentRoom = null;
        currentUser = null;
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
