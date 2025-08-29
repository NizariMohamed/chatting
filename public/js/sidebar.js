const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});


document.addEventListener("DOMContentLoaded", function() {
    const toggleButton = document.getElementById("toggle-sidebar");
    const sidebar = document.querySelector(".sidebar");

    toggleButton.addEventListener("click", function() {
      sidebar.classList.toggle("hidden");
    });
  });