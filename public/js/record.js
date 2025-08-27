let mediaRecorder;
let audioChunks = [];

const recordButton = document.getElementById('record-button');
const stopButton = document.getElementById('stop-button');
const audioPreview = document.getElementById('audio-preview');

recordButton.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start();
    recordButton.disabled = true;
    stopButton.disabled = false;

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = []; // Reset for the next recording

        // Create a URL for the audio blob
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPreview.src = audioUrl;
        audioPreview.hidden = false; // Show audio preview

        // Send the audio file
        const receiverId = active; // Get the current receiver ID
        try {
            const response = await sendAudioFile(receiverId, audioBlob);
            console.log('Audio sent:', response);
            renderMsg({ ...response, sender_id: me.id }); // Update the UI with the new message
        } catch (error) {
            console.error('Error sending audio:', error);
            showNotification('Failed to send audio', 'error');
        }

        recordButton.disabled = false;
        stopButton.disabled = true;
    };
});

recordButton.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start();
    recordButton.style.display = 'none'; // Hide record icon
    stopButton.style.display = 'inline'; // Show stop icon

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = []; // Reset for the next recording

        // Create a URL for the audio blob
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPreview.src = audioUrl;
        audioPreview.hidden = false; // Show audio preview

        // Send the audio file
        const receiverId = active; // Get the current receiver ID
        try {
            const response = await sendAudioFile(receiverId, audioBlob);
            console.log('Audio sent:', response);
            renderMsg({ ...response, sender_id: me.id }); // Update the UI with the new message
        } catch (error) {
            console.error('Error sending audio:', error);
            showNotification('Failed to send audio', 'error');
        }

        recordButton.style.display = 'inline'; // Show record icon again
        stopButton.style.display = 'none'; // Hide stop icon
    };
});

recordButton.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start();
    recordButton.style.display = 'none'; // Hide record icon
    stopButton.style.display = 'inline'; // Show stop icon

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = []; // Reset for the next recording

        // Create a URL for the audio blob
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPreview.src = audioUrl;
        audioPreview.hidden = false; // Show audio preview

        // Send the audio file
        const receiverId = active; // Get the current receiver ID
        try {
            const response = await sendAudioFile(receiverId, audioBlob);
            console.log('Audio sent:', response);
            renderMsg({ ...response, sender_id: me.id }); // Update the UI with the new message
        } catch (error) {
            console.error('Error sending audio:', error);
            showNotification('Failed to send audio', 'error');
        }

        recordButton.style.display = 'inline'; // Show record icon again
        stopButton.style.display = 'none'; // Hide stop icon
    };
});

stopButton.addEventListener('click', () => {
    mediaRecorder.stop();
    stopButton.style.display = 'none'; // Hide stop icon
});

// Update the sendAudioFile function to accept a Blob
async function sendAudioFile(receiverId, audioBlob) {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("receiver_id", receiverId);
    formData.append("audio", audioBlob, 'audio.wav'); // Provide a filename

    const res = await fetch("/api/messages/audios", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });

    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json(); // Return the response as JSON
}