document.addEventListener('DOMContentLoaded', () => {
    const profileDropdown = document.getElementById('profile-dropdown');
    const meName = document.getElementById('me-name');
    const meEmail = document.getElementById('me-email');
    const meAvatar = document.getElementById('me-avatar');
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const avatarInput = document.getElementById('avatar-input');
    const updateProfileBtn = document.getElementById('update-profile-btn');

    const token = localStorage.getItem('token');
    if (!token) { 
        location.href = '/'; 
        return; 
    }

    // Fetch user profile from backend
    async function fetchUserProfile() {
        try {
            const res = await fetch('/api/users/profile/read', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
    const userData = await res.json();
    localStorage.setItem('me', JSON.stringify(userData));

                console.log(userData.avatar)
    profileUsername.value = userData.username || '';
    profileEmail.value = userData.email || '';

    if (userData.avatar) {
        meAvatar.src = userData.avatar;   // set image
        meAvatar.style.display = 'block'; // ensure visible
    } else {
        meAvatar.src = '/default-avatar.png';                 // fallback
        meAvatar.style.display = 'none';
    }

    if (meName) meName.textContent = userData.username;
    if (meEmail) meEmail.textContent = userData.email;
}
else {
                console.error('Failed to fetch user profile');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    }

    fetchUserProfile();

console.log(meAvatar)
    // Profile update handler (existing code)
    updateProfileBtn.addEventListener('click', async () => {
        const updatedUsername = profileUsername.value.trim();
        const updatedEmail = profileEmail.value.trim();
        const avatarFile = avatarInput.files[0];

        if (!updatedUsername || !updatedEmail) {
            alert('Username and email cannot be empty');
            return;
        }

        const formData = new FormData();
        formData.append('username', updatedUsername);
        formData.append('email', updatedEmail);
        if (avatarFile) formData.append('avatar', avatarFile);

        try {
            const res = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
    const updatedUser = await res.json();
    localStorage.setItem('me', JSON.stringify(updatedUser));
    
    profileUsername.value = updatedUser.username;
    profileEmail.value = updatedUser.email;

    // Directly set avatar
    if (updatedUser.avatar) {
    meAvatar.src = updatedUser.avatar.startsWith('/') ? updatedUser.avatar : '/' + updatedUser.avatar;
    meAvatar.alt = `${updatedUser.username}'s Avatar`;
    meAvatar.style.display = 'block';
    } else {
        meAvatar.src = '/default-avatar.png'; // fallback
        meAvatar.alt = 'Default Avatar';
        meAvatar.style.display = 'block';
    }


    if (meName) meName.textContent = updatedUser.username;
    if (meEmail) meEmail.textContent = updatedUser.email;

    alert('Profile updated successfully');
}
 else {
                console.error(await res.text());
                alert('Failed to update profile');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating profile');
        }
    });
});
