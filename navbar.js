// navbar.js
async function loadPremiumLayout() {
    if (document.getElementById('sys-sidebar')) return;

    try {
        // 1. Verify Authentication INSTANTLY
        const { data: userData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !userData || !userData.user) {
            window.location.replace('index.html');
            return;
        }

        const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('role, shop_id')
            .eq('id', userData.user.id)
            .single();
        
        const isAdmin = profile && profile.role === 'admin';

        // 2. FETCH DYNAMIC SHOP NAME
        let shopName = "BEAUTY SPORTS"; 
        if (profile && profile.shop_id) {
            const { data: shop } = await supabaseClient.from('shops').select('name').eq('id', profile.shop_id).single();
            if (shop && shop.name) shopName = shop.name;
        }

        // 3. INJECT BOOTSTRAP & FONTS
        if (!document.getElementById('bs-css')) {
            const font = document.createElement('link'); font.href = 'https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&display=swap'; font.rel = 'stylesheet'; document.head.appendChild(font);
            const bs = document.createElement('link'); bs.id = 'bs-css'; bs.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'; bs.rel = 'stylesheet'; document.head.appendChild(bs);
        }

        // 4. APPLY PREMIUM BEAUTY SPORTS CSS & HAMBURGER LOGIC
        const style = document.createElement('style');
        style.innerHTML = `
            :root { 
                --creme-bg: #FDFBF7; 
                --sidebar-dark: #2C2C2C; 
                --sidebar-hover: #383838;
                --accent-gold: #C5A059;
                --glass: rgba(253, 251, 247, 0.85);
            }
            
            body { 
                font-family: 'Public Sans', sans-serif !important; 
                background-color: var(--creme-bg) !important; 
                color: #3A3A3A;
                margin: 0 !important;
                overflow-x: hidden;
            }

            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #EAE0D5; border-radius: 10px; }
            ::-webkit-scrollbar-thumb:hover { background: var(--accent-gold); }
            
            /* Desktop Sidebar */
            .sidebar { height: 100vh; width: 260px; position: fixed; top:0; left:0; background: var(--sidebar-dark); color: white; z-index: 1001; border-right: 1px solid rgba(255,255,255,0.05); box-shadow: 4px 0 20px rgba(0,0,0,0.05); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .sidebar-brand { padding: 2rem 1.5rem; font-weight: 800; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 1.15rem; display: flex; align-items: center; gap: 10px; text-transform: uppercase; }
            
            .sidebar-nav-link { color: rgba(255, 255, 255, 0.6); padding: 1rem 1.5rem; transition: all 0.3s ease; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-left: 4px solid transparent; display: flex; align-items: center; gap: 12px; text-decoration: none; }
            .sidebar-nav-link svg { transition: all 0.3s ease; opacity: 0.7; }
            .sidebar-nav-link:hover { color: white; background: var(--sidebar-hover); transform: translateX(4px); }
            .sidebar-nav-link:hover svg { opacity: 1; color: var(--accent-gold); }
            .sidebar-nav-link.active { color: white; background: var(--sidebar-hover); border-left: 4px solid var(--accent-gold); }
            .sidebar-nav-link.active svg { opacity: 1; color: var(--accent-gold); }

            /* Status Bar & Main Content */
            .status-bar { margin-left: 260px; padding: 1.25rem 2.5rem; background: var(--glass); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(197, 160, 89, 0.2); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 999; transition: margin-left 0.3s ease; }
            .main-content-wrapper { margin-left: 260px; padding: 2.5rem; transition: margin-left 0.3s ease; }

            .btn-outline-danger { border-color: #dc3545; color: #dc3545; }
            .btn-outline-danger:hover { background-color: #dc3545; color: white; }

            /* Hamburger Menu Elements */
            .mobile-toggle-btn { display: none; background: transparent; border: none; color: #2C2C2C; padding: 5px; cursor: pointer; border-radius: 6px; }
            .mobile-toggle-btn:hover { background: rgba(0,0,0,0.05); }
            .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 1000; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s; }
            .sidebar-overlay.active { opacity: 1; visibility: visible; }

            /* MOBILE LAYOUT */
            @media (max-width: 768px) {
                .sidebar { transform: translateX(-100%); }
                .sidebar.mobile-open { transform: translateX(0); }
                .status-bar, .main-content-wrapper { margin-left: 0; }
                .status-bar { padding: 1rem; }
                .main-content-wrapper { padding: 1.5rem 1rem; }
                .mobile-toggle-btn { display: inline-flex; align-items: center; justify-content: center; }
            }
        `;
        document.head.appendChild(style);

        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

        // 5. BUILD SIDEBAR
        const sidebar = document.createElement('div');
        sidebar.id = 'sys-sidebar';
        sidebar.className = 'sidebar';
        
        let navLinks = `
            <a class="sidebar-nav-link ${currentPage === 'dashboard.html' || currentPage === '' ? 'active' : ''}" href="dashboard.html">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Dashboard
            </a>
        `;

        if (isAdmin) {
            navLinks += `
                <a class="sidebar-nav-link ${currentPage === 'master-ledger.html' ? 'active' : ''}" href="master-ledger.html">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    Master Ledger
                </a>
                <a class="sidebar-nav-link ${currentPage === 'accounts.html' ? 'active' : ''}" href="accounts.html">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Entity Accounts
                </a>
                <a class="sidebar-nav-link ${currentPage === 'staff.html' ? 'active' : ''}" href="staff.html">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Staff Management
                </a>
            `;
        }

        let shopNameArr = shopName.split(' ');
        let firstWord = shopNameArr[0] || '';
        let restWords = shopNameArr.slice(1).join(' ') || '';

        sidebar.innerHTML = `
            <div class="sidebar-brand">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.2 7.8l-7.7 7.7-4-4-5.7 5.7"/><path d="M15 7h6v6"/>
                </svg>
                <span><span style="color: var(--accent-gold)">${firstWord}</span> ${restWords}</span>
            </div>
            <nav class="nav flex-column mt-4">${navLinks}</nav>
        `;
        document.body.prepend(sidebar);

        // 6. BUILD OVERLAY FOR MOBILE
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebar-overlay';
        document.body.appendChild(overlay);

        // 7. BUILD STATUS BAR WITH HAMBURGER
        const statusBar = document.createElement('div');
        statusBar.className = 'status-bar';
        
        let badgeHtml = isAdmin 
            ? `<span class="badge bg-danger text-white px-3 py-2 rounded-pill fw-bold shadow-sm d-none d-md-inline-block" style="font-size: 0.65rem; letter-spacing: 1px;">ADMIN ACTIVE</span>`
            : `<span class="badge bg-success text-white px-3 py-2 rounded-pill fw-bold shadow-sm d-none d-md-inline-block" style="font-size: 0.65rem; letter-spacing: 1px;">STANDARD MODE</span>`;

        statusBar.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <button id="mobile-menu-btn" class="mobile-toggle-btn me-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                ${badgeHtml}
            </div>
            <div class="d-flex align-items-center gap-3">
                <span class="small fw-bold text-muted text-uppercase d-none d-sm-inline" style="letter-spacing: 1px;">${todayStr}</span>
                <button id="sys-logout-btn" class="btn btn-sm btn-outline-danger fw-bold rounded-pill px-4 shadow-sm" style="background: transparent;">LOGOUT</button>
            </div>
        `;
        
        const mainContent = document.querySelector('main');
        if(mainContent) {
            mainContent.classList.remove('main-content');
            mainContent.classList.add('main-content-wrapper');
            sidebar.insertAdjacentElement('afterend', statusBar);
        }

        // 8. EVENT LISTENERS
        document.getElementById('mobile-menu-btn').addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });

        sidebar.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
        });

        document.getElementById('sys-logout-btn').addEventListener('click', async () => {
            document.getElementById('sys-logout-btn').innerText = 'Exiting...';
            try { await supabaseClient.auth.signOut(); } catch(e) {} 
            finally { window.location.replace('index.html'); }
        });

    } catch (error) {
        console.error("Layout failed to load:", error);
    }
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', loadPremiumLayout); } 
else { loadPremiumLayout(); }
