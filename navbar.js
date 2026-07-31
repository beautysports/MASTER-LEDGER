const sidebarCSS = `
<style>
    .sidebar { width: 260px; background: #0f172a; color: #fff; display: flex; flex-direction: column; height: 100vh; position: fixed; left: 0; top: 0; }
    .sidebar-header { padding: 25px 20px; border-bottom: 1px solid #1e293b; }
    .sidebar-header h2 { margin: 0; font-size: 1.2em; color: #f8fafc; letter-spacing: 0.5px; }
    .sidebar-header .badge { display: inline-block; background: #3b82f6; color: white; font-size: 0.7em; padding: 3px 8px; border-radius: 12px; margin-top: 8px; font-weight: bold; }
    
    .nav-links { flex-grow: 1; padding: 20px 0; }
    .nav-link { display: block; padding: 15px 25px; color: #94a3b8; text-decoration: none; font-weight: 600; border-left: 4px solid transparent; transition: 0.2s; }
    .nav-link:hover:not(.locked) { background: #1e293b; color: #fff; border-left-color: #3b82f6; }
    .nav-link.active { background: #1e293b; color: #fff; border-left-color: #3b82f6; }
    
    /* Staff Restrictions */
    .nav-link.locked { color: #475569; cursor: not-allowed; position: relative; }
    .nav-link.locked::after { content: " 🔒"; font-size: 0.8em; }

    .sidebar-footer { padding: 20px; border-top: 1px solid #1e293b; }
    .logout-btn { background: transparent; color: #ef4444; border: 1px solid #ef4444; width: 100%; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
    .logout-btn:hover { background: #ef4444; color: #fff; }
    
    /* Make room for the fixed sidebar */
    body { padding-left: 260px !important; }
    @media (max-width: 768px) {
        .sidebar { width: 100%; height: auto; position: relative; }
        body { padding-left: 0 !important; }
    }
</style>
`;

const sidebarHTML = `
<nav class="sidebar">
    <div class="sidebar-header">
        <h2 id="nav-shop-name">Loading...</h2>
        <span id="nav-role-badge" class="badge">Checking Access...</span>
    </div>
    
    <div class="nav-links">
        <a href="dashboard.html" class="nav-link" id="link-dashboard">Shop Floor</a>
        <a href="master-ledger.html" class="nav-link admin-only" id="link-ledger">Master Ledger</a>
        <a href="accounts.html" class="nav-link admin-only" id="link-accounts">Manage Accounts</a>
    </div>

    <div class="sidebar-footer">
        <button onclick="handleLogout()" class="logout-btn">Log Out</button>
    </div>
</nav>
`;

// Inject into the page
document.write(sidebarCSS + sidebarHTML);

// Run initialization
setTimeout(async () => {
    // 1. Highlight the current active page
    const currentPage = window.location.pathname.split("/").pop();
    if(currentPage.includes("dashboard")) document.getElementById('link-dashboard').classList.add('active');
    if(currentPage.includes("master-ledger")) document.getElementById('link-ledger').classList.add('active');
    if(currentPage.includes("accounts")) document.getElementById('link-accounts').classList.add('active');

    // 2. Fetch User Profile & Role from Database
    const { data: userData } = await supabaseClient.auth.getUser();
    if (userData && userData.user) {
        
        // Fetch from the new user_profiles table
        const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('role, shops(name)')
            .eq('id', userData.user.id)
            .single();

        const roleBadge = document.getElementById('nav-role-badge');
        const shopName = document.getElementById('nav-shop-name');

        if (profile) {
            shopName.innerText = profile.shops.name;
            
            if (profile.role === 'admin') {
                roleBadge.innerText = 'OWNER / ADMIN';
                roleBadge.style.background = '#3b82f6';
            } else {
                roleBadge.innerText = 'STAFF TERMINAL';
                roleBadge.style.background = '#64748b';
                
                // Lock the Admin Links
                const adminLinks = document.querySelectorAll('.admin-only');
                adminLinks.forEach(link => {
                    link.classList.add('locked');
                    link.href = "#"; // Disable navigation
                    link.onclick = (e) => {
                        e.preventDefault();
                        alert("Access Denied: Owner authorization required.");
                    };
                });
            }
        } else {
            shopName.innerText = "System Ready";
            roleBadge.innerText = "NO PROFILE SET";
            roleBadge.style.background = "#ef4444";
        }
    }
}, 600); // Slight delay ensures supabaseClient is loaded
