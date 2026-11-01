const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-OAfp8qXmXQKIKpuMyOw2HEjoLg4OqmXBlFYYpujs92XWwE-8_Kdg51C_FSi3LvQwpA/exec";

let currentInventory = { p100: 0, p500: 0, p1000: 0, totalBalance: 0 };

document.addEventListener("DOMContentLoaded", () => {
    const dateField = document.getElementById('date');
    if (dateField) dateField.valueAsDate = new Date();
    fetchDashboardMetrics();

    const amountField = document.getElementById('amount');
    if (amountField) {
        amountField.addEventListener('input', () => {
            calculateSuggestedDenominations();
            updateFeeCalculator();
        });

        // ⬇️ Auto-focus jump when pressing Enter on Amount ⬇️
        amountField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const type = document.getElementById('type')?.value;
                if (type === 'Withdrawal' || type === 'Cash Reload') {
                    const firstDenomInput = document.getElementById('b100');
                    if (firstDenomInput) {
                        firstDenomInput.focus();
                        firstDenomInput.select();
                    }
                } else {
                    const submitBtn = document.getElementById('submitBtn');
                    if (submitBtn) submitBtn.focus();
                }
            }
        });
    }
    
    const typeField = document.getElementById('type');
    if (typeField) {
        typeField.addEventListener('change', () => {
            toggleFields();
            updateFeeCalculator();
        });
    }

    // ⬇️ Bill Denominations Keyboard Cascade (b100 -> b500 -> b1000 -> Submit) ⬇️
    ['b100', 'b500', 'b1000'].forEach((id, index, arr) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index < arr.length - 1) {
                        const nextInput = document.getElementById(arr[index + 1]);
                        if (nextInput) {
                            nextInput.focus();
                            nextInput.select();
                        }
                    } else {
                        const submitBtn = document.getElementById('submitBtn');
                        if (submitBtn) submitBtn.focus();
                    }
                }
            });
        }
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW registration failed:', err));
    }
});

function setQuickAmount(val) {
    const amountField = document.getElementById('amount');
    if (amountField) {
        amountField.value = val;
        calculateSuggestedDenominations();
        updateFeeCalculator();
        
        // ⬇️ ADD THIS ENTIRE BLOCK INSIDE setQuickAmount ⬇️
        const type = document.getElementById('type')?.value;
        if (type === 'Withdrawal' || type === 'Cash Reload') {
            const firstDenomInput = document.getElementById('b100');
            if (firstDenomInput) {
                firstDenomInput.focus();
                firstDenomInput.select();
            }
        }
        // ⬆️ END OF ADDITION ⬆️
    }
}

function updateFeeCalculator() {
    const type = document.getElementById('type')?.value;
    const amount = parseFloat(document.getElementById('amount')?.value) || 0;
    const calcBox = document.getElementById('feeCalculatorBox');
    const feeLabel = document.getElementById('calcFeeLabel');
    const totalCollect = document.getElementById('calcTotalCollect');

    if (!calcBox) return;

    if (type === 'Withdrawal') {
        calcBox.classList.remove('hidden');
        if (feeLabel) feeLabel.innerText = "₱14.00";
        if (totalCollect) totalCollect.innerText = '₱' + (amount + 14).toLocaleString('en-US', { minimumFractionDigits: 2 });
    } else if (type === 'Balance Inquiry') {
        calcBox.classList.remove('hidden');
        if (feeLabel) feeLabel.innerText = "₱5.00";
        if (totalCollect) totalCollect.innerText = '₱5.00';
    } else {
        calcBox.classList.add('hidden');
    }
}

function toggleFields() {
    const type = document.getElementById('type')?.value;
    const denomTitle = document.getElementById('denomTitle');
    const quickPills = document.getElementById('quickAmountContainer');
    const denomSection = document.getElementById('denomSection');
    const suggestionBox = document.getElementById('suggestionBox');
    
    if (type === 'Cash Reload') {
        if (denomSection) denomSection.classList.remove('hidden');
        if (denomTitle) {
            denomTitle.innerText = "Bills Added (IN)";
            denomTitle.className = "text-xs font-semibold text-emerald-400 uppercase tracking-wider";
        }
        if (quickPills) quickPills.classList.remove('hidden');
        calculateSuggestedDenominations();
    } else if (type === 'Withdrawal') {
        if (denomSection) denomSection.classList.remove('hidden');
        if (denomTitle) {
            denomTitle.innerText = "Bills Dispensed (OUT)";
            denomTitle.className = "text-xs font-semibold text-amber-400 uppercase tracking-wider";
        }
        if (quickPills) quickPills.classList.remove('hidden');
        calculateSuggestedDenominations();
    } else {
        if (denomSection) denomSection.classList.add('hidden');
        if (quickPills) quickPills.classList.add('hidden');
        if (suggestionBox) suggestionBox.classList.add('hidden');
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

            const setSafeText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.innerText = text;
            };

            setSafeText('dashBalance', '₱' + currentInventory.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }));
            
            // Update Float Health indicator based on Physical Cash Float totalBalance
            const floatIndicator = document.getElementById('floatHealthIndicator');
            if (floatIndicator) {
                const bal = currentInventory.totalBalance;
                if (bal > 50000) {
                    floatIndicator.className = "px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center space-x-1";
                    floatIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>Green</span>`;
                } else if (bal >= 15000 && bal <= 50000) {
                    floatIndicator.className = "px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center space-x-1";
                    floatIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Yellow</span>`;
                } else {
                    floatIndicator.className = "px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center space-x-1";
                    floatIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span><span>Red</span>`;
                }
            }

            setSafeText('dashTodayWithdrawals', '₱' + Number(m.todayWithdrawals || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }));
            setSafeText('dashPendingSettlement', '₱' + Number(m.pendingSettlement || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }));
            
            // Commission Receivable KPI Synchronization
            setSafeText('dashCommissionReceivable', '₱' + Number(m.commissionReceivable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }));
            setSafeText('dashCommissionCoverage', `Coverage: ${m.previousMonthName || 'Previous Month'}`);
            setSafeText('dashCommissionPayBy', `Expected Payout: ${m.expectedPayoutDate || '15th of Current Month'}`);

            const settlementIndicator = document.getElementById('settlementStatusIndicator');
            const pendingVal = parseFloat(m.pendingSettlement) || 0;
            if (settlementIndicator) {
                if (pendingVal > 0) {
                    settlementIndicator.className = "px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20";
                    settlementIndicator.innerText = "Pending";
                } else {
                    settlementIndicator.className = "px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20";
                    settlementIndicator.innerText = "No Pending";
                }
            }

            setSafeText('dash100', currentInventory.p100);
            setSafeText('dash500', currentInventory.p500);
            setSafeText('dash1000', currentInventory.p1000);

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
    if (!feed) return;

    if (!logs || logs.length === 0) {
        feed.innerHTML = `<div class="text-center text-xs text-slate-500 py-3">No recent transactions logged yet.</div>`;
        return;
    }

    feed.innerHTML = logs.map(tx => {
        const isReload = tx.type === 'Cash Reload' || tx.type === 'Settlement Received';
        const isBalance = tx.type === 'Balance Inquiry';
        const color = isReload ? 'text-emerald-400' : isBalance ? 'text-indigo-400' : 'text-amber-400';
        const sign = isReload && tx.type !== 'Settlement Received' ? '+' : isBalance ? '' : tx.type === 'Settlement Received' ? '+' : '-';

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
    if (!alertBox || !alertText) return;

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
    const typeField = document.getElementById('type');
    const amountField = document.getElementById('amount');
    const atmForm = document.getElementById('atmForm');

    if (typeField) typeField.value = 'Cash Reload';
    toggleFields();
    if (amountField) amountField.focus();
    setQuickAmount(20000);
    if (atmForm) window.scrollTo({ top: atmForm.offsetTop, behavior: 'smooth' });
}

function calculateSuggestedDenominations() {
    const type = document.getElementById('type')?.value;
    const suggestionBox = document.getElementById('suggestionBox');
    if (!suggestionBox) return;
    
    if (type === 'Balance Inquiry') {
        suggestionBox.classList.add('hidden');
        return;
    }

    let targetAmount = parseInt(document.getElementById('amount')?.value) || 0;
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
        if (suggestionText) suggestionText.innerHTML = `💡 <b>Suggested Breakdown:</b> ₱1,000 × ${needed1000} | ₱500 × ${needed500} | ₱100 × ${needed100}`;
        suggestionBox.classList.remove('hidden');

        if (applyBtn) {
            applyBtn.onclick = function() {
                const b1000 = document.getElementById('b1000');
                const b500 = document.getElementById('b500');
                const b100 = document.getElementById('b100');
                if (b1000) b1000.value = needed1000;
                if (b500) b500.value = needed500;
                if (b100) b100.value = needed100;
                suggestionBox.classList.add('hidden');
            };
        }
    } else {
        if (suggestionText) suggestionText.innerHTML = `⚠️ Cannot exact-match amount (remainder: ₱${remaining})`;
        if (applyBtn) applyBtn.onclick = null;
        suggestionBox.classList.remove('hidden');
    }
}

const atmForm = document.getElementById('atmForm');
if (atmForm) {
    atmForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const status = document.getElementById('statusMessage');

        const type = document.getElementById('type').value;
        let rawAmount = parseFloat(document.getElementById('amount').value) || 0;

        if (type === 'Withdrawal' && rawAmount > 10000) {
            if (status) {
                status.innerText = "❌ Policy Violation: Maximum withdrawal per transaction is ₱10,000.";
                status.className = "mt-4 text-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 p-3 rounded-xl";
                status.classList.remove('hidden');
            }
            return;
        }

        // Denomination Validation Safeguard
        if (type === 'Withdrawal' || type === 'Cash Reload') {
            const b100Count = parseInt(document.getElementById('b100')?.value) || 0;
            const b500Count = parseInt(document.getElementById('b500')?.value) || 0;
            const b1000Count = parseInt(document.getElementById('b1000')?.value) || 0;
            const calculatedDenomTotal = (b100Count * 100) + (b500Count * 500) + (b1000Count * 1000);

            if (calculatedDenomTotal > 0 && calculatedDenomTotal !== rawAmount) {
                if (status) {
                    status.innerText = `❌ Mismatch: Bills total (₱${calculatedDenomTotal.toLocaleString()}) does not match Amount (₱${rawAmount.toLocaleString()})`;
                    status.className = "mt-4 text-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 p-3 rounded-xl";
                    status.classList.remove('hidden');
                }
                return;
            }
        }
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`;
        }
        if (status) status.classList.add('hidden');

        let amount = rawAmount;
        if (type === 'Withdrawal' && amount > 0) amount = -amount;

        const b100 = document.getElementById('b100')?.value || "";
        const b500 = document.getElementById('b500')?.value || "";
        const b1000 = document.getElementById('b1000')?.value || "";
        const dateVal = document.getElementById('date')?.value || "";
        const refVal = document.getElementById('reference')?.value || "";

        const payload = {
            date: dateVal,
            reference: refVal,
            amount: amount,
            type: type,
            b100_in: type === 'Cash Reload' || type === 'Settlement Received' ? b100 : "",
            b500_in: type === 'Cash Reload' || type === 'Settlement Received' ? b500 : "",
            b1000_in: type === 'Cash Reload' || type === 'Settlement Received' ? b1000 : "",
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
                if (status) {
                    status.innerText = "✅ Transaction successfully recorded!";
                    status.className = "mt-4 text-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 p-3 rounded-xl";
                    status.classList.remove('hidden');
                }
                atmForm.reset();
                const dateField = document.getElementById('date');
                if (dateField) dateField.valueAsDate = new Date();
                const suggestionBox = document.getElementById('suggestionBox');
                if (suggestionBox) suggestionBox.classList.add('hidden');
                updateFeeCalculator();
                setTimeout(fetchDashboardMetrics, 1200);
            } else {
                if (status) {
                    status.innerText = "❌ Server Error: " + (result.message || "Failed to record.");
                    status.className = "mt-4 text-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 p-3 rounded-xl";
                    status.classList.remove('hidden');
                }
            }
        } catch (err) {
            if (status) {
                status.innerText = "❌ Network error. Transaction was not confirmed.";
                status.className = "mt-4 text-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 p-3 rounded-xl";
                status.classList.remove('hidden');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Authorize Transaction";
            }
        }
    });
}

function showToast(message, type = 'success') {
    // Remove existing toast if any
    const existingToast = document.getElementById('toastNotification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toastNotification';
    const bgClass = type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/90 border-rose-500/40 text-rose-300';
    
    toast.className = `fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-xl border ${bgClass} shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center space-x-2 transition-all duration-300 animate-bounce`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    ['b100', 'b500', 'b1000'].forEach((id, index, arr) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index < arr.length - 1) {
                        // Move to next bill input box
                        const nextInput = document.getElementById(arr[index + 1]);
                        if (nextInput) {
                            nextInput.focus();
                            nextInput.select();
                        }
                    } else {
                        // Reached the last bill box, jump straight to the Submit button
                        const submitBtn = document.getElementById('submitBtn');
                        if (submitBtn) submitBtn.focus();
                    }
                }
            });
        }
    });
});
