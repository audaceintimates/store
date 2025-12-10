// Link da sua API Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbwmFW5JzBj_E1B5XeF3Cns2VPXCknFfUqKD9LUyW68-xkOsd2B2ypKInGLGOGmeZdoMsg/exec";

// Estado da Aplicação
let allProducts = [];
let cart = [];
let shippingMethod = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    // Evento de pesquisa
    document.getElementById('search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allProducts.filter(p => p.Nome.toLowerCase().includes(term));
        renderProducts(filtered);
    });

    // Menu hamburguer
    document.getElementById('menu-btn').addEventListener('click', () => {
        document.getElementById("side-menu").style.width = "250px";
    });
});

function closeMenu() {
    document.getElementById("side-menu").style.width = "0";
}

// 1. Busca dados da Planilha
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        // Assume-se que 'data' é um array de objetos com as chaves exatas da planilha
        allProducts = data;
        renderProducts(allProducts);
        renderCategories(allProducts);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        document.getElementById('products-container').innerHTML = "<p>Erro ao carregar loja. Tente novamente.</p>";
    }
}

// 2. Renderiza os Cards de Produtos
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = "";

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openProductModal(product);

        // Formatação de preço (assume que na planilha vem como numero ou string "79,00")
        let displayPrice = product.Preco;
        if(typeof displayPrice === 'number') displayPrice = displayPrice.toFixed(2).replace('.', ',');

        card.innerHTML = `
            <img src="${product.Imagem}" alt="${product.Nome}">
            <div class="product-info">
                <h3 class="product-name">${product.Nome}</h3>
                <p class="product-price">R$ ${displayPrice}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// 3. Renderiza o Menu de Categorias
function renderCategories(products) {
    const categories = [...new Set(products.map(p => p.Categoria))].filter(Boolean);
    const list = document.getElementById('category-list');
    list.innerHTML = "";

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerText = cat;
        btn.className = 'cat-btn';
        btn.onclick = () => {
            filterCategory(cat);
            closeMenu();
        };
        list.appendChild(btn);
    });
}

function filterCategory(category) {
    if(category === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.Categoria === category);
        renderProducts(filtered);
    }
}

// 4. Modal de Produto e Adição ao Carrinho
let currentProduct = null;

function openProductModal(product) {
    currentProduct = product;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    // Tratamento das variações (separadas por virgula na planilha, ex: "P, M, G")
    let variationsHtml = '';
    if(product.Variacoes) {
        const vars = product.Variacoes.toString().split(',').map(v => v.trim());
        variationsHtml = `
            <label>Variação:</label>
            <select id="modal-variation" class="variation-select">
                ${vars.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
        `;
    }

    let displayPrice = product.Preco;
    if(typeof displayPrice === 'number') displayPrice = displayPrice.toFixed(2).replace('.', ',');

    body.innerHTML = `
        <img src="${product.Imagem}" class="modal-img">
        <h2>${product.Nome}</h2>
        <p>R$ ${displayPrice}</p>
        <p>${product.Descricao || ''}</p>
        ${variationsHtml}
        <div style="margin: 10px 0;">
            <label>Quantidade:</label>
            <input type="number" id="modal-qty" value="1" min="1" class="qty-input">
        </div>
        <div class="modal-actions">
            <button class="action-btn secondary" onclick="addToCartAndStay()">Adicionar ao Carrinho</button>
            <button class="action-btn" onclick="buyNow()">Comprar Agora</button>
        </div>
    `;
    
    modal.style.display = "block";
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = "none";
}

// 5. Lógica do Carrinho
function addToCart(isBuyNow = false) {
    const qty = parseInt(document.getElementById('modal-qty').value);
    const variationSelect = document.getElementById('modal-variation');
    const variation = variationSelect ? variationSelect.value : 'Padrão';

    // Parse preço para float (remove virgula se for string)
    let price = currentProduct.Preco;
    if (typeof price === 'string') {
        price = parseFloat(price.replace(',', '.'));
    }

    const item = {
        name: currentProduct.Nome,
        price: price,
        image: currentProduct.Imagem,
        variation: variation,
        qty: qty
    };

    // Verifica se já existe item igual
    const existing = cart.find(i => i.name === item.name && i.variation === item.variation);
    if(existing) {
        existing.qty += qty;
    } else {
        cart.push(item);
    }

    updateCartCount();
    closeProductModal();

    if(isBuyNow) {
        openCart();
    } else {
        alert("Produto adicionado ao carrinho!");
    }
}

function addToCartAndStay() { addToCart(false); }
function buyNow() { addToCart(true); }

function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.reduce((acc, item) => acc + item.qty, 0);
}

function openCart() {
    const modal = document.getElementById('cart-modal');
    renderCartItems();
    modal.style.display = "block";
    // Reseta estado de checkout
    document.getElementById('checkout-btn').style.display = "none";
    document.getElementById('shipping-message').style.display = "none";
    shippingMethod = null;
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
                <h4>${item.name} (${item.variation})</h4>
                <p>R$ ${item.price.toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="cart-controls">
                <button onclick="changeQty(${index}, -1)">-</button>
                <span>${item.qty}</span>
                <button onclick="changeQty(${index}, 1)">+</button>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('cart-total').innerText = "R$ " + total.toFixed(2).replace('.', ',');
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if(cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    renderCartItems();
    updateCartCount();
}

// 6. Lógica de Checkout e Envio
function selectShipping(method) {
    shippingMethod = method;
    const msg = document.getElementById('shipping-message');
    const btn = document.getElementById('checkout-btn');

    if(method === 'entrega') {
        msg.style.display = "block";
    } else {
        msg.style.display = "none";
    }
    
    // Mostra botão finalizar
    btn.style.display = "block";
}

function finalizeCheckout() {
    if(cart.length === 0) return alert("Carrinho vazio!");
    
    // Constrói a string de itens para o InfinitePay
    // Formato solicitado: items=[{"name":"NOME","price":10000,"quantity":1}, ...]
    
    const itemsStrings = cart.map(item => {
        // Preço deve ser multiplicado por 100 e virar inteiro (Ex: 79.00 -> 7900)
        const priceInt = Math.round(item.price * 100);
        
        // Retorna string literal exata solicitada pelo usuário
        return `{"name":"${item.name} - ${item.variation}","price":${priceInt},"quantity":${item.qty}}`;
    });

    const itemsPayload = itemsStrings.join(',');
    
    // Montagem final do link sem encoding nos caracteres especiais das chaves
    // Nota: O navegador pode forçar encode, mas montaremos a string crua.
    const baseUrl = "https://checkout.infinitepay.io/audaces";
    const redirectUrl = "https://audaceintimates.github.io/store/";
    
    const finalLink = `${baseUrl}?items=[${itemsPayload}]&redirect_url=${redirectUrl}`;

    // Redireciona
    window.location.href = finalLink;
}

// Fechar modais ao clicar fora
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = "none";
    }
}
