 // JavaScript for handling file uploads and previews
    const socket = io(); // Ensure socket connection is established

    document.getElementById('file-btn').addEventListener('click', function() {
      document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', async function(event) {
      const files = event.target.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = function(e) {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('image-preview').classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        } else if (file.type.startsWith('audio/')) {
          await sendAudioFile(file);
        }
      }
    });

    document.getElementById('remove-preview').addEventListener('click', function() {
      document.getElementById('image-preview').classList.add('hidden');
      document.getElementById('file-input').value = '';
    });

    document.getElementById('send-form').addEventListener('submit', async function(event) {
      event.preventDefault();
      const messageInput = document.getElementById('message-input').value;
      if (messageInput.trim()) {
        await sendMessage(messageInput); // Send the text message
        document.getElementById('message-input').value = ''; // Clear input
      }
    });

    async function sendAudioFile(file) {
      try {
        const formData = new FormData();
        formData.append('receiver_id', active); // Ensure active is set
        formData.append('audio', file);

        const res = await fetch('/api/messages/audios', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token'), // Include token
          },
        });
        const msg = await res.json();
        renderMsg({ ...msg, sender_id: me.id, status: 'sent' });
        scrollBottom();
      } catch (error) {
        console.error('Error sending audio:', error);
        showNotification('Failed to send audio', 'error');
      }
    }

    async function sendMessage(message) {
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token'), // Include token
          },
          body: JSON.stringify({ receiver_id: active, message }),
        });
        const msg = await res.json();
        renderMsg({ ...msg, sender_id: me.id, status: 'sent' });
        scrollBottom();
      } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
      }
    }
    
    // Ensure renderMsg and other necessary functions are defined
    function renderMsg(msg) {
      const li = document.createElement('li');
      li.className = 'msg ' + (msg.sender_id === me.id ? 'me' : 'them');
      li.innerHTML = `
        ${msg.message ? msg.message : `<audio controls src="${msg.file_url}"></audio>`}
        <time>${new Date(msg.timestamp).toLocaleTimeString()}</time>
      `;
      document.getElementById('messages').appendChild(li);
    }

    function scrollBottom() {
      const messagesEl = document.getElementById('messages');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showNotification(message, type = 'info', duration = 3000) {
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), duration);
    }


 let mediaRecorder;
let audioChunks = [];

const recordButton = document.getElementById('record-button');
const stopButton = document.getElementById('stop-button');
const audioPreview = document.getElementById('audio-preview');

recordButton.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start();
    recordButton.style.display = 'none';
    stopButton.style.display = 'inline';

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = []; // Reset for the next recording

        const audioUrl = URL.createObjectURL(audioBlob);
        audioPreview.src = audioUrl;
        audioPreview.hidden = false;

        try {
            const response = await sendAudioFile(audioBlob);
            renderMsg({ ...response, sender_id: me.id, status: 'sent' });
            scrollBottom();
        } catch (error) {
            console.error('Error sending audio:', error);
            showNotification('Failed to send audio', 'error');
        }

        recordButton.style.display = 'inline';
        stopButton.style.display = 'none';
    };
});

stopButton.addEventListener('click', () => {
    mediaRecorder.stop();
    stopButton.style.display = 'none';
    recordButton.style.display = 'inline';
});


// Update the sendAudioFile function to accept a Blob
async function sendAudioFile(file) {
    try {
        const formData = new FormData();
        formData.append('receiver_id', active);
        formData.append('audio', file);

        const res = await fetch('/api/messages/audios', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
            },
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const msg = await res.json();
        return msg;
    } catch (error) {
        console.error('Error sending audio:', error);
        showNotification('Failed to send audio', 'error');
        throw error;
    }
}