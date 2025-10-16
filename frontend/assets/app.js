/* ===== app.js — dropdown tài khoản + bảo vệ guest + badge giỏ/wishlist ===== */
(function () {
  // ---------- helpers ----------
  const qs  = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const getJSON = (k, fb = null) => { try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{ return fb;} };
  const setJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ---------- auth ----------
  const auth     = getJSON('auth_user', null);              // {email, role, name}
  const isLogged = !!auth;
  const isAdmin  = isLogged && auth.role === 'admin';

  // ---------- dropdown account ----------
  function initAccountDropdown() {
    const wrap  = qs('.account-wrap');
    const btn   = qs('#accountBtn');
    const menu  = qs('.account-menu');
    if (!wrap || !btn || !menu) return;

    // Ẩn/hiện item theo trạng thái
    const loginItem    = qs('#loginItem');
    const registerItem = qs('#registerItem');
    const logoutItem   = qs('#logoutItem');

    if (isLogged) {
      if (loginItem)    loginItem.style.display = 'none';
      if (registerItem) registerItem.style.display = 'none';
      if (logoutItem)   logoutItem.style.display = '';
    } else {
      if (loginItem)    loginItem.style.display = '';
      if (registerItem) registerItem.style.display = '';
      if (logoutItem)   logoutItem.style.display = 'none';
    }

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
      }
    });

    // Đăng xuất
    if (logoutItem) {
      logoutItem.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('auth_user');
        alert('Đã đăng xuất.');
        location.href = 'index.html';
      });
    }
  }

  // ---------- bảo vệ các trang/đường dẫn cần login ----------
  function protectForGuest() {
    if (isLogged) return;
    const protectedPages = ['account.html', 'wishlist.html', 'cart.html'];
    // Chặn khi click link trên toàn site
    protectedPages.forEach(page => {
      qsa(`a[href="${page}"]`).forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          alert('Vui lòng đăng nhập để sử dụng chức năng này.');
          location.href = 'login.html';
        });
      });
    });
  }

  // ---------- hiển thị badge giỏ/wishlist ----------
  function updateBadges() {
    const cart = getJSON('cart', []);
    const wish = getJSON('wishlist', []);
    const cartCount = qs('#cartCount');
    const wishCount = qs('#wishCount');
    if (cartCount) cartCount.textContent = cart.length;
    if (wishCount) wishCount.textContent = wish.length;
  }

  // ---------- ẩn/hiện link Admin ----------
  function toggleAdminLink() {
    const navAdmin = qs('#navAdmin') || qs('a[href="admin-products.html"]');
    if (navAdmin) navAdmin.style.display = isAdmin ? '' : 'none';
  }

  // ---------- đảm bảo style dropdown + nút Lọc nhất quán (fallback) ----------
  function injectStyles() {
    const css = `
      .account-wrap{position:relative}
      .account-menu{
        position:absolute; right:0; top:44px; min-width:220px;
        background:#fff; border:1px solid var(--bd); border-radius:12px;
        box-shadow:0 10px 30px rgba(0,0,0,.08); padding:8px; display:none; z-index:50;
      }
      .account-menu.open{display:block}
      .account-item{display:block; padding:10px 12px; border-radius:10px}
      .account-item:hover{background:#f3f3f3}
      .badge-num{display:inline-flex; align-items:center; justify-content:center;
        min-width:18px; height:18px; padding:0 6px; margin-left:6px; border-radius:999px;
        background:#111; color:#fff; font-size:12px; font-weight:700}
      .hr{height:1px; background:var(--bd); margin:6px 0}
      /* chip (nút Lọc) */
      .chip{display:inline-flex;align-items:center;justify-content:center;
        min-height:36px;padding:8px 14px;border:1px solid var(--bd);border-radius:999px;
        background:#fff;color:#111;font-size:14px;font-weight:600;line-height:1}
      button.chip{cursor:pointer;background:#111;color:#fff;border-color:#111}
      button.chip:hover{filter:brightness(.95)}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    initAccountDropdown();
    protectForGuest();
    updateBadges();
    toggleAdminLink();
  });
})();

/* ===== CART MODULE (render từ localStorage, qty, remove, wishlist, totals) ===== */
(function(){
  const qs  = (s, r=document)=>r.querySelector(s);
  const qsa = (s, r=document)=>[...r.querySelectorAll(s)];
  const get = (k, fb=[]) => { try{const v=localStorage.getItem(k); return v?JSON.parse(v):fb;}catch{return fb;} };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function currency(n){ return (Number(n)||0).toLocaleString('vi-VN') + 'đ'; }

  function getCart(){ return get('cart', []); }
  function setCart(arr){ set('cart', arr); document.dispatchEvent(new CustomEvent('cart:changed')); }

  function updateTotals(){
    const cart = getCart();
    const subtotal = cart.reduce((s,i)=> s + i.price * i.qty, 0);
    qs('#sumSubtotal') && (qs('#sumSubtotal').textContent = currency(subtotal));
    qs('#sumShipping') && (qs('#sumShipping').textContent = subtotal>=1000000 || subtotal===0 ? 'Miễn phí' : currency(30000));
    const ship = subtotal>=1000000 || subtotal===0 ? 0 : 30000;
    const discount = 0;
    qs('#sumDiscount') && (qs('#sumDiscount').textContent = currency(discount));
    qs('#sumTotal') && (qs('#sumTotal').textContent = currency(subtotal + ship - discount));
    // badge on header
    const cartCount = qs('#cartCount'); if (cartCount) cartCount.textContent = cart.length;
  }

  function renderCart(){
    const wrap = qs('#cartList'); if(!wrap) return;
    const empty = qs('#cartEmpty');
    wrap.querySelectorAll('.cart-item').forEach(el=>el.remove());

    const cart = getCart();
    if (cart.length === 0){
      if (empty) empty.style.display='block';
      updateTotals();
      return;
    }
    if (empty) empty.style.display='none';

    cart.forEach((it, idx)=>{
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <img class="cart-thumb" src="${it.img||''}" alt="">
        <div>
          <div class="cart-name">${it.name}</div>
          <div class="cart-meta">Mã: ${it.id}${it.variant?(' • '+it.variant):''}</div>
          <div class="cart-actions">
            <span class="link move-to-wish" data-idx="${idx}">Thêm vào wishlist</span>
            <span class="link remove-item" data-idx="${idx}">Xóa</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="price" style="font-weight:800">${currency(it.price)}</div>
          <div class="qty" style="margin-top:8px">
            <button class="dec" data-idx="${idx}">-</button>
            <input class="qty-input" data-idx="${idx}" value="${it.qty}" />
            <button class="inc" data-idx="${idx}">+</button>
          </div>
        </div>`;
      wrap.appendChild(row);
    });

    // bind actions
    qsa('.inc', wrap).forEach(b=>b.addEventListener('click',()=>changeQty(+b.dataset.idx, +1)));
    qsa('.dec', wrap).forEach(b=>b.addEventListener('click',()=>changeQty(+b.dataset.idx, -1)));
    qsa('.qty-input', wrap).forEach(inp=>inp.addEventListener('change',()=>setQty(+inp.dataset.idx, +inp.value||1)));
    qsa('.remove-item', wrap).forEach(a=>a.addEventListener('click',()=>removeItem(+a.dataset.idx)));
    qsa('.move-to-wish', wrap).forEach(a=>a.addEventListener('click',()=>moveToWishlist(+a.dataset.idx)));

    updateTotals();
  }

  function changeQty(idx, delta){
    const cart = getCart();
    cart[idx].qty = Math.max(1, (cart[idx].qty||1) + delta);
    setCart(cart); renderCart();
  }
  function setQty(idx, v){
    const cart = getCart();
    cart[idx].qty = Math.max(1, v||1);
    setCart(cart); renderCart();
  }
  function removeItem(idx){
    const cart = getCart(); cart.splice(idx,1); setCart(cart); renderCart();
  }
  function moveToWishlist(idx){
    const cart = getCart();
    const item = cart[idx];
    const wish = get('wishlist', []);
    if (!wish.find(w=>w.id===item.id && w.variant===item.variant)){
      wish.push({id:item.id, name:item.name, price:item.price, img:item.img, variant:item.variant});
      localStorage.setItem('wishlist', JSON.stringify(wish));
    }
    cart.splice(idx,1); setCart(cart); renderCart();
    const wishCount = document.querySelector('#wishCount');
    if (wishCount) wishCount.textContent = wish.length;
    alert('Đã thêm vào wishlist.');
  }

  // “Gợi ý thêm”: nút Thêm vào giỏ ngay trên trang giỏ hàng
  document.addEventListener('DOMContentLoaded', ()=>{
    // Render cart khi vào trang
    renderCart();

    // bắt sự kiện add-to-cart ở block gợi ý
    document.body.addEventListener('click', (e)=>{
      const btn = e.target.closest('.add-to-cart'); if(!btn) return;
      const item = {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: Number(btn.dataset.price||0),
        img: btn.dataset.img||'',
        qty: Number(btn.dataset.qty||1),
        variant: btn.dataset.variant||''
      };
      const cart = getCart();
      const found = cart.findIndex(i=>i.id===item.id && i.variant===item.variant);
      if (found>=0) cart[found].qty += item.qty; else cart.push(item);
      setCart(cart);
      // nếu đang ở cart.html thì render lại
      if (document.getElementById('cartList')) renderCart();
    });

    // nút Thanh toán
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn){
      checkoutBtn.addEventListener('click', (e)=>{
        const hasItems = getCart().length>0;
        if (!hasItems){
          e.preventDefault();
          alert('Giỏ hàng đang trống.');
        }
      });
    }
  });

  // Cho các trang khác có nút .add-to-cart (data-*), dùng chung handler:
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.add-to-cart'); if(!btn) return;
    // (đã xử lý ở trên nếu ở cart.html; để chắc ăn ta vẫn thêm handler toàn cục)
  });

  // Khi cart đổi từ nơi khác -> cập nhật badges/totals
  document.addEventListener('cart:changed', ()=>{
    const cartCount = document.querySelector('#cartCount');
    const cart = get('cart', []);
    if (cartCount) cartCount.textContent = cart.length;
    if (document.getElementById('cartList')) renderCart();
  });
})();

/* ===== COUPON ENGINE (1 mã/đơn, hoặc tối đa 2 mã nếu khác loại; % trước -> đ) ===== */
(function(){
  const todayStr = () => new Date().toISOString().slice(0,10);
  const get = (k, fb=null)=>{ try{const v=localStorage.getItem(k); return v?JSON.parse(v):fb;}catch{return fb;} };
  const set = (k, v)=>localStorage.setItem(k, JSON.stringify(v));

  // applied coupons lưu tạm để checkout (và trang khác) cùng dùng
  function getApplied(){ return get('applied_coupons', []) || []; }
  function setApplied(arr){ set('applied_coupons', arr); document.dispatchEvent(new CustomEvent('coupon:changed')); }

  function listCoupons(){ return get('coupons', []) || []; }

  function findCouponByCode(code){
    const up = (code||'').trim().toUpperCase();
    let c = listCoupons().find(x=>x.code && x.code.toUpperCase()===up);
    // fallback demo
    if(!c && up==='GIA10'){ c = {code:'GIA10', type:'percent', value:10, min:0, expire:'', active:true}; }
    return c || null;
  }

  function validateCoupon(c, subtotal){
    if(!c) return {ok:false,msg:'Mã không tồn tại.'};
    if(!c.active) return {ok:false,msg:'Mã đang tắt.'};
    if(c.expire && c.expire < todayStr()) return {ok:false,msg:'Mã đã hết hạn.'};
    if(subtotal < (Number(c.min)||0)) return {ok:false,msg:'Chưa đạt giá trị tối thiểu.'};
    return {ok:true};
  }

  // Rule: 1 mã/đơn. Cho phép tối đa 2 nếu 2 loại khác nhau.
  function canAddCoupon(newC){
    const applied = getApplied();
    if (applied.some(c=>c.code.toUpperCase()===newC.code.toUpperCase()))
      return {ok:false, msg:'Mã đã áp dụng.'};

    if (applied.length===0) return {ok:true};

    if (applied.length===1){
      const first = applied[0];
      if (first.type !== newC.type) return {ok:true};
      return {ok:false, msg:'Chỉ cho phép 2 mã nếu khác loại (1% + 1 số tiền).'};
    }
    return {ok:false, msg:'Đã đạt giới hạn 2 mã.'};
  }

  // Tính giảm giá theo thứ tự: % trước -> cố định sau
  function calcDiscount(subtotal){
    const applied = getApplied();
    const arr = [...applied].sort((a,b)=>{
      if (a.type===b.type) return 0;
      return a.type==='percent' ? -1 : 1;
    });
    let discount = 0;
    let base = subtotal;
    for (const c of arr){
      if (c.type==='percent'){
        discount += Math.round(base * (Number(c.value)||0) / 100);
      } else {
        discount += Number(c.value)||0;
      }
      if (discount >= subtotal){ discount = subtotal; break; }
    }
    return discount;
  }

  // Public API
  const API = {
    getApplied,
    clear(){ setApplied([]); },
    removeAt(idx){ const a=getApplied(); a.splice(idx,1); setApplied(a); },
    add(code, subtotal){
      const c = findCouponByCode(code);
      if(!c) return {ok:false,msg:'Mã không tồn tại.'};
      const v = validateCoupon(c, subtotal);
      if(!v.ok) return v;
      const rule = canAddCoupon(c);
      if(!rule.ok) return rule;
      const a = getApplied(); a.push(c); setApplied(a);
      return {ok:true, coupon:c};
    },
    calcDiscount,
    // tiện ích format
    money(n){ return (Number(n)||0).toLocaleString('vi-VN')+'đ'; }
  };

  // gắn global
  window.CouponEngine = API;
})();
