const API_URL = "https://script.google.com/macros/s/AKfycbwmFW5JzBj_E1B5XeF3Cns2VPXCknFfUqKD9LUyW68-xkOsd2B2ypKInGLGOGmeZdoMsg/exec";
const NOTIFICATION_EMAIL = "useaudaceintimates@gmail.com";

let allProducts = [];
let cart = [];
let shippingMethod = null;
let currentProduct = null;
let currentSlide = 0; // Para o carrossel

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

function closeMenu() { document.getElementById("side-menu").style.width = "0"; }

// FUNÇÕES DE PREÇO E ESTOQUE (Suas originais)
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

async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        allProducts = data;
        renderProducts(allProducts);
        renderCategories(allProducts);
    } catch (error) { console.error("Erro:", error); }
}

function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = "";
    products.forEach(product => {
        const imgs = (product.Imagem || "").split(",");
        const firstImg = imgs[0].trim();
        const price = parsePrice(product.Preco);
        const stock = getStock(product);
        const isSoldOut = stock <= 0;
        
        const card = document.createElement('div');
        card.className = `product-card ${isSoldOut ? 'sold-out' : ''}`;
        card.onclick = () => openProductModal(product);
        card.innerHTML = `
            ${isSoldOut ? '<div class="sold-out-badge">ESGOTADO</div>' : ''}
            <img src="${firstImg}" onerror="this.src='https://via.placeholder.com/300'">
            <div class="product-info">
                <h3 class="product-name">${product.Nome}</h3>
                <p class="product-price">R$ ${price.toFixed(2).replace('.', ',')}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// MODAL COM CARROSSEL E SEUS BOTÕES ORIGINAIS
function openProductModal(product) {
    currentProduct = product;
    currentSlide = 0;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    const imgs = (product.Imagem || "").split(",").map(i => i.trim());
    const price = parsePrice(product.Preco);
    const stock = getStock(product);
    const isSoldOut = stock <= 0;

    // Gerar HTML do Carrossel
    let carouselHtml = `
        <div class="carousel-container">
            <div class="carousel-track" id="track">
                ${imgs.map(img => `<img src="${img}" class="carousel-item">`).join('')}
            </div>
            ${imgs.length > 1 ? `
                <button class="nav-btn prev-btn" onclick="moveSlide(-1, event)">❮</button>
                <button class="nav-btn next-btn" onclick="moveSlide(1, event)">❯</button>
            ` : ''}
        </div>
    `;

    let variationsHtml = product.Variacoes ? `
        <label><strong>Opção:</strong></label>
        <select id="modal-variation" class="variation-select">
            ${product.Variacoes.split(',').map(v => `<option value="${v.trim()}">${v.trim()}</option>`).join('')}
        </select>` : `<input type="hidden" id="modal-variation" value="Único">`;

    body.innerHTML = `
        ${carouselHtml}
        <h2>${product.Nome}</h2>
        <h3 style="margin: 10px 0;">R$ ${price.toFixed(2).replace('.', ',')}</h3>
        <p style="color:#666; font-size: 14px; margin-bottom: 15px;">${product.Descricao || ''}</p>
        ${variationsHtml}
        ${isSoldOut ? '<div style="background:red;color:white;padding:10px;text-align:center;border-radius:5px;">ESGOTADO</div>' : `
            <div style="margin: 15px 0;">
                <label><strong>Quantidade:</strong></label>
                <input type="number" id="modal-qty" value="1" min="1" max="${stock}" class="qty-input">
            </div>
            <div class="modal-actions">
                <button class="action-btn secondary" onclick="addToCartAndStay()">Adicionar ao Carrinho</button>
                <button class="action-btn" onclick="buyNow()">Comprar Agora</button>
            </div>
        `}
    `;
    modal.style.display = "block";
}

function moveSlide(step, event) {
    event.stopPropagation();
    const track = document.getElementById('track');
    const slides = document.querySelectorAll('.carousel-item');
    currentSlide = (currentSlide + step + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
}

// RESTANTE DA SUA LÓGICA (CARRINHO, INFINITEPAY, ETC) - IGUAL AO ORIGINAL
function addToCart(isBuyNow = false) {
    const qty = parseInt(document.getElementById('modal-qty').value) || 1;
    const variation = document.getElementById('modal-variation').value;
    const item = {
        name: currentProduct.Nome,
        price: parsePrice(currentProduct.Preco),
        image: currentProduct.Imagem.split(',')[0],
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

function renderCartItems() {
    const container = document.getElementById('cart-items');
    container.innerHTML = "";
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty;
        container.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>R$ ${item.price.toFixed(2).replace('.', ',')} | Qtd: ${item.qty}</p>
                </div>
                <div class="cart-controls">
                    <button onclick="changeQty(${index}, -1)">-</button>
                    <button onclick="changeQty(${index}, 1)">+</button>
                </div>
            </div>`;
    });
    document.getElementById('cart-total').innerText = "R$ " + total.toFixed(2).replace('.', ',');
}

// ... (Mantenha aqui as suas funções changeQty, selectShipping, submitOrder e redirectToPayment exatamente como estavam no seu original) ...

function openCart() {
    renderCartItems();
    document.getElementById('cart-modal').style.display = "block";
}

function closeCart() { document.getElementById('cart-modal').style.display = "none"; }
function closeProductModal() { document.getElementById('product-modal').style.display = "none"; }
