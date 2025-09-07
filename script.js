const chatButton = document.getElementById('chat-button');
const chatWindow = document.getElementById('chat-window');
const closeChat = document.getElementById('close-chat');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Open and close chat window
chatButton.addEventListener('click', () => {
    chatWindow.classList.remove('hidden');
});
closeChat.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
});

// Function to send message to your backend
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';

    // Send message to your backend server (UPDATED URL)
    try {
        const response = await fetch('https://pepeurope-ai-chatbot.onrender.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message }),
        });
        const data = await response.json();
        addMessage(data.reply, 'bot');
    } catch (error) {
        console.error('Error:', error);
        addMessage('Sorry, I am having trouble connecting right now.', 'bot');
    }
}

// Function to add message to chat window
function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
}

// Send message on button click or Enter key
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});