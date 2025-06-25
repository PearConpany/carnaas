/**
 * App.js - Archivo principal de la aplicación
 * Integra todos los componentes y maneja la inicialización
 */

class CarneAsadaApp {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        try {
            // Esperar a que el DOM esté listo
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
        }
    }

    /**
     * Inicializa todos los componentes de la aplicación
     */
    initializeApp() {
        try {
            // Verificar que las dependencias estén cargadas
            if (!this.checkDependencies()) {
                console.error('Dependencias no cargadas correctamente');
                return;
            }

            // Inicializar componentes
            this.setupDataManagement();
            this.setupEventListeners();
            this.updateUI();
            
            // Marcar como inicializada
            this.isInitialized = true;
            
            console.log('Aplicación inicializada correctamente');
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('Error en inicialización:', error);
            this.showErrorMessage('Error al inicializar la aplicación');
        }
    }

    /**
     * Verifica que las dependencias estén cargadas
     */
    checkDependencies() {
        const dependencies = [
            'dataManager',
            'barcodeScanner', 
            'ticketGenerator',
            'JsBarcode',
            'Html5Qrcode'
        ];

        for (const dep of dependencies) {
            if (typeof window[dep] === 'undefined' && typeof window[dep] !== 'function') {
                console.error(`Dependencia faltante: ${dep}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Configura la gestión de datos
     */
    setupDataManagement() {
        // Configurar event listeners para gestión de datos
        this.setupDataEventListeners();
        
        // Actualizar estadísticas iniciales
        this.updateStatsUI();
        
        // Configurar auto-backup (opcional)
        this.setupAutoBackup();
    }

    /**
     * Configura los event listeners para gestión de datos
     */
    setupDataEventListeners() {
        // Botón de backup
        const backupBtn = document.getElementById('backup-datos');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.createBackup());
        }

        // Botón de importar
        const importBtn = document.getElementById('importar-datos');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importData());
        }

        // Input de archivo para importar
        const fileInput = document.getElementById('file-import');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileImport(e));
        }

        // Botón de limpiar datos
        const clearBtn = document.getElementById('limpiar-datos');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllData());
        }
    }

    /**
     * Configura event listeners generales
     */
    setupEventListeners() {
        // Actualizar estadísticas cuando cambie el localStorage
        window.addEventListener('storage', () => {
            this.updateStatsUI();
        });

        // Manejar visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateStatsUI();
            }
        });

        // Manejar errores globales
        window.addEventListener('error', (e) => {
            console.error('Error global:', e.error);
        });

        // Manejar errores de promesas no capturadas
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promise rechazada:', e.reason);
        });
    }

    /**
     * Actualiza la interfaz de usuario
     */
    updateUI() {
        this.updateStatsUI();
        this.updateLastBackupUI();
    }

    /**
     * Actualiza las estadísticas en la UI
     */
    updateStatsUI() {
        try {
            const stats = window.dataManager.getStats();
            
            // Actualizar header stats
            this.updateElement('total-boletos', stats.boletosActivos);
            this.updateElement('total-vueltas', stats.totalVueltasRestantes);
            
            // Actualizar data section stats
            this.updateElement('total-generados', stats.totalBoletos);
            this.updateElement('total-usados', stats.totalVueltasUsadas);
            
            // Actualizar último backup
            const ultimoBackup = stats.ultimoBackup ? 
                this.formatDate(stats.ultimoBackup) : 'Nunca';
            this.updateElement('ultimo-backup', ultimoBackup);
            
        } catch (error) {
            console.error('Error al actualizar estadísticas UI:', error);
        }
    }

    /**
     * Actualiza la información del último backup
     */
    updateLastBackupUI() {
        try {
            const config = window.dataManager.getConfig();
            const ultimoBackup = config.ultimoBackup ? 
                this.formatDate(config.ultimoBackup) : 'Nunca';
            this.updateElement('ultimo-backup', ultimoBackup);
        } catch (error) {
            console.error('Error al actualizar último backup:', error);
        }
    }

    /**
     * Crea un backup de los datos
     */
    createBackup() {
        try {
            const success = window.dataManager.downloadCSV();
            if (success) {
                this.showToast('Backup creado exitosamente', 'success');
                this.updateLastBackupUI();
            } else {
                this.showToast('Error al crear backup', 'error');
            }
        } catch (error) {
            console.error('Error al crear backup:', error);
            this.showToast('Error al crear backup: ' + error.message, 'error');
        }
    }

    /**
     * Inicia el proceso de importación de datos
     */
    importData() {
        const fileInput = document.getElementById('file-import');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Maneja la importación de archivo
     */
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Verificar tipo de archivo
            if (!file.name.toLowerCase().endsWith('.csv')) {
                this.showToast('Por favor seleccione un archivo CSV', 'warning');
                return;
            }

            this.showLoading(true);

            // Leer archivo
            const content = await this.readFile(file);
            
            // Importar datos
            const result = window.dataManager.importFromCSV(content);
            
            if (result.success) {
                this.showToast(
                    `Importación exitosa: ${result.imported} nuevos, ${result.updated} actualizados`, 
                    'success'
                );
                this.updateStatsUI();
            } else {
                this.showToast('Error en importación: ' + result.error, 'error');
            }

        } catch (error) {
            console.error('Error al importar archivo:', error);
            this.showToast('Error al importar archivo: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            // Limpiar input
            event.target.value = '';
        }
    }

    /**
     * Lee un archivo como texto
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error al leer archivo'));
            reader.readAsText(file);
        });
    }

    /**
     * Limpia todos los datos
     */
    clearAllData() {
        // Confirmar acción
        if (!confirm('¿Está seguro de que desea eliminar todos los datos? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const success = window.dataManager.clearAllData();
            if (success) {
                this.showToast('Todos los datos han sido eliminados', 'success');
                this.updateStatsUI();
                
                // Limpiar vista previa de tickets si existe
                if (window.ticketGenerator) {
                    window.ticketGenerator.clearPreview();
                }
                
                // Limpiar resultados de scanner si existe
                if (window.barcodeScanner) {
                    window.barcodeScanner.clearResults();
                }
            } else {
                this.showToast('Error al eliminar datos', 'error');
            }
        } catch (error) {
            console.error('Error al limpiar datos:', error);
            this.showToast('Error al eliminar datos: ' + error.message, 'error');
        }
    }

    /**
     * Configura backup automático (opcional)
     */
    setupAutoBackup() {
        // Backup automático cada 24 horas (opcional)
        const autoBackupInterval = 24 * 60 * 60 * 1000; // 24 horas
        
        setInterval(() => {
            const config = window.dataManager.getConfig();
            const lastBackup = config.ultimoBackup ? new Date(config.ultimoBackup) : null;
            const now = new Date();
            
            if (!lastBackup || (now - lastBackup) > autoBackupInterval) {
                console.log('Realizando backup automático...');
                // No descargar automáticamente, solo actualizar timestamp
                const newConfig = { ...config, ultimoBackup: now.toISOString() };
                window.dataManager.saveConfig(newConfig);
            }
        }, 60 * 60 * 1000); // Verificar cada hora
    }

    /**
     * Muestra mensaje de bienvenida
     */
    showWelcomeMessage() {
        this.showToast('¡Bienvenido al Control de Boletos de Carne Asada!', 'info');
    }

    /**
     * Muestra mensaje de error
     */
    showErrorMessage(message) {
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
     * Obtiene información del sistema
     */
    getSystemInfo() {
        return {
            version: '1.0.0',
            initialized: this.isInitialized,
            userAgent: navigator.userAgent,
            localStorage: window.dataManager.isLocalStorageAvailable(),
            stats: window.dataManager.getStats()
        };
    }

    /**
     * Exporta configuración de la aplicación
     */
    exportConfig() {
        const config = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            settings: window.dataManager.getConfig(),
            stats: window.dataManager.getStats()
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { 
            type: 'application/json' 
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `config_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    /**
     * Reinicia la aplicación
     */
    restart() {
        if (confirm('¿Desea reiniciar la aplicación? Se recargarán todos los componentes.')) {
            window.location.reload();
        }
    }
}

// Función global para actualizar estadísticas (usada por otros componentes)
window.updateStatsUI = function() {
    if (window.carneAsadaApp) {
        window.carneAsadaApp.updateStatsUI();
    }
};

// Inicializar aplicación cuando se cargue el script
window.carneAsadaApp = new CarneAsadaApp();

