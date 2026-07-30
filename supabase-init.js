// 1. Load the Supabase CDN dynamically so you don't have to put it in every HTML file's <head>
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
document.head.appendChild(script);

let supabaseClient;

script.onload = () => {
    // 2. INITIALIZE CONNECTION (Replace with your actual keys)
        const supabaseUrl = 'https://rgwuqnmgphyjwioixgcu.supabase.co';
        const supabaseKey = 'sb_publishable_vSHVnLeJEjrnVGvlb7WuZA_TIzFbLKA';
    
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 3. RUN SECURITY CHECK IMMEDIATELY
    checkAuthRouting();
};

// 4. THE ROUTER LOGIC
async function checkAuthRouting() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Get the current page name
    const currentPage = window.location.pathname.split("/").pop();

    if (session) {
        // If they are logged in and sitting on the login page, push them to the dashboard
        if (currentPage === '' || currentPage === 'index.html') {
            window.location.href = 'dashboard.html';
        }
    } else {
        // If they are NOT logged in and trying to view a secure page, kick them to login
        if (currentPage !== '' && currentPage !== 'index.html') {
            window.location.href = 'index.html';
        }
    }
}