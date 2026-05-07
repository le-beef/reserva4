// LOGIN PERSISTENTE
const senhaCorreta = "7878";

// IDENTIFICADOR DA SENHA
const VERSAO_LOGIN = "7878";

// VERIFICA LOGIN
if (localStorage.getItem("logado") !== VERSAO_LOGIN) {

    let acessoPermitido = false;

    while (!acessoPermitido) {

        const senhaDigitada = prompt("Por favor, digite a senha para acessar o mapa:");

        // CANCELAR
        if (senhaDigitada === null) {
            location.reload();
            break;
        }

        // SENHA CORRETA
        if (senhaDigitada === senhaCorreta) {

            acessoPermitido = true;

            // SALVA LOGIN
            localStorage.setItem("logado", VERSAO_LOGIN);

            alert("Acesso concedido!");

        } else {

            alert("Senha incorreta. Tente novamente.");

        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Seletores
    const mesas = document.querySelectorAll('.mesa');
    const modalOverlay = document.getElementById('modal-mesa');
    const modalDisplayId = document.getElementById('mesa-id-display');
    const formOcupacao = document.getElementById('form-ocupacao');
    const botoesFechar = document.querySelectorAll('.btn-fechar');
    const btnLiberar = document.querySelector('.btn-liberar');
    const btnExportar = document.getElementById('btn-exportar');
    
    // Seletores dos Contadores e Inputs
    const contadorMesas = document.getElementById('contador-mesas'); 
    const contadorPessoas = document.getElementById('contador-pessoas'); 
    const inputPessoas = document.getElementById('qtd-pessoas'); 
    
    // Seletor para o Botão de Reset
    const btnResetGeral = document.getElementById('btn-reset-geral');

    // Senha específica para o reset geral
    const SENHA_RESET_GERAL = "120805"; 

    // Seletores para a Lista
    const listaMesasOcupadas = document.getElementById('lista-mesas-ocupadas');
    
    let mesaSelecionada = null;

    // 2. ☁️ CARREGAR DADOS DO FIREBASE EM TEMPO REAL
    const carregarStatusMesas = () => {
        if (typeof refMesas === 'undefined') {
            console.error("Firebase 'refMesas' não está definido.");
            return;
        }

        refMesas.on('value', (snapshot) => {
            const statusAtualizado = snapshot.val();
            let listaHTML = '';
            let contadorM = 0; // Contador de Mesas
            let totalP = 0;   // Contador de Pessoas

            mesas.forEach(mesa => {
                const mesaId = mesa.id;
                const mesaNome = mesa.dataset.nome;
                const statusMesa = statusAtualizado && statusAtualizado[mesaId] ? statusAtualizado[mesaId] : null;

                if (statusMesa && statusMesa.status === 'ocupada') {
                    mesa.classList.add('ocupada');
                    
                    // Somando totais
                    contadorM++;
                    const qtdPessoasNaMesa = parseInt(statusMesa.qtd || 1);
                    totalP += qtdPessoasNaMesa;
                    
                    // Salva os dados no elemento DOM
                    mesa.dataset.dados = JSON.stringify({ 
                        nome: statusMesa.nome, 
                        obs: statusMesa.obs,
                        pagamento: statusMesa.pagamento,
                        valor: statusMesa.valor,
                        qtd: qtdPessoasNaMesa
                    }); 
                    
                    // CONSTRUÇÃO DO ITEM DA LISTA (Conforme seu print)
                    const nome = statusMesa.nome || 'Não Informado';
                    
                    listaHTML += `
                        <li>
                            <strong>M:</strong> ${mesaNome} | <strong>QT.:</strong> ${qtdPessoasNaMesa} | <strong>N:</strong> ${nome}
                        </li>
                    `;
                    
                } else {
                    mesa.classList.remove('ocupada');
                    delete mesa.dataset.dados;
                }
            });

            // ATUALIZAÇÃO DA INTERFACE
            if (contadorM > 0) {
                listaMesasOcupadas.innerHTML = listaHTML;
            } else {
                listaMesasOcupadas.innerHTML = '<li>Nenhuma mesa ocupada no momento.</li>';
            }
            
            // Atualiza os números nos contadores lá embaixo
            if(contadorMesas) contadorMesas.textContent = contadorM;
            if(contadorPessoas) contadorPessoas.textContent = totalP;
        });
    };

    // 3. 🖱️ Abrir Modal ao clicar na mesa
    mesas.forEach(mesa => {
        mesa.addEventListener('click', () => {
            mesaSelecionada = mesa;
            const mesaNome = mesa.dataset.nome;
            const isOcupada = mesa.classList.contains('ocupada');
            
            modalDisplayId.textContent = mesaNome;
            btnLiberar.dataset.mesaId = mesa.id;

            if (isOcupada && mesa.dataset.dados) {
                const dados = JSON.parse(mesa.dataset.dados);
                document.getElementById('nome-ocupante').value = dados.nome || '';
                document.getElementById('observacoes').value = dados.obs || '';
                document.getElementById('qtd-pessoas').value = dados.qtd || '1';
                document.getElementById('status-pagamento').value = dados.pagamento || 'nao-informado';
                document.getElementById('valor-mesa').value = dados.valor || '0.00'; 
                
                btnLiberar.style.display = 'block';
                document.querySelector('.btn-ocupar').textContent = 'Atualizar Ocupação';
            } else {
                formOcupacao.reset();
                document.getElementById('valor-mesa').value = '0.00'; 
                document.getElementById('qtd-pessoas').value = '1';
                
                btnLiberar.style.display = 'none';
                document.querySelector('.btn-ocupar').textContent = 'Confirmar Ocupação';
            }
            modalOverlay.style.display = 'flex';
        });
    });

    // 4. ☁️ Lógica de Salvar (Ocupar/Atualizar)
    formOcupacao.addEventListener('submit', (e) => {
        e.preventDefault();
        if (mesaSelecionada) {
            const dadosParaFirebase = {
                status: 'ocupada',
                nome: document.getElementById('nome-ocupante').value,
                qtd: document.getElementById('qtd-pessoas').value,
                obs: document.getElementById('observacoes').value,
                pagamento: document.getElementById('status-pagamento').value,
                valor: document.getElementById('valor-mesa').value,
                timestamp: new Date().toISOString()
            };

            refMesas.child(mesaSelecionada.id).set(dadosParaFirebase)
                .then(() => {
                    modalOverlay.style.display = 'none';
                })
                .catch(error => alert("Erro ao salvar: " + error.message));
        }
    });

    // 5. ☁️ Lógica de Liberar
    btnLiberar.addEventListener('click', () => {
        if (mesaSelecionada && confirm(`Liberar a mesa ${mesaSelecionada.dataset.nome}?`)) {
            refMesas.child(mesaSelecionada.id).remove()
                .then(() => { modalOverlay.style.display = 'none'; })
                .catch(error => alert("Erro ao liberar: " + error.message));
        }
    });
    
    // 💡 LÓGICA DE RESET GERAL
    btnResetGeral.addEventListener('click', () => {
        if (!confirm("LIMPAR TODAS AS MESAS?")) return;
        if (prompt("Digite a senha de reset:") === SENHA_RESET_GERAL) {
            refMesas.remove().then(() => alert("✅ Tudo liberado."));
        } else {
            alert("Senha incorreta!");
        }
    });

    // 6. Fechar Modal 
    botoesFechar.forEach(btn => { 
        btn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
    });
    
    // 7. 📊 Exportação CSV
    btnExportar.addEventListener('click', () => {
        refMesas.once('value').then((snapshot) => {
            const statusFirebase = snapshot.val() || {};
            let dadosCSV = "Mesa;Status;Nome;Pessoas;Pagamento;Valor;Observacoes\n";

            mesas.forEach(mesa => {
                const status = statusFirebase[mesa.id];
                if (status && status.status === 'ocupada') {
                    dadosCSV += `${mesa.dataset.nome};OCUPADA;${status.nome};${status.qtd};${status.pagamento};${status.valor};${status.obs}\n`;
                } else {
                    dadosCSV += `${mesa.dataset.nome};LIVRE;;0;;0.00;\n`;
                }
            });

            const blob = new Blob(['\ufeff', dadosCSV], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Relatorio_LeBeef_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
        });
    });

    carregarStatusMesas();
});
