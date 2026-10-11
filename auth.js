window.onload = async () => {
    // Restore saved email if present
    const savedEmail = localStorage.getItem('shop_saved_email');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('remember-me').checked = true;
    }

    // Bypass if already authenticated
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.replace('dashboard.html');
        return; 
    }

    // Reveal UI
    document.getElementById('page-loader').classList.add('hidden');
    document.getElementById('login-ui').classList.remove('hidden');
    document.getElementById('sys-footer').classList.remove('hidden');
};

async function handleLogin(e) {
    e.preventDefault(); 
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    const btn = document.getElementById('login-btn');
    const errorBox = document.getElementById('error-box');

    if (!email || !password) {
        errorBox.innerText = "Please enter both email and password.";
        errorBox.style.display = 'block';
        return;
    }

    btn.innerText = "Authenticating...";
    btn.disabled = true;
    errorBox.style.display = 'none';

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        errorBox.innerText = error.message;
        errorBox.style.display = 'block';
        btn.innerText = "Continue";
        btn.disabled = false;
    } else {
        if (rememberMe) {
            localStorage.setItem('shop_saved_email', email);
        } else {
            localStorage.removeItem('shop_saved_email');
        }
        window.location.replace('dashboard.html');
    }
}
