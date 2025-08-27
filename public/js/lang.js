// ====================
// Initialize i18next
// ====================
i18next.init({
  lng: localStorage.getItem("lang") || "en", // load saved lang or default to English
  debug: true,
  fallbackLng: "en", // fallback to English if a key is missing
  resources: {
    en: {
      translation: {
        contacts: "Contacts",
        search_contacts: "Search contacts",
        logout: "Logout",
        select_contact: "Select a contact",
        my_profile: "My Profile",
        username: "Username",
        email: "Email",
        avatar: "Avatar",
        update_profile: "Update Profile",
        avatar_note: "(Avatar upload not implemented in this demo)",
        settings: "Settings",
        desktop_notifications: "Desktop Notifications",
        show_online_status: "Show Online Status",
        message_sounds: "Message Sounds",
        language: "Language",
        dark_mode: "Dark Mode",
        typing: "typing…",
        type_message: "Type a message…",
        send: "Send",
        remove: "Remove"
      }
    },
    sw: {
      translation: {
        contacts: "Mawasiliano",
        search_contacts: "Tafuta mawasiliano",
        logout: "Ondoka",
        select_contact: "Chagua mawasiliano",
        my_profile: "Wasifu Wangu",
        username: "Jina la mtumiaji",
        email: "Barua pepe",
        avatar: "Picha ya wasifu",
        update_profile: "Sasisha Wasifu",
        avatar_note: "(Upakiaji wa picha ya wasifu haujatekelezwa katika demo hii)",
        settings: "Mipangilio",
        desktop_notifications: "Taarifa za Kompyuta",
        show_online_status: "Onyesha Hali ya Mtandaoni",
        message_sounds: "Sauti za Ujumbe",
        language: "Lugha",
        dark_mode: "Hali ya Giza",
        typing: "anaandika…",
        type_message: "Andika ujumbe…",
        send: "Tuma",
        remove: "Ondoa"
      }
    }
  }
}, function(err, t) {
  updateContent();
  // sync dropdown to current lang
  const langSelect = document.getElementById("language-toggle");
  if(langSelect) langSelect.value = i18next.language;
});

// ====================
// Update all text and placeholders
// ====================
function updateContent() {
  document.querySelectorAll("[data-i18n]").forEach(function(el) {
    const key = el.getAttribute("data-i18n");
    // Handle placeholders for inputs or textareas
    if(el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = i18next.t(key);
    } else {
      el.textContent = i18next.t(key);
    }
  });
}

// ====================
// Handle language switching + save preference
// ====================
const langSelect = document.getElementById("language-toggle");
if(langSelect) {
  langSelect.addEventListener("change", function(e) {
    const newLang = e.target.value;
    i18next.changeLanguage(newLang, () => {
      updateContent();
      localStorage.setItem("lang", newLang); // persist language even after logout
    });
  });
}
