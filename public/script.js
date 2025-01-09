const socket = io();

// Global state
let currentRoomId = null;
let currentNickname = null;
let currentRoomName = null;
let darkMode = false;
let typing = false;
let typingTimeout = null;
let replyingTo = null;

// UI Elements
const elements = {
    initial: document.getElementById('initial-form'),
    createForm: document.getElementById('create-room-form'),
    joinForm: document.getElementById('join-room-form'),
    roomCreated: document.getElementById('room-created'),
    chatContainer: document.getElementById('chat-container'),
    roomIdDisplay: document.getElementById('room-id-display'),
    roomTitleText: document.querySelector('.room-title-text'),
    roomIdText: document.querySelector('.room-id-text'),
    messagesContainer: document.getElementById('messages'),
    messageForm: document.getElementById('message-form'),
    messageInput: document.getElementById('message-input'),
    typingIndicator: document.getElementById('typing-indicator'),
    joinNickname: document.getElementById('join-nickname'),
    roomIdInput: document.getElementById('room-id'),
    createNickname: document.getElementById('create-nickname'),
    newRoomName: document.getElementById('new-room-name')
};

// Room UI Functions
function showCreateRoom() {
    hideAllForms();
    elements.createForm.classList.remove('hidden');
}

function showJoinRoom() {
    hideAllForms();
    elements.joinForm.classList.remove('hidden');
}

function hideAllForms() {
    elements.initial.classList.add('hidden');
    elements.createForm.classList.add('hidden');
    elements.joinForm.classList.add('hidden');
    elements.roomCreated.classList.add('hidden');
    elements.chatContainer.classList.add('hidden');
}

function goBack() {
    hideAllForms();
    elements.initial.classList.remove('hidden');
}

function enterRoom() {
    hideAllForms();
    elements.chatContainer.classList.remove('hidden');
    updateRoomInfo();
}

function updateRoomInfo() {
    if (elements.roomTitleText) {
        elements.roomTitleText.textContent = currentRoomName || 'Chat Room';
    }
    if (elements.roomIdText) {
        elements.roomIdText.textContent = currentRoomId || '';
    }
}

// Room Creation and Joining
function createRoom() {
    const nickname = elements.createNickname.value.trim();
    const roomName = elements.newRoomName.value.trim();
    
    if (!nickname || !roomName) {
        alert('Please enter both nickname and room name');
        return;
    }

    currentNickname = nickname;
    currentRoomName = roomName;
    socket.emit('create room', { nickname, roomName });
}

function joinRoom() {
    const roomId = elements.roomIdInput.value.trim();
    const nickname = elements.joinNickname.value.trim();
    
    if (!roomId || !nickname) {
        alert('Please enter both room ID and nickname');
        return;
    }

    currentNickname = nickname;
    socket.emit('join room', { roomId, nickname });
}

// Message Functions
function sendMessage(e) {
    e.preventDefault(); // Prevent form submission
    
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message || !currentRoomId || !currentNickname) {
        return;
    }

    const messageData = {
        text: message,
        sender: currentNickname,
        roomId: currentRoomId,
        timestamp: new Date().toISOString(),
        replyTo: replyingTo
    };

    socket.emit('chat message', messageData);
    messageInput.value = '';
    replyingTo = null;
    updateReplyUI();
}

function addMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.sender === currentNickname ? 'own-message' : 'other-message'}`;
    messageDiv.id = `message-${msg.id}`;
    messageDiv.setAttribute('data-user', msg.sender);

    // Add message menu for own messages
    if (msg.sender === currentNickname) {
        const menuButton = document.createElement('button');
        menuButton.className = 'message-menu-btn';
        menuButton.innerHTML = '<span class="material-icons">more_vert</span>';
        
        const menuOptions = document.createElement('div');
        menuOptions.className = 'message-menu hidden';
        
        const editButton = document.createElement('button');
        editButton.innerHTML = '<span class="material-icons">edit</span> Edit';
        editButton.onclick = () => startEdit(msg.id);
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<span class="material-icons">delete</span> Delete';
        deleteButton.onclick = () => deleteMessage(msg.id);
        
        menuOptions.appendChild(editButton);
        menuOptions.appendChild(deleteButton);
        
        menuButton.onclick = (e) => {
            e.stopPropagation();
            menuOptions.classList.toggle('hidden');
        };
        
        // Add menu button first
        messageDiv.appendChild(menuButton);
        messageDiv.appendChild(menuOptions);
    }

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const senderName = document.createElement('div');
    senderName.className = 'sender-name';
    senderName.textContent = msg.sender;

    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = msg.text;

    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    const time = formatTime(msg.timestamp);
    messageTime.textContent = msg.edited ? `${time} (edited)` : time;

    messageContent.appendChild(senderName);
    messageContent.appendChild(messageText);
    messageContent.appendChild(messageTime);

    // Add message content after menu button
    messageDiv.appendChild(messageContent);
    elements.messagesContainer.appendChild(messageDiv);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = text;
    elements.messagesContainer.appendChild(messageDiv);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function updateReplyUI() {
    const replyPreview = document.querySelector('.reply-preview');
    if (replyPreview) {
        replyPreview.remove();
    }

    if (replyingTo) {
        const preview = document.createElement('div');
        preview.className = 'reply-preview';
        preview.textContent = `Replying to: ${replyingTo.text}`;
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-reply';
        cancelButton.innerHTML = '<span class="material-icons">close</span>';
        cancelButton.onclick = () => {
            replyingTo = null;
            updateReplyUI();
        };

        preview.appendChild(cancelButton);
        elements.messageForm.insertBefore(preview, elements.messageInput);
    }
}

// Typing indicator functions
function handleTyping() {
    if (!typing) {
        typing = true;
        socket.emit('typing', { isTyping: true });
    }
    
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    typingTimeout = setTimeout(() => {
        typing = false;
        socket.emit('typing', { isTyping: false });
    }, 2000);
}

function showTypingIndicator(user) {
    if (user === currentNickname) return;

    const typingIndicator = elements.typingIndicator;
    const typingUser = typingIndicator.querySelector('.typing-user');
    
    // Update typing user name
    typingUser.textContent = user;
    
    // Show the indicator
    typingIndicator.classList.remove('hidden');
}

function hideTypingIndicator(user) {
    const typingIndicator = elements.typingIndicator;
    const typingUser = typingIndicator.querySelector('.typing-user');
    
    if (typingUser.textContent === user) {
        typingIndicator.classList.add('hidden');
    }
}

// Message editing functions
function startEdit(messageId) {
    const messageDiv = document.getElementById(`message-${messageId}`);
    if (!messageDiv) return;

    const messageContent = messageDiv.querySelector('.message-text');
    const originalText = messageContent.textContent;

    // Create edit input
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = originalText;

    // Create edit actions
    const editActions = document.createElement('div');
    editActions.className = 'edit-actions';

    const saveButton = document.createElement('button');
    saveButton.className = 'save-edit';
    saveButton.textContent = 'Save';
    saveButton.onclick = () => saveEdit(messageId, editInput.value);

    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-edit';
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => cancelEdit(messageId, originalText);

    editActions.appendChild(cancelButton);
    editActions.appendChild(saveButton);

    // Hide original text and show edit input
    messageDiv.classList.add('editing');
    messageContent.style.display = 'none';
    messageContent.parentNode.insertBefore(editInput, messageContent);
    messageContent.parentNode.insertBefore(editActions, messageContent.nextSibling);

    // Focus input
    editInput.focus();
    editInput.select();

    // Handle Enter key
    editInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit(messageId, editInput.value);
        }
    });
}

function saveEdit(messageId, newText) {
    const messageDiv = document.getElementById(`message-${messageId}`);
    if (!messageDiv) return;

    socket.emit('edit message', {
        messageId: messageId,
        newText: newText
    });
}

function cancelEdit(messageId, originalText) {
    const messageDiv = document.getElementById(`message-${messageId}`);
    if (!messageDiv) return;

    const messageContent = messageDiv.querySelector('.message-text');
    const editInput = messageDiv.querySelector('.edit-input');
    const editActions = messageDiv.querySelector('.edit-actions');

    // Remove edit elements
    if (editInput) editInput.remove();
    if (editActions) editActions.remove();

    // Show original text
    messageContent.style.display = '';
    messageDiv.classList.remove('editing');
}

function deleteMessage(messageId) {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (!messageElement) return;

    // Only allow deletion if it's the user's own message
    const isOwnMessage = messageElement.classList.contains('own-message');
    if (!isOwnMessage) return;

    socket.emit('delete message', { messageId });
}

// Socket event handler for edited messages
socket.on('message edited', (data) => {
    const messageDiv = document.getElementById(`message-${data.messageId}`);
    if (!messageDiv) return;

    const messageText = messageDiv.querySelector('.message-text');
    const messageTime = messageDiv.querySelector('.message-time');
    const editInput = messageDiv.querySelector('.edit-input');
    const editActions = messageDiv.querySelector('.edit-actions');

    // Update message text
    messageText.textContent = data.newText;
    messageText.style.display = '';

    // Update time to show edited
    const time = formatTime(new Date().toISOString());
    messageTime.textContent = `${time} (edited)`;

    // Remove edit elements
    if (editInput) editInput.remove();
    if (editActions) editActions.remove();

    messageDiv.classList.remove('editing');
});

// Message menu functions
function toggleMessageMenu(messageId) {
    const allMenus = document.querySelectorAll('.menu-options');
    allMenus.forEach(menu => {
        if (menu.id !== `menu-${messageId}`) {
            menu.classList.add('hidden');
        }
    });

    const menu = document.getElementById(`menu-${messageId}`);
    if (menu) {
        menu.classList.toggle('hidden');
    }

    // Close menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!e.target.closest('.menu-btn') && !e.target.closest('.menu-options')) {
            menu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
        }
    });
}

// Emoji picker
let emojiPicker = null;

function initEmojiPicker() {
    const messageInput = document.getElementById('message-input');
    const emojiButton = document.getElementById('emoji-picker-btn');

    if (!emojiPicker) {
        emojiPicker = new EmojiMart.Picker({
            onEmojiSelect: (emoji) => {
                messageInput.value += emoji.native;
                messageInput.focus();
            },
            theme: darkMode ? 'dark' : 'light'
        });
        
        document.body.appendChild(emojiPicker);
        emojiPicker.style.display = 'none';
        emojiPicker.style.position = 'fixed';
    }
}

function toggleEmojiPicker() {
    if (!emojiPicker) {
        initEmojiPicker();
    }
    
    const isVisible = emojiPicker.style.display === 'block';
    const emojiButton = document.getElementById('emoji-picker-btn');
    const buttonRect = emojiButton.getBoundingClientRect();
    
    if (isVisible) {
        emojiPicker.style.display = 'none';
    } else {
        emojiPicker.style.display = 'block';
        emojiPicker.style.bottom = '80px';
        emojiPicker.style.right = '20px';
    }
}

// Socket Event Handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('room created', (data) => {
    console.log('Room created:', data);
    currentRoomId = data.roomId;
    currentRoomName = data.roomName;
    enterRoom();
});

socket.on('join success', (data) => {
    console.log('Join success:', data);
    currentRoomId = data.roomId;
    currentRoomName = data.roomName;
    enterRoom();
    updateUsersList(data.users);
});

socket.on('join error', (data) => {
    alert(data.message);
});

socket.on('user joined', (data) => {
    addSystemMessage(`${data.user} joined the room`);
    updateUsersList(data.users);
});

socket.on('user left', (data) => {
    addSystemMessage(`${data.user} left the room`);
    updateUsersList(data.users);
});

socket.on('chat message', (msg) => {
    addMessage(msg);
});

socket.on('room not found', () => {
    alert('Room not found. Please check the room ID and try again.');
});

socket.on('typing', (data) => {
    if (data.isTyping) {
        showTypingIndicator(data.user);
    } else {
        hideTypingIndicator(data.user);
    }
});

socket.on('stop typing', (data) => {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator && data.user !== currentNickname) {
        typingIndicator.style.display = 'none';
    }
});

socket.on('message deleted', (data) => {
    const messageElement = document.getElementById(`message-${data.messageId}`);
    if (messageElement) {
        messageElement.remove();
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Message form
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');

    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            sendMessage(e);
        });
    }

    // Typing indicator
    if (messageInput) {
        messageInput.addEventListener('input', handleTyping);
    }

    // Welcome screen buttons
    document.getElementById('show-create-room')?.addEventListener('click', showCreateRoom);
    document.getElementById('show-join-room')?.addEventListener('click', showJoinRoom);

    // Create room form buttons
    document.getElementById('submit-create-room')?.addEventListener('click', createRoom);
    document.getElementById('back-from-create')?.addEventListener('click', goBack);

    // Join room form buttons
    document.getElementById('submit-join-room')?.addEventListener('click', joinRoom);
    document.getElementById('back-from-join')?.addEventListener('click', goBack);

    // Room success screen
    document.getElementById('enter-room-btn')?.addEventListener('click', enterRoom);
    document.getElementById('copy-room-id')?.addEventListener('click', copyRoomId);

    // Chat room buttons
    document.querySelector('#toggle-theme-btn')?.addEventListener('click', toggleTheme);
    document.querySelector('#emoji-picker-btn')?.addEventListener('click', toggleEmojiPicker);
});

// Utility Functions
function copyRoomId() {
    const roomId = elements.roomIdDisplay?.textContent;
    if (roomId) {
        navigator.clipboard.writeText(roomId).then(() => {
            const copyButton = document.querySelector('.room-id-container .icon-button');
            if (copyButton) {
                const icon = copyButton.querySelector('.material-icons');
                icon.textContent = 'check';
                setTimeout(() => {
                    icon.textContent = 'content_copy';
                }, 2000);
            }
        });
    }
}

function updateUsersList(users) {
    const usersText = document.querySelector('.users-text');
    if (usersText) {
        usersText.textContent = `${users.length} ${users.length === 1 ? 'user' : 'users'} online`;
    }
}

// Theme Toggle
function toggleTheme() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    const themeIcon = document.querySelector('.theme-toggle .material-icons');
    if (themeIcon) {
        themeIcon.textContent = darkMode ? 'light_mode' : 'dark_mode';
    }
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    }).replace(/\s/, ''); // Remove space between time and AM/PM
}
