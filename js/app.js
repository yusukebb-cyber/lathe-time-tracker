/**
 * Lathe Time Tracker Application
 * 
 * This module handles the main application logic, including:
 * - UI interactions
 * - Time calculations
 * - Local data management
 * - Integration with GitHub API
 */

// Main application object
const LatheTimeTracker = {
    // Application state
    data: {
        activeJob: null,
        completedJobs: [],
        lastSync: null
    },
    
    // Timer variables
    timer: {
        interval: null,
        startTime: null,
        isPaused: false,
        pauseStartTime: null,
        breaks: [], // Array of {start, end} objects
    },
    
    // DOM elements (populated during initialization)
    elements: {},

    // Bootstrap modals
    modals: {},

    // 仕掛かり中の作業の表示用の状態
    workInProgressState: {
        timerLabel: '', // タイマーラベル（現在のセッション/一時停止中）
        totalWorkTime: 0 // 累計作業時間（分）
    },
    
    /**
     * UTC日付を日本時間（JST）に変換するヘルパー関数
     * @param {string|Date} dateInput - ISO文字列または Date オブジェクト
     * @returns {Date} 日本時間の Date オブジェクト
     */
    convertToJST(dateInput) {
        const utcDate = dateInput instanceof Date ? dateInput : new Date(dateInput);
        return new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    },
    
    /**
     * 日本時間（JST）をUTCに変換するヘルパー関数
     * @param {string|Date} dateInput - ISO文字列または Date オブジェクト
     * @returns {Date} UTC の Date オブジェクト
     */
    convertToUTC(dateInput) {
        const jstDate = dateInput instanceof Date ? dateInput : new Date(dateInput);
        return new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
    },
    
    /**
     * Initialize the application
     */
    init() {
        // Cache DOM elements
        this.cacheElements();
        
        // Initialize UI components
        this.initializeUI();
        
        // Load data from localStorage
        this.loadData();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update UI based on loaded data
        this.updateUI();
        
        // Initialize monthly statistics
        this.initializeMonthlyStats();

        // 初期化機能をセットアップ
        setTimeout(setupDataResetFunction, 500);

        console.log('Lathe Time Tracker initialized');
    },
    
    /**
     * Cache DOM elements for faster access
     */
    cacheElements() {
        // 同期ボタンとステータス表示
        this.elements.syncData = document.getElementById('syncData');
        this.elements.lastSyncTime = document.getElementById('lastSyncTime');
        
        // Active job panel elements
        this.elements.activeJobPanel = document.getElementById('activeJobPanel');
        this.elements.activeJobDrawingNumber = document.getElementById('activeJobDrawingNumber');
        this.elements.activeJobDescription = document.getElementById('activeJobDescription');
        this.elements.activeJobStartTime = document.getElementById('activeJobStartTime');
        this.elements.activeJobQuantity = document.getElementById('activeJobQuantity');
        this.elements.hoursDisplay = document.getElementById('hoursDisplay');
        this.elements.minutesDisplay = document.getElementById('minutesDisplay');
        this.elements.timerLabel = document.getElementById('timerLabel');
        this.elements.totalWorkTimeDisplay = document.getElementById('totalWorkTimeDisplay');
        this.elements.pauseResumeBtn = document.getElementById('pauseResumeBtn');
        this.elements.addBreakBtn = document.getElementById('addBreakBtn');
        this.elements.completeJobBtn = document.getElementById('completeJobBtn');
        this.elements.workSessionsList = document.getElementById('workSessionsList');
        
        // New job form elements
        this.elements.newJobPanel = document.getElementById('newJobPanel');
        this.elements.newJobForm = document.getElementById('newJobForm');
        this.elements.drawingNumber = document.getElementById('drawingNumber');
        this.elements.jobDescription = document.getElementById('jobDescription');
        
        // Monthly statistics elements
        this.elements.monthSelect = document.getElementById('monthSelect');
        this.elements.monthlyDrawingCount = document.getElementById('monthlyDrawingCount');
        this.elements.monthlyItemCount = document.getElementById('monthlyItemCount');
        this.elements.monthlyTotalTime = document.getElementById('monthlyTotalTime');
        this.elements.monthlyAverageTime = document.getElementById('monthlyAverageTime');
        
        // Completed jobs panel elements
        this.elements.completedJobsList = document.getElementById('completedJobsList');
        this.elements.refreshCompletedJobs = document.getElementById('refreshCompletedJobs');
        
        // Modal elements
        this.elements.errorMessage = document.getElementById('errorMessage');
        this.elements.errorTechnicalDetails = document.getElementById('errorTechnicalDetails');
        this.elements.errorDetails = document.getElementById('errorDetails');
        this.elements.showErrorDetails = document.getElementById('showErrorDetails');
    },
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        // Initialize Bootstrap modals
        this.modals.errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
        this.modals.helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
        this.modals.settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));

        // GitHub設定パネルが削除されたため、この部分は不要

        // Populate settings modal with the same values
        const githubTokenSettings = document.getElementById('githubTokenSettings');
        const githubUsernameSettings = document.getElementById('githubUsernameSettings');
        const githubRepoSettings = document.getElementById('githubRepoSettings');
        const dataFilePathSettings = document.getElementById('dataFilePathSettings');

        if (githubTokenSettings) githubTokenSettings.value = GitHubAPI.settings.token;
        if (githubUsernameSettings) githubUsernameSettings.value = GitHubAPI.settings.username;
        if (githubRepoSettings) githubRepoSettings.value = GitHubAPI.settings.repo;
        if (dataFilePathSettings) dataFilePathSettings.value = GitHubAPI.settings.dataFilePath;

        // Populate dark mode setting
        const darkModeSwitchSettings = document.getElementById('darkModeSwitchSettings');
        if (darkModeSwitchSettings) {
            darkModeSwitchSettings.checked = document.body.classList.contains('dark-mode');
        }

        // Update last sync time display
        this.updateLastSyncTime();
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // GitHub設定フォームが削除されたため、この部分は不要

        // Sync data with GitHub
        this.elements.syncData.addEventListener('click', () => {
            this.syncWithGitHub();
        });

        // New job form submission
        this.elements.newJobForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.startNewJob();
        });

        // Complete job button
        this.elements.completeJobBtn.addEventListener('click', () => {
            this.completeJob();
        });

        // Pause/Resume button
        this.elements.pauseResumeBtn.addEventListener('click', () => {
            this.togglePause();
        });

        // Add break button
        this.elements.addBreakBtn.addEventListener('click', () => {
            this.addManualBreak();
        });

        // Refresh completed jobs
        this.elements.refreshCompletedJobs.addEventListener('click', () => {
            this.refreshCompletedJobs();
        });

        // Month selection change
        this.elements.monthSelect?.addEventListener('change', () => {
            this.updateMonthlyStats();
        });

        // Show error details button
        this.elements.showErrorDetails.addEventListener('click', () => {
            this.toggleErrorDetails();
        });

        // Settings modal event listeners
        this.setupSettingsEventListeners();
    },

    /**
     * Set up event listeners for the settings modal
     */
    setupSettingsEventListeners() {
        // Save GitHub settings from settings modal
        const saveGitHubSettings = document.getElementById('saveGitHubSettings');
        if (saveGitHubSettings) {
            saveGitHubSettings.addEventListener('click', () => {
                const githubTokenSettings = document.getElementById('githubTokenSettings').value;
                const githubUsernameSettings = document.getElementById('githubUsernameSettings').value;
                const githubRepoSettings = document.getElementById('githubRepoSettings').value;
                const dataFilePathSettings = document.getElementById('dataFilePathSettings').value;

                const newSettings = {
                    token: githubTokenSettings,
                    username: githubUsernameSettings,
                    repo: githubRepoSettings,
                    dataFilePath: dataFilePathSettings
                };

                GitHubAPI.updateSettings(newSettings);

                // トップ画面のGitHub設定パネルが削除されたため不要

                this.showSuccessMessage('GitHub設定が保存されました');
            });
        }

        // Test GitHub connection from settings modal
        const testConnectionSettings = document.getElementById('testConnectionSettings');
        if (testConnectionSettings) {
            testConnectionSettings.addEventListener('click', async () => {
                try {
                    testConnectionSettings.disabled = true;
                    testConnectionSettings.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>テスト中...';

                    // Update settings first
                    const githubTokenSettings = document.getElementById('githubTokenSettings').value;
                    const githubUsernameSettings = document.getElementById('githubUsernameSettings').value;
                    const githubRepoSettings = document.getElementById('githubRepoSettings').value;
                    const dataFilePathSettings = document.getElementById('dataFilePathSettings').value;

                    GitHubAPI.updateSettings({
                        token: githubTokenSettings,
                        username: githubUsernameSettings,
                        repo: githubRepoSettings,
                        dataFilePath: dataFilePathSettings
                    });

                    // Test connection
                    const result = await GitHubAPI.testConnection();
                    this.showSuccessMessage(`${result.full_name} に接続しました`);
                } catch (error) {
                    this.showError('GitHub接続テストに失敗しました', error);
                } finally {
                    testConnectionSettings.disabled = false;
                    testConnectionSettings.innerHTML = '<i class="bi bi-check-circle me-1"></i> 接続テスト';
                }
            });
        }

        // 設定モーダル内のダークモードスイッチは、メインのdarkModeSwitch処理で対応するように修正済み

        // Data reset button in settings
        const resetAllDataSettings = document.getElementById('resetAllDataSettings');
        if (resetAllDataSettings) {
            resetAllDataSettings.addEventListener('click', () => {
                // The modal will open due to data-bs-toggle attributes
                console.log('データ初期化ボタンがクリックされました（設定から）');
            });
        }
    },
    
    /**
     * Save GitHub settings to GitHubAPI - 設定画面から直接呼び出されなくなりました
     * 保守性のために残していますが、現在は使用していません
     */
    saveGitHubSettings() {
        console.log('このメソッドは使用されなくなりました。設定画面から直接GitHubAPI.updateSettingsが呼ばれます');
    },

    /**
     * Test the GitHub connection - 設定画面から直接呼び出されなくなりました
     * 保守性のために残していますが、現在は使用していません
     */
    async testGitHubConnection() {
        console.log('このメソッドは使用されなくなりました。設定画面から直接テストが行われます');
    },
    
    /**
     * Synchronize data with GitHub
     */
    async syncWithGitHub() {
        try {
            this.elements.syncData.disabled = true;
            this.elements.syncData.innerHTML = '<span class="sync-spinner me-2"></span>Syncing...';
            
            const mergedData = await GitHubAPI.syncData(this.data);
            
            // Update local data with merged data
            this.data = mergedData;
            this.saveData();
            
            // Update UI
            this.updateUI();
            this.updateLastSyncTime();
            
            this.showSuccessMessage('Data synchronized successfully');
        } catch (error) {
            this.showError('Data synchronization failed', error);
        } finally {
            this.elements.syncData.disabled = false;
            this.elements.syncData.textContent = 'Sync Data';
        }
    },
    
    /**
     * Start a new job
     */
    startNewJob() {
        // Check if there's an active job
        if (this.data.activeJob) {
            if (!confirm('You have an active job. Do you want to complete it and start a new one?')) {
                return;
            }
            this.completeJob();
        }

        const drawingNumber = this.elements.drawingNumber.value.trim();
        const description = this.elements.jobDescription.value.trim();
        const itemQuantity = parseInt(document.getElementById('itemQuantity').value) || 1;
        const startTime = new Date();

        // Create new active job
        this.data.activeJob = {
            drawingNumber: drawingNumber,
            description: description,
            itemQuantity: itemQuantity,  // 加工個数を追加
            startedAt: startTime.toISOString(),
            lastUpdated: startTime.toISOString(),
            sessions: [{
                start: startTime.toISOString(),
                end: null
            }],
            breaks: [],
            totalTimeMinutes: 0,
            status: 'active'
        };

        // Reset timer state
        this.timer.interval = null;
        this.timer.startTime = startTime;
        this.timer.isPaused = false;
        this.timer.pauseStartTime = null;
        this.timer.breaks = [];

        // タイマーの状態表示も初期化
        if (this.elements.timerLabel) {
            this.elements.timerLabel.textContent = '現在のセッション時間';
        }

        // 累計作業時間の表示をリセット
        if (this.elements.totalWorkTimeDisplay) {
            this.elements.totalWorkTimeDisplay.textContent = '0h 0m';
        }

        // Start timer
        this.startTimer();

        // Save data
        this.saveData();

        // Update UI
        this.updateUI();

        // Reset form
        this.elements.newJobForm.reset();

        this.showSuccessMessage(`Job ${drawingNumber} started`);
    },
    
    /**
     * Complete the current job
     */
    completeJob() {
        if (!this.data.activeJob) {
            return;
        }
        
        // Stop timer
        this.stopTimer();
        
        // Update end time for the last session
        const lastSession = this.data.activeJob.sessions[this.data.activeJob.sessions.length - 1];
        if (lastSession && !lastSession.end) {
            lastSession.end = new Date().toISOString();
        }
        
        // Calculate total time
        const totalMinutes = this.calculateTotalTime(this.data.activeJob);
        
        // Create completed job entry
        const completedJob = {
            ...this.data.activeJob,
            completedAt: new Date().toISOString(),
            totalTimeMinutes: totalMinutes,
            status: 'completed'
        };
        
        // Add to completed jobs
        this.data.completedJobs.unshift(completedJob);
        
        // Clear active job
        this.data.activeJob = null;
        
        // Save data
        this.saveData();
        
        // Update UI
        this.updateUI();
        
        this.showSuccessMessage(`Job completed with ${this.formatTime(totalMinutes)} worked`);
    },
    
    /**
     * Toggle pause/resume state
     */
    togglePause() {
        if (!this.data.activeJob) {
            return;
        }

        if (this.timer.isPaused) {
            // Resume
            if (!this.timer.pauseStartTime) {
                console.error('Pause start time is not defined. Using current time instead.');
                this.timer.pauseStartTime = new Date();
            }

            const now = new Date();
            const pauseDuration = (now - this.timer.pauseStartTime);

            // Ensure the pause duration is valid (not negative)
            const validPauseDuration = Math.max(0, pauseDuration);

            // Add break record
            this.data.activeJob.breaks.push({
                start: this.timer.pauseStartTime.toISOString(),
                end: now.toISOString(),
                duration: Math.floor(validPauseDuration / 60000) // convert to minutes
            });

            // Add new session
            this.data.activeJob.sessions.push({
                start: now.toISOString(),
                end: null
            });

            this.timer.isPaused = false;
            this.elements.pauseResumeBtn.textContent = 'Pause';
            this.elements.pauseResumeBtn.classList.replace('btn-success', 'btn-warning');

            // タイマーラベルを更新
            if (this.elements.timerLabel) {
                this.elements.timerLabel.textContent = '現在のセッション時間';
            }
        } else {
            // Pause
            // End current session
            const lastSession = this.data.activeJob.sessions[this.data.activeJob.sessions.length - 1];
            if (lastSession && !lastSession.end) {
                lastSession.end = new Date().toISOString();
            }

            this.timer.pauseStartTime = new Date();
            this.timer.isPaused = true;
            this.elements.pauseResumeBtn.textContent = 'Resume';
            this.elements.pauseResumeBtn.classList.replace('btn-warning', 'btn-success');

            // タイマーラベルを更新
            if (this.elements.timerLabel) {
                this.elements.timerLabel.textContent = '一時停止中';
            }
        }

        // Update job status
        this.data.activeJob.status = this.timer.isPaused ? 'paused' : 'active';
        this.data.activeJob.lastUpdated = new Date().toISOString();

        // 累計作業時間表示を更新
        this.updateTotalWorkTime();

        // Save data
        this.saveData();

        // Update sessions list
        this.updateWorkSessionsList();
    },
    
    /**
     * Add a manual break
     */
    addManualBreak() {
        if (!this.data.activeJob || this.timer.isPaused) {
            return;
        }
        
        const breakMinutes = parseInt(prompt('Enter break duration in minutes:', '15'));
        if (isNaN(breakMinutes) || breakMinutes <= 0) {
            return;
        }
        
        // End current session
        const lastSession = this.data.activeJob.sessions[this.data.activeJob.sessions.length - 1];
        if (lastSession && !lastSession.end) {
            lastSession.end = new Date().toISOString();
        }
        
        const breakStart = new Date();
        const breakEnd = new Date(breakStart.getTime() + breakMinutes * 60000);
        
        // Add break record
        this.data.activeJob.breaks.push({
            start: breakStart.toISOString(),
            end: breakEnd.toISOString(),
            duration: breakMinutes
        });
        
        // Add new session starting after the break
        this.data.activeJob.sessions.push({
            start: breakEnd.toISOString(),
            end: null
        });
        
        // Update job data
        this.data.activeJob.lastUpdated = new Date().toISOString();
        
        // Save data
        this.saveData();
        
        // Update sessions list
        this.updateWorkSessionsList();
        
        this.showSuccessMessage(`${breakMinutes} minute break added`);
    },
    
    /**
     * Start the timer
     */
    startTimer() {
        if (this.timer.interval) {
            clearInterval(this.timer.interval);
        }
        
        this.timer.interval = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);
    },
    
    /**
     * Stop the timer
     */
    stopTimer() {
        if (this.timer.interval) {
            clearInterval(this.timer.interval);
            this.timer.interval = null;
        }
    },
    
    /**
     * Update the timer display
     */
    updateTimerDisplay() {
        if (!this.data.activeJob) {
            return;
        }

        // 現在時刻をチェック - 17時以降なら自動的に一時停止（タイマー動作中のみ）
        // 日本時間で判断
        const jstNow = this.convertToJST(new Date());
        if (jstNow.getHours() >= 17 && !this.timer.isPaused) {
            console.log('17時を過ぎたため、作業を自動的に一時停止します');
            this.togglePause();
            this.showSuccessMessage('17時になったため作業を自動的に一時停止しました。翌日は「再開」ボタンで続行できます。');
            return;
        }

        // 一時停止中は通常のタイマーを更新しない
        if (!this.timer.isPaused) {
            // Calculate working time in minutes for current session
            const workTimeMinutes = this.calculateTotalTime(this.data.activeJob);
            const hours = Math.floor(workTimeMinutes / 60);
            const minutes = workTimeMinutes % 60;

            // Update display
            this.elements.hoursDisplay.textContent = hours.toString().padStart(2, '0');
            this.elements.minutesDisplay.textContent = minutes.toString().padStart(2, '0');

            // タイマーラベルを「現在のセッション時間」に設定
            if (this.elements.timerLabel) {
                this.elements.timerLabel.textContent = '現在のセッション時間';
            }

            // Update job data
            this.data.activeJob.totalTimeMinutes = workTimeMinutes;
            this.data.activeJob.lastUpdated = new Date().toISOString();
        } else {
            // 一時停止中は「一時停止中」と表示
            if (this.elements.timerLabel) {
                this.elements.timerLabel.textContent = '一時停止中';
            }
        }

        // 加工個数を表示
        if (this.elements.activeJobQuantity) {
            this.elements.activeJobQuantity.textContent = this.data.activeJob.itemQuantity || 1;
        }

        // 累計作業時間を計算して表示（全セッションの合計）
        this.updateTotalWorkTime();
    },

    /**
     * 仕掛かり中の作業の累計時間を更新表示する
     */
    updateTotalWorkTime() {
        if (!this.data.activeJob) return;

        // 全セッションの時間を合計
        let totalMinutes = 0;

        // 作業セッションの分析
        for (const session of this.data.activeJob.sessions) {
            if (!session.start) continue;

            // セッションが終了しているか、進行中かを判断
            const sessionStart = new Date(session.start);
            let sessionEnd;

            if (session.end) {
                // 完了しているセッション
                sessionEnd = new Date(session.end);
            } else if (this.timer.isPaused) {
                // 一時停止中の現在のセッション - 一時停止時点までを計算
                sessionEnd = this.timer.pauseStartTime;
            } else {
                // 進行中の現在のセッション - 現在時刻まで
                sessionEnd = new Date();
            }

            // このセッションの作業時間を計算
            const sessionMinutes = this.calculateSessionMinutes(sessionStart, sessionEnd);
            totalMinutes += sessionMinutes;
        }

        // 表示を更新
        if (this.elements.totalWorkTimeDisplay) {
            this.elements.totalWorkTimeDisplay.textContent = this.formatTime(totalMinutes);
        }

        return totalMinutes;
    },
    
    /**
     * Calculate total working time for a job, excluding lunch break and after-hours
     * @param {Object} job - The job object
     * @returns {number} Total time in minutes
     */
    calculateTotalTime(job) {
        let totalMinutes = 0;
        
        // Process each work session
        for (const session of job.sessions) {
            if (!session.start || !session.end) {
                // Skip incomplete sessions or use current time for ongoing session
                if (session.start && !session.end && !this.timer.isPaused) {
                    const now = new Date();
                    totalMinutes += this.calculateSessionMinutes(
                        new Date(session.start),
                        now
                    );
                }
                continue;
            }
            
            const sessionStart = new Date(session.start);
            const sessionEnd = new Date(session.end);
            
            // データの整合性チェック - 終了時間が開始時間より前のセッションをスキップ
            if (sessionEnd < sessionStart) {
                console.warn('整合性エラー: セッションの終了時間が開始時間より前です', {
                    start: session.start,
                    end: session.end
                });
                continue; // 無効なセッションはスキップ
            }
            
            totalMinutes += this.calculateSessionMinutes(sessionStart, sessionEnd);
        }
        
        return totalMinutes;
    },
    
    /**
     * Calculate working minutes for a session, excluding lunch break and after-hours
     * @param {Date} start - Session start time
     * @param {Date} end - Session end time
     * @returns {number} Working time in minutes
     */
    calculateSessionMinutes(start, end) {
        // If session is in the future or invalid, return 0
        if (start > end) {
            return 0;
        }
        
        let totalMinutes = 0;
        let currentTime = new Date(start);
        
        // Process time in 1-minute increments for more accuracy
        while (currentTime < end) {
            const hour = currentTime.getHours();
            const nextMinute = new Date(currentTime);
            nextMinute.setMinutes(currentTime.getMinutes() + 1);
            
            // If next increment would go past end time, adjust
            if (nextMinute > end) {
                nextMinute.setTime(end.getTime());
            }
            
            // Skip lunch break (12:00-13:00)
            if (hour === 12) {
                // Skip this increment
            } 
            // Skip after-hours (after 17:00)
            else if (hour >= 17) {
                // Skip this increment
            }
            // Count working hours
            else {
                const incrementMinutes = (nextMinute - currentTime) / 60000;
                totalMinutes += incrementMinutes;
            }
            
            currentTime = nextMinute;
        }
        
        return Math.round(totalMinutes);
    },
    
    /**
     * Update work sessions list in the UI
     */
    updateWorkSessionsList() {
        if (!this.data.activeJob) {
            return;
        }

        const listElement = this.elements.workSessionsList;
        listElement.innerHTML = '';

        // セッションをグループ化するための Map (日付 -> セッション配列)
        const sessionsByDate = new Map();

        // 各セッションを日付ごとにグループ化（日本時間基準）
        this.data.activeJob.sessions.forEach(session => {
            if (!session.start) return;

            // ヘルパー関数を使用してUTCを日本時間に変換
            const startTimeJST = this.convertToJST(session.start);
            const dateKey = startTimeJST.toLocaleDateString(); // 日付のみの文字列

            if (!sessionsByDate.has(dateKey)) {
                sessionsByDate.set(dateKey, []);
            }

            sessionsByDate.get(dateKey).push(session);
        });

        // 現在の日付を取得（日本時間）
        const now = new Date();
        // 日本時間に変換（ヘルパー関数を使用）
        const todayJST = this.convertToJST(now).toLocaleDateString();

        // 日付の配列を取得してソート（新しい順）
        const sortedDates = Array.from(sessionsByDate.keys()).sort((a, b) => {
            return new Date(b) - new Date(a);
        });

        // 日付ごとのセッションを表示（新しい順）
        sortedDates.forEach(dateKey => {
            const sessions = sessionsByDate.get(dateKey);
            const isToday = dateKey === todayJST;

            // 日付情報（すべての日付共通）
            const sampleSession = sessions[0];
            const sampleStartUTC = new Date(sampleSession.start);
            const sampleStartJST = new Date(sampleStartUTC.getTime() + 9 * 60 * 60 * 1000);
            const month = sampleStartJST.getMonth() + 1;
            const day = sampleStartJST.getDate();
            const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][sampleStartJST.getDay()];

            if (isToday) {
                // 今日のセッションは詳細表示
                // 日付見出し
                const headerItem = document.createElement('li');
                headerItem.className = 'list-group-item fw-bold';
                // ステータスに応じた表示
                const statusText = this.data.activeJob.status === 'paused' ? '(一時停止中)' : '(進行中)';
                headerItem.textContent = `${month}/${day}(${dayOfWeek}) 今日の作業 ${statusText}`;
                listElement.appendChild(headerItem);

                // 各セッション
                sessions.forEach((session, index) => {
                    const startTimeJST = this.convertToJST(session.start);

                    let endTimeJST = null;
                    if (session.end) {
                        endTimeJST = this.convertToJST(session.end);
                    } else if (this.timer.isPaused) {
                        endTimeJST = null;
                    } else {
                        // 進行中のセッション
                        endTimeJST = this.convertToJST(new Date());
                    }

                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item';

                    // Format display text
                    // 時刻のフォーマットを関数化
                    const formatTimeString = (date) => {
                        const hours = date.getHours();
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${hours}:${minutes}`;
                    };

                    // 実際の開始・終了時間（日本時間）を表示
                    let displayStart = startTimeJST;
                    
                    // 終了時間（進行中のセッションは現在時刻）
                    let displayEnd;
                    if (session.end) {
                        displayEnd = this.convertToJST(new Date(session.end));
                    } else {
                        displayEnd = this.convertToJST(new Date());
                    }

                    // セッション時間を計算（分）
                    const startTimeUTC = new Date(session.start);
                    const endTimeUTC = session.end ? new Date(session.end) : new Date();
                    const duration = this.calculateSessionMinutes(startTimeUTC, endTimeUTC);
                    
                    // 表示テキスト: 「9:30 〜 10:45 (75分)」形式
                    let sessionText = `${formatTimeString(displayStart)} 〜 ${formatTimeString(displayEnd)}`;
                    if (duration > 0) {
                        sessionText += ` (${duration}分)`;
                    }

                    listItem.textContent = sessionText;
                    listElement.appendChild(listItem);
                });
            } else {
                // 過去の日付は開始・終了時間と作業時間を表示
                // 最初と最後のセッションを取得
                const firstSession = sessions[0];
                const lastSession = sessions[sessions.length - 1];

                // 開始・終了時間（日本時間）
                const firstStartJST = this.convertToJST(firstSession.start);

                let lastEndJST;
                if (lastSession.end) {
                    lastEndJST = this.convertToJST(lastSession.end);
                } else {
                    // 最後のセッションが終了していない場合（通常ないはず）
                    lastEndJST = new Date(firstStartJST);
                    lastEndJST.setHours(17, 0, 0); // 17:00に設定
                }

                // その日の全セッションから総作業時間を計算
                let totalDuration = 0;
                sessions.forEach(session => {
                    if (!session.start || !session.end) return;

                    const startTime = new Date(session.start);
                    const endTime = new Date(session.end);
                    totalDuration += this.calculateSessionMinutes(startTime, endTime);
                });

                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';

                // 時刻のフォーマットを関数化
                const formatTimeString = (date) => {
                    const hours = date.getHours();
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    return `${hours}:${minutes}`;
                };

                // この部分は廃止 - 重複コード
                
                // その日の作業時間を表示 (実際の開始・終了時間)
                const dateStr = `${month}/${day}(${dayOfWeek})`;
                
                // 実際の開始時間と終了時間を使用
                const displayStartTime = firstStartJST;
                const displayEndTime = lastEndJST;
                
                // 時間をフォーマット
                const startDisplayStr = formatTimeString(displayStartTime);
                const endDisplayStr = formatTimeString(displayEndTime);
                
                // フォーマット: 5/14(水) 9:30〜15:45 (4h 1m)
                listItem.textContent = `${dateStr} ${startDisplayStr}〜${endDisplayStr} (${this.formatTime(totalDuration)})`;

                listElement.appendChild(listItem);
            }
        });

        // 現在の一時停止状態を表示
        if (this.data.activeJob.status === 'paused') {
            // 最後のセッションの終了時間と現在時の差を計算
            const lastSession = this.data.activeJob.sessions[this.data.activeJob.sessions.length - 1];
            if (lastSession && lastSession.end) {
                const lastEndUTC = new Date(lastSession.end);
                const lastEndJST = new Date(lastEndUTC.getTime() + 9 * 60 * 60 * 1000);

                // 時刻のフォーマット
                const formatTimeString = (date) => {
                    const hours = date.getHours();
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    return `${hours}:${minutes}`;
                };

                // 実際の一時停止時間を表示
                const displayPauseTime = lastEndJST;

                const listItem = document.createElement('li');
                // CSSクラスを使用して統一したスタイルにする
                listItem.className = 'list-group-item pause-banner';
                listItem.innerHTML = `<i class="bi bi-pause-circle me-1"></i> <b>${formatTimeString(displayPauseTime)}で一時停止中</b> - 「再開」ボタンで作業を続行できます`;
                listElement.appendChild(listItem);
            }
        }
    },
    
    /**
     * Update the completed jobs list
     */
    refreshCompletedJobs() {
        const tableBody = this.elements.completedJobsList;
        const noCompletedJobsElement = document.getElementById('noCompletedJobs');
        tableBody.innerHTML = '';

        if (this.data.completedJobs.length === 0) {
            // 完了した作業がない場合はメッセージを表示
            if (noCompletedJobsElement) {
                noCompletedJobsElement.classList.remove('d-none');
            }
            return;
        }

        // 完了した作業がある場合は隠す
        if (noCompletedJobsElement) {
            noCompletedJobsElement.classList.add('d-none');
        }

        this.data.completedJobs.forEach((job, index) => {
            const row = document.createElement('tr');

            // 日付フォーマット（日本時間）
            const completedDateJST = this.convertToJST(new Date(job.completedAt));
            const dateStr = completedDateJST.toLocaleDateString();
            
            // 加工個数と1個あたりの時間を計算
            const quantity = job.itemQuantity || 1;
            const totalMinutes = job.totalTimeMinutes;
            const timePerItem = Math.round(totalMinutes / quantity);

            // 行のセルを作成
            row.innerHTML = `
                <td>${job.drawingNumber}</td>
                <td>${job.description || '-'}</td>
                <td>${dateStr}</td>
                <td>${quantity} 個</td>
                <td>${this.formatTime(totalMinutes)}</td>
                <td>${this.formatTime(timePerItem)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary action-btn view-details-btn" data-index="${index}">
                        <i class="bi bi-info-circle me-1"></i>詳細
                    </button>
                    <button class="btn btn-sm btn-outline-primary action-btn restart-job-btn" data-index="${index}">
                        <i class="bi bi-arrow-clockwise me-1"></i>再開
                    </button>
                </td>
            `;
            
            // Add event listeners to buttons
            const viewDetailsBtn = row.querySelector('.view-details-btn');
            const restartJobBtn = row.querySelector('.restart-job-btn');
            
            viewDetailsBtn.addEventListener('click', () => {
                this.viewJobDetails(job, index);
            });
            
            restartJobBtn.addEventListener('click', () => {
                this.restartJob(index);
            });
            
            tableBody.appendChild(row);
        });
    },
    
    /**
     * View details of a completed job
     * @param {Object} job - The job to view
     * @param {number} index - Index of the job in the completedJobs array
     */
    viewJobDetails(job, index) {
        // モーダルにデータを設定して表示
        const detailsModal = document.getElementById('jobDetailsModal');
        const detailsContent = document.getElementById('jobDetailsContent');
        const restartBtn = document.getElementById('restartJobFromModal');

        // 開始日と完了日を日本時間でフォーマット
        const startDateJST = this.convertToJST(new Date(job.startedAt));
        const completedDateJST = this.convertToJST(new Date(job.completedAt));
        const startDate = startDateJST.toLocaleString();
        const completedDate = completedDateJST.toLocaleString();

        // セッションのリスト作成
        let sessionsHtml = '';
        job.sessions.forEach((session, i) => {
            // 日本時間に変換
            const startJST = this.convertToJST(new Date(session.start));
            const startTime = startJST.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            
            let endTime;
            if (session.end) {
                const endJST = this.convertToJST(new Date(session.end));
                endTime = endJST.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            } else {
                endTime = '終了なし';
            }
            
            sessionsHtml += `<li class="mb-2">セッション ${i+1}: ${startTime} - ${endTime}</li>`;
        });

        // 休憩のリスト作成
        let breaksHtml = '';
        if (job.breaks && job.breaks.length > 0) {
            job.breaks.forEach((breakItem, i) => {
                // 日本時間に変換
                const startJST = this.convertToJST(new Date(breakItem.start));
                const endJST = this.convertToJST(new Date(breakItem.end));
                
                const startTime = startJST.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                const endTime = endJST.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                
                const duration = breakItem.duration || Math.round((new Date(breakItem.end) - new Date(breakItem.start)) / 60000);
                breaksHtml += `<li class="mb-2">休憩 ${i+1}: ${startTime} - ${endTime} (${duration}分)</li>`;
            });
        } else {
            breaksHtml = '<li>休憩記録なし</li>';
        }

        // 加工個数と1個あたりの時間を計算
        const quantity = job.itemQuantity || 1;
        const totalMinutes = job.totalTimeMinutes;
        const timePerItem = Math.round(totalMinutes / quantity);
        
        // HTML生成
        detailsContent.innerHTML = `
            <div class="card mb-3">
                <div class="card-header bg-light">
                    <h5 class="mb-0">${job.drawingNumber}</h5>
                </div>
                <div class="card-body">
                    <p><strong>作業内容:</strong> ${job.description || 'なし'}</p>
                    <p><strong>開始時間:</strong> ${startDate}</p>
                    <p><strong>完了時間:</strong> ${completedDate}</p>
                    
                    <div class="row mt-3">
                        <div class="col-md-4 mb-3">
                            <div class="card bg-light">
                                <div class="card-body text-center">
                                    <h6>加工個数</h6>
                                    <h3>${quantity} 個</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 mb-3">
                            <div class="card bg-light">
                                <div class="card-body text-center">
                                    <h6>総作業時間</h6>
                                    <h3>${this.formatTime(totalMinutes)}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 mb-3">
                            <div class="card bg-light">
                                <div class="card-body text-center">
                                    <h6>1個あたり</h6>
                                    <h3>${this.formatTime(timePerItem)}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <h6 class="mt-4 mb-2"><i class="bi bi-calendar-check me-2"></i>作業セッション</h6>
            <ul class="list-unstyled ps-3">
                ${sessionsHtml}
            </ul>

            <h6 class="mt-4 mb-2"><i class="bi bi-cup-hot me-2"></i>休憩記録</h6>
            <ul class="list-unstyled ps-3">
                ${breaksHtml}
            </ul>
        `;

        // 再開ボタンにジョブIDを設定
        restartBtn.dataset.jobId = index;

        // モーダルを表示
        const modal = new bootstrap.Modal(detailsModal);
        modal.show();
    },
    
    /**
     * Restart a completed job
     * @param {number} index - Index of the job in the completedJobs array
     */
    restartJob(index) {
        if (this.data.activeJob) {
            if (!confirm('You have an active job. Do you want to complete it and restart this job?')) {
                return;
            }
            this.completeJob();
        }

        const oldJob = this.data.completedJobs[index];
        const startTime = new Date();

        // 加工個数を取得または確認
        let itemQuantity = oldJob.itemQuantity || 1;
        const newQuantity = prompt(`加工個数を入力してください:`, itemQuantity);
        
        // 有効な数値なら更新、キャンセルまたは無効な入力は元の値を使用
        if (newQuantity !== null) {
            const parsedQuantity = parseInt(newQuantity);
            if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
                itemQuantity = parsedQuantity;
            }
        }
        
        // Create new active job based on the old one
        this.data.activeJob = {
            drawingNumber: oldJob.drawingNumber,
            description: oldJob.description,
            itemQuantity: itemQuantity,
            startedAt: startTime.toISOString(),
            lastUpdated: startTime.toISOString(),
            sessions: [{
                start: startTime.toISOString(),
                end: null
            }],
            breaks: [],
            totalTimeMinutes: 0,
            status: 'active'
        };
        
        // Reset timer state
        this.timer.interval = null;
        this.timer.startTime = startTime;
        this.timer.isPaused = false;
        this.timer.pauseStartTime = null;
        this.timer.breaks = [];
        
        // Start timer
        this.startTimer();
        
        // Save data
        this.saveData();
        
        // Update UI
        this.updateUI();
        
        this.showSuccessMessage(`Job ${oldJob.drawingNumber} restarted`);
    },
    
    /**
     * Update the user interface based on current data
     */
    updateUI() {
        // Update active job panel visibility
        if (this.data.activeJob) {
            this.elements.activeJobPanel.classList.remove('d-none');
            this.elements.newJobPanel.classList.add('d-none');

            // Update active job information
            this.elements.activeJobDrawingNumber.textContent = this.data.activeJob.drawingNumber;
            this.elements.activeJobDescription.textContent = this.data.activeJob.description || 'No description';
            // 日本時間で開始時間を表示
            const startTimeJST = this.convertToJST(new Date(this.data.activeJob.startedAt));
            this.elements.activeJobStartTime.textContent = startTimeJST.toLocaleString();

            // 加工個数を表示
            if (this.elements.activeJobQuantity) {
                this.elements.activeJobQuantity.textContent = this.data.activeJob.itemQuantity || 1;
            }

            // Set timer state from job status
            this.timer.isPaused = this.data.activeJob.status === 'paused';

            // Update pause/resume button
            if (this.timer.isPaused) {
                this.elements.pauseResumeBtn.textContent = 'Resume';
                this.elements.pauseResumeBtn.classList.remove('btn-warning');
                this.elements.pauseResumeBtn.classList.add('btn-success');

                // タイマーラベルを「一時停止中」に設定
                if (this.elements.timerLabel) {
                    this.elements.timerLabel.textContent = '一時停止中';
                }

                // Ensure pause start time is set when UI is updated
                if (!this.timer.pauseStartTime && this.data.activeJob.lastUpdated) {
                    this.timer.pauseStartTime = new Date(this.data.activeJob.lastUpdated);
                }
            } else {
                this.elements.pauseResumeBtn.textContent = 'Pause';
                this.elements.pauseResumeBtn.classList.remove('btn-success');
                this.elements.pauseResumeBtn.classList.add('btn-warning');

                // タイマーラベルを「現在のセッション時間」に設定
                if (this.elements.timerLabel) {
                    this.elements.timerLabel.textContent = '現在のセッション時間';
                }
            }

            // Update timer display
            this.updateTimerDisplay();

            // 累計作業時間を更新表示
            this.updateTotalWorkTime();

            // Update work sessions list
            this.updateWorkSessionsList();
        } else {
            this.elements.activeJobPanel.classList.add('d-none');
            this.elements.newJobPanel.classList.remove('d-none');
        }
        
        // Update completed jobs list
        this.refreshCompletedJobs();
        
        // Update monthly statistics
        this.updateMonthlyStats();
        
        // Update last sync time
        this.updateLastSyncTime();
    },
    
    /**
     * Update the last sync time display
     */
    updateLastSyncTime() {
        const lastSyncElement = this.elements.lastSyncTime;
        
        if (this.data.lastSync) {
            // 日本時間で表示
            const syncDateJST = this.convertToJST(new Date(this.data.lastSync));
            lastSyncElement.textContent = `最終同期: ${syncDateJST.toLocaleString()}`;
        } else {
            lastSyncElement.textContent = '未同期';
        }
    },
    
    /**
     * Save application data to localStorage
     */
    saveData() {
        try {
            // Update the lastUpdated timestamp for activeJob
            if (this.data.activeJob) {
                this.data.activeJob.lastUpdated = new Date().toISOString();
            }
            
            localStorage.setItem('latheTimeTrackerData', JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving data:', error);
            this.showError('Failed to save data locally', error);
        }
    },
    
    /**
     * Load application data from localStorage
     */
    loadData() {
        try {
            const savedData = localStorage.getItem('latheTimeTrackerData');

            if (savedData) {
                this.data = JSON.parse(savedData);

                // Initialize timer state if there's an active job
                if (this.data.activeJob) {
                    this.timer.isPaused = this.data.activeJob.status === 'paused';

                    // If the job is paused, set the pause start time to the last update time
                    if (this.timer.isPaused && this.data.activeJob.lastUpdated) {
                        this.timer.pauseStartTime = new Date(this.data.activeJob.lastUpdated);
                    }

                    // Resume timer if job is active
                    if (!this.timer.isPaused) {
                        this.startTimer();
                    }
                }

                console.log('Data loaded from localStorage');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load saved data', error);
        }
    },
    
    /**
     * Show an error message
     * @param {string} message - Main error message
     * @param {Error} error - Error object with details (optional)
     */
    showError(message, error = null) {
        this.elements.errorMessage.textContent = message;
        
        if (error) {
            this.elements.errorTechnicalDetails.textContent = error.toString();
            this.elements.showErrorDetails.classList.remove('d-none');
        } else {
            this.elements.errorDetails.classList.add('d-none');
            this.elements.showErrorDetails.classList.add('d-none');
        }
        
        this.modals.errorModal.show();
    },
    
    /**
     * Toggle error details visibility
     */
    toggleErrorDetails() {
        const detailsElement = this.elements.errorDetails;
        const isHidden = detailsElement.classList.contains('d-none');
        
        if (isHidden) {
            detailsElement.classList.remove('d-none');
            this.elements.showErrorDetails.textContent = 'Hide Details';
        } else {
            detailsElement.classList.add('d-none');
            this.elements.showErrorDetails.textContent = 'Show Details';
        }
    },
    
    /**
     * Show a success message (temporary toast or alert)
     * @param {string} message - Success message to display
     */
    showSuccessMessage(message) {
        console.log('Success:', message);
        
        // Create a temporary alert div
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.role = 'alert';

        alertDiv.innerHTML = `
            <strong>Success!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Add to document
        document.body.appendChild(alertDiv);
        
        // Show actual alert for now to make it obvious
        alert(message);

        // Remove after 3 seconds
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 500);
        }, 3000);
    },
    
    /**
     * Format time in hours and minutes
     * @param {number} totalMinutes - Time in minutes
     * @returns {string} Formatted time string (e.g., "2h 15m")
     */
    formatTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours === 0) {
            return `${minutes}m`;
        } else if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${minutes}m`;
        }
    },
    
    /**
     * Format date as 12-hour time
     * @param {Date} date - Date object
     * @returns {string} Formatted time (e.g., "2:30 PM")
     */
    formatTime12Hour(date) {
        // UTCタイムゾーンを明示的に指定して時間を表示
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'  // UTCタイムゾーンを使用
        });
    },
    
    /**
     * Initialize monthly statistics
     */
    initializeMonthlyStats() {
        // データが存在する月のみオプションとして追加
        const monthSelect = this.elements.monthSelect;
        if (!monthSelect) return;
        
        // 月の選択肢をクリア
        monthSelect.innerHTML = '';
        
        // データが無い場合のデフォルトオプション
        if (!this.data.completedJobs || this.data.completedJobs.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'データがありません';
            monthSelect.appendChild(option);
            return;
        }
        
        // 完了済み作業から、存在する月を抽出
        const months = new Map(); // {year-month: {year, month, count}} 形式で保存
        
        this.data.completedJobs.forEach(job => {
            if (!job.completedAt) return;
            
            const date = new Date(job.completedAt);
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // JavaScriptの月は0始まり
            const key = `${year}-${String(month).padStart(2, '0')}`;
            
            if (months.has(key)) {
                // 既存の月ならカウントを増やす
                const monthData = months.get(key);
                monthData.count++;
                months.set(key, monthData);
            } else {
                // 新しい月なら追加
                months.set(key, {
                    year: year,
                    month: month,
                    count: 1
                });
            }
        });
        
        // 月名の配列
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        
        // 日付の降順でソート（新しい月が上に）
        const sortedMonths = Array.from(months.entries())
            .sort((a, b) => b[0].localeCompare(a[0]));
        
        // 選択肢を追加
        sortedMonths.forEach(([key, data], index) => {
            const option = document.createElement('option');
            option.value = key;
            const monthName = monthNames[data.month - 1];
            option.textContent = `${data.year}年 ${monthName} (${data.count}件)`;
            
            // 最新の月を選択状態にする
            if (index === 0) {
                option.selected = true;
            }
            
            monthSelect.appendChild(option);
        });
        
        // 初期統計を更新
        this.updateMonthlyStats();
    },
    
    /**
     * Update monthly statistics based on selected month
     */
    updateMonthlyStats() {
        const monthSelect = this.elements.monthSelect;
        if (!monthSelect) return;
        
        const selectedMonth = monthSelect.value;
        if (!selectedMonth) return;
        
        // 選択された年月を解析
        const [year, month] = selectedMonth.split('-').map(Number);
        
        // 月初と月末の日付を作成
        const startDate = new Date(year, month - 1, 1, 0, 0, 0);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        
        // この月の完了済み作業を抽出
        const monthlyJobs = this.data.completedJobs.filter(job => {
            const completedDate = new Date(job.completedAt);
            return completedDate >= startDate && completedDate <= endDate;
        });
        
        // 図面の種類数（重複を排除）
        const uniqueDrawings = new Set();
        monthlyJobs.forEach(job => uniqueDrawings.add(job.drawingNumber));
        
        // 総加工個数
        let totalItems = 0;
        monthlyJobs.forEach(job => {
            totalItems += job.itemQuantity || 1;
        });
        
        // 総作業時間
        let totalMinutes = 0;
        monthlyJobs.forEach(job => {
            totalMinutes += job.totalTimeMinutes || 0;
        });
        
        // 平均加工時間（1個あたり）
        const averageTimePerItem = totalItems > 0 ? Math.round(totalMinutes / totalItems) : 0;
        
        // 統計を表示
        this.elements.monthlyDrawingCount.textContent = uniqueDrawings.size;
        this.elements.monthlyItemCount.textContent = totalItems;
        this.elements.monthlyTotalTime.textContent = this.formatTime(totalMinutes);
        this.elements.monthlyAverageTime.textContent = this.formatTime(averageTimePerItem);
    }
};

// Initialize the application when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    LatheTimeTracker.init();

    // スマホ向けのボタンはonclick属性で直接実装に変更

    // ダークモード機能はグローバルの toggleDarkMode() 関数に移行しました

    // データ初期化機能の設定
    function setupDataResetFunction() {
        console.log('データ初期化機能の設定を開始');
        const resetAllData = document.getElementById('resetAllData');
        const confirmResetCheck = document.getElementById('confirmResetCheck');
        const confirmResetBtn = document.getElementById('confirmResetBtn');

        console.log('要素:', { resetAllData, confirmResetCheck, confirmResetBtn });

        if (resetAllData && confirmResetCheck && confirmResetBtn) {
            console.log('データ初期化ボタンにイベントリスナーを追加');

            // チェックボックスの状態に応じて確認ボタンの有効・無効を切り替え
            confirmResetCheck.addEventListener('change', () => {
                console.log('チェックボックス状態変更:', confirmResetCheck.checked);
                confirmResetBtn.disabled = !confirmResetCheck.checked;
            });

            // モーダルが表示されたときに強制的にチェック状態を更新
            document.getElementById('resetConfirmModal').addEventListener('shown.bs.modal', () => {
                console.log('モーダル表示時にボタン状態を更新');
                // 強制的にボタンを有効化（緊急修正）
                confirmResetBtn.disabled = false;
            });

            // 初期化ボタンのクリックイベント
            confirmResetBtn.addEventListener('click', async () => {
                console.log('初期化ボタンがクリックされました');
                if (!confirmResetCheck.checked) return;

            try {
                // 1. ローカルストレージのデータをクリア
                localStorage.removeItem('latheTimeTrackerData');

                // 2. 空のデータオブジェクトを作成
                const emptyData = {
                    activeJob: null,
                    completedJobs: [],
                    lastSync: new Date().toISOString()
                };

                // 3. LatheTimeTrackerのデータを初期化
                LatheTimeTracker.data = emptyData;

                // 4. GitHubに空のデータを強制的に保存（第2引数のtrueは強制作成モード）
                await GitHubAPI.saveData(emptyData, true);

                // 5. UI更新
                LatheTimeTracker.updateUI();
                LatheTimeTracker.initializeMonthlyStats();

                // 6. モーダルを閉じる
                const modal = bootstrap.Modal.getInstance(document.getElementById('resetConfirmModal'));
                modal.hide();

                // 7. 成功メッセージを表示
                LatheTimeTracker.showSuccessMessage('すべてのデータが正常に初期化されました');

                // 8. チェックボックスをリセット
                confirmResetCheck.checked = false;
                confirmResetBtn.disabled = true;

            } catch (error) {
                console.error('データ初期化エラー:', error);
                LatheTimeTracker.showError('データの初期化に失敗しました', error);
            }
        });
    }
}

// 初期化関数をDOMContentLoadedイベントとアプリ初期化後に呼び出す
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        setupDataResetFunctionDirect(); // 直接実行する新しい関数
    }, 1000);
});

// 直接データリセット機能を実装（コードを完全にやり直し）
function setupDataResetFunctionDirect() {
    console.log('データリセット機能を直接実装');

    // メインの初期化ボタン（モーダルを開くボタン）にイベントを追加
    const resetAllData = document.getElementById('resetAllData');
    if (resetAllData) {
        resetAllData.addEventListener('click', function() {
            console.log('初期化ボタンがクリックされました - モーダルを表示');
        });
    }

    // 確認モーダルのボタンを取得
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    if (!confirmResetBtn) {
        console.error('初期化ボタンが見つかりません');
        return;
    }

    // 初期化ボタンのクリックイベント - シンプルな実装
    confirmResetBtn.addEventListener('click', async function() {
        console.log('データ初期化ボタンがクリックされました！');

        try {
            // 1. ローカルストレージのデータをクリア
            localStorage.removeItem('latheTimeTrackerData');

            // 2. 空のデータオブジェクトを作成
            const emptyData = {
                activeJob: null,
                completedJobs: [],
                lastSync: new Date().toISOString()
            };

            // 3. LatheTimeTrackerのデータを初期化
            LatheTimeTracker.data = emptyData;

            // 4. GitHubに空のデータを保存
            try {
                await GitHubAPI.saveData(emptyData, true);
                console.log('GitHubデータをリセットしました');
            } catch (e) {
                console.error('GitHub保存エラー:', e);
                alert('GitHubデータのリセットに失敗しました: ' + e.message);
            }

            // 5. UI更新
            LatheTimeTracker.updateUI();
            LatheTimeTracker.initializeMonthlyStats();

            // 6. モーダルを閉じる
            const modal = bootstrap.Modal.getInstance(document.getElementById('resetConfirmModal'));
            if (modal) modal.hide();

            // 7. 成功メッセージを表示
            alert('すべてのデータが正常に初期化されました');
        } catch (error) {
            console.error('データ初期化エラー:', error);
            alert('データの初期化に失敗しました: ' + error.message);
        }
    });
}

    // ホーム画面追加バナーの表示（iOSのみ）
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone && !localStorage.getItem('installBannerDismissed')) {
        document.getElementById('installBanner').classList.add('show');
    }

    // 詳細表示用のモーダル設定
    document.getElementById('restartJobFromModal')?.addEventListener('click', () => {
        const jobId = document.getElementById('restartJobFromModal').dataset.jobId;
        if (jobId) {
            const jobIndex = parseInt(jobId);
            LatheTimeTracker.restartJob(jobIndex);
            const modal = bootstrap.Modal.getInstance(document.getElementById('jobDetailsModal'));
            modal.hide();
        }
    });
});