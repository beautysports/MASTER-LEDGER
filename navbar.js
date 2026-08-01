// navbar.js
async function loadSidebarNavbar() {
    // Prevent it from duplicating if it accidentally runs twice
    if (document.getElementById('sys-sidebar-nav')) return;

    // THE FIX: Wait for supabaseClient to be loaded by supabase-init.js
    let retries = 0;
    while (!window.supabaseClient && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 50));
        retries++;
    }

    if (!window.supabaseClient) {
        console.error("Fatal Error: Supabase client never loaded.");
        return;
    }

    try {
        // 1. Verify Authentication
        const { data: userData, error: authError } = await window.supabaseClient.auth.getUser();
        
        if (authError || !userData || !userData.user) {
            window.location.replace('index.html');
            return;
        }

        // 2. Get User Role
        const { data: profile } = await window.supabaseClient
            .from('user_profiles')
            .select('role')
            .eq('id', userData.user.id)
            .single();
        
        const isAdmin = profile && profile.role === 'admin';

        // 3. Apply Bulletproof Sidebar CSS
        const style = document.createElement('style');
        style.innerHTML = `
            /* Shift the whole page right to make room for the sidebar */
            body {
                margin: 0 !important;
                padding-left: 220px !important; 
            }

            .sys-sidebar {
                position: fixed;
                top: 0;
                left: 0;
                width: 220px;
                height: 100vh;
                background-color: #0f172a;
                display: flex;
                flex-direction: column;
                z-index: 99999;
                box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            }

            .sys-brand {
                color: #ffffff;
                font-size: 1.2em;
                font-weight: 800;
                padding: 25px 20px;
                text-align: center;
                border-bottom: 1px solid #1e293b;
                text-decoration: none;
                letter-spacing: -0.5px;
            }

            .sys-nav-links {
                display: flex;
                flex-direction: column;
                padding: 15px 0;
                flex-grow: 1;
            }

            .sys-nav-link {
                color: #94a3b8;
                text-decoration: none;
                padding: 15px 25px;
                font-weight: 600;
                font-size: 0.95em;
                transition: 0.2s;
                border-left: 4px solid transparent;
            }

            .sys-nav-link:hover {
                color: #ffffff;
                background-color: #1e293b;
            }

            .sys-nav-link.active {
                color: #38bdf8;
                background-color: #1e293b;
                border-left-color: #38bdf8;
            }

            .sys-logout-btn {
                margin: 20px;
                padding: 12px;
                background: transparent;
                color: #ef4444;
                border: 1px solid #ef4444;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 700;
                font-size: 0.9em;
                transition: 0.2s;
            }

            .sys-logout-btn:hover {
                background: #ef4444;
                color: #ffffff;
            }

            /* MOBILE LAYOUT: Switches to Bottom Tab Bar */
            @media (max-width: 768px) {
                body { 
                    padding-left: 0 !important; 
                    padding-bottom: 60px !important; 
                }
                .sys-sidebar {
                    top: auto;
                    bottom: 0;
                    width: 100%;
                    height: 60px;
                    flex-direction: row;
                    border-top: 1px solid #1e293b;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                }
                .sys-brand { display: none; }
                .sys-nav-links {
                    flex-direction: row;
                    justify-content: space-around;
                    width: 100%;
                    padding: 0;
                }
                .sys-nav-link {
                    padding: 10px 5px;
                    font-size: 0.8em;
                    border-left: none;
                    border-top: 3px solid transparent;
                    text-align: center;
                    flex-grow: 1;
                }
                .sys-nav-link:hover { background-color: transparent; }
                .sys-nav-link.active {
                    border-left: none;
                    border-top-color: #38bdf8;
                    background-color: transparent;
                }
                .sys-logout-btn {
                    margin: 10px;
                    padding: 5px 10px;
                    font-size: 0.8em;
                    width: auto;
                }
            }
        `;
        document.head.appendChild(style);

        // 4. Identify the active page
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

        // 5. Build the links
        let linksHtml = `<a href="dashboard.html" class="sys-nav-link ${currentPage === 'dashboard.html' ? 'active' : ''}">Dashboard</a>`;

        if (isAdmin) {
            linksHtml += `
                <a href="accounts.html" class="sys-nav-link ${currentPage === 'accounts.html' ? 'active' : ''}">Accounts</a>
                <a href="staff.html" class="sys-nav-link ${currentPage === 'staff.html' ? 'active' : ''}">Staff</a>
                <a href="master-ledger.html" class="sys-nav-link ${currentPage === 'master-ledger.html' ? 'active' : ''}">Vault</a>
            `;
        }

        // 6. Create and append the navbar
        const nav = document.createElement('nav');
        nav.id = 'sys-sidebar-nav';
        nav.className = 'sys-sidebar';
        nav.innerHTML = `
            <a href="dashboard.html" class="sys-brand">Shop System</a>
            <div class="sys-nav-links">${linksHtml}</div>
            <button class="sys-logout-btn" id="logout-btn">Logout</button>
        `;

        // Append to the END of the body so it sits on top of everything
        document.body.appendChild(nav);

        // 7. Bulletproof Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            const btn = document.getElementById('logout-btn');
            btn.innerText = 'Exiting...';
            try {
                await window.supabaseClient.auth.signOut();
            } catch(e) {
                console.error('Logout error suppressed');
            } finally {
                window.location.replace('index.html');
            }
        });

    } catch (error) {
        console.error("Navbar failed to load:", error);
    }
}

// Fire the function
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSidebarNavbar);
} else {
    loadSidebarNavbar();
}
