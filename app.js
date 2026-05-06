document.addEventListener("DOMContentLoaded", () => {

console.log("App JS Loaded");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

const signupUsername = document.getElementById("signupUsername");
const signupPassword = document.getElementById("signupPassword");
const roleSelect = document.getElementById("roleSelect");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");

const USERS = "users";

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS)) || [];
}

function saveUsers(users) {
    localStorage.setItem(USERS, JSON.stringify(users));
}

if (!getUsers().find(u => u.username === "admin")) {
    saveUsers([{ username: "admin", password: "admin123", role: "admin" }]);
}

signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let users = getUsers();
    if (users.find(u => u.username === signupUsername.value)) {
        alert("User exists");
        return;
    }
    users.push({
        username: signupUsername.value,
        password: signupPassword.value,
        role: roleSelect.value
    });
    saveUsers(users);
    alert("Account created!");
});

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let users = getUsers();
    let user = users.find(u =>
        u.username === loginUsername.value &&
        u.password === loginPassword.value
    );
    if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        window.location.href = "dashboard.html";
    } else {
        alert("Wrong login");
    }
});

});