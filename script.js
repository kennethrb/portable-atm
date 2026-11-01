const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-OAfp8qXmXQKIKpuMyOw2HEjoLg4OqmXBlFYYpujs92XWwE-8_Kdg51C_FSi3LvQwpA/exec";

let currentInventory = { p100: 0, p500: 0, p1000: 0, totalBalance: 0 };

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('date').valueAsDate = new Date();
    fetchDashboardMetrics();

    document.getElementById('amount').addEventListener('input', () => {
        calculateSuggestedDenominations();
        updateFeeCalculator();
    });
    
    document.getElementById('type').addEventListener('change', () => {
        toggleFields();
        updateFeeCalculator();
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW registration failed:', err));
    }
});

function setQuickAmount(val) {
    document.getElementById('amount').value = val;
    calculateSuggestedDenominations();
    updateFeeCalculator();
}

function updateFeeCalculator() {
    const type = document.getElementById('type').value;
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const calcBox = document.getElementById('feeCalculatorBox');
    const feeLabel = document.getElementById('calcFeeLabel');
    const totalCollect = document.getElementById('calcTotalCollect');

    if (type === 'Withdrawal') {
        calcBox.classList.remove('hidden');
        feeLabel.innerText = "₱14.00";
        totalCollect.innerText = '₱' + (amount + 14).toLocaleString('en-US', { minimumFractionDigits: 2 });
    } else if (type === 'Balance Inquiry') {
        calcBox.classList.remove('hidden');
        feeLabel.innerText = "₱5.00";
        totalCollect.innerText = '₱5.00';
    } else {
        calcBox.classList.add('hidden');
    }
}

function toggleFields() {
    const type = document.getElementById('type').value;
    const denomTitle = document.getElementById('denomTitle');
    const quickPills = document.getElementById('quickAmountContainer');
    
    if (type === 'Cash Reload') {
        denomTitle.innerText = "Bills Added (IN)";
        denomTitle.className = "text-xs font-semibold text-emerald-400 uppercase tracking-wider";
        quickPills.classList.remove('hidden');
        calculateSuggestedDenominations();
    } else if (type === 'Withdrawal') {
        denomTitle.innerText = "Bills Dispensed (OUT)";
        denomTitle.className = "text-xs font-semibold text-amber-400 uppercase tracking-wider";
        quickPills.classList.remove('hidden');
        calculateSuggestedDenominations();
    } else {
        denomTitle.innerText = "No Bills (Balance Inquiry)";
        denomTitle.className = "text-xs font-semibold text-slate-400 uppercase tracking-wider";
        quickPills.classList.add('hidden');
        document.getElementById('suggestionBox').classList.add('hidden');
    }
}

async function fetchDashboardMetrics() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();

        if (data.status === 'success') {
            const m = data.metrics;
            currentInventory.totalBalance = parseFloat(m.currentBalance) || 0;
            currentInventory.p100 = parseInt(m.b100Remaining) || 0;
            currentInventory.p500 = parseInt(m.b500Remaining) || 0;
            currentInventory.p1000 = parseInt(m.b1000Remaining) || 0;

            document.getElementById('dashBalance').innerText = '₱' + currentInventory.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 });
            document.getElementById('dashTodayWithdrawals').innerText = '₱' + Number(m.todayWithdrawals || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
            document.getElementById('dashPendingSettlement').innerText = '₱' + Number(m.pendingSettlement || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
            document.getElementById('dashCommissionReceivable').innerText = '₱' + Number(m.commissionReceivable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

            // Settlement Status Logic (Green if 0, Yellow if pending exists)
            const settlementIndicator = document.getElementById('settlementStatusIndicator');
            const pendingVal = parseFloat(m.pendingSettlement) || 0;
            if (pendingVal > 0) {
                settlementIndicator.className = "px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20";
                settlementIndicator.innerText = "Pending";
            } else {
                settlementIndicator.className = "px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20";
                settlementIndicator.innerText = "No Pending";
            }

            document.getElementById('dash100').innerText = currentInventory.p100;
            document.getElementById('dash500').innerText = currentInventory.p500;
            document.getElementById('dash1000').innerText = currentInventory.p1000;

            checkLowStockAlerts();

            if (data.recentHistory) {
                renderRecentHistory(data.recentHistory);
            }
        }
    } catch (err) {
        console.error("❌ Error fetching metrics:", err);
    }
}

function renderRecentHistory(logs) {
    const feed = document.getElementById('historyFeed');
    if (logs.length === 0) {
        feed.innerHTML = `<div class="text-center text-xs text-slate-500 py-3">No recent transactions logged yet.</div>`;
        return;
    }

    feed.innerHTML = logs.map(tx => {
        const isReload = tx.type === 'Cash Reload';
        const isBalance = tx.type === 'Balance Inquiry';
        const color = isReload ? 'text-emerald-400' : isBalance ? 'text-indigo-400' : 'text-amber-400';
        const sign = isReload ? '+' : isBalance ? '' : '-';

        return `
            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <div>
                    <div class="flex items-center space-x-2">
                        <span class="font-bold text-white">${tx.type}</span>
                        <span class="text-[10px] text-slate-500 font-mono">${tx.reference}</span>
                    </div>
                    <span class="text-[10px] text-slate-400">${tx.date}</span>
                </div>
                <span class="font-extrabold ${color}">
                    ${sign}₱${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            </div>
        `;
    }).join('');
}

function checkLowStockAlerts() {
    const alertBox = document.getElementById('lowStockAlert');
    const alertText = document.getElementById('lowStockText');
    let warnings = [];
    const LOW_THRESHOLD = 10;

    if (currentInventory.p1000 < LOW_THRESHOLD) warnings.push(`₱1,000 bills low (${currentInventory.p1000})`);
    if (currentInventory.p500 < LOW_THRESHOLD) warnings.push(`₱500 bills low (${currentInventory.p500})`);
    if (currentInventory.p100 < LOW_THRESHOLD) warnings.push(`₱100 bills low (${currentInventory.p100})`);
    if (currentInventory.totalBalance < 15000) warnings.push(`Low balance (₱${currentInventory.totalBalance.toLocaleString()})`);

    if (warnings.length > 0) {
        alertText.innerHTML = `⚠️ <b>Alert:</b> ${warnings.join(' • ')}`;
        alertBox.classList.remove('hidden');
    } else {
        alertBox.classList.add('hidden');
    }
}

function triggerQuickReload() {
    document.getElementById('type').value = 'Cash Reload';
    toggleFields();
    document.getElementById('amount').focus();
    setQuickAmount(20000);
    window.scrollTo({ top: document.getElementById('atmForm').offsetTop, behavior: 'smooth' });
}

function calculateSuggestedDenominations() {
    const type = document.getElementById('type').value;
    const suggestionBox = document.getElementById('suggestionBox');
    
    if (type === 'Balance Inquiry') {
        suggestionBox.classList.add('hidden');
        return;
    }

    let targetAmount = parseInt(document.getElementById('amount').value) || 0;
    if (targetAmount <= 0) {
        suggestionBox.classList.add('hidden');
        return;
    }

    let needed1000 = 0, needed500 = 0, needed100 = 0;
    let remaining = targetAmount;

    if (type === 'Withdrawal') {
        let stock1000 = currentInventory.p1000;
        let stock500 = currentInventory.p500;
        let stock100 = currentInventory.p100;

        if (remaining >= 1000 && stock1000 > 0) {
            needed1000 = Math.floor(remaining / 1000);
            if (needed1000 > stock1000) needed1000 = stock1000;
            remaining -= needed1000 * 1000;
        }

        if (remaining >= 500 && stock500 > 0) {
            needed500 = Math.floor(remaining / 500);
            if (needed500 > stock500) needed500 = stock500;
            remaining -= needed500 * 500;
        }

        if (remaining >= 100 && stock100 > 0) {
            needed100 = Math.floor(remaining / 100);
            if (needed100 > stock100) needed100 = stock100;
            remaining -= needed100 * 100;
        }
    } else if (type === 'Cash Reload') {
        let target100 = 0;
        if (currentInventory.p100 < 30 && remaining >= 100) {
            let needed100Count = Math.min(30 - currentInventory.p100, Math.floor(remaining / 100));
            target100 = needed100Count;
            remaining -= target100 * 100;
        }

        let target500 = 0;
        if (currentInventory.p500 < 20 && remaining >= 500) {
            let needed500Count = Math.min(20 - currentInventory.p500, Math.floor(remaining / 500));
            target500 = needed500Count;
            remaining -= target500 * 500;
        }

        if (remaining >= 5000) {
            let extra500 = Math.floor((remaining * 0.2) / 500);
            target500 += extra500;
            remaining -= extra500 * 500;
        }

        let target1000 = Math.floor(remaining / 1000);
        remaining -= target1000 * 1000;

        if (remaining >= 100) {
            target100 += Math.floor(remaining / 100);
            remaining %= 100;
        }

        needed1000 = target1000;
        needed500 = target500;
        needed100 = target100;
    }

    const suggestionText = document.getElementById('suggestionText');
    const applyBtn = document.getElementById('applySuggestionBtn');

    if (remaining === 0 && (needed1000 > 0 || needed500 > 0 || needed100 > 0)) {
        suggestionText.innerHTML = `💡 <b>Suggested Breakdown:</b> ₱1,000 × ${needed1000} | ₱500 × ${needed500} | ₱100 × ${needed100}`;
        suggestionBox.classList.remove('hidden');

        applyBtn.onclick = function() {
            document.getElementById('b1000').value = needed1000;
            document.getElementById('b500').value = needed500;
            document.getElementById('b100').value = needed100;
            suggestionBox.classList.add('hidden');
        };
    } else {
        suggestionText.innerHTML = `⚠️ Cannot exact-match amount (remainder: ₱${remaining})`;
        applyBtn.onclick = null;
        suggestionBox.classList.remove('hidden');
    }
}

document.getElementById('atmForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const status = document.getElementById('statusMessage');

    const type = document.getElementById('type').value;
    let rawAmount = parseFloat(document.getElementById('amount').value) || 0;

    if (type === 'Withdrawal' && rawAmount > 10000) {
        status.innerText = "❌ Policy Violation: Maximum withdrawal per transaction is ₱10,000.";
        status.className = "mt-4 text-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 p-3 rounded-xl";
        status.classList.remove('hidden');
        return;
    }
    
    btn.disabled = true;
    btn.innerText = "Submitting...";
    status.classList.add('hidden');

    let amount = rawAmount;
    if (type === 'Withdrawal' && amount > 0) amount = -amount;

    const b100 = document.getElementById('b100').value;
    const b500 = document.getElementById('b500').value;
    const b1000 = document.getElementById('b1000').value;

    const payload = {
        date: document.getElementById('date').value,
        reference: document.getElementById('reference').value,
        amount: amount,
        type: type,
        b100_in: type === 'Cash Reload' ? b100 : "",
        b500_in: type === 'Cash Reload' ? b500 : "",
        b1000_in: type === 'Cash Reload' ? b1000 : "",
        b100_out: type === 'Withdrawal' ? b100 : "",
        b500_out: type === 'Withdrawal' ? b500 : "",
        b1000_out: type === 'Withdrawal' ? b1000 : ""
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.status === 'success') {
            status.innerText = "✅ Transaction successfully recorded!";
            status.className = "mt-4 text-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 p-3 rounded-xl";
            status.classList.remove('hidden');
            document.getElementById('atmForm').reset();
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('suggestionBox').classList.add('hidden');
            updateFeeCalculator();
            setTimeout(fetchDashboardMetrics, 1200);
        } else {
            status.innerText = "❌ Server Error: " + (result.message || "Failed to record.");
            status.className = "mt-4 text-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 p-3 rounded-xl";
            status.classList.remove('hidden');
        }
    } catch (err) {
        status.innerText = "❌ Network error. Transaction was not confirmed.";
        status.className = "mt-4 text-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 p-3 rounded-xl";
        status.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerText = "Authorize Transaction";
    }
});
