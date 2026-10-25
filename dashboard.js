let currentShopId = null;
let isAdmin = false;
const DATE_STORAGE_KEY = 'daybook-active-date';

// Global Smart Search Array
let unifiedEntities = [];

/* ---------- Click Outside to Close Dropdown ---------- */
document.addEventListener('click', function(e) {
    const searchInput = document.getElementById('smart-expense-search');
    const resultsDiv = document.getElementById('smart-search-results');
    if (searchInput && resultsDiv) {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.add('d-none');
        }
    }
});

/* ---------- Date persistence across tabs ---------- */
function getLocalDateString(d = new Date()) {
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().split('T')[0];
}

function initActiveDate() {
    const saved = localStorage.getItem(DATE_STORAGE_KEY);
    const today = getLocalDateString();
    const dateInput = document.getElementById('active-date');
    dateInput.value = (saved && saved <= today) ? saved : today;
}

function onDateChanged() {
    const val = document.getElementById('active-date').value;
    if (val) localStorage.setItem(DATE_STORAGE_KEY, val);
    loadDashboardData();
}

window.addEventListener('storage', (e) => {
    if (e.key === DATE_STORAGE_KEY && e.newValue) {
        const input = document.getElementById('active-date');
        if (input.value !== e.newValue) {
            input.value = e.newValue;
            loadDashboardData();
        }
    }
});

/* ---------- Initialization ---------- */
window.onload = async () => {
    initActiveDate();
    
    try {
        const { data: userData } = await supabaseClient.auth.getUser();
        if (userData && userData.user) {
            const { data: profile } = await supabaseClient.from('user_profiles').select('role, shop_id').eq('id', userData.user.id).single();
            if (profile) {
                currentShopId = profile.shop_id;
                isAdmin = (profile.role === 'admin');
                
                if (isAdmin) {
                    document.getElementById('edit-col-header').classList.remove('d-none');
                    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
                }

                await loadDropdowns(currentShopId);
                await loadDashboardData();
            }
        }
    } catch (err) {
        console.error("Dashboard Init Error:", err);
    }
};

/* ---------- Smart Search Data Load ---------- */
async function loadDropdowns(shopId) {
    unifiedEntities = [];
    
    // 1. Fetch Vendors and Finances
    const { data: vendors } = await supabaseClient.from('vendors').select('id, name, account_type').eq('shop_id', shopId);
    if (vendors) {
        vendors.forEach(v => {
            const isFin = (v.account_type === 'finance');
            const safeName = (v.name || 'UNNAMED VENDOR').toUpperCase();
            unifiedEntities.push({ id: v.id, name: safeName, type: isFin ? 'finance' : 'vendor' });
        });
    }

    // 2. Fetch Staff
    const { data: staff } = await supabaseClient.from('staff').select('id, name').eq('shop_id', shopId);
    if (staff) {
        staff.forEach(s => {
            const safeName = (s.name || 'UNNAMED STAFF').toUpperCase();
            unifiedEntities.push({ id: s.id, name: safeName, type: 'staff' });
        });
    }

    // 3. Fetch Historical Generic Expenses (The "Memory" Engine)
    const { data: generics } = await supabaseClient.from('daily_transactions')
        .select('reference_note')
        .eq('shop_id', shopId)
        .eq('category', 'generic')
        .not('reference_note', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000); 

    if (generics) {
        const uniqueNames = new Set();
        generics.forEach(g => {
            if(!g.reference_note) return;
            let note = g.reference_note.trim().toUpperCase();
            if (note.includes(' - ')) {
                note = note.split(' - ')[0].trim();
            }
            if (note.length > 0) uniqueNames.add(note);
        });
        
        uniqueNames.forEach(name => {
            unifiedEntities.push({ id: 'GENERIC', name: name, type: 'generic' });
        });
    }
}

/* ---------- Smart Search UI Handlers ---------- */
function handleSmartSearch() {
    const input = document.getElementById('smart-expense-search');
    const resultsDiv = document.getElementById('smart-search-results');
    if (!input || !resultsDiv) return;
    
    const query = input.value.toLowerCase().trim();
    
    let matches = [];
    if (query.length === 0) {
        // If empty, show first 50 results so it feels instantly interactive
        matches = unifiedEntities.slice(0, 50);
    } else {
        matches = unifiedEntities.filter(e => e.name.toLowerCase().includes(query)).slice(0, 50);
    }

    const exactMatchExists = query.length > 0 && matches.some(m => m.name.toLowerCase() === query);
    
    resultsDiv.innerHTML = '';
    
    matches.forEach(m => {
        const a = document.createElement('a');
        a.className = 'list-group-item list-group-item-action py-2 cursor-pointer border-bottom';
        
        let typeColor = m.type === 'vendor' ? 'text-primary' : (m.type === 'staff' ? 'text-success' : (m.type === 'finance' ? 'text-info' : 'text-warning'));
        let displayType = m.type === 'generic' ? 'OVERHEAD / GENERAL' : m.type;

        a.innerHTML = `
            <div class="fw-bold text-dark" style="font-size: 0.85rem;">${m.name}</div>
            <div class="small fw-bold ${typeColor}" style="font-size: 0.65rem; text-transform: uppercase;">${displayType}</div>
        `;
        a.onclick = () => selectSmartEntity(m.id, m.name, m.type);
        resultsDiv.appendChild(a);
    });

    if (query.length > 0 && !exactMatchExists) {
        const aNew = document.createElement('a');
        aNew.className = 'list-group-item list-group-item-action py-2 cursor-pointer bg-light';
        aNew.innerHTML = `
            <div class="fw-bold text-dark" style="font-size: 0.85rem;">"${query.toUpperCase()}"</div>
            <div class="small fw-bold text-warning" style="font-size: 0.65rem; text-transform: uppercase;">+ CREATE NEW GENERAL OVERHEAD</div>
        `;
        aNew.onclick = () => selectSmartEntity('GENERIC', query.toUpperCase(), 'generic');
        resultsDiv.appendChild(aNew);
    }
    
    resultsDiv.classList.remove('d-none');
}

function selectSmartEntity(id, name, type) {
    document.getElementById('smart-expense-id').value = id;
    document.getElementById('smart-expense-type').value = type;
    
    document.getElementById('smart-expense-search').value = '';
    document.getElementById('smart-expense-search').classList.add('d-none');
    document.getElementById('smart-search-results').classList.add('d-none');
    
    document.getElementById('smart-selected-name').innerText = name;
    document.getElementById('smart-selected-type').innerText = type.toUpperCase();
    document.getElementById('smart-selected-badge').classList.remove('d-none');
}

function clearSmartSelection() {
    document.getElementById('smart-expense-id').value = '';
    document.getElementById('smart-expense-type').value = '';
    
    document.getElementById('smart-selected-badge').classList.add('d-none');
    document.getElementById('smart-expense-search').classList.remove('d-none');
    document.getElementById('smart-expense-search').focus();
}

/* ---------- Utils ---------- */
function getLocalDayBounds(dateString) {
    const start = new Date(`${dateString}T00:00:00`).toISOString();
    const end = new Date(`${dateString}T23:59:59.999`).toISOString();
    return { start, end };
}

function animateMetric(id, newValue) {
    const el = document.getElementById(id);
    const from = parseFloat(el.dataset.val || 0);
    const to = parseFloat(newValue) || 0;
    el.dataset.val = to;
    if (from === to) { el.innerText = to.toFixed(2); return; }

    const duration = 400;
    const startTime = performance.now();
    function tick(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.innerText = (from + (to - from) * eased).toFixed(2);
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

/* ---------- Core Data Engine ---------- */
async function loadDashboardData() {
    if (!currentShopId) return;
    const selectedDate = document.getElementById('active-date').value;
    if (!selectedDate) return;

    document.getElementById('txn-body').innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" class="text-center py-4 text-muted fin-math fw-semibold">Fetching ledger...</td></tr>`;

    const { start, end } = getLocalDayBounds(selectedDate);

    const { data: shopData } = await supabaseClient.from('shops').select('master_ledger_balance').eq('id', currentShopId).single();
    animateMetric('display-vault', parseFloat(shopData?.master_ledger_balance || 0));

    const { data: txns, error } = await supabaseClient.from('daily_transactions')
        .select(`*, vendors ( name ), staff ( name )`)
        .eq('shop_id', currentShopId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true }); 
    
    if (error) return console.error("Fetch Error:", error);

    let cashSales = 0, upiSales = 0, totalExpense = 0, drawerCash = 0;
    let runningCashBalance = 0;
    const processedTxns = [];

    if (txns && txns.length > 0) {
        txns.forEach(txn => {
            const amt = parseFloat(txn.amount);
            const isLegacySweep = txn.reference_note && (txn.reference_note.includes('Transferred to Master Vault') || txn.reference_note.includes('Automated 2:00 AM'));

            if (txn.transaction_type === 'INCOME') {
                if (txn.payment_method === 'CASH') cashSales += amt;
                else upiSales += amt;
            }
            if (txn.transaction_type === 'EXPENSE' && !isLegacySweep) totalExpense += amt;

            if (txn.payment_method === 'CASH') {
                if (txn.transaction_type === 'INCOME') { drawerCash += amt; runningCashBalance += amt; }
                if (txn.transaction_type === 'EXPENSE') { drawerCash -= amt; runningCashBalance -= amt; }
            }

            let mainGroup = (txn.category || 'OTHER').toUpperCase();
            let partyName = txn.reference_note || '-';
            
            if (txn.category === 'vendor' && txn.vendors) { mainGroup = 'VENDOR PAYOUT'; partyName = txn.vendors.name; }
            else if (txn.category === 'finance' && txn.vendors) { mainGroup = 'FINANCE / EMI'; partyName = txn.vendors.name; }
            else if (txn.category === 'staff' && txn.staff) { mainGroup = 'STAFF WAGE'; partyName = txn.staff.name; }
            
            // This line crashed your UI previously. It is now completely bulletproofed.
            let refNote = txn.reference_note ? `<div class="text-muted" style="font-size: 0.7rem; margin-top: 2px;">Ref: ${txn.reference_note}</div>` : '';
            if (txn.reference_note && partyName) {
                if (txn.reference_note === partyName || txn.reference_note.includes(partyName)) {
                    refNote = '';
                }
            }

            if (!isLegacySweep) {
                processedTxns.push({
                    ...txn,
                    amt: amt,
                    mainGroup: mainGroup,
                    partyName: partyName,
                    refNote: refNote,
                    currentBalance: runningCashBalance
                });
            }
        });
    }

    processedTxns.reverse(); 
    const tbody = document.getElementById('txn-body');
    tbody.innerHTML = '';

    if (processedTxns.length > 0) {
        processedTxns.forEach(txn => {
            const timeStr = new Date(txn.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const isIncome = txn.transaction_type === 'INCOME';
            
            const creditHtml = isIncome ? `₹ ${txn.amt.toFixed(2)}` : '-';
            const debitHtml = !isIncome ? `₹ ${txn.amt.toFixed(2)}` : '-';
            
            const badgeHtml = txn.payment_method === 'UPI' 
                ? `<span class="badge-mode bg-light text-secondary">UPI</span>` 
                : `<span class="badge-mode bg-light text-dark">CASH</span>`;

            let adminEditBtn = isAdmin ? `
                <td data-label="Action" class="text-center admin-only align-middle">
                    <div class="d-flex justify-content-end justify-content-md-center gap-2">
                        <button class="action-btn" onclick="editTransaction('${txn.id}', ${txn.amt})">Edit</button>
                        <button class="action-btn danger" onclick="deleteTransaction('${txn.id}')">Del</button>
                    </div>
                </td>
            ` : '';
            
            tbody.innerHTML += `
                <tr>
                    <td data-label="Time" class="mobile-hide text-muted fin-math small">${timeStr}</td>
                    <td data-label="Details">
                        <div class="tx-group small">${txn.mainGroup}</div>
                        <div class="tx-party">${txn.partyName}</div>
                        ${txn.refNote}
                    </td>
                    <td data-label="Mode" class="text-end text-md-center">${badgeHtml}</td>
                    <td data-label="Credit" class="text-end fw-bold text-success fin-math">${creditHtml}</td>
                    <td data-label="Debit" class="text-end fw-bold text-danger fin-math">${debitHtml}</td>
                    <td data-label="Drawer Bal" class="text-end mobile-hide fw-bold fin-math">
                        ${txn.payment_method === 'CASH' ? '₹ ' + txn.currentBalance.toFixed(2) : '<span class="text-muted fw-normal small" style="letter-spacing: 0;">N/A</span>'}
                    </td>
                    ${adminEditBtn}
                </tr>
            `;
        });
    } else {
        const colSpanCount = isAdmin ? 7 : 6;
        tbody.innerHTML = `<tr><td colspan="${colSpanCount}" class="text-center py-4 text-muted fin-math fw-semibold">No transactions found for this date.</td></tr>`;
    }

    animateMetric('display-sales-cash', cashSales);
    animateMetric('display-sales-upi', upiSales);
    animateMetric('display-expense', totalExpense);
    animateMetric('display-drawer', drawerCash);
}

/* ---------- Transaction Submissions ---------- */
function getSubmissionTimestamp() {
    const dateVal = document.getElementById('active-date').value;
    const now = new Date();
    const localString = `${dateVal}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    return new Date(localString).toISOString(); 
}

async function submitIncome() { 
    if(!currentShopId) return;
    const category = document.getElementById('income-category').value;
    const method = document.getElementById('income-method').value;
    const amount = parseFloat(document.getElementById('income-amount').value);
    const note = document.getElementById('income-note').value;
    
    if(!amount || amount <= 0) return Swal.fire('Invalid', 'Enter a valid amount.', 'error');

    const { error } = await supabaseClient.from('daily_transactions').insert([{
        shop_id: currentShopId, 
        transaction_type: 'INCOME', 
        category: category, 
        payment_method: method, 
        amount: amount,
        reference_note: note,
        status: 'open',
        created_at: getSubmissionTimestamp()
    }]);

    if (error) return Swal.fire('Error', error.message, 'error');
    
    document.getElementById('income-amount').value = '';
    document.getElementById('income-note').value = '';
    Swal.fire({ title: 'Logged', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    await loadDashboardData();
}

async function submitExpense() { 
    if(!currentShopId) return;
    const method = document.getElementById('expense-method').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    let note = document.getElementById('expense-note').value.trim();
    
    const smartId = document.getElementById('smart-expense-id').value;
    const smartType = document.getElementById('smart-expense-type').value;

    if(!smartId || !smartType) return Swal.fire('Missing Payee', 'Please search and click a payee classification from the dropdown.', 'warning');
    if(!amount || amount <= 0) return Swal.fire('Invalid', 'Enter valid amount.', 'error');

    let category = '';
    let vendor_id = null, staff_id = null;

    if (smartType === 'generic') {
        category = 'generic';
        
        const baseName = document.getElementById('smart-selected-name').innerText;
        if (note) {
            note = `${baseName} - ${note}`;
        } else {
            note = baseName;
        }
    } else if (smartType === 'staff') {
        category = 'staff';
        staff_id = smartId;
    } else {
        category = smartType; // 'vendor' or 'finance'
        vendor_id = smartId;
    }

    const { error: insertErr } = await supabaseClient.from('daily_transactions').insert([{
        shop_id: currentShopId, 
        transaction_type: 'EXPENSE', 
        category: category, 
        payment_method: method, 
        amount: amount, 
        reference_note: note, 
        vendor_id: vendor_id, 
        staff_id: staff_id,
        status: 'open',
        created_at: getSubmissionTimestamp()
    }]);

    if (insertErr) return Swal.fire('Error', insertErr.message, 'error');
    
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-note').value = '';
    clearSmartSelection();
    
    // Reload memory immediately so new overheads instantly appear in the search bar
    await loadDropdowns(currentShopId);

    Swal.fire({ title: 'Logged', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    await loadDashboardData();
}

/* ---------- Admin Actions ---------- */
async function editTransaction(txnId, currentAmount) {
    const { value: newAmountStr } = await Swal.fire({
        title: 'Edit Amount',
        input: 'number',
        inputValue: currentAmount,
        showCancelButton: true,
        confirmButtonColor: '#0f172a',
        confirmButtonText: 'Update'
    });

    if (!newAmountStr) return; 
    const newAmount = parseFloat(newAmountStr);
    if (isNaN(newAmount) || newAmount <= 0) return Swal.fire('Error', 'Invalid amount.', 'error');
    if (newAmount - currentAmount === 0) return; 

    const { error } = await supabaseClient.from('daily_transactions').update({ amount: newAmount }).eq('id', txnId);
    if (error) return Swal.fire('Error', error.message, 'error');

    Swal.fire({ title: 'Updated', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    await loadDashboardData();
}

async function deleteTransaction(txnId) {
    const result = await Swal.fire({
        title: 'Delete Record?',
        text: "Balances will auto-correct.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Delete'
    });

    if (result.isConfirmed) {
        const { error: delError } = await supabaseClient.from('daily_transactions').delete().eq('id', txnId);
        if (delError) return Swal.fire('Error', delError.message, 'error');
        
        await loadDropdowns(currentShopId); // Reload memory in case they deleted a unique overhead
        
        Swal.fire({ title: 'Deleted', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        await loadDashboardData();
    }
}
