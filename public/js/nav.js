async function loadNav() {
    const container = document.getElementById('navbar');
    if (!container) return;

    let user = null;
    let cartCount = 0;

    try {
        const [authRes, cartRes] = await Promise.all([
            fetch('/api/auth/me'),
            fetch('/api/cart')
        ]);
        const authData = await authRes.json().catch(() => ({}));
        const cartData = await cartRes.json().catch(() => ({}));
        user      = authData.user || null;
        cartCount = (cartData.items || []).reduce((sum, i) => sum + i.quantity, 0);
    } catch {}

    container.innerHTML = `
        <div class="navbar bg-white shadow-sm px-4 lg:px-8 sticky top-0 z-40">
            <div class="flex-1">
                <a href="/" class="text-xl font-bold text-green-700">Baweed Groceries Ltd</a>
            </div>
            <div class="flex-none items-center gap-1">
                <a href="/products.html" class="btn btn-ghost btn-sm">Products</a>
                <a href="/cart.html" class="btn btn-ghost btn-sm gap-1">
                    Cart
                    ${cartCount > 0
                        ? `<div class="badge badge-primary badge-sm">${cartCount}</div>`
                        : ''}
                </a>
                ${user ? `
                    <div class="dropdown dropdown-end">
                        <label tabindex="0" class="btn btn-ghost btn-sm">
                            ${user.full_name.split(' ')[0]}
                        </label>
                        <ul tabindex="0" class="menu menu-sm dropdown-content bg-base-100 rounded-box shadow-lg mt-2 p-2 w-44 z-50">
                            ${user.role === 'admin'
                                ? `<li><a href="/admin/dashboard.html">Admin Panel</a></li>`
                                : `<li><a href="/orders.html">My Orders</a></li>`}
                            <li><a href="#" onclick="logout(event)">Logout</a></li>
                        </ul>
                    </div>
                ` : `
                    <a href="/login.html" class="btn btn-ghost btn-sm">Login</a>
                    <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
                `}
            </div>
        </div>
    `;
}

async function logout(e) {
    e && e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}

loadNav();
