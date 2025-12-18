// Link da sua API Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbwmFW5JzBj_E1B5XeF3Cns2VPXCknFfUqKD9LUyW68-xkOsd2B2ypKInGLGOGmeZdoMsg/exec";

// E-mail para receber notificações (FormSubmit)
const NOTIFICATION_EMAIL = "useaudaceintimates@gmail.com";

// Estado da Aplicação
let allProducts = [];
let cart = [];
let shippingMethod = null;
let currentSlideIndex = 0; // Controle do Carrossel

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allProducts.filter(p => (p.Nome || '').toLowerCase().includes(term));
            renderProducts(filtered);
        });
    }

    const menuBtn = document.getElementById('menu-btn');
    if(menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.getElementById("side-menu").style.width = "250px";
        });
    }
});

function closeMenu() {
    document.getElementById("side-menu").style.width = "0";
}

async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        allProducts = data;
        renderProducts(allProducts);
        renderCategories(allProducts);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        document.getElementById('products-container').innerHTML = `<p>Erro ao carregar produtos.</p>`;
    }
}

function parsePrice(priceValue) {
    if (typeof priceValue === 'number') return priceValue;
    if (!priceValue) return 0;
    let stringPrice = priceValue.toString().replace('R$', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(stringPrice) || 0;
}

function getStock(product) {
    if (product.Estoque === undefined || product.Estoque === "" || product.Estoque === null) return 999;
    return parseInt(product.Estoque);
}

// 2. Renderiza os Cards (Pega a 1ª imagem da lista)
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = "";

    products.forEach(product => {
        const nome = product.Nome || "Produto sem nome";
        
        // Trata múltiplas imagens: pega apenas a primeira para o Card
        const listaImagens = (product.Imagem || "").split(",").map(img => img.trim());
        const imagemPrincipal = listaImagens[0] || "https://via.placeholder.com/300?text=Sem+Imagem";

        const price = parsePrice(product.Preco);
        const stock = getStock(product);
        const isSoldOut = stock <= 0;
        
        const card = document.createElement('div');
        card.className = `product-card ${isSoldOut ? 'sold-out' : ''}`;
        card.onclick = () => openProductModal(product);

        card.innerHTML = `
            ${isSoldOut ? '<div class="sold-out-badge">ESGOTADO</div>' : ''}
            <img src="${imagemPrincipal}" alt="${nome}" onerror="this.src='https://via.placeholder.com/300?text=Erro+Imagem'">
            <div class="product-info">
                <h3 class="product-name">${nome}</h3>
                <p class="product-price">R$ ${price.toFixed(2).replace('.', ',')}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderCategories(products) {
    const categories = [...new Set(products.map(p => p.Categoria))].filter(c => c && c.trim() !== '');
    const list = document.getElementById('category-list');
    list.innerHTML = "";
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerText = cat; btn.className = 'cat-btn';
        btn.onclick = () => filterCategory(cat);
        list.appendChild(btn);
    });
}

function filterCategory(category) {
    const filtered = category === 'all' ? allProducts : allProducts.filter(p => p.Categoria === category);
    renderProducts(filtered);
    closeMenu();
}

// 4. Modal com Carrossel de Fotos
let currentProduct = null;

function openProductModal(product) {
    currentProduct = product;
    currentSlideIndex = 0; // Reseta o slide ao abrir
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    const listaImagens = (product.Imagem || "").split(",").map(img => img.trim()).filter(img => img !== "");
    const nome = product.Nome || "Produto";
    const price = parsePrice(product.Preco);
    const stock = getStock(product);

    // Montagem do HTML do Carrossel
    let carouselHtml = '';
    if (listaImagens.length > 1) {
        carouselHtml = `
            <div class="carousel">
                <div class="carousel-inner" id="carousel-inner">
                    ${listaImagens.map(img => `<img src="${img}" class="carousel-img">`).join('')}
                </div>
                <button class="carousel-prev" onclick="changeSlide(-1)">&#10094;</button>
                <button class="carousel-next" onclick="changeSlide(1)">&#10095;</button>
                <div class="carousel-dots">
                    ${listaImagens.map((_, i) => `<span class="dot ${i===0?'active':''}" onclick="setSlide(${i})"></span>`).join('')}
                </div>
            </div>`;
    } else {
        carouselHtml = `<img src="${listaImagens[0] || 'https://via.placeholder.com/300'}" class="modal-img">`;
    }

    let variationsHtml = product.Variacoes ? `
        <label><strong>Opção:</strong></label>
        <select id="modal-variation" class="variation-select">
            ${product.Variacoes.split(',').map(v => `<option value="${v.trim()}">${v.trim()}</option>`).join('')}
        </select>` : `<input type="hidden" id="modal-variation" value="Único">`;

    body.innerHTML = `
        ${carouselHtml}
        <h2>${nome}</h2>
        <h3 style="margin: 10px 0;">R$ ${price.toFixed(2).replace('.', ',')}</h3>
        <p style="color:#666; font-size: 14px; margin-bottom: 15px;">${product.Descricao || "Sem descrição."}</p>
        ${variationsHtml}
        <div id="modal-controls">
            ${stock > 0 ? `
                <div style="margin: 15px 0;">
                    <label><strong>Quantidade:</strong></label>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                        <input type="number" id="modal-qty" value="1" min="1" max="${stock}" class="qty-input">
                        <span style="font-size:12px; color:#666;">(Disp: ${stock})</span>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="action-btn secondary" onclick="addToCartAndStay()">Carrinho</button>
                    <button class="action-btn" onclick="buyNow()">Comprar Agora</button>
                </div>
            ` : `<div class="sold-out-msg">PRODUTO ESGOTADO</div>`}
        </div>
    `;
    modal.style.display = "block";
}

// Funções de Controle do Carrossel
function changeSlide(n) {
    const slides = document.querySelectorAll('.carousel-img');
    if (slides.length === 0) return;
    currentSlideIndex = (currentSlideIndex + n + slides.length) % slides.length;
    updateCarousel();
}

function setSlide(n) {
    currentSlideIndex = n;
    updateCarousel();
}

function updateCarousel() {
    const inner = document.getElementById('carousel-inner');
    const dots = document.querySelectorAll('.dot');
    if (inner) {
        inner.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    }
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlideIndex);
    });
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = "none";
}

// 5. Carrinho (Usa a primeira imagem para o ícone no carrinho)
function addToCart(isBuyNow = false) {
    const qty = parseInt(document.getElementById('modal-qty').value) || 1;
    const variation = document.getElementById('modal-variation').value;
    const listaImagens = (currentProduct.Imagem || "").split(",");
    
    const item = {
        name: currentProduct.Nome,
        price: parsePrice(currentProduct.Preco),
        image: listaImagens[0].trim(), // Salva a imagem principal no carrinho
        variation: variation,
        qty: qty
    };

    const existing = cart.find(i => i.name === item.name && i.variation === item.variation);
    if(existing) existing.qty += qty; else cart.push(item);

    updateCartCount();
    closeProductModal();
    if(isBuyNow) openCart();
}

function addToCartAndStay() { addToCart(false); }
function buyNow() { addToCart(true); }

function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.reduce((acc, item) => acc + item.qty, 0);
}

function openCart() {
    document.getElementById('cart-modal').style.display = "block";
    renderCartItems();
}

function closeCart() {
    document.getElementById('cart-modal').style.display = "none";
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    container.innerHTML = "";
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>R$ ${item.price.toFixed(2).replace('.', ',')} x ${item.qty}</p>
            </div>
            <div class="cart-controls">
                <button onclick="changeQty(${index}, -1)">-</button>
                <button onclick="changeQty(${index}, 1)">+</button>
            </div>
        `;
        container.appendChild(div);
    });
    document.getElementById('cart-total').innerText = "R$ " + total.toFixed(2).replace('.', ',');
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if(cart[index].qty <= 0) cart.splice(index, 1);
    renderCartItems();
    updateCartCount();
}

function selectShipping(method) {
    shippingMethod = method;
    document.getElementById('customer-form').style.display = "block";
    document.getElementById('checkout-btn').style.display = "block";
    document.getElementById('shipping-message').style.display = "block";
}

function submitOrder() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const email = document.getElementById('cust-email').value;
    const address = document.getElementById('cust-address').value;

    if(!name || !phone || !email || !address) return alert("Preencha todos os campos!");

    const btn = document.getElementById('checkout-btn');
    btn.innerText = "Processando...";
    btn.disabled = true;

    let orderSummary = cart.map(item => `- ${item.name} (${item.variation}) | Qtd: ${item.qty}`).join('\n');
    let totalVal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const formData = {
        _subject: "Novo Pedido - Audace Intimates",
        Cliente: name,
        Telefone: phone,
        Total: `R$ ${totalVal.toFixed(2)}`,
        Produtos: orderSummary
    };

    fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(() => redirectToPayment())
    .catch(() => redirectToPayment());
}

function redirectToPayment() {
    const itemsStrings = cart.map(item => {
        const priceInt = Math.round(item.price * 100);
        return `{"name":"${item.name}","price":${priceInt},"quantity":${item.qty}}`;
    });
    const baseUrl = "https://checkout.infinitepay.io/audaces";
    const redirectUrl = "https://wa.me/5549914014398?text=Pagamento%20Confirmado!";
    window.location.href = `${baseUrl}?items=[${itemsStrings.join(',')}]&redirect_url=${redirectUrl}`;
}

window.onclick = function(event) {
    if (event.target.className === 'modal') event.target.style.display = "none";
}
