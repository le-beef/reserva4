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
                    
                    // Salva os dados no elemento DOM
                    mesa.dataset.dados = JSON.stringify({ 
                        nome: statusMesa.nome, 
                        obs: statusMesa.obs,
                        pagamento: statusMesa.pagamento,
                        valor: statusMesa.valor
                    }); 
                    
                    // CONSTRUÇÃO DO ITEM DA LISTA
                    const nome = statusMesa.nome || 'Não Informado';
                    const pagamento = statusMesa.pagamento ? statusMesa.pagamento.toUpperCase().replace('-', ' ') : 'N/A';
                    const valor = parseFloat(statusMesa.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    
                    listaHTML += `
                        <li>
                            <strong>Mesa:</strong> ${mesaNome} | <strong>Cliente:</strong> ${nome}
                            <br>
                            <strong>Status:</strong> ${pagamento} | <strong>Valor:</strong> ${valor}
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
                
                document.getElementById('status-pagamento').value = dados.pagamento || 'nao-informado';
                document.getElementById('valor-mesa').value = dados.valor || '0.00'; 
                
                btnLiberar.style.display = 'block';
                document.querySelector('.btn-ocupar').textContent = 'Atualizar Ocupação';
            } else {
                formOcupacao.reset();
                document.getElementById('valor-mesa').value = '0.00'; 
                
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
            const statusPagamento = document.getElementById('status-pagamento').value;
            const valorMesa = document.getElementById('valor-mesa').value;
            
            const dadosParaFirebase = {
                status: 'ocupada',
                nome: nome,
                obs: obs,
                pagamento: statusPagamento,
                valor: valorMesa,
                timestamp: new Date().toISOString()
            };

            // SALVA NO FIREBASE
            refMesas.child(mesaSelecionada.id).set(dadosParaFirebase)
                .then(() => {
                    modalOverlay.style.display = 'none';
                    alert(`Mesa ${mesaSelecionada.dataset.nome} ocupada/atualizada e sincronizada!`);
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
                // REMOVE O DADO DO FIREBASE
                refMesas.child(mesaSelecionada.id).remove()
                    .then(() => {
                        modalOverlay.style.display = 'none';
                        alert(`Mesa ${mesaSelecionada.dataset.nome} liberada e sincronizada!`);
                    })
                    .catch(error => {
                        alert("Erro ao liberar no Firebase: " + error.message);
                    });
            }
        }
    });
    
    // 💡 LÓGICA DE RESET GERAL (LIBERAR TODAS AS MESAS)
    btnResetGeral.addEventListener('click', () => {
        
        // 1. Confirmação inicial
        const confirmar = confirm("ATENÇÃO: Você está prestes a LIMPAR o status de TODAS as mesas. Essa ação é IRREVERSÍVEL. Deseja continuar?");
        
        if (!confirmar) {
            return; // Sai se o usuário cancelar
        }
        
        // 2. Confirmação de senha
        const senhaDigitada = prompt("Para confirmar o RESET GERAL, digite a senha de reset:");
        
        if (senhaDigitada !== SENHA_RESET_GERAL) {
            alert("Senha de reset incorreta. Ação cancelada.");
            return;
        }

        // 3. Execução do Reset
        // Remove o nó pai 'mesas_status', limpando todos os dados.
        refMesas.remove()
            .then(() => {
                alert("✅ RESET GERAL CONCLUÍDO. Todas as mesas foram liberadas para um novo evento.");
            })
            .catch(error => {
                alert("❌ Erro ao executar o Reset Geral no Firebase: " + error.message);
            });
    });
    

    // 6. Fechar Modal 
    botoesFechar.forEach(btn => { 
        btn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
    });
    
    // 7. 📊 Lógica de Exportação para CSV 
    btnExportar.addEventListener('click', () => {
        
        // **INÍCIO DA NOVA PARTE**
        // Adiciona a confirmação do usuário antes de continuar
        if (!confirm('Deseja realmente exportar a lista de ocupação?')) {
            return; // Cancela a exportação se o usuário clicar em "Cancelar"
        }
        // **FIM DA NOVA PARTE**
        
        // Pega o estado atual do Firebase
        refMesas.once('value').then((snapshot) => {
            const statusFirebase = snapshot.val() || {};
            
            let dadosCSV = "Mesa;Status;Nome dos Ocupantes;Pagamento;Valor (R$);Observacoes\n";
            let mesasEncontradas = false;

            mesas.forEach(mesa => {
                const mesaId = mesa.id;
                const mesaNome = mesa.dataset.nome;
                const statusDados = statusFirebase[mesaId];

                let statusDisplay = "LIVRE";
                let nomeOcupante = "";
                let pagamentoStatus = "";
                let valor = "0.00";
                let obs = "";

                if (statusDados && statusDados.status === 'ocupada') {
                    statusDisplay = "OCUPADA";
                    
                    nomeOcupante = statusDados.nome ? statusDados.nome.replace(/;/g, ',') : "";
                    pagamentoStatus = statusDados.pagamento || 'N/A';
                    valor = statusDados.valor || '0.00';
                    
                    // CORREÇÃO DE QUEBRA DE LINHA:
                    obs = statusDados.obs ? statusDados.obs.replace(/(\r\n|\n|\r)/gm, ' ').replace(/;/g, ',') : "";
                }
                
                dadosCSV += `${mesaNome};${statusDisplay};${nomeOcupante};${pagamentoStatus};${valor};${obs}\n`;
                mesasEncontradas = true;
            });

            if (!mesasEncontradas) {
                alert("Nenhuma mesa foi encontrada para exportação. Verifique se as mesas foram adicionadas ao HTML.");
                return;
            }

            // Cria e inicia o download do arquivo
            const nomeArquivo = `Status_Mesas_${new Date().toISOString().slice(0, 10)}.csv`;
            const blob = new Blob(['\ufeff', dadosCSV], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', nomeArquivo);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    // Inicia o carregamento
    carregarStatusMesas();
});


