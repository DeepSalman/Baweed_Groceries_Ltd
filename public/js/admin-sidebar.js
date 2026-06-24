async function initAdmin() {
    try {
        const res  = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.user || data.user.role !== 'admin') {
            window.location.href = '/admin/login.html';
            return;
        }
        renderSidebar(data.user);
    } catch {
        window.location.href = '/admin/login.html';
    }
}

function renderSidebar(user) {
    const cur  = window.location.pathname;
    const links = [
        { href: '/admin/dashboard.html', label: 'Dashboard' },
        { href: '/admin/products.html',  label: 'Products' },
        { href: '/admin/suppliers.html', label: 'Suppliers' },
        { href: '/admin/inventory.html', label: 'Inventory' },
        { href: '/admin/invoices.html',  label: 'Invoices' },
        { href: '/admin/orders.html',    label: 'Orders' },
    ];

    document.getElementById('adminSidebar').innerHTML = `
        <aside class="min-h-screen w-60 bg-gray-900 text-white flex flex-col">
            <div class="p-5 border-b border-gray-700">
                <p class="font-bold text-green-400 text-lg">Baweed Groceries</p>
                <p class="text-xs text-gray-400 mt-0.5">Admin Panel</p>
            </div>
            <nav class="flex-1 p-3">
                <ul class="space-y-0.5">
                    ${links.map(l => `
                        <li>
                            <a href="${l.href}"
                               class="flex items-center px-3 py-2 rounded-lg text-sm transition-colors
                                      ${cur === l.href
                                          ? 'bg-green-700 text-white font-semibold'
                                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'}">
                                ${l.label}
                            </a>
                        </li>`).join('')}
                </ul>
            </nav>
            <div class="p-4 border-t border-gray-700 space-y-2">
                <p class="text-xs text-gray-400 truncate">${user.full_name}</p>
                <a href="/" class="block text-center text-xs text-gray-400 hover:text-white py-1">
                    View Store
                </a>
                <button onclick="adminLogout()"
                        class="w-full py-1.5 rounded-lg border border-red-700 text-red-400
                               hover:bg-red-700 hover:text-white text-xs transition-colors">
                    Logout
                </button>
            </div>
        </aside>`;
}

async function adminLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
}

function showToast(msg, type = 'success') {
    let t = document.getElementById('adminToast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'adminToast';
        t.className = 'toast toast-top toast-end z-50';
        document.body.appendChild(t);
    }
    t.innerHTML = `<div class="alert alert-${type} shadow text-sm"><span>${msg}</span></div>`;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}
