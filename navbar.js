// navbar.js
(async function initNavbar() {
    const renderNavbar = async () => {
        try {
            // 1. Verify User exists
            const { data: userData, error: authError } = await supabaseClient.auth.getUser();
            
            if (authError || !userData || !userData.user) {
                window.location.replace('index.html');
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

            // 3. Inject Sideways (Sidebar) CSS
            if (!document.getElementById('sys-navbar-style')) {
                const style = document.createElement('style');
                style.id = 'sys-navbar-style';
                style.innerHTML = `
                    /* Push the entire app to the right so the sidebar fits perfectly */
                    body {
                        margin-left: 240px !important;
                        transition: margin-left 0.3s;
                    }

                    /* Override previous top-bar height calculations */
                    .main-content {
                        height: 100vh !important;
                    }

                    /* The Sidebar */
                    .sys-sidebar {
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        width: 240px;
                        background-color: #0f172a;
                        display: flex;
                        flex-direction: column;
                        z-index: 9000;
                        box-shadow: 2px 0 8px rgba(0,0,0,0.15);
                    }

                    .sys-brand {
                        color: #ffffff;
                        font-weight: 800;
                        font-size: 1.4em;
                        text-decoration: none;
                        letter-spacing: -0.5px;
                        padding: 25px 20px;
                        border-bottom: 1px solid #1e293b;
                        text-align: center;
                    }

                    .sys-nav-links {
                        display: flex;
                        flex-direction: column;
                        flex-grow: 1;
                        padding-top: 20px;
                    }

                    .sys-nav-link {
                        color: #94a3b8;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 1em;
                        padding: 16px 25px;
                        transition: 0.2s;
                        border-left: 4px solid transparent;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .sys-nav-link span { font-size: 1.2em; }

                    .sys-nav-link:hover {
                        color: #ffffff;
                        background-color: #1e293b;
                    }

                    .sys-nav-link.active {
                        color: #38bdf8;
                        background-color: #1e293b;
                        border-left-color: #38bdf8;
                    }

                    .sys-logout-container {
                        padding: 20px;
                        border-top: 1px solid #1e293b;
                    }

                    .sys-logout {
                        width: 100%;
                        background: transparent;
                        color: #ef4444;
                        border: 1px solid #ef4444;
                        padding: 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 700;
                        font-size: 0.9em;
                        transition: 0.2s;
                    }

                    .sys-logout:hover { background: #ef4444; color: #ffffff; }

                    /* --- MOBILE RESPONSIVENESS: Turns into a Bottom App Bar --- */
                    @media (max-width: 768px) {
                        body {
                            margin-left: 0 !important;
                            padding-bottom: 65px !important;
                        }
                        
                        .main-content { height: auto !important; }

                        .sys-sidebar {
                            top: auto;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            width: 100%;
                            height: 65px;
                            flex-direction: row;
                            justify-content: space-between;
                            padding: 0;
                            box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
                            border-top: 1px solid #1e293b;
                        }

                        .sys-brand { display: none; }

                        .sys-nav-links {
                            flex-direction: row;
                            flex-grow: 1;
                            padding: 0;
                            justify-content: space-around;
                        }

                        .sys-nav-link {
                            padding: 8px 5px;
                            flex-direction: column;
                            font-size: 0.7em;
                            justify-content: center;
                            gap: 4px;
                            border-left: none;
                            border-top: 3px solid transparent;
                        }

                        .sys-nav-link.active {
                            border-left: none;
                            border-top-color: #38bdf8;
                            background-color: transparent;
                        }

                        .sys-logout-container {
                            padding: 0 10px;
                            border-top: none;
                            display: flex;
                            align-items: center;
                            border-left: 1px solid #1e293b;
                        }

                        .sys-logout { padding: 8px 12px; font-size: 0.8em; }
                    }
                `;
                document.head.appendChild(style);
            }

            // 4. Determine Active Page
            const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

            // 5. Build Links Based on Role
            let linksHtml = `
                <a href="dashboard.html" class="sys-nav-link ${currentPage === 'dashboard.html' || currentPage === '' ? 'active' : ''}">
                    <span>📊</span> Dashboard
                </a>
            `;

            if (isAdmin) {
                linksHtml += `
                    <a href="accounts.html" class="sys-nav-link ${currentPage === 'accounts.html' ? 'active' : ''}">
                        <span>👥</span> Accounts
                    </a>
                    <a href="staff.html" class="sys-nav-link ${currentPage === 'staff.html' ? 'active' : ''}">
                        <span>⏱️</span> Staff
                    </a>
                    <a href="master-ledger.html" class="sys-nav-link ${currentPage === 'master-ledger.html' ? 'active' : ''}">
                        <span>🏦</span> Vault
                    </a>
                `;
            }

            // 6. Inject HTML structure
            const navDiv = document.createElement('nav');
            navDiv.className = 'sys-sidebar';
            navDiv.innerHTML = `
                <a href="dashboard.html" class="sys-brand">Shop System</a>
                <div class="sys-nav-links">
                    ${linksHtml}
                </div>
                <div class="sys-logout-container">
                    <button class="sys-logout" id="sys-logout-btn">Logout</button>
                </div>
            `;
            
            document.body.insertBefore(navDiv, document.body.firstChild);

            // 7. The Bulletproof Logout Fix
            document.getElementById('sys-logout-btn').addEventListener('click', async () => {
                const btn = document.getElementById('sys-logout-btn');
                btn.innerText = 'Exiting...';
                btn.style.opacity = '0.5';
                
                try {
                    await supabaseClient.auth.signOut();
                } catch (err) {
                    console.error('Logout error suppressed:', err);
                } finally {
                    window.location.replace('index.html');
                }
            });

        } catch (err) {
            console.error("Navbar Initialization Failed:", err);
        }
    };

    // The Invisibility Fix: Ensure it builds even if the page loads instantly
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderNavbar);
    } else {
        renderNavbar(); 
    }
})();
