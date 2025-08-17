/**
 * Dynamic API Engine - MyMoolah Treasury Platform
 * 
 * Core engine for real-time product ingestion from Service Providers (SPs)
 * Handles automatic product catalog updates, pricing, and service availability
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const axios = require('axios');
const crypto = require('crypto');

class DynamicApiEngine {
    constructor() {
        this.spConnections = new Map();
        this.productCache = new Map();
        this.menuCache = new Map();
        this.lastSync = new Map();
        this.syncInterval = 30000; // 30 seconds
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5 seconds
        
        // Initialize SP connections
        this.initializeSPConnections();
        
        // Start automatic sync
        this.startAutoSync();
    }

    /**
     * Initialize Service Provider connections
     */
    initializeSPConnections() {
        // EasyPay Integration
        this.spConnections.set('easypay', {
            name: 'EasyPay',
            baseUrl: process.env.EASYPAY_API_URL || 'https://api.easypay.co.za',
            apiKey: process.env.EASYPAY_API_KEY,
            secret: process.env.EASYPAY_SECRET,
            endpoints: {
                products: '/api/v1/bills',
                pricing: '/api/v1/pricing',
                availability: '/api/v1/status'
            },
            categories: ['Bill Payments', 'VAS Services'],
            syncInterval: 30000
        });

        // dtMercury Integration
        this.spConnections.set('dtmercury', {
            name: 'dtMercury',
            baseUrl: process.env.DTMERCURY_API_URL || 'https://api.dtmercury.co.za',
            apiKey: process.env.DTMERCURY_API_KEY,
            secret: process.env.DTMERCURY_SECRET,
            endpoints: {
                products: '/api/v1/services',
                pricing: '/api/v1/fees',
                availability: '/api/v1/status'
            },
            categories: ['Banking Services', 'Real-time Payments'],
            syncInterval: 45000
        });

        // Flash Integration
        this.spConnections.set('flash', {
            name: 'Flash',
            baseUrl: process.env.FLASH_API_URL || 'https://api.flash.co.za',
            apiKey: process.env.FLASH_API_KEY,
            secret: process.env.FLASH_SECRET,
            endpoints: {
                products: '/api/v1/vouchers',
                pricing: '/api/v1/pricing',
                availability: '/api/v1/status'
            },
            categories: ['Vouchers', 'Cash-out Services', 'VAS'],
            syncInterval: 60000
        });

        // MobileMart Integration
        this.spConnections.set('mobilemart', {
            name: 'MobileMart',
            baseUrl: process.env.MOBILEMART_API_URL || 'https://api.mobilemart.co.za',
            apiKey: process.env.MOBILEMART_API_KEY,
            secret: process.env.MOBILEMART_SECRET,
            endpoints: {
                products: '/api/v1/services',
                pricing: '/api/v1/pricing',
                availability: '/api/v1/status'
            },
            categories: ['Mobile Services', 'Airtime', 'Data', 'Electricity'],
            syncInterval: 90000
        });

        console.log('✅ Dynamic API Engine: SP connections initialized');
    }

    /**
     * Start automatic synchronization
     */
    startAutoSync() {
        console.log('🔄 Dynamic API Engine: Starting automatic sync...');
        
        // Sync all SPs immediately
        this.syncAllSPs();
        
        // Set up periodic sync for each SP
        this.spConnections.forEach((spConfig, spId) => {
            setInterval(() => {
                this.syncSP(spId);
            }, spConfig.syncInterval);
        });
    }

    /**
     * Sync all Service Providers
     */
    async syncAllSPs() {
        console.log('🔄 Dynamic API Engine: Syncing all SPs...');
        
        const syncPromises = Array.from(this.spConnections.keys()).map(spId => 
            this.syncSP(spId)
        );
        
        try {
            await Promise.allSettled(syncPromises);
            console.log('✅ Dynamic API Engine: All SPs synced');
        } catch (error) {
            console.error('❌ Dynamic API Engine: Error syncing SPs:', error.message);
        }
    }

    /**
     * Sync specific Service Provider
     */
    async syncSP(spId, retryCount = 0) {
        const spConfig = this.spConnections.get(spId);
        if (!spConfig) {
            console.error(`❌ Dynamic API Engine: SP ${spId} not found`);
            return;
        }

        try {
            console.log(`🔄 Dynamic API Engine: Syncing ${spConfig.name}...`);
            
            // Fetch products from SP
            const products = await this.fetchSPProducts(spId);
            
            // Process and standardize products
            const processedProducts = await this.processProducts(products, spId);
            
            // Update product cache
            this.productCache.set(spId, processedProducts);
            
            // Update menu cache
            await this.updateMenu(spId, processedProducts);
            
            // Update last sync timestamp
            this.lastSync.set(spId, new Date().toISOString());
            
            console.log(`✅ Dynamic API Engine: ${spConfig.name} synced successfully`);
            
        } catch (error) {
            console.error(`❌ Dynamic API Engine: Error syncing ${spConfig.name}:`, error.message);
            
            // Retry logic
            if (retryCount < this.maxRetries) {
                console.log(`🔄 Dynamic API Engine: Retrying ${spConfig.name} (${retryCount + 1}/${this.maxRetries})...`);
                setTimeout(() => {
                    this.syncSP(spId, retryCount + 1);
                }, this.retryDelay);
            }
        }
    }

    /**
     * Fetch products from Service Provider
     */
    async fetchSPProducts(spId) {
        const spConfig = this.spConnections.get(spId);
        if (!spConfig) {
            throw new Error(`SP ${spId} not found`);
        }

        const headers = this.generateAuthHeaders(spConfig);
        
        try {
            const response = await axios.get(
                `${spConfig.baseUrl}${spConfig.endpoints.products}`,
                { headers, timeout: 10000 }
            );
            
            return response.data;
            
        } catch (error) {
            throw new Error(`Failed to fetch products from ${spConfig.name}: ${error.message}`);
        }
    }

    /**
     * Process and standardize products from SP
     */
    async processProducts(products, spId) {
        const spConfig = this.spConnections.get(spId);
        if (!spConfig) {
            throw new Error(`SP ${spId} not found`);
        }

        // Handle different SP response formats
        let processedProducts = [];
        
        switch (spId) {
            case 'easypay':
                processedProducts = this.processEasyPayProducts(products);
                break;
            case 'dtmercury':
                processedProducts = this.processDtMercuryProducts(products);
                break;
            case 'flash':
                processedProducts = this.processFlashProducts(products);
                break;
            case 'mobilemart':
                processedProducts = this.processMobileMartProducts(products);
                break;
            default:
                processedProducts = this.processGenericProducts(products);
        }

        // Add SP metadata
        processedProducts = processedProducts.map(product => ({
            ...product,
            spId: spId,
            spName: spConfig.name,
            lastUpdated: new Date().toISOString(),
            categories: spConfig.categories
        }));

        return processedProducts;
    }

    /**
     * Process EasyPay products
     */
    processEasyPayProducts(products) {
        if (!products.bills) return [];
        
        return products.bills.map(bill => ({
            id: `easypay_${bill.billNumber}`,
            name: bill.merchantName,
            category: 'Bill Payments',
            price: bill.amount,
            currency: 'ZAR',
            availability: bill.status === 'active',
            description: `${bill.merchantName} - ${bill.accountNumber}`,
            features: ['bill_payment', 'instant_settlement'],
            metadata: {
                billNumber: bill.billNumber,
                accountNumber: bill.accountNumber,
                merchantCode: bill.merchantCode
            }
        }));
    }

    /**
     * Process dtMercury products
     */
    processDtMercuryProducts(products) {
        if (!products.services) return [];
        
        return products.services.map(service => ({
            id: `dtmercury_${service.serviceId}`,
            name: service.serviceName,
            category: 'Banking Services',
            price: service.fee,
            currency: 'ZAR',
            availability: service.status === 'active',
            description: service.description,
            features: ['real_time_payment', 'bank_transfer'],
            metadata: {
                serviceId: service.serviceId,
                bankCode: service.bankCode,
                serviceType: service.serviceType
            }
        }));
    }

    /**
     * Process Flash products
     */
    processFlashProducts(products) {
        if (!products.vouchers) return [];
        
        return products.vouchers.map(voucher => ({
            id: `flash_${voucher.code}`,
            name: voucher.name,
            category: 'Vouchers',
            price: voucher.faceValue,
            currency: 'ZAR',
            availability: voucher.status === 'available',
            description: voucher.description,
            features: ['cash_out', 'voucher_redemption'],
            metadata: {
                voucherCode: voucher.code,
                expiryDate: voucher.expiryDate,
                redemptionType: voucher.redemptionType
            }
        }));
    }

    /**
     * Process MobileMart products
     */
    processMobileMartProducts(products) {
        if (!products.services) return [];
        
        return products.services.map(service => ({
            id: `mobilemart_${service.serviceId}`,
            name: service.serviceName,
            category: 'Mobile Services',
            price: service.price,
            currency: 'ZAR',
            availability: service.status === 'available',
            description: service.description,
            features: ['airtime', 'data', 'electricity'],
            metadata: {
                serviceId: service.serviceId,
                provider: service.provider,
                serviceType: service.serviceType
            }
        }));
    }

    /**
     * Process generic products
     */
    processGenericProducts(products) {
        if (!Array.isArray(products)) return [];
        
        return products.map(product => ({
            id: `generic_${product.id || crypto.randomUUID()}`,
            name: product.name,
            category: product.category || 'Other',
            price: product.price || 0,
            currency: product.currency || 'ZAR',
            availability: product.availability !== false,
            description: product.description || '',
            features: product.features || [],
            metadata: product.metadata || {}
        }));
    }

    /**
     * Update dynamic menu for SP
     */
    async updateMenu(spId, products) {
        const spConfig = this.spConnections.get(spId);
        if (!spConfig) return;

        // Organize products by category
        const menuStructure = this.organizeByCategory(products);
        
        // Update menu cache
        this.menuCache.set(spId, {
            spName: spConfig.name,
            categories: spConfig.categories,
            products: products,
            menuStructure: menuStructure,
            lastUpdated: new Date().toISOString()
        });

        console.log(`✅ Dynamic API Engine: Menu updated for ${spConfig.name}`);
    }

    /**
     * Organize products by category
     */
    organizeByCategory(products) {
        return products.reduce((acc, product) => {
            const category = product.category || 'Other';
            if (!acc[category]) acc[category] = [];
            acc[category].push(product);
            return acc;
        }, {});
    }

    /**
     * Generate authentication headers for SP API calls
     */
    generateAuthHeaders(spConfig) {
        const timestamp = Date.now().toString();
        const signature = this.generateSignature(spConfig, timestamp);
        
        return {
            'Authorization': `Bearer ${spConfig.apiKey}`,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Generate API signature for security
     */
    generateSignature(spConfig, timestamp) {
        const message = `${spConfig.apiKey}${timestamp}`;
        return crypto
            .createHmac('sha256', spConfig.secret)
            .update(message)
            .digest('hex');
    }

    /**
     * Get all products from all SPs
     */
    getAllProducts() {
        const allProducts = [];
        
        this.productCache.forEach((products, spId) => {
            allProducts.push(...products);
        });
        
        return allProducts;
    }

    /**
     * Get products by SP
     */
    getProductsBySP(spId) {
        return this.productCache.get(spId) || [];
    }

    /**
     * Get menu structure by SP
     */
    getMenuBySP(spId) {
        return this.menuCache.get(spId) || null;
    }

    /**
     * Get all menu structures
     */
    getAllMenus() {
        const allMenus = {};
        
        this.menuCache.forEach((menu, spId) => {
            allMenus[spId] = menu;
        });
        
        return allMenus;
    }

    /**
     * Get SP status and last sync
     */
    getSPStatus() {
        const status = {};
        
        this.spConnections.forEach((spConfig, spId) => {
            const lastSync = this.lastSync.get(spId);
            const productCount = this.productCache.get(spId)?.length || 0;
            
            status[spId] = {
                name: spConfig.name,
                lastSync: lastSync,
                productCount: productCount,
                status: lastSync ? 'active' : 'inactive'
            };
        });
        
        return status;
    }

    /**
     * Force sync specific SP
     */
    async forceSyncSP(spId) {
        console.log(`🔄 Dynamic API Engine: Force syncing ${spId}...`);
        await this.syncSP(spId);
    }

    /**
     * Force sync all SPs
     */
    async forceSyncAll() {
        console.log('🔄 Dynamic API Engine: Force syncing all SPs...');
        await this.syncAllSPs();
    }

    /**
     * Get engine statistics
     */
    getStats() {
        const totalProducts = this.getAllProducts().length;
        const activeSPs = Array.from(this.lastSync.keys()).length;
        const totalSPs = this.spConnections.size;
        
        return {
            totalProducts,
            activeSPs,
            totalSPs,
            cacheSize: this.productCache.size,
            menuCacheSize: this.menuCache.size,
            lastSync: Object.fromEntries(this.lastSync)
        };
    }
}

module.exports = DynamicApiEngine; 