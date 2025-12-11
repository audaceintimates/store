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
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allProducts.filter(p => (p.Nome || '').toLowerCase().includes(term));
            renderProducts(filtered);
        });
    }

    // Menu hamburguer
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

// 1. Busca dados da Planilha
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        console.log("Dados recebidos da planilha:", data); // Isso ajuda a ver erros no Console (F12)

        // Verificação simples se o dado é válido
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Planilha vazia ou formato incorreto.");
        }

        allProducts = data;
        renderProducts(allProducts);
        renderCategories(allProducts);

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        document.getElementById('products-container').innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <p>Não foi possível carregar os produtos.</p>
                <p style="font-size: 12px; color: red;">Erro: ${error.message}</p>
                <p style="font-size: 12px;">Verifique se os nomes das colunas na planilha são: Nome, Preco, Imagem, Categoria</p>
            </div>`;
    }
}

// Função auxiliar para tratar preços
function parsePrice(priceValue) {
    if (typeof priceValue === 'number') return priceValue;
    if (!priceValue) return 0;
    
    // Remove R$, espaços e converte virgula em ponto
    let stringPrice = priceValue.toString().replace('R$', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(stringPrice) || 0;
}

// 2. Renderiza os Cards de Produtos
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = "";

    if(products.length === 0) {
        container.innerHTML = "<p style='padding:20px'>Nenhum produto encontrado.</p>";
        return;
    }

    products.forEach(product => {
        // Proteção contra dados vazios
        const nome = product.Nome || "Produto sem nome";
        const imagem = product.Imagem || "https://via.placeholder.com/300?text=Sem+Imagem"; 
        const rawPrice = product.Preco; 
        const price = parsePrice(rawPrice);
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openProductModal(product);

        card.innerHTML = `
            <img src="${imagem}" alt="${nome}" onerror="this.src='https://via.placeholder.com/300?text=Erro+Imagem'">
            <div class="product-info">
                <h3 class="product-name">${nome}</h3>
                <p class="product-price">R$ ${price.toFixed(2).replace('.', ',')}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// 3. Renderiza o Menu de Categorias
function renderCategories(products) {
    // Filtra categorias nulas ou vazias
    const categories = [...new Set(products.map(p => p.Categoria))].filter(c => c && c.trim() !== '');
    
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
    closeMenu();
}

// 4. Modal de Produto
let currentProduct = null;

function openProductModal(product) {
    currentProduct = product;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    const nome = product.Nome || "Produto";
    const imagem = product.Imagem || "https://via.placeholder.com/300";
    const desc = product.Descricao || "Sem descrição.";
    const price = parsePrice(product.Preco);

    // Tratamento das variações
    let variationsHtml = '';
    if(product.Variacoes) {
        const vars = product.Variacoes.toString().split(',').map(v => v.trim());
        variationsHtml = `
            <label><strong>Opção:</strong></label>
            <select id="modal-variation" class="variation-select">
                ${vars.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
        `;
    } else {
         variationsHtml = `<input type="hidden" id="modal-variation" value="Único">`;
    }

    body.innerHTML = `
        <img src="${imagem}" class="modal-img">
        <h2>${nome}</h2>
        <h3 style="margin: 10px 0;">R$ ${price.toFixed(2).replace('.', ',')}</h3>
        <p style="color:#666; font-size: 14px; margin-bottom: 15px;">${desc}</p>
        
        ${variationsHtml}
        
        <div style="margin: 15px 0;">
            <label><strong>Quantidade:</strong></label>
            <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                <input type="number" id="modal-qty" value="1" min="1" class="qty-input" style="width:60px; padding:8px;">
            </div>
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
    const qtyInput = document.getElementById('modal-qty');
    const qty = parseInt(qtyInput.value) || 1;
    
    const variationSelect = document.getElementById('modal-variation');
    const variation = variationSelect ? variationSelect.value : 'Padrão';

    const price = parsePrice(currentProduct.Preco);
    const nome = currentProduct.Nome || "Item";

    const item = {
        name: nome,
        price: price,
        image: currentProduct.Imagem,
        variation: variation,
        qty: qty
    };

    // Verifica item igual
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
        // Feedback visual simples
        const btn = document.querySelector('.cart-icon');
        btn.style.transform = "scale(1.2)";
        setTimeout(() => btn.style.transform = "scale(1)", 200);
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
    
    // Reseta visualização
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

    if(cart.length === 0) {
        container.innerHTML = "<p>Seu carrinho está vazio.</p>";
        document.getElementById('cart-total').innerText = "R$ 0,00";
        return;
    }

    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p style="font-size:12px; color:#666;">Var: ${item.variation}</p>
                <p>R$ ${item.price.toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="cart-controls">
                <button onclick="changeQty(${index}, -1)">-</button>
                <span style="margin:0 10px;">${item.qty}</span>
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

// 6. Checkout
function selectShipping(method) {
    if(cart.length === 0) return alert("Carrinho vazio!");

    shippingMethod = method;
    const msg = document.getElementById('shipping-message');
    const btn = document.getElementById('checkout-btn');

    if(method === 'entrega') {
        msg.style.display = "block";
    } else {
        msg.style.display = "none";
    }
    btn.style.display = "block";
    
    // Scroll para o botão de finalizar
    btn.scrollIntoView({ behavior: 'smooth' });
}

function finalizeCheckout() {
    if(cart.length === 0) return alert("Carrinho vazio!");
    
    // Tratamento dos itens para JSON puro
    const itemsStrings = cart.map(item => {
        // Multiplica por 100 para centavos (InfinitePay format)
        const priceInt = Math.round(item.price * 100);
        // Garante nome limpo
        const cleanName = (item.name + " - " + item.variation).replace(/"/g, ''); 
        
        return `{"name":"${cleanName}","price":${priceInt},"quantity":${item.qty}}`;
    });

    const itemsPayload = itemsStrings.join(',');
    
    const baseUrl = "https://checkout.infinitepay.io/audaces";
    const redirectUrl = "https://wa.me/5584991401439?text=Ol%C3%A1!%20Acabei%20de%20fazer%20o%20meu%20pedido%20pelo%20site%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20entrega/retirada%20do(s)%20meu(s)%20produto(s).";
    
    // Monta URL crua
    const finalLink = `${baseUrl}?items=[${itemsPayload}]&redirect_url=${redirectUrl}`;

    window.location.href = finalLink;
}

// Fechar modais ao clicar fora
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = "none";
    }
}
