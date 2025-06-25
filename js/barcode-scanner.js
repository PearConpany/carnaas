/**
 * Barcode Scanner - Manejo de escaneo de códigos de barras
 * Soporta lectores USB y cámaras móviles
 */

class BarcodeScanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.lastScanTime = 0;
        this.scanCooldown = 1000; // 1 segundo entre escaneos
        this.init();
    }

    /**
     * Inicializa el escáner
     */
    init() {
        this.setupEventListeners();
        this.setupUSBScanner();
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón de activar cámara
        const toggleCameraBtn = document.getElementById('toggle-camera');
        if (toggleCameraBtn) {
            toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
        }

        // Botón de detener cámara
        const stopCameraBtn = document.getElementById('stop-camera');
        if (stopCameraBtn) {
            stopCameraBtn.addEventListener('click', () => this.stopCamera());
        }

        // Botón de búsqueda manual
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchManual());
        }

        // Botón de entrada manual
        const manualInputBtn = document.getElementById('manual-input');
        if (manualInputBtn) {
            manualInputBtn.addEventListener('click', () => this.focusInput());
        }

        // Botón de registrar vuelta
        const registrarVueltaBtn = document.getElementById('registrar-vuelta');
        if (registrarVueltaBtn) {
            registrarVueltaBtn.addEventListener('click', () => this.registrarVuelta());
        }

        // Botón de ver historial
        const verHistorialBtn = document.getElementById('ver-historial');
        if (verHistorialBtn) {
            verHistorialBtn.addEventListener('click', () => this.toggleHistorial());
        }
    }

    /**
     * Configura el escáner USB (teclado)
     */
    setupUSBScanner() {
        const barcodeInput = document.getElementById('barcode-input');
        if (!barcodeInput) return;

        let scanBuffer = '';
        let scanTimeout = null;

        // Detectar entrada de lector USB
        barcodeInput.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Si el valor cambió significativamente, probablemente es un escaneo
            if (value.length > scanBuffer.length + 5) {
                this.processScan(value.trim());
                return;
            }

            scanBuffer = value;
            
            // Limpiar timeout anterior
            if (scanTimeout) {
                clearTimeout(scanTimeout);
            }

            // Configurar nuevo timeout
            scanTimeout = setTimeout(() => {
                if (scanBuffer.trim().length > 0) {
                    this.processScan(scanBuffer.trim());
                }
            }, 100);
        });

        // Detectar Enter (común en lectores USB)
        barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = e.target.value.trim();
                if (value) {
                    this.processScan(value);
                }
            }
        });

        // Focus automático en el input
        barcodeInput.focus();
    }

    /**
     * Procesa un código escaneado
     */
    processScan(code) {
        // Verificar cooldown
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            return;
        }
        this.lastScanTime = now;

        // Limpiar input
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) {
            barcodeInput.value = '';
        }

        // Buscar boleto
        this.searchBoleto(code);
    }

    /**
     * Busca un boleto por código
     */
    searchBoleto(codigo) {
        try {
            // Mostrar loading
            this.showLoading(true);

            // Limpiar resultados anteriores
            this.clearResults();

            // Buscar en la base de datos
            const boleto = window.dataManager.findBoleto(codigo);
            
            if (!boleto) {
                this.showError('Boleto no encontrado. Verifique el código e intente nuevamente.');
                return;
            }

            // Validar boleto
            const validation = window.dataManager.validateBoleto(codigo);
            if (!validation.valid) {
                this.showError(validation.error);
                return;
            }

            // Mostrar información del boleto
            this.showBoletoInfo(boleto);
            
            // Mostrar toast de éxito
            this.showToast('Boleto encontrado exitosamente', 'success');

        } catch (error) {
            console.error('Error al buscar boleto:', error);
            this.showError('Error interno al buscar el boleto. Intente nuevamente.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Búsqueda manual
     */
    searchManual() {
        const barcodeInput = document.getElementById('barcode-input');
        if (!barcodeInput) return;

        const codigo = barcodeInput.value.trim();
        if (!codigo) {
            this.showError('Por favor ingrese un código de boleto');
            return;
        }

        this.searchBoleto(codigo);
    }

    /**
     * Enfoca el input de código
     */
    focusInput() {
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) {
            barcodeInput.focus();
            barcodeInput.select();
        }
    }

    /**
     * Activa/desactiva la cámara
     */
    async toggleCamera() {
        if (this.isScanning) {
            this.stopCamera();
        } else {
            await this.startCamera();
        }
    }

    /**
     * Inicia el escaneo con cámara
     */
    async startCamera() {
        try {
            // Verificar soporte de cámara
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showError('Su navegador no soporta acceso a la cámara');
                return;
            }

            // Mostrar sección de cámara
            const cameraSection = document.getElementById('camera-scanner');
            if (cameraSection) {
                cameraSection.classList.remove('hidden');
            }

            // Inicializar Html5Qrcode si no existe
            if (!this.html5QrCode) {
                this.html5QrCode = new Html5Qrcode("qr-reader");
            }

            // Configuración de escaneo
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            // Iniciar escaneo
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Cámara trasera preferida
                config,
                (decodedText, decodedResult) => {
                    this.processScan(decodedText);
                },
                (errorMessage) => {
                    // Errores de escaneo (normales, no mostrar)
                }
            );

            this.isScanning = true;
            this.updateCameraButton();
            this.showToast('Cámara activada. Apunte al código de barras', 'info');

        } catch (error) {
            console.error('Error al iniciar cámara:', error);
            this.showError('No se pudo acceder a la cámara. Verifique los permisos.');
            this.hideCameraSection();
        }
    }

    /**
     * Detiene el escaneo con cámara
     */
    async stopCamera() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
            }
        } catch (error) {
            console.error('Error al detener cámara:', error);
        } finally {
            this.isScanning = false;
            this.updateCameraButton();
            this.hideCameraSection();
            this.showToast('Cámara desactivada', 'info');
        }
    }

    /**
     * Actualiza el botón de cámara
     */
    updateCameraButton() {
        const toggleBtn = document.getElementById('toggle-camera');
        if (!toggleBtn) return;

        if (this.isScanning) {
            toggleBtn.innerHTML = '<i class="fas fa-camera-slash"></i> Desactivar Cámara';
            toggleBtn.classList.remove('btn-secondary');
            toggleBtn.classList.add('btn-warning');
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-camera"></i> Activar Cámara';
            toggleBtn.classList.remove('btn-warning');
            toggleBtn.classList.add('btn-secondary');
        }
    }

    /**
     * Oculta la sección de cámara
     */
    hideCameraSection() {
        const cameraSection = document.getElementById('camera-scanner');
        if (cameraSection) {
            cameraSection.classList.add('hidden');
        }
    }

    /**
     * Muestra información del boleto
     */
    showBoletoInfo(boleto) {
        // Mostrar sección de resultados
        const resultsSection = document.getElementById('scanner-results');
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
        }

        // Actualizar información
        this.updateElement('result-codigo', boleto.codigo);
        this.updateElement('result-vueltas', boleto.vueltas_restantes);
        this.updateElement('result-fecha', this.formatDate(boleto.fecha_creacion));

        // Actualizar estado
        const statusBadge = document.getElementById('result-status');
        if (statusBadge) {
            statusBadge.className = 'status-badge';
            if (boleto.vueltas_restantes > 0) {
                statusBadge.classList.add('active');
                statusBadge.textContent = 'ACTIVO';
            } else {
                statusBadge.classList.add('used');
                statusBadge.textContent = 'AGOTADO';
            }
        }

        // Habilitar/deshabilitar botón de registrar vuelta
        const registrarBtn = document.getElementById('registrar-vuelta');
        if (registrarBtn) {
            registrarBtn.disabled = boleto.vueltas_restantes <= 0;
            registrarBtn.dataset.codigo = boleto.codigo;
        }

        // Actualizar historial
        this.updateHistorial(boleto);

        // Guardar boleto actual para referencia
        this.currentBoleto = boleto;
    }

    /**
     * Actualiza el historial del boleto
     */
    updateHistorial(boleto) {
        const historialList = document.getElementById('historial-list');
        if (!historialList) return;

        historialList.innerHTML = '';

        if (!boleto.historial || boleto.historial.length === 0) {
            historialList.innerHTML = '<p class="text-center text-secondary">No hay registros de uso</p>';
            return;
        }

        boleto.historial.forEach((fecha, index) => {
            const item = document.createElement('div');
            item.className = 'historial-item';
            item.innerHTML = `
                <span>Vuelta ${index + 1}</span>
                <span class="historial-fecha">${this.formatDate(fecha)}</span>
            `;
            historialList.appendChild(item);
        });
    }

    /**
     * Registra una vuelta
     */
    registrarVuelta() {
        if (!this.currentBoleto) {
            this.showError('No hay boleto seleccionado');
            return;
        }

        try {
            this.showLoading(true);

            const result = window.dataManager.usarVuelta(this.currentBoleto.codigo);
            
            if (result.success) {
                // Actualizar información mostrada
                this.showBoletoInfo(result.boleto);
                
                // Mostrar mensaje de éxito
                this.showToast(
                    `Vuelta registrada. Quedan ${result.vueltas_restantes} vueltas`, 
                    'success'
                );

                // Actualizar estadísticas globales
                if (window.updateStatsUI) {
                    window.updateStatsUI();
                }
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error al registrar vuelta:', error);
            this.showError('Error interno al registrar la vuelta');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Muestra/oculta el historial
     */
    toggleHistorial() {
        const historialSection = document.getElementById('historial-section');
        if (historialSection) {
            historialSection.classList.toggle('hidden');
        }
    }

    /**
     * Limpia los resultados
     */
    clearResults() {
        const resultsSection = document.getElementById('scanner-results');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }

        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }

        this.currentBoleto = null;
    }

    /**
     * Muestra un error
     */
    showError(message) {
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
        }

        // Ocultar resultados
        const resultsSection = document.getElementById('scanner-results');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }

        // Mostrar toast de error
        this.showToast(message, 'error');
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
     * Actualiza el contenido de un elemento
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    /**
     * Formatea una fecha
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Limpia el escáner al destruir
     */
    destroy() {
        if (this.isScanning) {
            this.stopCamera();
        }
    }
}

// Crear instancia global del escáner
window.barcodeScanner = new BarcodeScanner();

