const socket = io();

const cliantsTotal = document.getElementById('cliants-total');
const messageContainer = document.getElementById('message-container');
const nameInput = document.getElementById('name-input');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

socket.on('cliants-total', (data) => {
  cliantsTotal.innerText = `Total clients: ${data}`;
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  const data = {
    name: nameInput.value || 'anonymous',
    message: message,
    dateTime: new Date(),
  };

  socket.emit('message', data);
  addMessageToUI(true, data);
  messageInput.value = '';
}

socket.on('chat-message', (data) => {
  addMessageToUI(false, data);
});

function addMessageToUI(isOwnMessage, data) {
    clearFeedback()
  const element = document.createElement('li');
  element.classList.add(isOwnMessage ? 'message-right' : 'message-left');
  element.innerHTML = `
    <p class="message">
      ${data.message}
      <span>${data.name} : ${moment(data.dateTime).fromNow()}</span>
    </p>
  `;
  messageContainer.appendChild(element);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}


messageInput.addEventListener('focus', (e)=> {
socket.emit('feedback', {
    feedback: `${nameInput.value} is typing...`
})
})
messageInput.addEventListener('keypress', (e)=> {
    socket.emit('feedback', {
        feedback: `${nameInput.value} is typing...`
    })
})
messageInput.addEventListener('blur', (e)=> {
    socket.emit('feedback', {
        feedback: ''
    })
})

socket.on('feedback', (data) => {
    clearFeedback()
    const element = `
    <li class="message-feedback">
        <p class="feedback" id="feedback">${data.feedback}</p>
      </li>
      `
    messageContainer.innerHTML += element
})

function clearFeedback() {
    document.querySelectorAll('li.message-feedback').forEach(element => {
      element.parentNode.removeChild(element);
    });
  }
  