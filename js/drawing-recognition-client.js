/**
 * Drawing Recognition Client Module for Lathe Time Tracker
 * 
 * This module handles image processing and drawing number extraction
 * using the secure backend API server.
 */

const DrawingRecognition = {
    // API設定
    apiUrl: 'http://localhost:3000', // 開発環境のデフォルト値
    
    // 認識中の状態管理
    processing: {
        isActive: false,
        results: null
    },
    
    /**
     * APIサーバーのURLを設定する
     * @param {string} url - APIサーバーのURL
     */
    setApiUrl(url) {
        if (url && typeof url === 'string') {
            this.apiUrl = url;
            console.log(`API URL set to: ${this.apiUrl}`);
        }
    },
    
    /**
     * 画像を処理して図面番号を抽出する
     * @param {File|Blob} imageFile - 処理する画像ファイル
     * @returns {Promise<Object>} 抽出結果
     */
    async processImage(imageFile) {
        this.processing.isActive = true;
        this.processing.results = null;
        
        try {
            // 画像をBase64エンコード
            const base64Image = await this.convertImageToBase64(imageFile);
            
            // APIサーバーに画像を送信して図面情報を抽出
            const result = await this.extractDrawingInfo(base64Image);
            
            // 結果を保存
            this.processing.results = result;
            
            return this.processing.results;
        } catch (error) {
            console.error('Image processing error:', error);
            throw error;
        } finally {
            this.processing.isActive = false;
        }
    },
    
    /**
     * 画像をBase64エンコードする
     * @param {File|Blob} file - 画像ファイル
     * @returns {Promise<string>} Base64エンコードされた画像データ
     */
    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Data URLからBase64部分のみを抽出
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    },
    
    /**
     * バックエンドAPIを使用して図面情報を抽出する
     * @param {string} base64Image - Base64エンコードされた画像
     * @returns {Promise<Object>} 抽出結果
     */
    async extractDrawingInfo(base64Image) {
        const url = `${this.apiUrl}/api/extract-drawing-info`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: base64Image })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API communication error:', error);
            throw new Error(`図面情報の抽出に失敗しました: ${error.message}`);
        }
    },
    
    /**
     * API接続をテストする
     * @returns {Promise<boolean>} 接続成功の場合はtrue
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/`);
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            const data = await response.json();
            console.log('API connection test successful:', data);
            return true;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
};

// モジュールとしてエクスポート（必要に応じて）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DrawingRecognition;
}