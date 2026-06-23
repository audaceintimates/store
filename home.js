function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    if(tabId === 'croquis' && document.getElementById('croquis-grid').children.length === 0) loadCroquis();
    if(tabId === 'portifolio' && document.getElementById('portifolio-grid').children.length === 0) loadPortifolio();
}

function toggleUserModal() {
    document.getElementById('user-modal').classList.toggle('hidden');
    document.getElementById('cart-modal').classList.add('hidden');
}

function toggleCartModal() {
    document.getElementById('cart-modal').classList.toggle('hidden');
    document.getElementById('user-modal').classList.add('hidden');
}

function openCheckout() {
    const selected = cart.filter(i => i.selected);
    if(selected.length === 0) return alert("Selecione itens para comprar.");
    
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('chkName').value = user.fullname;
    document.getElementById('chkCpf').value = user.cpf;
    document.getElementById('chkTel').value = user.tel;
    
    document.getElementById('cart-modal').classList.add('hidden');
    document.getElementById('checkout-modal').classList.remove('hidden');
}

function closeCheckout() {
    document.getElementById('checkout-modal').classList.add('hidden');
}

function toggleAddress() {
    const val = document.getElementById('chkShipping').value;
    if(val === 'retirada') {
        document.getElementById('chkAddress').classList.add('hidden');
        document.getElementById('pickup-address').classList.remove('hidden');
    } else {
        document.getElementById('chkAddress').classList.remove('hidden');
        document.getElementById('pickup-address').classList.add('hidden');
    }
}

async function submitOrder() {
    const user = JSON.parse(localStorage.getItem('user'));
    const shipping = document.getElementById('chkShipping').value;
    const address = shipping === 'entrega' ? document.getElementById('chkAddress').value : 'Retirada';
    if(shipping === 'entrega' && !address) return alert("Preencha o endereço.");

    const selectedItems = cart.filter(i => i.selected);
    const total = selectedItems.reduce((acc, item) => acc + parseFloat(item.price), 0);
    const productCodes = selectedItems.map(i => i.code).join(',');

    // 1. Send via FormSubmit
    const formData = new FormData();
    formData.append('name', user.fullname);
    formData.append('email', user.email);
    formData.append('cpf', user.cpf);
    formData.append('telefone', user.tel);
    formData.append('endereco', address);
    formData.append('entrega', shipping);
    formData.append('produtos', productCodes);
    formData.append('total', total.toFixed(2));

    showLoader();
    try {
        await fetch('https://formsubmit.co/ajax/useaudaceintimates@gmail.com', {
            method: 'POST',
            body: formData
        });
    } catch(e) { console.log("FormSubmit Error", e); }

    // 2. Save to Sheets
    const res = await apiRequest({
        action: 'createOrder',
        user: user.fullname,
        products: productCodes,
        address: address,
        shipping: shipping,
        cpf: user.cpf,
        total: total.toFixed(2)
    });

    // 3. InfinitePay Redirect
    let jsonItems = selectedItems.map(item => {
        let priceInt = Math.round(parseFloat(item.price) * 100);
        return `{"name":"${item.productname}","price":${priceInt},"quantity":1}`;
    }).join(',');

    const finalUrl = `${INFINITE_BASE}[${jsonItems}]&redirect_url=${STORE_URL}`;
    window.location.href = finalUrl;
}
