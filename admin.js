const SUPABASE_URL = "https://llfnlkjogamkqonnelsf.supabase.co";
const SUPABASE_KEY = "sb_publishable_oTSFR8fjnB3FVHswb8qQPg_CW6UjO4G";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    loginMessage.textContent = "ログイン中...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginMessage.textContent = "ログイン失敗：" + error.message;
        return;
    }

    loginMessage.textContent = "ログイン成功！";

    window.location.href = "dashboard.html";
});