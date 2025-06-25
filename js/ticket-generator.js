/**
 * Ticket Generator - Generación de boletos únicos
 * Maneja la creación, visualización y almacenamiento de boletos
 */

class TicketGenerator {
    constructor() {
        this.generatedTickets = [];
        this.maxTicketsPerGeneration = 50;
        this.init();
    }

    /**
     * Inicializa el generador
     */
    init() {
        this.setupEventListeners();
        this.updateGenerationLimits();
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón de generar boletos
        const generarBtn = document.getElementById('generar-boletos');
        if (generarBtn) {
            generarBtn.addEventListener('click', () => this.generateTickets());
        }

        // Botón de exportar datos
        const exportarBtn = document.getElementById('exportar-datos');
        if (exportarBtn) {
            exportarBtn.addEventListener('click', () => this.exportData());
        }

        // Botón de descargar PDF
        const downloadPdfBtn = document.getElementById('download-pdf');
        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => this.downloadPDF());
        }

        // Botón de imprimir
        const printBtn = document.getElementById('print-tickets');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printTickets());
        }

        // Validación de inputs
        const cantidadInput = document.getElementById('cantidad-boletos');
        const vueltasInput = document.getElementById('vueltas-boleto');

        if (cantidadInput) {
            cantidadInput.addEventListener('input', () => this.validateInputs());
            cantidadInput.addEventListener('change', () => this.validateInputs());
        }

        if (vueltasInput) {
            vueltasInput.addEventListener('input', () => this.validateInputs());
            vueltasInput.addEventListener('change', () => this.validateInputs());
        }
    }

    /**
     * Actualiza los límites de generación
     */
    updateGenerationLimits() {
        const cantidadInput = document.getElementById('cantidad-boletos');
        if (cantidadInput) {
            cantidadInput.max = this.maxTicketsPerGeneration;
        }
    }

    /**
     * Valida los inputs de generación
     */
    validateInputs() {
        const cantidadInput = document.getElementById('cantidad-boletos');
        const vueltasInput = document.getElementById('vueltas-boleto');
        const generarBtn = document.getElementById('generar-boletos');

        if (!cantidadInput || !vueltasInput || !generarBtn) return;

        const cantidad = parseInt(cantidadInput.value) || 0;
        const vueltas = parseInt(vueltasInput.value) || 0;

        let isValid = true;
        let errorMessage = '';

        // Validar cantidad
        if (cantidad < 1) {
            isValid = false;
            errorMessage = 'La cantidad debe ser mayor a 0';
        } else if (cantidad > this.maxTicketsPerGeneration) {
            isValid = false;
            errorMessage = `La cantidad máxima es ${this.maxTicketsPerGeneration} boletos`;
        }

        // Validar vueltas
        if (vueltas < 1) {
            isValid = false;
            errorMessage = 'Las vueltas deben ser mayor a 0';
        } else if (vueltas > 10) {
            isValid = false;
            errorMessage = 'El máximo de vueltas por boleto es 10';
        }

        // Actualizar UI
        generarBtn.disabled = !isValid;
        
        if (!isValid && errorMessage) {
            this.showToast(errorMessage, 'warning');
        }

        return isValid;
    }

    /**
     * Genera los boletos
     */
    async generateTickets() {
        try {
            // Validar inputs
            if (!this.validateInputs()) {
                return;
            }

            // Obtener valores
            const cantidad = parseInt(document.getElementById('cantidad-boletos').value) || 1;
            const vueltas = parseInt(document.getElementById('vueltas-boleto').value) || 3;

            // Mostrar loading
            this.showLoading(true);

            // Generar boletos
            const tickets = [];
            for (let i = 0; i < cantidad; i++) {
                const boleto = window.dataManager.createBoleto(vueltas);
                
                // Guardar en la base de datos
                if (window.dataManager.saveBoleto(boleto)) {
                    tickets.push(boleto);
                } else {
                    throw new Error(`Error al guardar boleto ${i + 1}`);
                }

                // Actualizar progreso (opcional)
                if (cantidad > 10) {
                    await this.sleep(10); // Pequeña pausa para UI responsiva
                }
            }

            // Guardar tickets generados
            this.generatedTickets = tickets;

            // Mostrar vista previa
            await this.showTicketsPreview(tickets);

            // Actualizar estadísticas
            if (window.updateStatsUI) {
                window.updateStatsUI();
            }

            // Mostrar mensaje de éxito
            this.showToast(
                `${cantidad} boleto${cantidad > 1 ? 's' : ''} generado${cantidad > 1 ? 's' : ''} exitosamente`, 
                'success'
            );

        } catch (error) {
            console.error('Error al generar boletos:', error);
            this.showToast('Error al generar boletos: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Muestra la vista previa de los boletos
     */
    async showTicketsPreview(tickets) {
        const previewSection = document.getElementById('tickets-preview');
        const ticketsContainer = document.getElementById('tickets-container');

        if (!previewSection || !ticketsContainer) return;

        // Limpiar contenedor
        ticketsContainer.innerHTML = '';

        // Mostrar sección
        previewSection.classList.remove('hidden');

        // Generar vista previa de cada ticket
        for (const ticket of tickets) {
            const ticketElement = await this.createTicketElement(ticket);
            ticketsContainer.appendChild(ticketElement);
        }

        // Scroll hacia la vista previa
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Crea el elemento HTML de un ticket
     */
    async createTicketElement(ticket) {
        const ticketDiv = document.createElement('div');
        ticketDiv.className = 'ticket';
        
        // Crear código de barras
        const barcodeCanvas = document.createElement('canvas');
        barcodeCanvas.className = 'ticket-barcode-canvas';
        
        try {
            // Generar código de barras usando JsBarcode
            JsBarcode(barcodeCanvas, ticket.codigo, {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: false,
                margin: 0
            });
        } catch (error) {
            console.error('Error al generar código de barras:', error);
        }

        // Crear contenido del ticket
        ticketDiv.innerHTML = `
            <div class="ticket-header">BOLETO CARNE ASADA</div>
            <div class="ticket-barcode"></div>
            <div class="ticket-code">${ticket.codigo}</div>
            <div class="ticket-info">Válido por ${ticket.vueltas_asignadas} vuelta${ticket.vueltas_asignadas > 1 ? 's' : ''}</div>
            <div class="ticket-note">(3 tacos por vuelta)</div>
            <div class="ticket-date">Fecha: ${this.formatDate(ticket.fecha_creacion)}</div>
        `;

        // Insertar código de barras
        const barcodeContainer = ticketDiv.querySelector('.ticket-barcode');
        if (barcodeContainer) {
            barcodeContainer.appendChild(barcodeCanvas);
        }

        return ticketDiv;
    }

    /**
     * Exporta los datos a CSV
     */
    exportData() {
        try {
            const success = window.dataManager.downloadCSV();
            if (success) {
                this.showToast('Datos exportados exitosamente', 'success');
            } else {
                this.showToast('Error al exportar datos', 'error');
            }
        } catch (error) {
            console.error('Error al exportar datos:', error);
            this.showToast('Error al exportar datos: ' + error.message, 'error');
        }
    }

    /**
     * Descarga los boletos en PDF
     */
    async downloadPDF() {
        if (!this.generatedTickets || this.generatedTickets.length === 0) {
            this.showToast('No hay boletos para descargar', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            
            // Usar el generador de PDF
            if (window.pdfGenerator) {
                await window.pdfGenerator.generateTicketsPDF(this.generatedTickets);
                this.showToast('PDF descargado exitosamente', 'success');
            } else {
                throw new Error('Generador de PDF no disponible');
            }
        } catch (error) {
            console.error('Error al generar PDF:', error);
            this.showToast('Error al generar PDF: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Imprime los boletos
     */
    printTickets() {
        if (!this.generatedTickets || this.generatedTickets.length === 0) {
            this.showToast('No hay boletos para imprimir', 'warning');
            return;
        }

        try {
            // Crear ventana de impresión
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                throw new Error('No se pudo abrir la ventana de impresión');
            }

            // Generar HTML para impresión
            const printHTML = this.generatePrintHTML(this.generatedTickets);
            
            printWindow.document.write(printHTML);
            printWindow.document.close();
            
            // Esperar a que cargue y luego imprimir
            printWindow.onload = () => {
                printWindow.print();
                printWindow.close();
            };

            this.showToast('Preparando impresión...', 'info');
        } catch (error) {
            console.error('Error al imprimir:', error);
            this.showToast('Error al imprimir: ' + error.message, 'error');
        }
    }

    /**
     * Genera HTML para impresión
     */
    generatePrintHTML(tickets) {
        let ticketsHTML = '';
        
        tickets.forEach(ticket => {
            // Generar código de barras como SVG para mejor calidad de impresión
            const barcodeCanvas = document.createElement('canvas');
            JsBarcode(barcodeCanvas, ticket.codigo, {
                format: "CODE128",
                width: 2,
                height: 80,
                displayValue: false,
                margin: 0
            });
            
            const barcodeDataURL = barcodeCanvas.toDataURL('image/png');
            
            ticketsHTML += `
                <div class="print-ticket">
                    <div class="print-ticket-header">BOLETO CARNE ASADA</div>
                    <div class="print-ticket-barcode">
                        <img src="${barcodeDataURL}" alt="Código de barras" />
                    </div>
                    <div class="print-ticket-code">${ticket.codigo}</div>
                    <div class="print-ticket-info">Válido por ${ticket.vueltas_asignadas} vuelta${ticket.vueltas_asignadas > 1 ? 's' : ''}</div>
                    <div class="print-ticket-note">(3 tacos por vuelta)</div>
                    <div class="print-ticket-date">Fecha: ${this.formatDate(ticket.fecha_creacion)}</div>
                </div>
            `;
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Boletos - Carne Asada</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: white;
                    }
                    .print-ticket {
                        width: 8cm;
                        height: 6cm;
                        border: 2px dashed #333;
                        margin: 5mm;
                        padding: 5mm;
                        text-align: center;
                        display: inline-block;
                        vertical-align: top;
                        page-break-inside: avoid;
                        box-sizing: border-box;
                    }
                    .print-ticket-header {
                        font-weight: bold;
                        font-size: 14px;
                        margin-bottom: 5mm;
                        color: #e74c3c;
                    }
                    .print-ticket-barcode {
                        margin: 3mm 0;
                    }
                    .print-ticket-barcode img {
                        max-width: 100%;
                        height: auto;
                    }
                    .print-ticket-code {
                        font-family: 'Courier New', monospace;
                        font-size: 8px;
                        margin: 2mm 0;
                        word-break: break-all;
                        line-height: 1.2;
                    }
                    .print-ticket-info {
                        font-weight: bold;
                        font-size: 12px;
                        margin: 2mm 0;
                    }
                    .print-ticket-note {
                        font-size: 10px;
                        font-style: italic;
                        margin: 2mm 0;
                    }
                    .print-ticket-date {
                        font-size: 8px;
                        color: #666;
                        margin-top: 2mm;
                    }
                    @media print {
                        body { margin: 0; padding: 0; }
                        .print-ticket { margin: 2mm; }
                    }
                </style>
            </head>
            <body>
                ${ticketsHTML}
            </body>
            </html>
        `;
    }

    /**
     * Limpia la vista previa
     */
    clearPreview() {
        const previewSection = document.getElementById('tickets-preview');
        if (previewSection) {
            previewSection.classList.add('hidden');
        }

        const ticketsContainer = document.getElementById('tickets-container');
        if (ticketsContainer) {
            ticketsContainer.innerHTML = '';
        }

        this.generatedTickets = [];
    }

    /**
     * Muestra/oculta loading
     */
    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.remove('hidden');
            } else {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    /**
     * Muestra un toast notification
     */
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Remover después de 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    /**
     * Formatea una fecha
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Pausa la ejecución (para UI responsiva)
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtiene estadísticas de generación
     */
    getGenerationStats() {
        const stats = window.dataManager.getStats();
        return {
            totalGenerados: stats.totalBoletos,
            ultimaGeneracion: this.generatedTickets.length,
            fechaUltimaGeneracion: this.generatedTickets.length > 0 ? 
                this.generatedTickets[0].fecha_creacion : null
        };
    }

    /**
     * Resetea el formulario de generación
     */
    resetForm() {
        const cantidadInput = document.getElementById('cantidad-boletos');
        const vueltasInput = document.getElementById('vueltas-boleto');

        if (cantidadInput) cantidadInput.value = '1';
        if (vueltasInput) vueltasInput.value = '3';

        this.clearPreview();
        this.validateInputs();
    }
}

// Crear instancia global del generador
window.ticketGenerator = new TicketGenerator();

