// navbar.js
(async function initNavbar() {
    const renderNavbar = async () => {
        try {
            // 1. Verify User exists
            const { data: userData, error: authError } = await supabaseClient.auth.getUser();
            
            if (authError || !userData || !userData.user) {
                window.location.href = 'index.html';
                return;
            }

            // 2. Get User Profile & Role
            const { data: profile } = await supabaseClient
                .from('user_profiles')
                .select('role')
                .eq('id', userData.user.id)
                .single();
            
            const role = profile ? profile.role : 'staff'; 
            const isAdmin = role === 'admin';

            // 3. Inject Navbar CSS (Check if it exists first so we don't duplicate)
            if (!document.getElementById('sys-navbar-style')) {
                const style = document.createElement('style');
                style.id = 'sys-navbar-style';
                style.innerHTML = `
                    .sys-navbar { background-color: #0f172a; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; height: 60px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .sys-brand { color: #fff; font-weight: 800; font-size: 1.2em; text-decoration: none; letter-spacing: -0.5px; }
                    .sys-nav-links { display: flex; gap: 20px; }
                    .sys-nav-link { color: #94a3b8; text-decoration: none; font-weight: 600; font-size: 0.9em; transition: 0.2s; padding: 20px 0; border-bottom: 2px solid transparent; }
                    .sys-nav-link:hover { color: #fff; }
                    .sys-nav-link.active { color: #38bdf8; border-bottom-color: #38bdf8; }
                    .sys-logout { background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 0.85em; transition: 0.2s; }
                    .sys-logout:hover { background: #ef4444; color: #fff; }
                    
                    @media (max-width: 768px) {
                        .sys-navbar { flex-wrap: wrap; height: auto; padding: 10px 20px; gap: 10px; }
                        .sys-nav-links { display: flex; width: 100%; overflow-x: auto; gap: 15px; padding-bottom: 5px; }
                        .sys-nav-link { padding: 5px 0; white-space: nowrap; }
                    }
                `;
                document.head.appendChild(style);
            }

            // 4. Determine Active Page
            const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

            // 5. Build Links Based on Role
            let linksHtml = `
                <a href="dashboard.html" class="sys-nav-link ${currentPage === 'dashboard.html' || currentPage === '' ? 'active' : ''}">Dashboard</a>
            `;

            if (isAdmin) {
                linksHtml += `
                    <a href="accounts.html" class="sys-nav-link ${currentPage === 'accounts.html' ? 'active' : ''}">Accounts</a>
                    <a href="staff.html" class="sys-nav-link ${currentPage === 'staff.html' ? 'active' : ''}">Staff Mgmt</a>
                    <a href="master-ledger.html" class="sys-nav-link ${currentPage === 'master-ledger.html' ? 'active' : ''}">Master Vault</a>
                `;
            }

            // 6. Inject HTML
            const navDiv = document.createElement('nav');
            navDiv.className = 'sys-navbar';
            navDiv.innerHTML = `
                <a href="dashboard.html" class="sys-brand">SHOP SYSTEM</a>
                <div class="sys-nav-links">
                    ${linksHtml}
                </div>
                <button class="sys-logout" id="sys-logout-btn">Logout</button>
            `;
            
            document.body.insertBefore(navDiv, document.body.firstChild);

            // 7. Bulletproof Logout Handler
            document.getElementById('sys-logout-btn').addEventListener('click', async () => {
                const btn = document.getElementById('sys-logout-btn');
                btn.innerText = 'Exiting...';
                btn.style.opacity = '0.5';
                
                try {
                    await supabaseClient.auth.signOut();
                } catch (err) {
                    console.error('Logout error suppressed:', err);
                } finally {
                    // Force the redirect no matter what happens
                    window.location.replace('index.html');
                }
            });

        } catch (err) {
            console.error("Navbar Initialization Failed:", err);
        }
    };

    // The Timing Fix: Check if DOM is already fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderNavbar);
    } else {
        renderNavbar(); // Fire immediately if already loaded
    }
})();
