// sound-toggle.js
(function() {
    const soundsToggle = document.getElementById('sounds-toggle');

    // Load saved preference
    let messageSounds = localStorage.getItem('sound_enabled');
    if (messageSounds !== null) {
        messageSounds = messageSounds === 'true';
        soundsToggle.checked = messageSounds;
    } else {
        messageSounds = true; // default enabled
        soundsToggle.checked = true;
        localStorage.setItem('sound_enabled', 'true');
    }

    // Update preference when toggle changes
    soundsToggle.addEventListener('change', () => {
        messageSounds = soundsToggle.checked;
        localStorage.setItem('sound_enabled', messageSounds);
    });

    // Expose function to check if sound should play
    window.SoundControl = {
        isEnabled: () => messageSounds
    };
})();
