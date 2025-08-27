// ========================
// Notification Controller
// ========================
const UserNotification = (() => {
    const toggle = document.getElementById('notifications-toggle');

    // Load saved preference
    let enabled = localStorage.getItem('notifications_enabled');
    if (enabled === null) {
        enabled = true; // default enabled
    } else {
        enabled = enabled === 'true';
    }

    // Sync the toggle UI
    if (toggle) toggle.checked = enabled;

    // Listen for toggle changes
    if (toggle) {
        toggle.addEventListener('change', () => {
            enabled = toggle.checked;
            localStorage.setItem('notifications_enabled', enabled);
        });
    }

    // Wrapper for your existing showNotification function
    function notify(message, type = 'info', duration = 3000) {
        if (!enabled) return; // user disabled notifications
        if (typeof showNotification === 'function') {
            showNotification(message, type, duration);
        } else {
            console.warn('showNotification function is not defined!');
        }
    }

    function isEnabled() {
        return enabled;
    }

    return {
        notify,
        isEnabled
    };
})();
