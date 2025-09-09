const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

/**
 * 🚀 MyMoolah Codebase Sweep Service
 * Automatically discovers all possible support questions from the entire codebase
 * Runs daily to keep AI support system up-to-date
 */
class CodebaseSweepService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.projectRoot = process.cwd();
    this.discoveredCapabilities = new Map();
    this.lastSweepTime = null;
    this.sweepInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // File patterns to scan
    this.scanPatterns = {
      routes: ['**/routes/**/*.js', '**/routes/**/*.ts'],
      controllers: ['**/controllers/**/*.js', '**/controllers/**/*.ts'],
      models: ['**/models/**/*.js', '**/models/**/*.ts'],
      services: ['**/services/**/*.js', '**/services/**/*.ts'],
      docs: ['**/docs/**/*.md', '**/docs/**/*.txt'],
      config: ['**/config/**/*.js', '**/config/**/*.json'],
      migrations: ['**/migrations/**/*.js']
    };
  }

  /**
   * 🚀 Start the daily sweep scheduler
   */
  async startScheduler() {
    console.log('🚀 Starting MyMoolah Codebase Sweep Scheduler...');
    
    // Run initial sweep in background (non-blocking)
    this.performSweep().catch(error => {
      console.error('⚠️  Initial codebase sweep failed:', error.message);
    });
    
    // Schedule daily sweeps
    setInterval(async () => {
      console.log('🔄 Running scheduled daily codebase sweep...');
      await this.performSweep();
    }, this.sweepInterval);
    
    console.log('✅ Codebase sweep scheduler started successfully');
  }

  /**
   * 🔍 Perform comprehensive codebase sweep
   */
  async performSweep() {
    try {
      console.log('🔍 Starting comprehensive codebase sweep...');
      
      // 1. Discover all files
      const discoveredFiles = await this.discoverFiles();
      console.log(`📁 Discovered ${discoveredFiles.length} files to analyze`);
      
      // 2. Analyze code structure
      const codeAnalysis = await this.analyzeCodeStructure(discoveredFiles);
      console.log('🔍 Code structure analysis completed');
      
      // 3. Extract API capabilities
      const apiCapabilities = await this.extractAPICapabilities(discoveredFiles);
      console.log('🔌 API capabilities extracted');
      
      // 4. Analyze database models
      const modelCapabilities = await this.analyzeDatabaseModels(discoveredFiles);
      console.log('🗄️ Database model analysis completed');
      
      // 5. Parse documentation
      const docCapabilities = await this.parseDocumentation(discoveredFiles);
      console.log('📚 Documentation parsed');
      
      // 6. Consolidate all capabilities
      const consolidatedCapabilities = {
        codeStructure: codeAnalysis,
        apiEndpoints: apiCapabilities,
        databaseModels: modelCapabilities,
        documentation: docCapabilities,
        sweepTimestamp: new Date().toISOString()
      };
      
      // 7. Send to OpenAI for intelligent analysis
      const aiAnalysis = await this.analyzeWithAI(consolidatedCapabilities);
      console.log('🤖 AI analysis completed');
      
      // 8. Cache the results
      this.discoveredCapabilities = aiAnalysis;
      this.lastSweepTime = new Date();
      
      // 9. Save to file for persistence
      await this.saveSweepResults(aiAnalysis);
      
      console.log('✅ Codebase sweep completed successfully');
      console.log(`📊 Discovered ${aiAnalysis.totalSupportQuestions} possible support questions`);
      
      return aiAnalysis;
      
    } catch (error) {
      console.error('❌ Error during codebase sweep:', error);
      throw error;
    }
  }

  /**
   * 📁 Discover all relevant files in the project
   */
  async discoverFiles() {
    const discoveredFiles = [];
    
    for (const [category, patterns] of Object.entries(this.scanPatterns)) {
      for (const pattern of patterns) {
        try {
          const files = await this.glob(pattern);
          discoveredFiles.push(...files.map(file => ({
            path: file,
            category,
            type: path.extname(file)
          })));
        } catch (error) {
          console.warn(`⚠️ Warning: Could not scan pattern ${pattern}:`, error.message);
        }
      }
    }
    
    return discoveredFiles;
  }

  /**
   * 🔍 Analyze code structure and architecture
   */
  async analyzeCodeStructure(files) {
    const analysis = {
      totalFiles: files.length,
      fileTypes: {},
      architecture: {},
      dependencies: []
    };
    
    // Analyze file types
    files.forEach(file => {
      const ext = file.type;
      analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;
    });
    
    // Analyze architecture patterns
    const routeFiles = files.filter(f => f.category === 'routes');
    const controllerFiles = files.filter(f => f.category === 'controllers');
    const serviceFiles = files.filter(f => f.category === 'services');
    
    analysis.architecture = {
      routes: routeFiles.length,
      controllers: controllerFiles.length,
      services: serviceFiles.length,
      models: files.filter(f => f.category === 'models').length
    };
    
    return analysis;
  }

  /**
   * 🔌 Extract API capabilities from route and controller files
   */
  async extractAPICapabilities(files) {
    const apiCapabilities = [];
    
    for (const file of files) {
      if (file.category === 'routes' || file.category === 'controllers') {
        try {
          const content = await fs.readFile(file.path, 'utf8');
          const endpoints = this.parseAPIEndpoints(content, file.path);
          apiCapabilities.push(...endpoints);
        } catch (error) {
          console.warn(`⚠️ Could not read file ${file.path}:`, error.message);
        }
      }
    }
    
    return apiCapabilities;
  }

  /**
   * 🗄️ Analyze database models and their capabilities
   */
  async analyzeDatabaseModels(files) {
    const modelCapabilities = [];
    
    for (const file of files) {
      if (file.category === 'models') {
        try {
          const content = await fs.readFile(file.path, 'utf8');
          const modelInfo = this.parseModelDefinition(content, file.path);
          if (modelInfo) {
            modelCapabilities.push(modelInfo);
          }
        } catch (error) {
          console.warn(`⚠️ Could not read model file ${file.path}:`, error.message);
        }
      }
    }
    
    return modelCapabilities;
  }

  /**
   * 📚 Parse documentation files for capabilities
   */
  async parseDocumentation(files) {
    const docCapabilities = [];
    
    for (const file of files) {
      if (file.category === 'docs') {
        try {
          const content = await fs.readFile(file.path, 'utf8');
          const docInfo = this.parseDocumentationContent(content, file.path);
          if (docInfo) {
            docCapabilities.push(docInfo);
          }
        } catch (error) {
          console.warn(`⚠️ Could not read documentation ${file.path}:`, error.message);
        }
      }
    }
    
    return docCapabilities;
  }

  /**
   * 🤖 Use OpenAI to intelligently analyze discovered capabilities
   */
  async analyzeWithAI(consolidatedCapabilities) {
    try {
      console.log('🤖 Sending capabilities to OpenAI for intelligent analysis...');
      
      // Prepare the data for OpenAI (keep it under token limits)
      const simplifiedCapabilities = this.simplifyForAI(consolidatedCapabilities);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert software architect analyzing the MyMoolah financial platform codebase. 

Your task is to identify ALL possible support questions users might ask based on the discovered capabilities.

For each capability, generate:
1. Common user questions
2. Support scenarios
3. Feature explanations users might need

Focus on:
- User-facing features
- Common problems users encounter
- How-to questions
- Troubleshooting scenarios
- Integration questions

Be comprehensive but practical. Return a structured JSON response.`
          },
          {
            role: "user",
            content: `Analyze this MyMoolah platform codebase and identify all possible support questions users might ask:

${JSON.stringify(simplifiedCapabilities, null, 2)}

Generate a comprehensive list of support questions organized by category.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });
      
      const aiResponse = completion.choices[0].message.content;
      
      // Parse the AI response and structure it
      const structuredResponse = this.parseAIResponse(aiResponse);
      
      return structuredResponse;
      
    } catch (error) {
      console.error('❌ OpenAI analysis failed:', error);
      
      // Fallback to basic analysis
      return this.generateBasicSupportQuestions(consolidatedCapabilities);
    }
  }

  /**
   * 📊 Simplify capabilities for AI analysis (stay within token limits)
   */
  simplifyForAI(capabilities) {
    return {
      apiEndpoints: capabilities.apiEndpoints.slice(0, 20), // Limit to top 20
      databaseModels: capabilities.databaseModels.slice(0, 10), // Limit to top 10
      documentation: capabilities.documentation.slice(0, 5), // Limit to top 5
      architecture: capabilities.architecture
    };
  }

  /**
   * 🔄 Parse AI response into structured format
   */
  parseAIResponse(aiResponse) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: parse text response
      return this.parseTextResponse(aiResponse);
      
    } catch (error) {
      console.warn('⚠️ Could not parse AI response as JSON, using text parser');
      return this.parseTextResponse(aiResponse);
    }
  }

  /**
   * 📝 Parse text response when JSON parsing fails
   */
  parseTextResponse(text) {
    // Basic text parsing logic
    const categories = {
      userManagement: [],
      financialServices: [],
      integrations: [],
      troubleshooting: [],
      general: []
    };
    
    // Simple keyword-based categorization
    if (text.includes('user') || text.includes('profile') || text.includes('account')) {
      categories.userManagement.push('User account management questions');
    }
    
    if (text.includes('wallet') || text.includes('voucher') || text.includes('money')) {
      categories.financialServices.push('Financial service questions');
    }
    
    if (text.includes('integration') || text.includes('api') || text.includes('connect')) {
      categories.integrations.push('Integration questions');
    }
    
    return {
      categories,
      totalSupportQuestions: Object.values(categories).flat().length,
      sweepTimestamp: new Date().toISOString()
    };
  }

  /**
   * 🆘 Generate basic support questions when AI fails
   */
  generateBasicSupportQuestions(capabilities) {
    const questions = {
      userManagement: [
        'How do I update my profile?',
        'How do I change my password?',
        'How do I verify my identity?',
        'How do I check my account status?'
      ],
      financialServices: [
        'How do I check my wallet balance?',
        'How do I create a voucher?',
        'How do I send money to another user?',
        'How do I view my transaction history?'
      ],
      integrations: [
        'How do I connect Flash to my account?',
        'How do I set up MobileMart integration?',
        'How do I configure EasyPay?'
      ],
      troubleshooting: [
        'Why can\'t I log in?',
        'Why is my transaction failing?',
        'How do I reset my password?'
      ]
    };
    
    return {
      categories: questions,
      totalSupportQuestions: Object.values(questions).flat().length,
      sweepTimestamp: new Date().toISOString(),
      fallbackGenerated: true
    };
  }

  /**
   * 💾 Save sweep results to file for persistence
   */
  async saveSweepResults(results) {
    try {
      const backupDir = path.join(this.projectRoot, 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const filename = `codebase_sweep_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(backupDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(results, null, 2));
      console.log(`💾 Sweep results saved to ${filepath}`);
      
    } catch (error) {
      console.error('❌ Could not save sweep results:', error);
    }
  }

  /**
   * 🔍 Parse API endpoints from route/controller files
   */
  parseAPIEndpoints(content, filepath) {
    const endpoints = [];
    
    // Extract route definitions
    const routeMatches = content.match(/app\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g);
    if (routeMatches) {
      routeMatches.forEach(match => {
        const method = match.match(/app\.(get|post|put|delete|patch)/)[1];
        const path = match.match(/['"`]([^'"`]+)['"`]/)[1];
        
        endpoints.push({
          method: method.toUpperCase(),
          path,
          file: filepath,
          category: 'API Endpoint'
        });
      });
    }
    
    // Extract controller methods
    const methodMatches = content.match(/(async\s+)?(\w+)\s*\([^)]*\)\s*{/g);
    if (methodMatches) {
      methodMatches.forEach(match => {
        const methodName = match.match(/(?:async\s+)?(\w+)\s*\(/)[1];
        
        endpoints.push({
          method: 'CONTROLLER',
          path: methodName,
          file: filepath,
          category: 'Controller Method'
        });
      });
    }
    
    return endpoints;
  }

  /**
   * 🗄️ Parse model definitions from model files
   */
  parseModelDefinition(content, filepath) {
    try {
      // Extract table name
      const tableMatch = content.match(/tableName:\s*['"`]([^'"`]+)['"`]/);
      const tableName = tableMatch ? tableMatch[1] : path.basename(filepath, path.extname(filepath));
      
      // Extract field definitions
      const fieldMatches = content.match(/(\w+):\s*\{/g);
      const fields = fieldMatches ? fieldMatches.map(match => match.match(/(\w+):/)[1]) : [];
      
      return {
        tableName,
        fields,
        file: filepath,
        category: 'Database Model'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 📚 Parse documentation content
   */
  parseDocumentationContent(content, filepath) {
    try {
      // Extract headings
      const headingMatches = content.match(/^#{1,6}\s+(.+)$/gm);
      const headings = headingMatches ? headingMatches.map(h => h.replace(/^#{1,6}\s+/, '')) : [];
      
      // Extract code blocks
      const codeBlockMatches = content.match(/```[\s\S]*?```/g);
      const codeBlocks = codeBlockMatches ? codeBlockMatches.length : 0;
      
      return {
        filename: path.basename(filepath),
        headings,
        codeBlocks,
        file: filepath,
        category: 'Documentation'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 🌐 Simple glob pattern matching (basic implementation)
   */
  async glob(pattern) {
    const files = [];
    
    try {
      // Basic glob implementation for common patterns
      if (pattern.includes('**')) {
        // Recursive search
        await this.recursiveSearch(pattern, files);
      } else {
        // Simple pattern
        const matches = await this.simplePatternSearch(pattern);
        files.push(...matches);
      }
    } catch (error) {
      console.warn(`⚠️ Glob pattern ${pattern} failed:`, error.message);
    }
    
    return files;
  }

  /**
   * 🔍 Recursive file search
   */
  async recursiveSearch(pattern, files, currentPath = this.projectRoot) {
    try {
      const items = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          await this.recursiveSearch(pattern, files, fullPath);
        } else if (item.isFile()) {
          if (this.matchesPattern(fullPath, pattern)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors for system directories
    }
  }

  /**
   * 🎯 Simple pattern matching
   */
  matchesPattern(filepath, pattern) {
    const relativePath = path.relative(this.projectRoot, filepath);
    
    // Convert glob pattern to regex
    let regexPattern = pattern
      .replace(/\*\*/g, '.*') // ** -> .*
      .replace(/\*/g, '[^/]*') // * -> [^/]*
      .replace(/\./g, '\\.') // . -> \.
      .replace(/\//g, '\\/'); // / -> \/
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(relativePath);
  }

  /**
   * 🔍 Simple pattern search
   */
  async simplePatternSearch(pattern) {
    const files = [];
    const searchPath = pattern.replace(/\*\*\/\*\*\/\*\.(js|ts)/, '');
    
    try {
      const fullPath = path.join(this.projectRoot, searchPath);
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isFile() && (item.name.endsWith('.js') || item.name.endsWith('.ts'))) {
          files.push(path.join(fullPath, item.name));
        }
      }
    } catch (error) {
      // Pattern not found, return empty array
    }
    
    return files;
  }

  /**
   * 📊 Get current discovered capabilities
   */
  getDiscoveredCapabilities() {
    return {
      capabilities: this.discoveredCapabilities,
      lastSweepTime: this.lastSweepTime,
      isStale: this.lastSweepTime ? (Date.now() - this.lastSweepTime) > this.sweepInterval : true
    };
  }

  /**
   * 🔄 Force immediate sweep
   */
  async forceSweep() {
    console.log('🔄 Forcing immediate codebase sweep...');
    return await this.performSweep();
  }
}

module.exports = CodebaseSweepService;
