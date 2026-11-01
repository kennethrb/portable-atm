// Replace this with your actual Google Apps Script Web App URL
const SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// Set today's date by default on load
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('date').valueAsDate = new Date();
    fetchDashboardMetrics();
});

function toggleFields() {
    const type = document.getElementById('type').value;
    const denomTitle = document.getElementById('denomTitle');
    if (type === 'Cash Reload') {
        denomTitle.innerText = "Bills Added (IN)";
        denomTitle.className = "text-sm font-semibold text-emerald-400 uppercase tracking-wider";
    } else if (type === 'Withdrawal') {
        denomTitle.innerText = "Bills Dispensed (OUT)";
        denomTitle.className = "text-sm font-semibold text-amber-400 uppercase tracking-wider";
    } else {
        denomTitle.innerText = "No Bills (Balance Inquiry)";
        denomTitle.className = "text-sm font-semibold text-slate-400 uppercase tracking-wider";
    }
}

async function fetchDashboardMetrics() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        if (data.status === 'success') {
            const m = data.metrics;
            document.getElementById('dashBalance').innerText = '₱' + Number(m.currentBalance).toLocaleString();
            document.getElementById('dashFees').innerText = '₱' + Number(m.totalFees).toLocaleString();
            document.getElementById('dash100').innerText = m.b100Remaining;
            document.getElementById('dash500').innerText = m.b500Remaining;
            document.getElementById('dash1000').innerText = m.b1000Remaining;
        }
    } catch (err) {
        console.error("Error fetching dashboard metrics:", err);
    }
}

document.getElementById('atmForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const status = document.getElementById('statusMessage');
    
    btn.disabled = true;
    btn.innerText = "Submitting...";
    status.classList.add('hidden');

    const type = document.getElementById('type').value;
    let amount = parseFloat(document.getElementById('amount').value) || 0;
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
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        status.innerText = "✅ Transaction successfully recorded!";
        status.className = "mt-4 text-center text-sm text-emerald-400 font-semibold";
        status.classList.remove('hidden');
        document.getElementById('atmForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        
        // Refresh dashboard metrics after a brief delay to allow sheet sync
        setTimeout(fetchDashboardMetrics, 1500);
    } catch (err) {
        status.innerText = "❌ Error submitting transaction. Please try again.";
        status.className = "mt-4 text-center text-sm text-rose-400 font-semibold";
        status.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit Transaction";
    }
});
