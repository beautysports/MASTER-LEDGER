const sidebarCSS = `
<style>
    /* Desktop Default: Make room for sidebar */
    body { padding-left: 260px !important; margin: 0; transition: padding-left 0.3s ease; }
    
    /* MOBILE TOP BAR (Hidden on Desktop) */
    .mobile-topbar { display: none; background: #0f172a; color: white; padding: 15px 20px; justify-content: space-between; align-items: center; position: fixed; top: 0; left: 0; right: 0; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .hamburger { font-size: 1.5em; cursor: pointer; background: none; border: none; color: white; padding: 0; margin: 0; line-height: 1; }
    
    /* MOBILE OVERLAY (Darkens background when menu is open) */
    .mobile-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); z-index: 999; opacity: 0; transition: opacity 0.3s ease; backdrop-filter: blur(2px); }
    .mobile-overlay.open { display: block; opacity: 1; }

    /* SIDEBAR STYLING */
    .sidebar { width: 260px; background: #0f172a; color: #fff; display: flex; flex-direction: column; height: 100vh; position: fixed; left: 0; top: 0; z-index: 1001; transition: transform 0.3s ease; box-shadow: 2px 0 15px rgba(0,0,0,0.05); }
    .sidebar-header { padding: 30px 20px; border-bottom: 1px solid #1e293b; }
    .sidebar-header h2 { margin: 0; font-size: 1.25em; color: #f8fafc; letter-spacing: 0.5px; font-weight: 700; }
    .sidebar-header .badge { display: inline-block; background: #3b82f6; color: white; font-size: 0.7em; padding: 4px 10px; border-radius: 12px; margin-top: 10px; font-weight: 700; letter-spacing: 0.5px; }
    
    .nav-links { flex-grow: 1; padding: 15px 0; overflow-y: auto; }
    
    /* SMOOTH HOVER EFFECT */
    .nav-link { display: block; padding: 16px 25px; color: #94a3b8; text-decoration: none; font-weight: 600; border-left: 4px solid transparent; transition: all 0.25s ease; position: relative; }
    .nav-link:hover:not(.locked) { background: #1e293b; color: #fff; border-left-color: #3b82f6; padding-left: 32px; /* Slides text slightly right */ }
    .nav-link.active { background: #1e293b; color: #fff; border-left-color: #3b82f6; }
    
    /* STAFF RESTRICTIONS */
    .nav-link.locked { color: #475569; cursor: not-allowed; }
    .nav-link.locked::after { content: " 🔒"; font-size: 0.9em; position: absolute; right: 20px; }

    .sidebar-footer { padding: 25px 20px; border-top: 1px solid #1e293b; }
    .logout-btn { background: transparent; color: #ef4444; border: 1px solid #ef4444; width: 100%; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
    .logout-btn:hover { background: #ef4444; color: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
    
    /* --- MOBILE RESPONSIVENESS --- */
    @media (max-width: 768px) {
        body { padding-left: 0 !important; padding-top: 60px !important; }
        .mobile-topbar { display: flex; }
        .sidebar { transform: translateX(-100%); }
        .sidebar.open { transform: translateX(0); }
    }
</style>
`;

const sidebarHTML = `
<!-- Mobile Header -->
<div class="mobile-topbar">
    <h2 style="margin: 0; font-size: 1.1em; font-weight: 600;" id="mobile-shop-name">Loading...</h2>
    <button class="hamburger" onclick="toggleSidebar()">☰</button>
</div>

<!-- Mobile Click-out Overlay -->
<div class="mobile-overlay" id="mobile-overlay" onclick="toggleSidebar()"></div>

<!-- Main Sidebar -->
<nav class="sidebar" id="app-sidebar">
    <div class="sidebar-header">
        <h2 id="nav-shop-name">Loading...</h2>
        <span id="nav-role-badge" class="badge">Checking Access...</span>
    </div>
    
    <div class="nav-links">
        <a href="dashboard.html" class="nav-link" id="link-dashboard">Shop Floor</a>
        <a href="master-ledger.html" class="nav-link admin-only" id="link-ledger">Master Ledger</a>
        <a href="staff.html" class="nav-link admin-only" id="link-staff">Staff Mgmt (Admin)</a>
        <a href="accounts.html" class="nav-link admin-only" id="link-accounts">Manage Accounts</a>
    </div>

    <div class="sidebar-footer">
        <button onclick="handleLogout()" class="logout-btn">Log Out</button>
    </div>
</nav>
`;

// Inject into the page
document.write(sidebarCSS + sidebarHTML);

// Mobile Toggle Logic
function toggleSidebar() {
    document.getElementById('app-sidebar').classList.toggle('open');
    document.getElementById('mobile-overlay').classList.toggle('open');
}

// Run initialization
setTimeout(async () => {
    // 1. Highlight the current active page
    const currentPage = window.location.pathname.split("/").pop();
    if(currentPage.includes("dashboard")) document.getElementById('link-dashboard').classList.add('active');
    if(currentPage.includes("master-ledger")) document.getElementById('link-ledger').classList.add('active');
    if(currentPage.includes("accounts")) document.getElementById('link-accounts').classList.add('active');
    if(currentPage.includes("staff")) document.getElementById('link-staff').classList.add('active');

    // 2. Fetch User Profile & Role from Database
    const { data: userData } = await supabaseClient.auth.getUser();
    if (userData && userData.user) {
        
        // Fetch from the user_profiles table
        const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('role, shops(name)')
            .eq('id', userData.user.id)
            .single();

        const roleBadge = document.getElementById('nav-role-badge');
        const shopName = document.getElementById('nav-shop-name');
        const mobileShopName = document.getElementById('mobile-shop-name');

        if (profile) {
            shopName.innerText = profile.shops.name;
            mobileShopName.innerText = profile.shops.name;
            
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
            mobileShopName.innerText = "System Ready";
            roleBadge.innerText = "NO PROFILE SET";
            roleBadge.style.background = "#ef4444";
        }
    }
}, 600); // Slight delay ensures supabaseClient is loaded
