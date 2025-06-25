/**
 * PDF Generator - Generación de PDFs para boletos
 * Utiliza jsPDF para crear documentos PDF imprimibles
 */

class PDFGenerator {
    constructor() {
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 10;
        this.ticketWidth = 85; // Width of each ticket in mm
        this.ticketHeight = 60; // Height of each ticket in mm
        this.ticketsPerRow = 2;
        this.ticketsPerPage = 10; // 5 rows x 2 columns
        this.init();
    }

    /**
     * Inicializa el generador de PDF
     */
    init() {
        // Verificar que jsPDF esté disponible
        if (typeof window.jspdf === 'undefined') {
            console.error('jsPDF no está disponible');
            return;
        }
    }

    /**
     * Genera PDF con los boletos
     */
    async generateTicketsPDF(tickets) {
        try {
            if (!tickets || tickets.length === 0) {
                throw new Error('No hay boletos para generar PDF');
            }

            // Crear nuevo documento PDF
            const doc = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Configurar fuente
            doc.setFont('helvetica');

            let currentPage = 1;
            let ticketIndex = 0;

            // Procesar boletos en grupos de página
            while (ticketIndex < tickets.length) {
                if (currentPage > 1) {
                    doc.addPage();
                }

                // Agregar título de página
                this.addPageHeader(doc, currentPage);

                // Agregar boletos a la página actual
                const ticketsInPage = Math.min(this.ticketsPerPage, tickets.length - ticketIndex);
                
                for (let i = 0; i < ticketsInPage; i++) {
                    const ticket = tickets[ticketIndex + i];
                    const row = Math.floor(i / this.ticketsPerRow);
                    const col = i % this.ticketsPerRow;
                    
                    await this.addTicketToPDF(doc, ticket, row, col);
                }

                ticketIndex += ticketsInPage;
                currentPage++;
            }

            // Agregar información del documento
            this.addDocumentInfo(doc, tickets.length);

            // Descargar PDF
            const fileName = `boletos_carne_asada_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            return true;
        } catch (error) {
            console.error('Error al generar PDF:', error);
            throw error;
        }
    }

    /**
     * Agrega header a la página
     */
    addPageHeader(doc, pageNumber) {
        // Título principal
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('BOLETOS CARNE ASADA', this.pageWidth / 2, 15, { align: 'center' });

        // Información de página
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${pageNumber}`, this.pageWidth - this.margin, 10, { align: 'right' });
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, this.margin, 10);

        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(this.margin, 20, this.pageWidth - this.margin, 20);
    }

    /**
     * Agrega un boleto al PDF
     */
    async addTicketToPDF(doc, ticket, row, col) {
        try {
            // Calcular posición
            const x = this.margin + (col * (this.ticketWidth + 5));
            const y = 30 + (row * (this.ticketHeight + 5));

            // Dibujar borde del boleto (línea punteada)
            this.drawDashedBorder(doc, x, y, this.ticketWidth, this.ticketHeight);

            // Título del boleto
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('BOLETO CARNE ASADA', x + this.ticketWidth / 2, y + 8, { align: 'center' });

            // Generar código de barras
            await this.addBarcodeToTicket(doc, ticket.codigo, x, y + 12);

            // Código del boleto
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const codeLines = this.splitText(ticket.codigo, 20);
            let codeY = y + 32;
            codeLines.forEach(line => {
                doc.text(line, x + this.ticketWidth / 2, codeY, { align: 'center' });
                codeY += 3;
            });

            // Información de vueltas
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Válido por ${ticket.vueltas_asignadas} vuelta${ticket.vueltas_asignadas > 1 ? 's' : ''}`, 
                     x + this.ticketWidth / 2, y + 42, { align: 'center' });

            // Nota adicional
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text('(3 tacos por vuelta)', x + this.ticketWidth / 2, y + 47, { align: 'center' });

            // Fecha
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            const fecha = new Date(ticket.fecha_creacion).toLocaleDateString('es-ES');
            doc.text(`Fecha: ${fecha}`, x + this.ticketWidth / 2, y + 53, { align: 'center' });

        } catch (error) {
            console.error('Error al agregar boleto al PDF:', error);
        }
    }

    /**
     * Agrega código de barras al boleto
     */
    async addBarcodeToTicket(doc, codigo, x, y) {
        try {
            // Crear canvas temporal para el código de barras
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;

            // Generar código de barras
            JsBarcode(canvas, codigo, {
                format: "CODE128",
                width: 1,
                height: 40,
                displayValue: false,
                margin: 0
            });

            // Convertir canvas a imagen
            const imgData = canvas.toDataURL('image/png');

            // Agregar imagen al PDF
            const imgWidth = 60; // Ancho en mm
            const imgHeight = 15; // Alto en mm
            const imgX = x + (this.ticketWidth - imgWidth) / 2;

            doc.addImage(imgData, 'PNG', imgX, y, imgWidth, imgHeight);

        } catch (error) {
            console.error('Error al generar código de barras:', error);
            // Si falla el código de barras, agregar texto alternativo
            doc.setFontSize(8);
            doc.text('Código de barras no disponible', x + this.ticketWidth / 2, y + 10, { align: 'center' });
        }
    }

    /**
     * Dibuja borde punteado
     */
    drawDashedBorder(doc, x, y, width, height) {
        doc.setLineWidth(0.5);
        doc.setLineDashPattern([2, 1], 0);
        
        // Dibujar rectángulo
        doc.rect(x, y, width, height);
        
        // Resetear patrón de línea
        doc.setLineDashPattern([], 0);
    }

    /**
     * Divide texto en líneas
     */
    splitText(text, maxLength) {
        const lines = [];
        for (let i = 0; i < text.length; i += maxLength) {
            lines.push(text.substring(i, i + maxLength));
        }
        return lines;
    }

    /**
     * Agrega información del documento
     */
    addDocumentInfo(doc, totalTickets) {
        // Metadatos del PDF
        doc.setProperties({
            title: 'Boletos Carne Asada',
            subject: `${totalTickets} boletos generados`,
            author: 'Sistema de Control de Boletos',
            creator: 'Aplicación Web Carne Asada',
            producer: 'jsPDF'
        });
    }

    /**
     * Genera PDF de reporte de estadísticas
     */
    async generateStatsReport() {
        try {
            const stats = window.dataManager.getStats();
            const boletos = window.dataManager.getAllBoletos();

            const doc = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Título
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORTE DE ESTADÍSTICAS', this.pageWidth / 2, 20, { align: 'center' });
            doc.text('CARNE ASADA', this.pageWidth / 2, 30, { align: 'center' });

            // Fecha del reporte
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-ES')}`, this.pageWidth / 2, 40, { align: 'center' });

            // Estadísticas generales
            let y = 60;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('ESTADÍSTICAS GENERALES', this.margin, y);

            y += 15;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total de boletos generados: ${stats.totalBoletos}`, this.margin, y);
            y += 8;
            doc.text(`Boletos activos: ${stats.boletosActivos}`, this.margin, y);
            y += 8;
            doc.text(`Total de vueltas restantes: ${stats.totalVueltasRestantes}`, this.margin, y);
            y += 8;
            doc.text(`Total de vueltas usadas: ${stats.totalVueltasUsadas}`, this.margin, y);

            // Detalle de boletos
            y += 20;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('DETALLE DE BOLETOS', this.margin, y);

            y += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Código', this.margin, y);
            doc.text('Vueltas Asignadas', this.margin + 60, y);
            doc.text('Vueltas Restantes', this.margin + 100, y);
            doc.text('Estado', this.margin + 140, y);

            y += 5;
            doc.setLineWidth(0.5);
            doc.line(this.margin, y, this.pageWidth - this.margin, y);

            y += 8;
            doc.setFont('helvetica', 'normal');

            boletos.forEach(boleto => {
                if (y > this.pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                const codigo = boleto.codigo.substring(0, 20) + '...';
                const estado = boleto.vueltas_restantes > 0 ? 'Activo' : 'Agotado';

                doc.text(codigo, this.margin, y);
                doc.text(boleto.vueltas_asignadas.toString(), this.margin + 60, y);
                doc.text(boleto.vueltas_restantes.toString(), this.margin + 100, y);
                doc.text(estado, this.margin + 140, y);

                y += 6;
            });

            // Descargar PDF
            const fileName = `reporte_estadisticas_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            return true;
        } catch (error) {
            console.error('Error al generar reporte:', error);
            throw error;
        }
    }

    /**
     * Genera PDF de historial de un boleto específico
     */
    async generateTicketHistory(codigo) {
        try {
            const boleto = window.dataManager.findBoleto(codigo);
            if (!boleto) {
                throw new Error('Boleto no encontrado');
            }

            const doc = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Título
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('HISTORIAL DE BOLETO', this.pageWidth / 2, 20, { align: 'center' });

            // Información del boleto
            let y = 40;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Código: ${boleto.codigo}`, this.margin, y);
            y += 8;
            doc.text(`Vueltas asignadas: ${boleto.vueltas_asignadas}`, this.margin, y);
            y += 8;
            doc.text(`Vueltas restantes: ${boleto.vueltas_restantes}`, this.margin, y);
            y += 8;
            doc.text(`Fecha de creación: ${new Date(boleto.fecha_creacion).toLocaleString('es-ES')}`, this.margin, y);

            // Historial de uso
            y += 20;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('HISTORIAL DE USO', this.margin, y);

            y += 15;
            if (boleto.historial && boleto.historial.length > 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Vuelta', this.margin, y);
                doc.text('Fecha y Hora', this.margin + 30, y);

                y += 8;
                doc.setFont('helvetica', 'normal');

                boleto.historial.forEach((fecha, index) => {
                    doc.text(`${index + 1}`, this.margin, y);
                    doc.text(new Date(fecha).toLocaleString('es-ES'), this.margin + 30, y);
                    y += 6;
                });
            } else {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'italic');
                doc.text('No hay registros de uso', this.margin, y);
            }

            // Descargar PDF
            const fileName = `historial_${codigo.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            return true;
        } catch (error) {
            console.error('Error al generar historial:', error);
            throw error;
        }
    }
}

// Crear instancia global del generador de PDF
window.pdfGenerator = new PDFGenerator();

