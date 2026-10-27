let currentShopId = null;
let currentShopName = 'Enterprise Shop';
let isAdmin = false;

// Chart Instances
let cashflowChartInst = null;
let expenseChartInst = null;

// Global Time State
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); 
let globalActivityDates = [];

function toLocalDateKey(isoString) {
    const d = new Date(isoString);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
}

window.addEventListener('DOMContentLoaded', async () => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    document.getElementById('global-month-filter').value = `${currentYear}-${monthStr}`;

    try {
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

        if (profile) {
            if (profile.role !== 'admin') {
                window.location.replace('dashboard.html');
                return;
            }
            currentShopId = profile.shop_id;
            isAdmin = true;

            const { data: shopData } = await supabaseClient
                .from('shops')
                .select('name')
                .eq('id', currentShopId)
                .single();
            if (shopData && shopData.name) currentShopName = shopData.name.toLowerCase(); // Lowercase per screenshot

            document.getElementById('admin-content').classList.remove('d-none');
            await fetchAnalyticsData();
        }
    } catch (err) {
        console.error('Analytics Init Error:', err);
    }
});

async function updateGlobalFilter() {
    const val = document.getElementById('global-month-filter').value;
    if (!val) return;
    const parts = val.split('-');
    currentYear = parseInt(parts[0], 10);
    currentMonth = parseInt(parts[1], 10) - 1;
    await fetchAnalyticsData();
}

async function changeGlobalMonth(step) {
    currentMonth += step;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
    }
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear -= 1;
    }

    const monthStr = String(currentMonth + 1).padStart(2, '0');
    document.getElementById('global-month-filter').value = `${currentYear}-${monthStr}`;
    await fetchAnalyticsData();
}

async function fetchAnalyticsData() {
    document.getElementById('loader-trend').classList.remove('d-none');
    document.getElementById('loader-expense').classList.remove('d-none');
    document.getElementById('loader-metrics').classList.remove('d-none');
    document.getElementById('loader-calendar').classList.remove('d-none');

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthPadded = String(currentMonth + 1).padStart(2, '0');

    const start = new Date(`${currentYear}-${monthPadded}-01T00:00:00`).toISOString();
    const end = new Date(`${currentYear}-${monthPadded}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999`).toISOString();

    const { data: txns, error } = await supabaseClient
        .from('daily_transactions')
        .select('*')
        .eq('shop_id', currentShopId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Analytics Fetch Error:', error);
        return;
    }

    const safeTxns = txns || [];
    processTrendData(safeTxns, currentYear, currentMonth, daysInMonth);
    processMTDData(safeTxns);
    extractActivityDates(safeTxns);
    renderCalendar(daysInMonth);
}

function extractActivityDates(txns) {
    const dates = new Set();
    txns.forEach(t => {
        const isSweep = t.reference_note && (t.reference_note.includes('Transferred to Master Vault') || t.reference_note.includes('Automated'));
        if (!isSweep) {
            dates.add(toLocalDateKey(t.created_at));
        }
    });
    globalActivityDates = Array.from(dates);
}

function processTrendData(txns, year, month, daysInMonth) {
    const datesMap = {};
    const today = new Date();
    let endDay = daysInMonth;

    if (year === today.getFullYear() && month === today.getMonth()) {
        endDay = today.getDate();
    }

    const monthPadded = String(month + 1).padStart(2, '0');
    for (let i = 1; i <= endDay; i++) {
        const dStr = `${year}-${monthPadded}-${String(i).padStart(2, '0')}`;
        datesMap[dStr] = { in: 0, out: 0 };
    }

    txns.forEach(t => {
        const dStr = toLocalDateKey(t.created_at);
        if (!datesMap[dStr]) return;

        const isSweep = t.reference_note && (t.reference_note.includes('Transferred to Master Vault') || t.reference_note.includes('Automated'));
        if (t.transaction_type === 'INCOME') datesMap[dStr].in += parseFloat(t.amount);
        if (t.transaction_type === 'EXPENSE' && !isSweep) datesMap[dStr].out += parseFloat(t.amount);
    });

    const labels = Object.keys(datesMap).sort();
    const incomeData = labels.map(l => datesMap[l].in);
    const expenseData = labels.map(l => datesMap[l].out);
    const displayLabels = labels.map(l => l.split('-')[2]);

    document.getElementById('loader-trend').classList.add('d-none');

    if (cashflowChartInst) cashflowChartInst.destroy();
    cashflowChartInst = new Chart(document.getElementById('cashflowChart'), {
        type: 'line',
        data: {
            labels: displayLabels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.08)',
                    fill: true,
                    tension: 0.25,
                    pointRadius: 2,
                    borderWidth: 2
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.06)',
                    fill: true,
                    tension: 0.25,
                    pointRadius: 2,
                    borderWidth: 2
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 10,
                        usePointStyle: true,
                        font: { family: 'Plus Jakarta Sans', weight: '700', size: 11 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Plus Jakarta Sans', weight: '600', size: 10 } }
                },
                y: {
                    grid: { color: '#e5e7eb' },
                    ticks: { font: { family: 'Plus Jakarta Sans', weight: '600', size: 10 } }
                }
            }
        }
    });
}

function processMTDData(txns) {
    let mtdIncome = 0;
    let mtdExpense = 0;
    let mtdCashIncome = 0;
    let mtdUpiIncome = 0;

    const incomeCats = {};
    const expenseCats = {};

    txns.forEach(t => {
        const amt = parseFloat(t.amount);
        const isSweep = t.reference_note && (t.reference_note.includes('Transferred to Master Vault') || t.reference_note.includes('Automated'));
        const cat = (t.category || 'OTHER').toUpperCase();

        if (t.transaction_type === 'INCOME') {
            mtdIncome += amt;
            incomeCats[cat] = (incomeCats[cat] || 0) + amt;

            if (t.payment_method === 'CASH') mtdCashIncome += amt;
            if (t.payment_method === 'UPI') mtdUpiIncome += amt;
        } else if (t.transaction_type === 'EXPENSE' && !isSweep) {
            mtdExpense += amt;
            let expenseName = cat;
            if (t.reference_note && t.reference_note.trim().length > 0) {
                expenseName = t.reference_note.split(' - ')[0].toUpperCase();
            }
            expenseCats[expenseName] = (expenseCats[expenseName] || 0) + amt;
        }
    });

    document.getElementById('mtd-income').innerText = mtdIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('mtd-expense').innerText = mtdExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('mtd-cash-in').innerText = mtdCashIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('mtd-upi-in').innerText = mtdUpiIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const net = mtdIncome - mtdExpense;
    const netEl = document.getElementById('mtd-profit');
    netEl.innerText = `${net >= 0 ? '+' : '-'} ₹ ${Math.abs(net).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    netEl.style.color = net >= 0 ? '#4ade80' : '#f87171';

    const sortedInc = Object.keys(incomeCats)
        .map(k => ({ name: k, total: incomeCats[k] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    const maxInc = sortedInc.length ? sortedInc[0].total : 0;
    let incHtml = '';

    sortedInc.forEach((i, idx) => {
        const pct = maxInc > 0 ? Math.max(4, (i.total / maxInc) * 100) : 0;
        incHtml += `
            <div class="rank-row">
                <div class="rank-badge">${idx + 1}</div>
                <div class="rank-body">
                    <div class="rank-top">
                        <span class="rank-name">${i.name}</span>
                        <span class="rank-amt text-success">₹ ${i.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="rank-bar-track"><div class="rank-bar-fill up" style="width:${pct}%;"></div></div>
                </div>
            </div>`;
    });
    document.getElementById('top-income-list').innerHTML = incHtml || '<div class="empty-note">No income recorded for this period.</div>';

    const sortedExp = Object.keys(expenseCats)
        .map(k => ({ name: k, total: expenseCats[k] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    const maxExp = sortedExp.length ? sortedExp[0].total : 0;
    let expHtml = '';

    sortedExp.forEach((e, idx) => {
        const pct = maxExp > 0 ? Math.max(4, (e.total / maxExp) * 100) : 0;
        expHtml += `
            <div class="rank-row">
                <div class="rank-badge">${idx + 1}</div>
                <div class="rank-body">
                    <div class="rank-top">
                        <span class="rank-name">${e.name}</span>
                        <span class="rank-amt text-danger">₹ ${e.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="rank-bar-track"><div class="rank-bar-fill down" style="width:${pct}%;"></div></div>
                </div>
            </div>`;
    });
    document.getElementById('top-expense-list').innerHTML = expHtml || '<div class="empty-note">No expenses recorded for this period.</div>';

    document.getElementById('loader-metrics').classList.add('d-none');
    document.getElementById('loader-expense').classList.add('d-none');

    if (expenseChartInst) expenseChartInst.destroy();
    expenseChartInst = new Chart(document.getElementById('expenseChart'), {
        type: 'doughnut',
        data: {
            labels: sortedExp.length ? sortedExp.map(e => e.name) : ['NO EXPENSE'],
            datasets: [{
                data: sortedExp.length ? sortedExp.map(e => e.total) : [1],
                backgroundColor: sortedExp.length
                    ? ['#0f172a', '#dc2626', '#2563eb', '#475569', '#94a3b8']
                    : ['#e5e7eb'],
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        usePointStyle: true,
                        font: { size: 10, family: 'Plus Jakarta Sans', weight: '700' }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function renderCalendar(daysInMonth) {
    document.getElementById('monthYearDisplay').innerText = new Date(currentYear, currentMonth).toLocaleString('en-IN', {
        month: 'long',
        year: 'numeric'
    });

    const calBody = document.getElementById('calendarBody');
    calBody.innerHTML = '';

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const today = new Date();
    const isCurrentMonth = (currentYear === today.getFullYear() && currentMonth === today.getMonth());

    for (let i = 0; i < firstDayIndex; i++) {
        calBody.innerHTML += `<div class="calendar-day empty-slot"></div>`;
    }

    const mStr = String(currentMonth + 1).padStart(2, '0');
    for (let day = 1; day <= daysInMonth; day++) {
        const dStr = String(day).padStart(2, '0');
        const dateKey = `${currentYear}-${mStr}-${dStr}`;

        const dotHtml = globalActivityDates.includes(dateKey) ? `<div class="activity-dot"></div>` : '';
        const todayClass = (isCurrentMonth && day === today.getDate()) ? ' is-today' : '';
        calBody.innerHTML += `<div class="calendar-day${todayClass}" onclick="buildDailyCashbook('${dateKey}')">${day}${dotHtml}</div>`;
    }

    document.getElementById('loader-calendar').classList.add('d-none');
}

/* ======================================================================
   ENTERPRISE CATEGORIZED DAYBOOK 
   ====================================================================== */
async function buildDailyCashbook(dateKey) {
    // 1. Setup UI
    document.getElementById('cb-shop-name').innerText = currentShopName;
    const dateObj = new Date(dateKey);
    
    // Formatting: DD / MM / YYYY
    const dDay = String(dateObj.getDate()).padStart(2, '0');
    const dMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dYear = dateObj.getFullYear();
    document.getElementById('cb-date').innerText = `${dDay} / ${dMonth} / ${dYear}`;
    
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    document.getElementById('cb-day').innerText = dayNames[dateObj.getDay()];

    const tbody = document.getElementById('cashbook-body');
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-5 text-muted fw-semibold"><div class="spinner-border spinner-border-sm text-secondary me-2"></div>Categorizing daybook...</td></tr>`;
    new bootstrap.Modal(document.getElementById('cashbookModal')).show();

    // 2. Define timezone boundaries
    const startOfDay = new Date(`${dateKey}T00:00:00`).toISOString();
    const endOfDay = new Date(`${dateKey}T23:59:59.999`).toISOString();

    // 3. Fetch day transactions
    const { data: dayTxns, error: dayError } = await supabaseClient
        .from('daily_transactions')
        .select('*, vendors(name), staff(name)')
        .eq('shop_id', currentShopId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

    if (dayError) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-danger fw-bold">Database Error</td></tr>`;
        return;
    }

    // 4. Categorize Data
    let incCash = [], incUpi = [];
    let expCash = [], expUpi = [];
    let expWage = [];
    
    if (dayTxns) {
        dayTxns.forEach(tx => {
            const isSweep = tx.reference_note && (tx.reference_note.includes('Transferred to Master Vault') || tx.reference_note.includes('Automated'));
            if (isSweep) return;

            const amt = parseFloat(tx.amount);
            const isIncome = tx.transaction_type === 'INCOME';
            const isCash = tx.payment_method === 'CASH';

            // Resolve name
            let name = tx.reference_note || tx.category.toUpperCase();
            if (tx.category === 'vendor' && tx.vendors) name = tx.vendors.name;
            else if (tx.category === 'finance' && tx.vendors) name = tx.vendors.name;
            else if (tx.category === 'staff' && tx.staff) name = tx.staff.name;

            // Route to buckets based on the screenshot logic
            if (isIncome) {
                if (isCash) incCash.push({name, amt});
                else incUpi.push({name, amt});
            } else {
                if (tx.category === 'staff') {
                    expWage.push({name, amt});
                } else if (isCash) {
                    expCash.push({name, amt});
                } else {
                    expUpi.push({name, amt});
                }
            }
        });
    }

    // 5. Build HTML (Mobile block-card style exactly matching screenshot)
    let rowsHtml = '';
    
    const generateRow = (name, dr, cr) => {
        const drStr = dr ? dr.toFixed(2) : '-';
        const crStr = cr ? cr.toFixed(2) : '-';
        
        // Desktop uses tr/td, Mobile uses flex cards via CSS media query override
        return `
            <tr class="mobile-card-row">
                <td data-label="Particulars" class="item-indent">${name}</td>
                <td data-label="Dr (Out)" class="text-end fin-math">${drStr}</td>
                <td data-label="Cr (In)" class="text-end fin-math">${crStr}</td>
            </tr>
        `;
    };

    // --- INCOME ---
    if (incCash.length > 0 || incUpi.length > 0) {
        rowsHtml += `<tr class="group-header"><td colspan="3">Income</td></tr>`;
        incCash.forEach(i => rowsHtml += generateRow(`CASH: ${i.name}`, null, i.amt));
        incUpi.forEach(i => rowsHtml += generateRow(`UPI: ${i.name}`, null, i.amt));
    }

    // --- CASH EXPENSE ---
    if (expCash.length > 0) {
        rowsHtml += `<tr class="group-header"><td colspan="3">Expense (Cash)</td></tr>`;
        expCash.forEach(e => rowsHtml += generateRow(e.name, e.amt, null));
    }

    // --- DIGITAL EXPENSE ---
    if (expUpi.length > 0) {
        rowsHtml += `<tr class="group-header"><td colspan="3">Expense (GPay / Digital)</td></tr>`;
        expUpi.forEach(e => rowsHtml += generateRow(e.name, e.amt, null));
    }

    // --- WAGE ---
    if (expWage.length > 0) {
        rowsHtml += `<tr class="group-header"><td colspan="3">Wage</td></tr>`;
        expWage.forEach(w => rowsHtml += generateRow(w.name, w.amt, null));
    }

    if (rowsHtml === '') {
        rowsHtml = `<tr><td colspan="3" class="text-center py-5 text-muted fw-semibold">No transactions logged for this date.</td></tr>`;
    }

    tbody.innerHTML = rowsHtml;
}

/* ---------- Print / PDF Handlers ---------- */
async function printCashbook() {
    window.print();
}
