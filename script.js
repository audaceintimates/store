const SCRIPT_URL = typeof APP_SCRIPT_URL !== 'undefined' ? APP_SCRIPT_URL : '';

function showLoader() { document.getElementById('loader').classList.remove('hidden'); }
function hideLoader() { document.getElementById('loader').classList.add('hidden'); }
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function validatePassword(pass) {
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\W])[A-Za-z\d@$!%*?&\W]{6,20}$/;
    return re.test(pass);
}

function validateCPF(cpf) {
    return /^\d{11}$/.test(cpf);
}

async function apiRequest(data) {
    showLoader();
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        hideLoader();
        return result;
    } catch (e) {
        hideLoader();
        console.error(e);
        return { success: false };
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    if(!email || !pass) return alert("Preencha todos os campos.");
    
    const res = await apiRequest({ action: 'login', email: email, password: pass });
    if(res.success) {
        localStorage.setItem('user', JSON.stringify(res.user));
        initApp();
    } else {
        alert("Credenciais inválidas.");
    }
}

async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const tel = document.getElementById('regTel').value;
    const cpf = document.getElementById('regCpf').value;
    const pass = document.getElementById('regPassword').value;
    const passConf = document.getElementById('regPasswordConfirm').value;

    if(!name || !email || !tel || !cpf || !pass) return alert("Preencha tudo.");
    if(!validateCPF(cpf)) return alert("CPF deve ter 11 dígitos numéricos.");
    if(pass !== passConf) return alert("As senhas não coincidem.");
    if(!validatePassword(pass)) return alert("Senha não atende aos requisitos.");

    const res = await apiRequest({ action: 'register', fullname: name, email: email, tel: tel, cpf: cpf, password: pass });
    if(res.success) {
        alert("Registrado com sucesso. Faça login.");
        showView('login-view');
    } else {
        alert("Erro ao registrar.");
    }
}

async function resetPassword() {
    const name = document.getElementById('resetName').value;
    const email = document.getElementById('resetEmail').value;
    const tel = document.getElementById('resetTel').value;
    const newPass = document.getElementById('resetNewPass').value;

    if(!name || !email || !tel || !newPass) return alert("Preencha tudo.");
    if(!validatePassword(newPass)) return alert("Nova senha fraca.");

    const res = await apiRequest({ action: 'reset', fullname: name, email: email, tel: tel, newPassword: newPass });
    if(res.success) {
        alert("Senha redefinida.");
        showView('login-view');
    } else {
        alert("Dados não conferem.");
    }
}

function logout() {
    localStorage.removeItem('user');
    initApp();
    document.getElementById('user-modal').classList.add('hidden');
}

function initApp() {
    const user = JSON.parse(localStorage.getItem('user'));
    const avatarBtn = document.getElementById('userAvatarBtn');
    
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    if(user) {
        avatarBtn.innerText = user.fullname.charAt(0).toUpperCase();
        // Se logado, o botão abre o modal do usuário
        avatarBtn.onclick = () => document.getElementById('user-modal').classList.toggle('hidden');
        
        document.getElementById('um-name').innerText = user.fullname;
        document.getElementById('um-email').innerText = user.email;
        avatarBtn.classList.remove('hidden');
    } else {
        avatarBtn.innerText = "?";
        // Se não logado, o botão redireciona para login
        avatarBtn.onclick = () => {
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('auth-container').classList.remove('hidden');
            showView('login-view');
        };
        
        document.getElementById('um-name').innerText = "Visitante";
        document.getElementById('um-email').innerText = "Faça login para comprar";
    }
    
    if (typeof loadProducts === 'function') {
        loadProducts();
    }
}

function checkAuthBeforeAction(callback) {
    if(localStorage.getItem('user')) {
        callback();
    } else {
        alert("Você precisa estar logado para realizar esta ação.");
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        showView('login-view');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initApp();
});
