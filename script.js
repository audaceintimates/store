const API_URL = "https://script.google.com/macros/s/AKfycbwmFW5JzBj_E1B5XeF3Cns2VPXCknFfUqKD9LUyW68-xkOsd2B2ypKInGLGOGmeZdoMsg/exec";
const NOTIFICATION_EMAIL = "useaudaceintimates@gmail.com";

let allProducts = [];
let cart = [];
let currentSlide = 0;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    // Pesquisa
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allProducts.filter(p => (p.Nome || '').toLowerCase().includes(term));
        renderProducts(filtered);
    });

    // Menu
    document.getElementById('menu-btn')?.addEventListener('click', () => {
        document.getElementById("side-menu").style.width = "280px";
    });
});

function closeMenu() { document.getElementById("side-menu").style.width = "0"; }

async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        allProducts = await response.json();
        renderProducts(allProducts);
        renderCategories(allProducts);
    } catch (e) { console.error("Erro:", e); }
}

function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = "";
    products.forEach(p => {
        const imgs = (p.Imagem || "").split(",");
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openProductModal(p);
        card.innerHTML = `
            <img src="${imgs[0].trim()}" onerror="this.src='https://via.placeholder.com/300'">
            <div class="product-info">
                <h3 class="product-name">${p.Nome}</h3>
                <p class="product-price">R$ ${parseFloat(p.Preco || 0).toFixed(2).replace('.',',')}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function openProductModal(product) {
    const body = document.getElementById('modal-body');
    const imgs = (product.Imagem || "").split(",").map(i => i.trim());
    currentSlide = 0;

    let carouselHtml = `
        <div class="carousel-container">
            <div class="carousel-track" id="track">
                ${imgs.map(img => `<img src="${img}" class="carousel-item">`).join('')}
            </div>
            ${imgs.length > 1 ? `
                <button class="nav-btn prev-btn" onclick="moveSlide(-1)">❮</button>
                <button class="nav-btn next-btn" onclick="moveSlide(1)">❯</button>
            ` : ''}
        </div>
    `;

    body.innerHTML = `
        ${carouselHtml}
        <h2>${product.Nome}</h2>
        <p style="color:#666; margin: 10px 0;">${product.Descricao || ''}</p>
        <h3 style="margin-bottom:15px;">R$ ${parseFloat(product.Preco || 0).toFixed(2).replace('.',',')}</h3>
        <button class="action-btn" onclick="addToCartModal('${product.Nome}', ${product.Preco}, '${imgs[0]}')">Adicionar ao Carrinho</button>
    `;
    document.getElementById('product-modal').style.display = "block";
}

function moveSlide(step) {
    const track = document.getElementById('track');
    const slides = document.querySelectorAll('.carousel-item');
    currentSlide = (currentSlide + step + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
}

function addToCartModal(name, price, img) {
    cart.push({name, price, img, qty: 1});
    updateCartCount();
    document.getElementById('product-modal').style.display = "none";
}

function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.length;
}

function closeProductModal() { document.getElementById('product-modal').style.display = "none"; }
function openCart() { document.getElementById('cart-modal').style.display = "block"; /* Adicione renderCartItems aqui */ }
function closeCart() { document.getElementById('cart-modal').style.display = "none"; }
