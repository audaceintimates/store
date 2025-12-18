const API_URL = "https://script.google.com/macros/s/AKfycbwmFW5JzBj_E1B5XeF3Cns2VPXCknFfUqKD9LUyW68-xkOsd2B2ypKInGLGOGmeZdoMsg/exec";
const NOTIFICATION_EMAIL = "useaudaceintimates@gmail.com";

let allProducts = [];
let cart = [];
let shippingMethod = null;
let currentProduct = null;
let currentSlide = 0; 

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    // Configuração da Busca
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allProducts.filter(p => (p.Nome || '').toLowerCase().includes(term));
            renderProducts(filtered);
        });
    }

    // Configuração do Menu Lateral
    const menuBtn = document.getElementById('menu-btn');
    if(menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.getElementById("side-menu").style.width = "280px";
        });
    }
});

function closeMenu() { 
    document.getElementById("side-menu").style.width = "0"; 
}

// --- FUNÇÕES AUXILIARES ---
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

// --- CARREGAMENTO DE DADOS ---
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        allProducts = data;
        renderProducts(allProducts);
        renderCategories(allProducts);
    } catch (error) { console.error("Erro:", error); }
}

// --- RENDERIZAÇÃO ---
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = "";
    
    if(products.length === 0) {
        container.innerHTML = "<p style='padding:20px; text-align:center; width:100%;'>Nenhum produto encontrado.</p>";
        return;
    }

    products.forEach(product => {
        const imgs = (product.Imagem || "").split(",");
        const firstImg = imgs[0].trim();
        const price = parsePrice(product.Preco);
        const stock = getStock(product);
        const isSoldOut = stock <= 0;
        
        const card = document.createElement('div');
        // Adiciona classe sold-out se esgotado para o filtro cinza
        card.className = `product-card ${isSoldOut ? 'sold-out' : ''}`;
        card.onclick = () => openProductModal(product);
        
        // Aqui criamos o overlay GRANDE e CENTRALIZADO se estiver esgotado
        const soldOutOverlay = isSoldOut ? '<div class="sold-out-overlay">ESGOTADO</div>' : '';

        card.innerHTML = `
            ${soldOutOverlay}
            <img src="${firstImg}" onerror="this.src='https://via.placeholder.com/300'">
            <div class="product-info">
                <h3 class="product-name">${product.Nome}</h3>
                <p class="product-price">R$ ${price.toFixed(2).replace('.', ',')}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderCategories(products) {
    // Pegar categorias únicas
    const categories = [...new Set(products.map(p => p.Categoria))].filter(c => c && c.trim() !== '');
    
    // Inserir APENAS no menu lateral
    const list = document.getElementById('category-list');
    if (list) {
        list.innerHTML = ""; // Limpa lista anterior
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
}

function filterCategory(category) {
    if(category === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.Categoria === category);
        renderProducts(filtered);
    }
}

// --- MODAL DE PRODUTO ---
function openProductModal(product) {
    currentProduct = product;
    currentSlide = 0;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    const imgs = (product.Imagem || "").split(",").map(i => i.trim());
    const price = parsePrice(product.Preco);
    const stock = getStock(product);
    const isSoldOut = stock <= 0;

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
        <select id="modal-variation" class="variation-select" style="width:100%; padding:10px; margin:5px 0;">
            ${product.Variacoes.split(',').map(v => `<option value="${v.trim()}">${v.trim()}</option>`).join('')}
        </select>` : `<input type="hidden" id="modal-variation" value="Único">`;

    // Botões só aparecem se NÃO estiver esgotado
    let buttonsHtml = isSoldOut ? 
        `<div style="background:#cc0000; color:white; padding:15px; text-align:center; border-radius:5px; font-weight:bold; margin-top:15px;">PRODUTO INDISPONÍVEL</div>` : 
        `<div style="margin: 15px 0;">
            <label><strong>Quantidade:</strong></label>
            <input type="number" id="modal-qty" value="1" min="1" max="${stock}" class="qty-input" style="width:60px; padding:5px; text-align:center;">
            <span style="font-size:12px; color:#666;">(Disp: ${stock})</span>
        </div>
        <div class="modal-actions" style="display:flex; gap:10px;">
            <button class="action-btn secondary" onclick="addToCartAndStay()">Adicionar ao Carrinho</button>
            <button class="action-btn" onclick="buyNow()">Comprar Agora</button>
        </div>`;

    body.innerHTML = `
        ${carouselHtml}
        <h2>${product.Nome}</h2>
        <h3 style="margin: 10px 0;">R$ ${price.toFixed(2).replace('.', ',')}</h3>
        <p style="color:#666; font-size: 14px; margin-bottom: 15px;">${product.Descricao || ''}</p>
        ${variationsHtml}
        ${buttonsHtml}
    `;
    modal.style.display = "block";
}

function moveSlide(step, event) {
    if(event) event.stopPropagation();
    const track = document.getElementById('track');
    const slides = document.querySelectorAll('.carousel-item');
    if(slides.length === 0) return;
    currentSlide = (currentSlide + step + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
}

// --- CARRINHO E CHECKOUT ---
function addToCart(isBuyNow = false) {
    const qtyInput = document.getElementById('modal-qty');
    const qty = parseInt(qtyInput.value) || 1;
    const variationSelect = document.getElementById('modal-variation');
    const variation = variationSelect ? variationSelect.value : 'Padrão';
    
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

    if(cart.length === 0) {
        container.innerHTML = "<p>Seu carrinho está vazio.</p>";
        document.getElementById('cart-total').innerText = "R$ 0,00";
        return;
    }

    cart.forEach((item, index) => {
        total += item.price * item.qty;
        container.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p style="font-size:12px; color:#666;">Var: ${item.variation}</p>
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

function changeQty(index, delta) {
    cart[index].qty += delta;
    if(cart[index].qty <= 0) cart.splice(index, 1);
    renderCartItems();
    updateCartCount();
}

// --- LÓGICA DE FINALIZAÇÃO ---
function selectShipping(method) {
    if(cart.length === 0) return alert("Carrinho vazio!");

    shippingMethod = method;
    const msg = document.getElementById('shipping-message');
    const form = document.getElementById('customer-form');
    const btn = document.getElementById('checkout-btn');

    // MOSTRAR FORMULÁRIO E BOTÃO
    form.style.display = "block";
    btn.style.display = "block"; // Agora o botão aparece!

    if(method === 'entrega') {
        msg.style.display = "block";
        msg.innerHTML = '<p><strong>Frete:</strong> O cálculo será combinado via WhatsApp.</p>';
    } else {
        msg.style.display = "block";
        msg.innerHTML = '<p>Você escolheu <strong>Retirada</strong>. Entraremos em contato para combinar.</p>';
    }
    
    form.scrollIntoView({ behavior: 'smooth' });
}

function submitOrder() {
    if(cart.length === 0) return alert("Carrinho vazio!");
    
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const email = document.getElementById('cust-email').value;
    const address = document.getElementById('cust-address').value;

    if(!name || !phone || !email || !address) {
        return alert("Por favor, preencha todos os dados.");
    }

    const btn = document.getElementById('checkout-btn');
    btn.innerText = "Processando...";
    btn.disabled = true;

    let orderSummary = cart.map(item => 
        `- ${item.name} (${item.variation}) | Qtd: ${item.qty} | R$ ${(item.price * item.qty).toFixed(2)}`
    ).join('\n');

    let totalVal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const formData = {
        _subject: "Novo Pedido - Audace Intimates",
        _template: "table",
        Cliente: name,
        Telefone: phone,
        Email: email,
        Entrega: shippingMethod.toUpperCase(),
        Endereco: address,
        Total_Compra: `R$ ${totalVal.toFixed(2)}`,
        Produtos: orderSummary
    };

    fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        redirectToPayment();
    })
    .catch(error => {
        alert("Erro ao notificar pedido, mas vamos para o pagamento.");
        redirectToPayment();
    });
}

function redirectToPayment() {
    const itemsStrings = cart.map(item => {
        const priceInt = Math.round(item.price * 100);
        const cleanName = (item.name + " - " + item.variation).replace(/"/g, ''); 
        return `{"name":"${cleanName}","price":${priceInt},"quantity":${item.qty}}`;
    });

    const itemsPayload = itemsStrings.join(',');
    const baseUrl = "https://checkout.infinitepay.io/audaces";
    const redirectUrl = "https://wa.me/5549914014398?text=Ol%C3%A1!%20Acabei%20de%20pagar%20meu%20pedido%20no%20site.";
    
    const finalLink = `${baseUrl}?items=[${itemsPayload}]&redirect_url=${redirectUrl}`;
    window.location.href = finalLink;
}

function openCart() {
    renderCartItems();
    document.getElementById('cart-modal').style.display = "block";
    // Resetar visualização do form ao abrir o carrinho novamente
    document.getElementById('checkout-btn').style.display = "none";
    document.getElementById('customer-form').style.display = "none";
    document.getElementById('shipping-message').style.display = "none";
}

function closeCart() { document.getElementById('cart-modal').style.display = "none"; }
function closeProductModal() { document.getElementById('product-modal').style.display = "none"; }

// Fechar ao clicar fora
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = "none";
    }
}
