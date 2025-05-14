/**
 * GitHub API Integration for Lathe Time Tracker
 * 
 * This module handles all interactions with the GitHub API,
 * including authentication, file operations, and data synchronization.
 */

const GitHubAPI = {
    // Settings object containing authentication and repository information
    settings: {
        token: '',
        username: '',
        repo: '',
        dataFilePath: 'lathe-time-data.json',
        
        // Load settings from localStorage
        load() {
            this.token = localStorage.getItem('github_token') || '';
            this.username = localStorage.getItem('github_username') || '';
            this.repo = localStorage.getItem('github_repo') || '';
            this.dataFilePath = localStorage.getItem('github_dataFilePath') || 'lathe-time-data.json';
        },
        
        // Save settings to localStorage
        save() {
            localStorage.setItem('github_token', this.token);
            localStorage.setItem('github_username', this.username);
            localStorage.setItem('github_repo', this.repo);
            localStorage.setItem('github_dataFilePath', this.dataFilePath);
        },
        
        // Check if all required settings are available
        isConfigured() {
            return this.token && this.username && this.repo && this.dataFilePath;
        }
    },
    
    /**
     * Initialize GitHub API integration
     */
    init() {
        this.settings.load();
        console.log('GitHub API initialized');
    },
    
    /**
     * Update settings with new values
     * @param {Object} newSettings - Object containing new settings
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        this.settings.save();
    },
    
    /**
     * Get authorization headers for GitHub API requests
     * @returns {Object} Headers object with authorization
     */
    getHeaders() {
        return {
            'Authorization': `token ${this.settings.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    },
    
    /**
     * Test the GitHub connection by fetching repository info
     * @returns {Promise<Object>} Repository information
     * @throws {Error} If connection fails
     */
    async testConnection() {
        if (!this.settings.isConfigured()) {
            throw new Error('GitHub settings are not configured');
        }
        
        const url = `https://api.github.com/repos/${this.settings.username}/${this.settings.repo}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub API Error: ${error.message}`);
        }
        
        return await response.json();
    },
    
    /**
     * Check if a file exists in the repository
     * @param {string} path - File path in the repository
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(path) {
        try {
            const url = `https://api.github.com/repos/${this.settings.username}/${this.settings.repo}/contents/${path}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            return response.status === 200;
        } catch (error) {
            console.error('Error checking file existence:', error);
            return false;
        }
    },
    
    /**
     * Fetch a file from the repository
     * @param {string} path - File path in the repository
     * @returns {Promise<Object>} File content and metadata
     * @throws {Error} If file cannot be fetched
     */
    async fetchFile(path) {
        const url = `https://api.github.com/repos/${this.settings.username}/${this.settings.repo}/contents/${path}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`File not found: ${path}`);
            } else {
                const error = await response.json();
                throw new Error(`GitHub API Error: ${error.message}`);
            }
        }

        const data = await response.json();

        // Unicode対応Base64デコード
        function decodeUnicodeBase64(str) {
            // Base64デコードしてからUTF-8に変換
            try {
                // 改行や空白を削除
                const cleanStr = str.replace(/\s/g, '');
                // Base64デコード
                return decodeURIComponent(Array.prototype.map.call(atob(cleanStr), function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
            } catch (e) {
                console.error('Decoding error:', e);
                // 通常のデコードを試みる（非Unicode用）
                return atob(str);
            }
        }

        // コンテンツをデコード
        const content = decodeUnicodeBase64(data.content);

        return {
            content: content,
            sha: data.sha
        };
    },
    
    /**
     * Create an empty data file in the repository
     * @returns {Promise<Object>} Result of the operation
     * @throws {Error} If file cannot be created
     */
    async createEmptyDataFile() {
        const emptyData = {
            activeJob: null,
            completedJobs: [],
            lastSync: new Date().toISOString()
        };

        // Unicode対応Base64エンコード
        function encodeUnicodeBase64(str) {
            // UTF-8に変換してからBase64エンコード
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode('0x' + p1);
                }));
        }

        const url = `https://api.github.com/repos/${this.settings.username}/${this.settings.repo}/contents/${this.settings.dataFilePath}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
                message: 'Create lathe time tracking data file',
                content: encodeUnicodeBase64(JSON.stringify(emptyData, null, 2))
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to create data file: ${error.message}`);
        }
        
        return await response.json();
    },
    
    /**
     * Save data to the GitHub repository
     * @param {Object} data - Data to save
     * @param {boolean} forceCreate - Force creation of a new file, even if one exists
     * @returns {Promise<Object>} Result of the operation
     * @throws {Error} If data cannot be saved
     */
    async saveData(data, forceCreate = false) {
        // Make sure we include the last sync time
        data.lastSync = new Date().toISOString();

        // 強制的に新規作成する場合
        if (forceCreate) {
            // 空のデータを使用して新規ファイルとして保存
            const emptyData = {
                activeJob: null,
                completedJobs: [],
                lastSync: new Date().toISOString()
            };

            // Unicode対応Base64エンコード
            function encodeUnicodeBase64(str) {
                return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                    function toSolidBytes(match, p1) {
                        return String.fromCharCode('0x' + p1);
                    }));
            }

            // まず既存ファイルのSHAを取得（ファイルが存在する場合）
            let sha = null;
            try {
                console.log('既存ファイルのSHAを取得中...');
                const fileData = await this.fetchFile(this.settings.dataFilePath);
                sha = fileData.sha;
                console.log('既存ファイルのSHA:', sha);
            } catch (e) {
                console.log('ファイルが存在しないか取得エラー:', e.message);
                // ファイルが存在しない場合はSHAなしで続行
            }

            // リクエストボディ準備
            const requestBody = {
                message: 'Reset lathe time tracking data',
                content: encodeUnicodeBase64(JSON.stringify(emptyData, null, 2))
            };

            // ファイルが存在する場合はSHAを含める
            if (sha) {
                console.log('既存ファイルのSHAを使用');
                requestBody.sha = sha;
            }

            // ファイルを上書き保存
            const url = `https://api.github.com/repos/${this.settings.username}/${this.settings.repo}/contents/${this.settings.dataFilePath}`;
            console.log('GitHub APIリクエスト:', url);

            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to reset data: ${error.message}`);
            }

            return await response.json();
        }

        let sha;
        try {
            // Try to fetch the file first to get the SHA
            const fileData = await this.fetchFile(this.settings.dataFilePath);
            sha = fileData.sha;
        } catch (error) {
            // If file doesn't exist, create it
            if (error.message.includes('not found')) {
                return await this.createEmptyDataFile();
            } else {
                throw error;
            }
        }

        // Unicode対応Base64エンコード
        function encodeUnicodeBase64(str) {
            // UTF-8に変換してからBase64エンコード
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode('0x' + p1);
                }));
        }

        // Update the file with new content
        const url = `https://api.github.com/repos/${this.settings.username}/${this.settings.repo}/contents/${this.settings.dataFilePath}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
                message: 'Update lathe time tracking data',
                content: encodeUnicodeBase64(JSON.stringify(data, null, 2)),
                sha: sha
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to save data: ${error.message}`);
        }
        
        return await response.json();
    },
    
    /**
     * Load data from the GitHub repository
     * @returns {Promise<Object>} The loaded data
     * @throws {Error} If data cannot be loaded
     */
    async loadData() {
        try {
            // Check if file exists
            const exists = await this.fileExists(this.settings.dataFilePath);
            
            if (!exists) {
                // Create empty data file if it doesn't exist
                await this.createEmptyDataFile();
                return {
                    activeJob: null,
                    completedJobs: [],
                    lastSync: new Date().toISOString()
                };
            }
            
            // Fetch existing file
            const fileData = await this.fetchFile(this.settings.dataFilePath);
            return JSON.parse(fileData.content);
        } catch (error) {
            console.error('Error loading data:', error);
            throw new Error(`Failed to load data: ${error.message}`);
        }
    },
    
    /**
     * Synchronize local data with GitHub repository
     * @param {Object} localData - Local data to synchronize
     * @param {boolean} forceReset - Force reset remote data with local data (no merge)
     * @returns {Promise<Object>} Merged data after synchronization
     * @throws {Error} If synchronization fails
     */
    async syncData(localData, forceReset = false) {
        try {
            console.log('同期処理開始:', { localData, forceReset });

            // 強制リセットの場合
            if (forceReset) {
                console.log('強制リセットモード: ローカルデータを使用');

                // ローカルデータを直接保存（マージせず）
                await this.saveData(localData, true);
                return localData;
            }

            // 通常の同期処理
            // Load remote data
            const remoteData = await this.loadData();
            console.log('リモートデータ取得:', remoteData);

            // Merge data (simplistic approach - could be more sophisticated)
            const mergedData = this.mergeData(localData, remoteData);
            console.log('マージ結果:', mergedData);

            // Save merged data back to GitHub
            await this.saveData(mergedData);

            return mergedData;
        } catch (error) {
            console.error('Sync error:', error);
            throw new Error(`Synchronization failed: ${error.message}`);
        }
    },
    
    /**
     * Merge local and remote data
     * This is an enhanced implementation with improved conflict resolution
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data from GitHub
     * @returns {Object} Merged data
     */
    mergeData(localData, remoteData) {
        const mergedData = {
            activeJob: null,
            completedJobs: [],
            lastSync: new Date().toISOString()
        };

        // Handle active job with improved logic
        // If the remote has an active job but local doesn't, the remote job was likely started on another device
        if (!localData.activeJob && remoteData.activeJob) {
            console.log('Adopting remote active job');
            mergedData.activeJob = remoteData.activeJob;
        } else if (localData.activeJob && !remoteData.activeJob) {
            console.log('Keeping local active job');
            mergedData.activeJob = localData.activeJob;
        } else if (localData.activeJob && remoteData.activeJob) {
            // Both have active jobs - choose the one that was updated most recently
            const localUpdated = new Date(localData.activeJob.lastUpdated || localData.activeJob.startedAt);
            const remoteUpdated = new Date(remoteData.activeJob.lastUpdated || remoteData.activeJob.startedAt);
            
            if (localUpdated >= remoteUpdated) {
                console.log('Keeping local active job (more recently updated)');
                mergedData.activeJob = localData.activeJob;
            } else {
                console.log('Adopting remote active job (more recently updated)');
                mergedData.activeJob = remoteData.activeJob;
            }
        } else {
            // Neither has active job
            mergedData.activeJob = null;
        }
        
        // Improved job merging with more robust identifier and conflict resolution
        const allJobs = [...(localData.completedJobs || []), ...(remoteData.completedJobs || [])];
        const seenJobs = new Map();
        
        for (const job of allJobs) {
            // Create a more specific unique identifier, including quantity to prevent overwriting different batches
            const key = `${job.drawingNumber}-${job.itemQuantity || 1}-${job.startedAt}-${job.completedAt}`;
            
            // More sophisticated conflict resolution strategy:
            if (!seenJobs.has(key)) {
                seenJobs.set(key, job);
            } else {
                const existingJob = seenJobs.get(key);
                // Choose the job with the more recent last update
                const existingUpdate = new Date(existingJob.lastUpdated || existingJob.completedAt);
                const currentUpdate = new Date(job.lastUpdated || job.completedAt);
                
                if (currentUpdate > existingUpdate) {
                    seenJobs.set(key, job);
                } else if (currentUpdate.getTime() === existingUpdate.getTime()) {
                    // If timestamps are identical, prefer the one with more data (longer sessions, more breaks)
                    const existingSessionCount = existingJob.sessions ? existingJob.sessions.length : 0;
                    const currentSessionCount = job.sessions ? job.sessions.length : 0;
                    
                    if (currentSessionCount > existingSessionCount) {
                        seenJobs.set(key, job);
                    } else if (existingJob.totalTimeMinutes < job.totalTimeMinutes) {
                        // If same sessions count, prefer the one with more total time
                        seenJobs.set(key, job);
                    }
                }
            }
        }
        
        mergedData.completedJobs = Array.from(seenJobs.values())
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        
        return mergedData;
    }
};

// Initialize GitHub API when the script loads
document.addEventListener('DOMContentLoaded', () => {
    GitHubAPI.init();
});