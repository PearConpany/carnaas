/**
 * Data Manager - Gestión de datos locales para la aplicación de boletos
 * Maneja localStorage, exportación/importación CSV y validación de datos
 */

class DataManager {
    constructor() {
        this.storageKey = 'carneAsadaBoletos';
        this.configKey = 'carneAsadaConfig';
        this.init();
    }

    /**
     * Inicializa el gestor de datos
     */
    init() {
        // Verificar si localStorage está disponible
        if (!this.isLocalStorageAvailable()) {
            console.error('localStorage no está disponible');
            return;
        }

        // Inicializar estructura de datos si no existe
        if (!localStorage.getItem(this.storageKey)) {
            this.initializeStorage();
        }

        // Migrar datos antiguos si es necesario
        this.migrateData();
    }

    /**
     * Verifica si localStorage está disponible
     */
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Inicializa la estructura de datos en localStorage
     */
    initializeStorage() {
        const initialData = {
            boletos: {},
            version: '1.0.0',
            lastUpdate: new Date().toISOString()
        };

        const initialConfig = {
            totalBoletosGenerados: 0,
            totalVueltasUsadas: 0,
            ultimoBackup: null,
            configuracion: {
                vueltas_default: 3,
                max_boletos_generacion: 50
            }
        };

        localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        localStorage.setItem(this.configKey, JSON.stringify(initialConfig));
    }

    /**
     * Migra datos de versiones anteriores
     */
    migrateData() {
        try {
            const data = this.getData();
            if (!data.version || data.version < '1.0.0') {
                // Realizar migraciones necesarias
                data.version = '1.0.0';
                this.saveData(data);
            }
        } catch (error) {
            console.error('Error en migración de datos:', error);
        }
    }

    /**
     * Obtiene todos los datos del localStorage
     */
    getData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : { boletos: {} };
        } catch (error) {
            console.error('Error al obtener datos:', error);
            return { boletos: {} };
        }
    }

    /**
     * Guarda datos en localStorage
     */
    saveData(data) {
        try {
            data.lastUpdate = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error al guardar datos:', error);
            return false;
        }
    }

    /**
     * Obtiene la configuración
     */
    getConfig() {
        try {
            const config = localStorage.getItem(this.configKey);
            return config ? JSON.parse(config) : {};
        } catch (error) {
            console.error('Error al obtener configuración:', error);
            return {};
        }
    }

    /**
     * Guarda la configuración
     */
    saveConfig(config) {
        try {
            localStorage.setItem(this.configKey, JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Error al guardar configuración:', error);
            return false;
        }
    }

    /**
     * Genera un UUID único
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Genera un salt de seguridad
     */
    generateSalt() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let salt = '';
        for (let i = 0; i < 8; i++) {
            salt += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return salt;
    }

    /**
     * Crea un nuevo boleto
     */
    createBoleto(vueltas = 3) {
        const codigo = this.generateUUID();
        const salt = this.generateSalt();
        const fechaCreacion = new Date().toISOString();

        const boleto = {
            codigo: codigo,
            salt: salt,
            vueltas_asignadas: vueltas,
            vueltas_restantes: vueltas,
            fecha_creacion: fechaCreacion,
            historial: [],
            activo: true
        };

        return boleto;
    }

    /**
     * Guarda un boleto en la base de datos
     */
    saveBoleto(boleto) {
        try {
            const data = this.getData();
            data.boletos[boleto.codigo] = boleto;
            
            if (this.saveData(data)) {
                // Actualizar estadísticas
                this.updateStats();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al guardar boleto:', error);
            return false;
        }
    }

    /**
     * Busca un boleto por código
     */
    findBoleto(codigo) {
        try {
            const data = this.getData();
            return data.boletos[codigo] || null;
        } catch (error) {
            console.error('Error al buscar boleto:', error);
            return null;
        }
    }

    /**
     * Valida un boleto con su salt
     */
    validateBoleto(codigo, salt = null) {
        const boleto = this.findBoleto(codigo);
        if (!boleto) {
            return { valid: false, error: 'Boleto no encontrado' };
        }

        if (!boleto.activo) {
            return { valid: false, error: 'Boleto inactivo' };
        }

        if (salt && boleto.salt !== salt) {
            return { valid: false, error: 'Salt de seguridad inválido' };
        }

        if (boleto.vueltas_restantes <= 0) {
            return { valid: false, error: 'Boleto sin vueltas restantes' };
        }

        return { valid: true, boleto: boleto };
    }

    /**
     * Registra el uso de una vuelta
     */
    usarVuelta(codigo) {
        try {
            const boleto = this.findBoleto(codigo);
            if (!boleto) {
                return { success: false, error: 'Boleto no encontrado' };
            }

            if (boleto.vueltas_restantes <= 0) {
                return { success: false, error: 'No hay vueltas restantes' };
            }

            // Registrar uso
            const fechaUso = new Date().toISOString();
            boleto.vueltas_restantes--;
            boleto.historial.push(fechaUso);

            // Guardar cambios
            if (this.saveBoleto(boleto)) {
                // Actualizar estadísticas
                this.incrementarVueltasUsadas();
                
                return { 
                    success: true, 
                    boleto: boleto,
                    vueltas_restantes: boleto.vueltas_restantes
                };
            }

            return { success: false, error: 'Error al guardar cambios' };
        } catch (error) {
            console.error('Error al usar vuelta:', error);
            return { success: false, error: 'Error interno' };
        }
    }

    /**
     * Obtiene todos los boletos
     */
    getAllBoletos() {
        try {
            const data = this.getData();
            return Object.values(data.boletos);
        } catch (error) {
            console.error('Error al obtener boletos:', error);
            return [];
        }
    }

    /**
     * Obtiene boletos activos
     */
    getActiveBoletos() {
        return this.getAllBoletos().filter(boleto => 
            boleto.activo && boleto.vueltas_restantes > 0
        );
    }

    /**
     * Actualiza las estadísticas
     */
    updateStats() {
        try {
            const config = this.getConfig();
            const boletos = this.getAllBoletos();
            
            config.totalBoletosGenerados = boletos.length;
            config.totalVueltasUsadas = boletos.reduce((total, boleto) => {
                return total + (boleto.vueltas_asignadas - boleto.vueltas_restantes);
            }, 0);

            this.saveConfig(config);
            
            // Actualizar UI si existe
            if (window.updateStatsUI) {
                window.updateStatsUI();
            }
        } catch (error) {
            console.error('Error al actualizar estadísticas:', error);
        }
    }

    /**
     * Incrementa el contador de vueltas usadas
     */
    incrementarVueltasUsadas() {
        try {
            const config = this.getConfig();
            config.totalVueltasUsadas = (config.totalVueltasUsadas || 0) + 1;
            this.saveConfig(config);
        } catch (error) {
            console.error('Error al incrementar vueltas usadas:', error);
        }
    }

    /**
     * Exporta datos a CSV
     */
    exportToCSV() {
        try {
            const boletos = this.getAllBoletos();
            
            // Crear CSV header
            const headers = [
                'codigo',
                'salt',
                'vueltas_asignadas',
                'vueltas_restantes',
                'fecha_creacion',
                'historial_fechas',
                'activo'
            ];

            // Crear filas CSV
            const rows = boletos.map(boleto => [
                boleto.codigo,
                boleto.salt,
                boleto.vueltas_asignadas,
                boleto.vueltas_restantes,
                boleto.fecha_creacion,
                boleto.historial.join('|'),
                boleto.activo ? 'true' : 'false'
            ]);

            // Combinar headers y rows
            const csvContent = [headers, ...rows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            return csvContent;
        } catch (error) {
            console.error('Error al exportar CSV:', error);
            return null;
        }
    }

    /**
     * Descarga archivo CSV
     */
    downloadCSV() {
        try {
            const csvContent = this.exportToCSV();
            if (!csvContent) {
                throw new Error('No se pudo generar el CSV');
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `boletos_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Actualizar último backup
                const config = this.getConfig();
                config.ultimoBackup = new Date().toISOString();
                this.saveConfig(config);
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al descargar CSV:', error);
            return false;
        }
    }

    /**
     * Importa datos desde CSV
     */
    importFromCSV(csvContent) {
        try {
            const lines = csvContent.split('\n');
            if (lines.length < 2) {
                throw new Error('Archivo CSV vacío o inválido');
            }

            // Parsear header
            const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
            
            // Validar headers requeridos
            const requiredHeaders = ['codigo', 'salt', 'vueltas_asignadas', 'vueltas_restantes', 'fecha_creacion'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            
            if (missingHeaders.length > 0) {
                throw new Error(`Headers faltantes: ${missingHeaders.join(', ')}`);
            }

            // Parsear datos
            const importedBoletos = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',').map(v => v.replace(/"/g, ''));
                const boleto = {};

                headers.forEach((header, index) => {
                    boleto[header] = values[index] || '';
                });

                // Validar y convertir tipos
                boleto.vueltas_asignadas = parseInt(boleto.vueltas_asignadas) || 0;
                boleto.vueltas_restantes = parseInt(boleto.vueltas_restantes) || 0;
                boleto.activo = boleto.activo === 'true';
                boleto.historial = boleto.historial_fechas ? 
                    boleto.historial_fechas.split('|').filter(f => f) : [];

                // Validar boleto
                if (boleto.codigo && boleto.salt) {
                    importedBoletos.push(boleto);
                }
            }

            if (importedBoletos.length === 0) {
                throw new Error('No se encontraron boletos válidos en el archivo');
            }

            // Guardar boletos importados
            const data = this.getData();
            let importedCount = 0;
            let updatedCount = 0;

            importedBoletos.forEach(boleto => {
                if (data.boletos[boleto.codigo]) {
                    updatedCount++;
                } else {
                    importedCount++;
                }
                data.boletos[boleto.codigo] = boleto;
            });

            if (this.saveData(data)) {
                this.updateStats();
                return {
                    success: true,
                    imported: importedCount,
                    updated: updatedCount,
                    total: importedBoletos.length
                };
            }

            throw new Error('Error al guardar datos importados');
        } catch (error) {
            console.error('Error al importar CSV:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Limpia todos los datos
     */
    clearAllData() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.configKey);
            this.initializeStorage();
            
            // Actualizar UI si existe
            if (window.updateStatsUI) {
                window.updateStatsUI();
            }
            
            return true;
        } catch (error) {
            console.error('Error al limpiar datos:', error);
            return false;
        }
    }

    /**
     * Obtiene estadísticas generales
     */
    getStats() {
        try {
            const config = this.getConfig();
            const boletos = this.getAllBoletos();
            const activeBoletos = this.getActiveBoletos();
            
            const totalVueltasRestantes = activeBoletos.reduce((total, boleto) => {
                return total + boleto.vueltas_restantes;
            }, 0);

            return {
                totalBoletos: boletos.length,
                boletosActivos: activeBoletos.length,
                totalVueltasRestantes: totalVueltasRestantes,
                totalVueltasUsadas: config.totalVueltasUsadas || 0,
                ultimoBackup: config.ultimoBackup
            };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return {
                totalBoletos: 0,
                boletosActivos: 0,
                totalVueltasRestantes: 0,
                totalVueltasUsadas: 0,
                ultimoBackup: null
            };
        }
    }
}

// Crear instancia global del gestor de datos
window.dataManager = new DataManager();

