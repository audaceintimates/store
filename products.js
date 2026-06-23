let globalProducts = [];
let cart = [];
let currentProduct = null;

const INFINITE_BASE = "https://checkout.infinitepay.io/audaces?items=";
const STORE_URL = "https://audaceintimates.github.io/store/";

document.addEventListener('DOMContentLoaded', loadProducts);

async function loadProducts() {
    const res = await apiRequest({ action: 'getProducts' });
    if (res && res.success) {
        globalProducts = res.products;
        renderProducts();
    }
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML = '';
    globalProducts.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => openProductPage(prod);
        
        const imgSrc = (prod.img && prod.img.length > 0 && prod.img[0] !== '') ? prod.img[0] : '';
        
        div.innerHTML = `
            <img src="${imgSrc}" alt="${prod.productname}">
            <h3>${prod.productname}</h3>
            <p class="price">R$ ${parseFloat(prod.price || 0).toFixed(2)}</p>
        `;
        grid.appendChild(div);
    });
}

function openProductPage(prod) {
    currentProduct = prod;
    document.getElementById('prod-page-name').innerText = prod.productname;
    document.getElementById('prod-page-price').innerText = `R$ ${parseFloat(prod.price || 0).toFixed(2)}`;
    document.getElementById('prod-page-desc').innerHTML = marked.parse(prod.description || '');
    
    const imgCol = document.getElementById('prod-page-imgs');
    imgCol.innerHTML = '';
    
    if (prod.img && prod.img.length > 0) {
        const validImgs = prod.img.filter(src => src.trim() !== '');
        
        if (validImgs.length > 0) {
            if (!document.getElementById('gallery-style')) {
                const style = document.createElement('style');
                style.id = 'gallery-style';
                style.innerHTML = `
                    .gallery-track::-webkit-scrollbar { display: none; }
                    .gallery-track { -ms-overflow-style: none; scrollbar-width: none; }
                `;
                document.head.appendChild(style);
            }

            const galleryWrapper = document.createElement('div');
            galleryWrapper.style.position = 'relative';
            galleryWrapper.style.width = '100%';

            const track = document.createElement('div');
            track.className = 'gallery-track';
            track.style.display = 'flex';
            track.style.overflowX = 'auto';
            track.style.scrollSnapType = 'x mandatory';
            track.style.scrollBehavior = 'smooth';
            track.style.width = '100%';

            const dotsContainer = document.createElement('div');
            dotsContainer.style.display = 'flex';
            dotsContainer.style.justifyContent = 'center';
            dotsContainer.style.gap = '10px';
            dotsContainer.style.marginTop = '15px';

            validImgs.forEach((src, index) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.style.flex = '0 0 100%';
                imgWrapper.style.scrollSnapAlign = 'start';
                
                const img = document.createElement('img');
                img.src = src.trim();
                img.style.width = '100%';
                img.style.display = 'block';
                
                imgWrapper.appendChild(img);
                track.appendChild(imgWrapper);

                const dot = document.createElement('div');
                dot.style.width = '12px';
                dot.style.height = '12px';
                dot.style.borderRadius = '50%';
                dot.style.backgroundColor = index === 0 ? 'var(--text-color)' : 'var(--border)';
                dot.style.cursor = 'pointer';
                dot.style.transition = 'background-color 0.3s';
                
                dot.onclick = () => {
                    track.scrollTo({ left: track.clientWidth * index, behavior: 'smooth' });
                };
                
                dotsContainer.appendChild(dot);
            });

            track.addEventListener('scroll', () => {
                const scrollPos = track.scrollLeft;
                const index = Math.round(scrollPos / track.clientWidth);
                const dots = dotsContainer.children;
                for (let i = 0; i < dots.length; i++) {
                    dots[i].style.backgroundColor = i === index ? 'var(--text-color)' : 'var(--border)';
                }
            });

            galleryWrapper.appendChild(track);
            
            if (validImgs.length > 1) {
                galleryWrapper.appendChild(dotsContainer);
            }
            
            imgCol.appendChild(galleryWrapper);
        }
    }

    const infoCol = document.querySelector('.prod-info-col');
    const existingButtons = infoCol.querySelectorAll('.btn');
    existingButtons.forEach(b => b.remove());

    const existingQty = document.getElementById('prod-qty-container');
    if (existingQty) existingQty.remove();

    const maxQtd = parseInt(prod.qtd) || 1;
    const qtyContainer = document.createElement('div');
    qtyContainer.id = 'prod-qty-container';
    qtyContainer.style.margin = '15px 0';
    qtyContainer.innerHTML = `
        <label for="prod-qty" style="margin-right: 10px; font-weight: bold;">Quantidade:</label>
        <input type="number" id="prod-qty" min="1" max="${maxQtd}" value="1" style="width: 60px; padding: 5px; border-radius: 5px; border: 1px solid var(--border);">
        <span style="font-size: 0.9em; color: gray; margin-left: 10px;">(Estoque: ${maxQtd})</span>
    `;
    infoCol.appendChild(qtyContainer);

    const addCartBtn = document.createElement('button');
    addCartBtn.className = 'btn';
    addCartBtn.setAttribute('data-i18n', 'btn_add_cart');
    addCartBtn.innerText = 'Adicionar ao Carrinho';
    addCartBtn.onclick = () => checkAuthBeforeAction(addToCartCurrent);

    const buyNowBtn = document.createElement('button');
    buyNowBtn.className = 'btn mt-1';
    buyNowBtn.innerText = 'Comprar Agora';
    buyNowBtn.onclick = () => checkAuthBeforeAction(buyNowCurrent);

    infoCol.appendChild(addCartBtn);
    infoCol.appendChild(buyNowBtn);

    document.getElementById('product-page').classList.remove('hidden');
    if (typeof applyTranslations === 'function') applyTranslations();
}

function closeProductPage() {
    document.getElementById('product-page').classList.add('hidden');
}

function addToCartCurrent() {
    if (!currentProduct) return;
    
    const qtyInput = document.getElementById('prod-qty');
    const selectedQty = qtyInput ? parseInt(qtyInput.value) : 1;

    const existing = cart.find(i => i.code === currentProduct.code);
    if (!existing) {
        cart.push({ ...currentProduct, selected: true, qty: selectedQty });
        updateCartUI();
        alert("Adicionado ao carrinho!");
        closeProductPage();
    } else {
        alert("Produto já está no carrinho.");
    }
}

function buyNowCurrent() {
    if (!currentProduct) return;
    
    const qtyInput = document.getElementById('prod-qty');
    const selectedQty = qtyInput ? parseInt(qtyInput.value) : 1;

    const existingIndex = cart.findIndex(i => i.code === currentProduct.code);
    
    cart.forEach(item => item.selected = false);

    if (existingIndex === -1) {
        cart.push({ ...currentProduct, selected: true, qty: selectedQty });
    } else {
        cart[existingIndex].selected = true;
        cart[existingIndex].qty = selectedQty;
    }
    
    updateCartUI();
    closeProductPage();
    openCheckout();
}

function updateCartUI() {
    const count = cart.length;
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.innerText = count;
    
    const list = document.getElementById('cart-items');
    if (!list) return;
    list.innerHTML = '';
    cart.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <input type="checkbox" ${item.selected ? 'checked' : ''} onchange="toggleCartItem(${index}, this.checked)">
            <span>${item.productname} (x${item.qty || 1})</span>
            <span>R$ ${(parseFloat(item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
            <button onclick="removeFromCart(${index})" style="background:none;border:none;color:red;cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
        `;
        list.appendChild(div);
    });
}

function toggleCartItem(index, isChecked) {
    cart[index].selected = isChecked;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}
