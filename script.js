// Proteção Simples (Não segura)
const senhaCorreta = "7878"; 
let acessoPermitido = false;

while (!acessoPermitido) {
    const senhaDigitada = prompt("Por favor, digite a senha para acessar o mapa:");
    
    if (senhaDigitada === senhaCorreta) {
        acessoPermitido = true;
        alert("Acesso concedido!");
    } else {
        alert("Senha incorreta. Tente novamente.");
    }
}
// O restante do seu script.js só rodará se a senha estiver correta.

document.addEventListener('DOMContentLoaded', () => {
    // 1. Seletores
    const mesas = document.querySelectorAll('.mesa');
    const modalOverlay = document.getElementById('modal-mesa');
    const modalDisplayId = document.getElementById('mesa-id-display');
    const formOcupacao = document.getElementById('form-ocupacao');
    const botoesFechar = document.querySelectorAll('.btn-fechar');
    const btnLiberar = document.querySelector('.btn-liberar');
    const btnExportar = document.getElementById('btn-exportar');
    
    // NOVO SELETOR PARA O BOTÃO DE RESET
    const btnResetGeral = document.getElementById('btn-reset-geral');

    // Senha específica para o reset geral
    const SENHA_RESET_GERAL = "120805"; 

    // SELETORES PARA A LISTA
    const listaMesasOcupadas = document.getElementById('lista-mesas-ocupadas');
    const contadorOcupadas = document.getElementById('contador-ocupadas');

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
            let contador = 0;

            mesas.forEach(mesa => {
                const mesaId = mesa.id;
                const mesaNome = mesa.dataset.nome;
                const statusMesa = statusAtualizado && statusAtualizado[mesaId] ? statusAtualizado[mesaId] : null;

                if (statusMesa && statusMesa.status === 'ocupada') {
                    mesa.classList.add('ocupada');
                    contador++;
                    
                    // Salva os dados no elemento DOM (incluindo a nova quantidade)
                    mesa.dataset.dados = JSON.stringify({ 
                        nome: statusMesa.nome, 
                        obs: statusMesa.obs,
                        pagamento: statusMesa.pagamento,
                        valor: statusMesa.valor,
                        qtd: statusMesa.qtd || '1' // Padrão 1 se não existir
                    }); 
                    
                    // CONSTRUÇÃO DO ITEM DA LISTA
                    const nome = statusMesa.nome || 'Não Informado';
                    const qtd = statusMesa.qtd || '1';
                    const pagamento = statusMesa.pagamento ? statusMesa.pagamento.toUpperCase().replace('-', ' ') : 'N/A';
                    const valor = parseFloat(statusMesa.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    
                    listaHTML += `
                        <li>
                            <strong>Mesa:</strong> ${mesaNome} | <strong>Pessoas:</strong> ${qtd} | <strong>Cliente:</strong> ${nome}
                            
                        </li>
                    `;
                    
                } else {
                    mesa.classList.remove('ocupada');
                    delete mesa.dataset.dados;
                }
            });

            // ATUALIZAÇÃO DA LISTA NO HTML
            if (contador > 0) {
                listaMesasOcupadas.innerHTML = listaHTML;
            } else {
                listaMesasOcupadas.innerHTML = '<li>Nenhuma mesa ocupada no momento.</li>';
            }
            contadorOcupadas.textContent = contador;
        });
    };

    // 3. 🖱️ Adicionar ouvinte de clique para cada mesa
    mesas.forEach(mesa => {
        mesa.addEventListener('click', () => {
            mesaSelecionada = mesa;
            const mesaNome = mesa.dataset.nome;
            const isOcupada = mesa.classList.contains('ocupada');
            
            modalDisplayId.textContent = mesaNome;
            btnLiberar.dataset.mesaId = mesa.id;

            // Preenche o formulário
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

    // 4. ☁️ Lógica de Ocupar/Atualizar
    formOcupacao.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (mesaSelecionada) {
            const nome = document.getElementById('nome-ocupante').value;
            const obs = document.getElementById('observacoes').value;
            const qtd = document.getElementById('qtd-pessoas').value;
            const statusPagamento = document.getElementById('status-pagamento').value;
            const valorMesa = document.getElementById('valor-mesa').value;
            
            const dadosParaFirebase = {
                status: 'ocupada',
                nome: nome,
                qtd: qtd, // Enviando a quantidade
                obs: obs,
                pagamento: statusPagamento,
                valor: valorMesa,
                timestamp: new Date().toISOString()
            };

            // SALVA NO FIREBASE
            refMesas.child(mesaSelecionada.id).set(dadosParaFirebase)
                .then(() => {
                    modalOverlay.style.display = 'none';
                    alert(`Mesa ${mesaSelecionada.dataset.nome} atualizada com sucesso!`);
                })
                .catch(error => {
                    alert("Erro ao salvar no Firebase: " + error.message);
                });
        }
    });

    // 5. ☁️ Lógica de Liberar uma Mesa
    btnLiberar.addEventListener('click', () => {
        if (mesaSelecionada) {
            const confirmar = confirm(`Tem certeza que deseja LIBERAR a mesa ${mesaSelecionada.dataset.nome}?`);
            if (confirmar) {
                refMesas.child(mesaSelecionada.id).remove()
                    .then(() => {
                        modalOverlay.style.display = 'none';
                        alert(`Mesa ${mesaSelecionada.dataset.nome} liberada!`);
                    })
                    .catch(error => {
                        alert("Erro ao liberar no Firebase: " + error.message);
                    });
            }
        }
    });
    
    // 💡 LÓGICA DE RESET GERAL
    btnResetGeral.addEventListener('click', () => {
        const confirmar = confirm("ATENÇÃO: Você está prestes a LIMPAR TODAS as mesas. Deseja continuar?");
        if (!confirmar) return;
        
        const senhaDigitada = prompt("Digite a senha de reset:");
        if (senhaDigitada !== SENHA_RESET_GERAL) {
            alert("Senha incorreta!");
            return;
        }

        refMesas.remove()
            .then(() => { alert("✅ Todas as mesas foram liberadas."); })
            .catch(error => { alert("❌ Erro: " + error.message); });
    });

    // 6. Fechar Modal 
    botoesFechar.forEach(btn => { 
        btn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
    });
    
    // 7. 📊 Lógica de Exportação para CSV (Atualizada com Qtd)
    btnExportar.addEventListener('click', () => {
        if (!confirm('Deseja exportar a lista de ocupação?')) return;
        
        refMesas.once('value').then((snapshot) => {
            const statusFirebase = snapshot.val() || {};
            // Adicionado "Qtd Pessoas" ao cabeçalho
            let dadosCSV = "Mesa;Status;Nome dos Ocupantes;Qtd Pessoas;Pagamento;Valor (R$);Observacoes\n";
            let mesasEncontradas = false;

            mesas.forEach(mesa => {
                const mesaId = mesa.id;
                const mesaNome = mesa.dataset.nome;
                const statusDados = statusFirebase[mesaId];

                let statusDisplay = "LIVRE", nomeOcupante = "", qtd = "0", pagamentoStatus = "", valor = "0.00", obs = "";

                if (statusDados && statusDados.status === 'ocupada') {
                    statusDisplay = "OCUPADA";
                    nomeOcupante = statusDados.nome ? statusDados.nome.replace(/;/g, ',') : "";
                    qtd = statusDados.qtd || "1";
                    pagamentoStatus = statusDados.pagamento || 'N/A';
                    valor = statusDados.valor || '0.00';
                    obs = statusDados.obs ? statusDados.obs.replace(/(\r\n|\n|\r)/gm, ' ').replace(/;/g, ',') : "";
                }
                
                // Incluindo a variável qtd na linha do CSV
                dadosCSV += `${mesaNome};${statusDisplay};${nomeOcupante};${qtd};${pagamentoStatus};${valor};${obs}\n`;
                mesasEncontradas = true;
            });

            const nomeArquivo = `Status_Mesas_${new Date().toISOString().slice(0, 10)}.csv`;
            const blob = new Blob(['\ufeff', dadosCSV], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nomeArquivo;
            link.click();
        });
    });

    carregarStatusMesas();
});
