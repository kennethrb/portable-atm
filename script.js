const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-OAfp8qXmXQKIKpuMyOw2HEjoLg4OqmXBlFYYpujs92XWwE-8_Kdg51C_FSi3LvQwpA/exec";

let currentInventory = { p100: 0, p500: 0, p1000: 0, totalBalance: 0 };
let adaptivePatternData = { p100Percent: 15, p500Percent: 20, p1000Percent: 65, mostUsed: "₱1,000", fastestDepleting: "₱500" };

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
        
        const type = document.getElementById('type')?.value;
        if (type === 'Withdrawal' || type === 'Cash Reload') {
            const firstDenomInput = document.getElementById('b100');
            if (firstDenomInput) {
                firstDenomInput.focus();
                firstDenomInput.select();
            }
        }
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

            if (m.adaptivePattern) {
                adaptivePatternData = m.adaptivePattern;
            }

            const setSafeText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.innerText = text;
            };

            setSafeText('dashBalance', '₱' + currentInventory.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }));
            
            const floatIndicator = document.getElementById('floatHealthIndicator');
            if (floatIndicator) {
                const bal = currentInventory.totalBalance;
                if (bal > 50000) {
                    floatIndicator.className = "px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center space-x-1";
                    floatIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>Online</span>`;
                } else if (bal >= 15000 && bal <= 50000) {
                    floatIndicator.className = "px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center space-x-1";
                    floatIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Warning</span>`;
                } else {
                    floatIndicator.className = "px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center space-x-1";
                    floatIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span><span>Critical</span>`;
                }
            }

            setSafeText('dashTodayWithdrawals', '₱' + Number(m.todayWithdrawals || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }));
            setSafeText('dashPendingSettlement', '₱' + Number(m.pendingSettlement || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }));
            
            setSafeText('dashCommissionReceivable', '₱' + Number(m.commissionReceivable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }));
            setSafeText('dashCommissionCoverage', `Coverage: ${m.previousMonthName || 'Previous Month'}`);
            setSafeText('dashCommissionPayBy', `Expected Payout: ${m.expectedPayoutDate || '15th of Current Month'}`);

            setSafeText('dashSettlementFunds', '₱' + Number(m.settlementFundsAvailable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }));

            // Update Customer Cash Pattern Card UI
            setSafeText('pattern100', adaptivePatternData.p100Percent + '%');
            setSafeText('pattern500', adaptivePatternData.p500Percent + '%');
            setSafeText('pattern1000', adaptivePatternData.p1000Percent + '%');
            setSafeText('patternMostUsed', adaptivePatternData.mostUsed);

            // Update Float Health Intelligence Card UI
            setSafeText('healthMostConsumed', adaptivePatternData.mostUsed);
            setSafeText('healthFastestDepleting', adaptivePatternData.fastestDepleting);
            setSafeText('healthRecommendedReload', '₱' + Math.max(20000, Math.round((m.todayWithdrawals || 5000) * 2)).toLocaleString('en-US'));

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
        // Adaptive Reload Recommendation Engine with Inventory Awareness
        let w100 = adaptivePatternData.p100Percent / 100;
        let w500 = adaptivePatternData.p500Percent / 100;
        let w1000 = adaptivePatternData.p1000Percent / 100;

        // Inventory Awareness Weight Boost: Boost low stock denominations
        if (currentInventory.p100 < 10) w100 *= 1.35;
        if (currentInventory.p500 < 10) w500 *= 1.35;
        if (currentInventory.p1000 < 10) w1000 *= 1.35;

        let totalWeight = w100 + w500 + w1000;
        let target100Amt = targetAmount * (w100 / totalWeight);
        let target500Amt = targetAmount * (w500 / totalWeight);
        let target1000Amt = targetAmount - target100Amt - target500Amt;

        needed100 = Math.floor(target100Amt / 100);
        needed500 = Math.floor(target500Amt / 500);
        needed1000 = Math.floor(target1000Amt / 1000);

        let distributedTotal = (needed100 * 100) + (needed500 * 500) + (needed1000 * 1000);
        let diff = targetAmount - distributedTotal;
        if (diff >= 1000) {
            let extra1000 = Math.floor(diff / 1000);
            needed1000 += extra1000;
            diff -= extra1000 * 1000;
        }
        if (diff >= 500) {
            needed500 += 1;
            diff -= 500;
        }
        if (diff >= 100) {
            needed100 += Math.round(diff / 100);
        }
    }

    const suggestionText = document.getElementById('suggestionText');
    const applyBtn = document.getElementById('applySuggestionBtn');

    if (targetAmount > 0 && (needed1000 > 0 || needed500 > 0 || needed100 > 0)) {
        if (suggestionText) {
            if (type === 'Cash Reload') {
                let amt100 = needed100 * 100;
                let amt500 = needed500 * 500;
                let amt1000 = needed1000 * 1000;
                suggestionText.innerHTML = `💡 <b>Adaptive Reload:</b> ₱100=₱${amt100.toLocaleString()} | ₱500=₱${amt500.toLocaleString()} | ₱1000=₱${amt1000.toLocaleString()}`;
            } else {
                suggestionText.innerHTML = `💡 <b>Suggested Breakdown:</b> ₱1,000 × ${needed1000} | ₱500 × ${needed500} | ₱100 × ${needed100}`;
            }
        }
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
        if (suggestionText) suggestionText.innerHTML = `⚠️ Cannot exact-match amount`;
        if (applyBtn) applyBtn.onclick = null;
        suggestionBox.classList.add('hidden');
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
