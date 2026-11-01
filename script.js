// Replace this with your actual Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-OAfp8qXmXQKIKpuMyOw2HEjoLg4OqmXBlFYYpujs92XWwE-8_Kdg51C_FSi3LvQwpA/exec";

// Global variable to store live stock fetched from dashboard
let currentInventory = { p100: 0, p500: 0, p1000: 0 };

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('date').valueAsDate = new Date();
    fetchDashboardMetrics();

    // Listen to input and dropdown changes to trigger smart denomination suggestions
    document.getElementById('amount').addEventListener('input', calculateSuggestedDenominations);
    document.getElementById('type').addEventListener('change', calculateSuggestedDenominations);
});

function toggleFields() {
    const type = document.getElementById('type').value;
    const denomTitle = document.getElementById('denomTitle');
    
    if (type === 'Cash Reload') {
        denomTitle.innerText = "Bills Added (IN)";
        denomTitle.className = "text-xs font-semibold text-emerald-400 uppercase tracking-wider";
        calculateSuggestedDenominations();
    } else if (type === 'Withdrawal') {
        denomTitle.innerText = "Bills Dispensed (OUT)";
        denomTitle.className = "text-xs font-semibold text-amber-400 uppercase tracking-wider";
        calculateSuggestedDenominations();
    } else {
        denomTitle.innerText = "No Bills (Balance Inquiry)";
        denomTitle.className = "text-xs font-semibold text-slate-400 uppercase tracking-wider";
        document.getElementById('suggestionBox').classList.add('hidden');
    }
}

async function fetchDashboardMetrics() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        if (data.status === 'success') {
            const m = data.metrics;
            document.getElementById('dashBalance').innerText = '₱' + Number(m.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 });
            document.getElementById('dashFees').innerText = '₱' + Number(m.totalFees).toLocaleString('en-US', { minimumFractionDigits: 2 });
            
            // Save inventory for withdrawal calculation
            currentInventory.p100 = parseInt(m.b100Remaining) || 0;
            currentInventory.p500 = parseInt(m.b500Remaining) || 0;
            currentInventory.p1000 = parseInt(m.b1000Remaining) || 0;

            document.getElementById('dash100').innerText = currentInventory.p100;
            document.getElementById('dash500').innerText = currentInventory.p500;
            document.getElementById('dash1000').innerText = currentInventory.p1000;
        }
    } catch (err) {
        console.error("Error fetching dashboard metrics:", err);
    }
}

// 💡 Smart Denomination Suggestion Logic (Handles both Withdrawal & Cash Reload)
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
        // --- Withdrawal Logic (Tray Inventory Constraint) ---
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
        // --- Cash Reload Logic (Optimal Denomination Breakdown) ---
        if (remaining >= 1000) {
            needed1000 = Math.floor(remaining / 1000);
            remaining -= needed1000 * 1000;
        }

        if (remaining >= 500) {
            needed500 = Math.floor(remaining / 500);
            remaining -= needed500 * 500;
        }

        if (remaining >= 100) {
            needed100 = Math.floor(remaining / 100);
            remaining -= needed100 * 100;
        }
    }

    const suggestionText = document.getElementById('suggestionText');
    const applyBtn = document.getElementById('applySuggestionBtn');

    if (remaining === 0 && (needed1000 > 0 || needed500 > 0 || needed100 > 0)) {
        suggestionText.innerHTML = `💡 <b>Suggested Reload:</b> ₱1,000 × ${needed1000} | ₱500 × ${needed500} | ₱100 × ${needed100}`;
        suggestionBox.classList.remove('hidden');

        // Attach action to apply button
        applyBtn.onclick = function() {
            document.getElementById('b1000').value = needed1000;
            document.getElementById('b500').value = needed500;
            document.getElementById('b100').value = needed100;
            suggestionBox.classList.add('hidden');
        };
    } else {
        suggestionText.innerHTML = `⚠️ Amount must be a multiple of ₱100 (remainder: ₱${remaining})`;
        applyBtn.onclick = null;
        suggestionBox.classList.remove('hidden');
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
        status.className = "mt-4 text-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 p-3 rounded-xl";
        status.classList.remove('hidden');
        document.getElementById('atmForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('suggestionBox').classList.add('hidden');
        
        setTimeout(fetchDashboardMetrics, 1500);
    } catch (err) {
        status.innerText = "❌ Error submitting transaction. Please try again.";
        status.className = "mt-4 text-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 p-3 rounded-xl";
        status.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerText = "Authorize Transaction";
    }
});
