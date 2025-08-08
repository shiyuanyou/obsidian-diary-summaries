import { Plugin, Notice, Modal, Setting } from 'obsidian';
import { DiaryOrganizerSettings, DEFAULT_SETTINGS, OpenAIConnection } from './types';
import { DiaryOrganizerSettingTab } from './settings';
import { DiaryOrganizer } from './core/organizer';
import { DiaryData } from './types';
import { APIKeyEncryption } from './utils/encryption';

// 年份月份选择模态框
class YearMonthSelectionModal extends Modal {
	private plugin: DiarySummariesPlugin;
	private selectedYear: string = '';
	private selectedMonth: string = '';
	private forceOverwrite: boolean = false;
	private availableYears: string[] = [];
	private availableMonths: { [year: string]: string[] } = {};

	constructor(plugin: DiarySummariesPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '选择要处理的年份和月份' });

		// 扫描可用的年份和月份
		await this.scanAvailableData();

		// 年份选择
		const yearSetting = new Setting(contentEl)
			.setName('选择年份')
			.setDesc('选择要处理的年份')
			.addDropdown(dropdown => {
				dropdown.addOption('', '全部年份');
				this.availableYears.forEach(year => {
					dropdown.addOption(year, year);
				});
				dropdown.setValue(this.selectedYear);
				dropdown.onChange(async (value) => {
					this.selectedYear = value;
					this.selectedMonth = ''; // 重置月份选择
					await this.updateMonthDropdown(monthSetting);
				});
			});

		// 月份选择
		const monthSetting = new Setting(contentEl)
			.setName('选择月份')
			.setDesc('选择要处理的月份（可选）')
			.addDropdown(dropdown => {
				dropdown.addOption('', '全部月份');
				dropdown.setValue(this.selectedMonth);
				dropdown.onChange((value) => {
					this.selectedMonth = value;
				});
			});

		// 强制执行选项
		new Setting(contentEl)
			.setName('强制执行')
			.setDesc('覆盖已存在的汇总文件')
			.addToggle(toggle => toggle
				.setValue(this.forceOverwrite)
				.onChange((value) => {
					this.forceOverwrite = value;
				}));

		// 初始化月份下拉框
		await this.updateMonthDropdown(monthSetting);

		// 按钮
		const buttonContainer = contentEl.createEl('div', { cls: 'setting-item-control' });
		
		buttonContainer.createEl('button', {
			text: '开始处理',
			cls: 'mod-cta'
		}).addEventListener('click', async () => {
			await this.startProcessing();
			this.close();
		});

		buttonContainer.createEl('button', {
			text: '取消',
			cls: 'mod-warning'
		}).addEventListener('click', () => {
			this.close();
		});
	}

	private async scanAvailableData() {
		try {
			const scanResult = await this.plugin.organizer.scanDiaries();
			if (scanResult.success && scanResult.data) {
				this.availableYears = Object.keys(scanResult.data);
				
				// 收集每个年份的月份
				for (const [year, yearData] of Object.entries(scanResult.data)) {
					const yearDataTyped = yearData as { months: { [key: string]: any[] } };
					this.availableMonths[year] = Object.keys(yearDataTyped.months).filter(month => 
						yearDataTyped.months[month].length > 0
					);
				}
			}
		} catch (error) {
			console.error('扫描可用数据失败:', error);
		}
	}

	private async updateMonthDropdown(monthSetting: Setting) {
		const monthDropdown = monthSetting.controlEl.querySelector('select') as HTMLSelectElement;
		if (monthDropdown) {
			monthDropdown.innerHTML = '';
			
			// 添加"全部月份"选项
			const allOption = monthDropdown.createEl('option', { value: '', text: '全部月份' });
			
			if (this.selectedYear && this.availableMonths[this.selectedYear]) {
				this.availableMonths[this.selectedYear].forEach(month => {
					monthDropdown.createEl('option', { value: month, text: month });
				});
			}
		}
	}

	private async startProcessing() {
		const options: any = {};
		if (this.selectedYear) {
			options.year = this.selectedYear;
		}
		if (this.selectedMonth) {
			options.month = this.selectedMonth;
		}
		if (this.forceOverwrite) {
			options.force = true;
		}

		await this.plugin.processMonthSummariesWithOptions(options);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 年份月份选择（用于周报）
class WeekSelectionModal extends Modal {
    private plugin: DiarySummariesPlugin;
    private selectedYear: string = '';
    private selectedMonth: string = '';
    private selectedWeek: string = '';
    private forceOverwrite: boolean = false;
    private availableYears: string[] = [];
    private availableMonths: { [year: string]: string[] } = {};
    private availableData: DiaryData | null = null;

    constructor(plugin: DiarySummariesPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '选择要处理的年/月/周（周报）' });

        await this.scanAvailableData();

        // 年份选择
        const yearSetting = new Setting(contentEl)
            .setName('选择年份')
            .setDesc('选择要处理的年份')
            .addDropdown(dropdown => {
                dropdown.addOption('', '全部年份');
                this.availableYears.forEach(year => {
                    dropdown.addOption(year, year);
                });
                dropdown.setValue(this.selectedYear);
                dropdown.onChange(async (value) => {
                    this.selectedYear = value;
                    this.selectedMonth = '';
                    this.selectedWeek = '';
                    await this.updateMonthDropdown(monthSetting);
                    await this.updateWeekDropdown(weekSetting);
                });
            });

        // 月份选择
        const monthSetting = new Setting(contentEl)
            .setName('选择月份')
            .setDesc('选择要处理的月份（可选）')
            .addDropdown(dropdown => {
                dropdown.addOption('', '全部月份');
                dropdown.setValue(this.selectedMonth);
                dropdown.onChange(async (value) => {
                    this.selectedMonth = value;
                    this.selectedWeek = '';
                    await this.updateWeekDropdown(weekSetting);
                });
            });

        // 周选择
        const weekSetting = new Setting(contentEl)
            .setName('选择周')
            .setDesc('选择要处理的周（需先选择具体月份，可选）')
            .addDropdown(dropdown => {
                dropdown.addOption('', '全部周');
                dropdown.setValue(this.selectedWeek);
                dropdown.onChange((value) => {
                    this.selectedWeek = value;
                });
            });

        // 强制执行选项
        new Setting(contentEl)
            .setName('强制执行')
            .setDesc('覆盖已存在的汇总文件')
            .addToggle(toggle => toggle
                .setValue(this.forceOverwrite)
                .onChange((value) => {
                    this.forceOverwrite = value;
                }));

        await this.updateMonthDropdown(monthSetting);
        await this.updateWeekDropdown(weekSetting);

        // 按钮
        const buttonContainer = contentEl.createEl('div', { cls: 'setting-item-control' });
        buttonContainer.createEl('button', {
            text: '开始处理',
            cls: 'mod-cta'
        }).addEventListener('click', async () => {
            await this.startProcessing();
            this.close();
        });
        buttonContainer.createEl('button', {
            text: '取消',
            cls: 'mod-warning'
        }).addEventListener('click', () => {
            this.close();
        });
    }

    private async scanAvailableData() {
        try {
            const scanResult = await this.plugin.organizer.scanDiaries();
            if (scanResult.success && scanResult.data) {
                this.availableData = scanResult.data;
                this.availableYears = Object.keys(scanResult.data);
                for (const [year, yearData] of Object.entries(scanResult.data)) {
                    const yearDataTyped = yearData as { months: { [key: string]: any[] } };
                    this.availableMonths[year] = Object.keys(yearDataTyped.months).filter(month =>
                        yearDataTyped.months[month].length > 0
                    );
                }
            }
        } catch (error) {
            console.error('扫描可用数据失败:', error);
        }
    }

    private async updateMonthDropdown(monthSetting: Setting) {
        const monthDropdown = monthSetting.controlEl.querySelector('select') as HTMLSelectElement;
        if (monthDropdown) {
            monthDropdown.innerHTML = '';
            monthDropdown.createEl('option', { value: '', text: '全部月份' });
            if (this.selectedYear && this.availableMonths[this.selectedYear]) {
                this.availableMonths[this.selectedYear].forEach(month => {
                    monthDropdown.createEl('option', { value: month, text: month });
                });
            }
        }
    }

    private async updateWeekDropdown(weekSetting: Setting) {
        const weekDropdown = weekSetting.controlEl.querySelector('select') as HTMLSelectElement;
        if (!weekDropdown) return;
        weekDropdown.innerHTML = '';
        weekDropdown.createEl('option', { value: '', text: '全部周' });

        if (!this.selectedYear || !this.selectedMonth || !this.availableData) {
            return;
        }

        const months = this.availableData[this.selectedYear]?.months || {};
        const diaries = months[this.selectedMonth] || [];
        if (diaries.length === 0) return;

        const weekKeys = Array.from(new Set(diaries.map(d => this.getWeekKey(d.date)))).sort();
        weekKeys.forEach(weekKey => {
            weekDropdown.createEl('option', { value: weekKey, text: weekKey });
        });
    }

    // 与核心逻辑保持一致的周键计算
    private getWeekKey(date: Date): string {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;
    }

    private async startProcessing() {
        const options: any = {};
        if (this.selectedYear) options.year = this.selectedYear;
        if (this.selectedMonth) options.month = this.selectedMonth;
        if (this.selectedWeek) options.week = this.selectedWeek;
        if (this.forceOverwrite) options.force = true;
        await this.plugin.processWeekSummariesWithOptions(options);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// 年份季度选择（用于季报）
class YearQuarterSelectionModal extends Modal {
    private plugin: DiarySummariesPlugin;
    private selectedYear: string = '';
    private selectedQuarter: string = '';
    private forceOverwrite: boolean = false;
    private availableYears: string[] = [];
    private availableQuarters: { [year: string]: string[] } = {};

    constructor(plugin: DiarySummariesPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '选择要处理的年份和季度' });

        await this.scanAvailableData();

        // 年份
        const yearSetting = new Setting(contentEl)
            .setName('选择年份')
            .setDesc('选择要处理的年份')
            .addDropdown(dropdown => {
                dropdown.addOption('', '全部年份');
                this.availableYears.forEach(year => dropdown.addOption(year, year));
                dropdown.setValue(this.selectedYear);
                dropdown.onChange(async (value) => {
                    this.selectedYear = value;
                    this.selectedQuarter = '';
                    await this.updateQuarterDropdown(quarterSetting);
                });
            });

        // 季度
        const quarterSetting = new Setting(contentEl)
            .setName('选择季度')
            .setDesc('选择要处理的季度（可选）')
            .addDropdown(dropdown => {
                dropdown.addOption('', '全部季度');
                dropdown.setValue(this.selectedQuarter);
                dropdown.onChange((value) => {
                    this.selectedQuarter = value;
                });
            });

        // 强制执行
        new Setting(contentEl)
            .setName('强制执行')
            .setDesc('覆盖已存在的汇总文件')
            .addToggle(toggle => toggle
                .setValue(this.forceOverwrite)
                .onChange((value) => this.forceOverwrite = value));

        await this.updateQuarterDropdown(quarterSetting);

        // 按钮
        const buttonContainer = contentEl.createEl('div', { cls: 'setting-item-control' });
        buttonContainer.createEl('button', { text: '开始处理', cls: 'mod-cta' })
            .addEventListener('click', async () => { await this.startProcessing(); this.close(); });
        buttonContainer.createEl('button', { text: '取消', cls: 'mod-warning' })
            .addEventListener('click', () => this.close());
    }

    private async scanAvailableData() {
        try {
            const scanResult = await this.plugin.organizer.scanDiaries();
            if (scanResult.success && scanResult.data) {
                this.availableYears = Object.keys(scanResult.data);
                for (const [year, yearData] of Object.entries(scanResult.data)) {
                    const months = Object.keys((yearData as any).months).filter(m => (yearData as any).months[m].length > 0);
                    const quarters = new Set<string>();
                    months.forEach(m => {
                        const num = parseInt(m, 10);
                        if (num >= 1 && num <= 3) quarters.add('1');
                        else if (num >= 4 && num <= 6) quarters.add('2');
                        else if (num >= 7 && num <= 9) quarters.add('3');
                        else quarters.add('4');
                    });
                    this.availableQuarters[year] = Array.from(quarters).sort();
                }
            }
        } catch (error) {
            console.error('扫描可用数据失败:', error);
        }
    }

    private async updateQuarterDropdown(quarterSetting: Setting) {
        const quarterDropdown = quarterSetting.controlEl.querySelector('select') as HTMLSelectElement;
        if (quarterDropdown) {
            quarterDropdown.innerHTML = '';
            quarterDropdown.createEl('option', { value: '', text: '全部季度' });
            if (this.selectedYear && this.availableQuarters[this.selectedYear]) {
                this.availableQuarters[this.selectedYear].forEach(q => {
                    quarterDropdown.createEl('option', { value: q, text: `Q${q}` });
                });
            }
        }
    }

    private async startProcessing() {
        const options: any = {};
        if (this.selectedYear) options.year = this.selectedYear;
        if (this.selectedQuarter) options.quarter = this.selectedQuarter;
        if (this.forceOverwrite) options.force = true;
        await this.plugin.processQuarterSummariesWithOptions(options);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// 年份选择（用于年报）
class YearSelectionModal extends Modal {
    private plugin: DiarySummariesPlugin;
    private selectedYear: string = '';
    private forceOverwrite: boolean = false;
    private availableYears: string[] = [];

    constructor(plugin: DiarySummariesPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '选择要处理的年份（年报）' });

        await this.scanAvailableData();

        new Setting(contentEl)
            .setName('选择年份')
            .setDesc('选择要处理的年份（可选）')
            .addDropdown(dropdown => {
                dropdown.addOption('', '全部年份');
                this.availableYears.forEach(year => dropdown.addOption(year, year));
                dropdown.setValue(this.selectedYear);
                dropdown.onChange((value) => this.selectedYear = value);
            });

        new Setting(contentEl)
            .setName('强制执行')
            .setDesc('覆盖已存在的汇总文件')
            .addToggle(toggle => toggle
                .setValue(this.forceOverwrite)
                .onChange((value) => this.forceOverwrite = value));

        const buttonContainer = contentEl.createEl('div', { cls: 'setting-item-control' });
        buttonContainer.createEl('button', { text: '开始处理', cls: 'mod-cta' })
            .addEventListener('click', async () => { await this.startProcessing(); this.close(); });
        buttonContainer.createEl('button', { text: '取消', cls: 'mod-warning' })
            .addEventListener('click', () => this.close());
    }

    private async scanAvailableData() {
        try {
            const scanResult = await this.plugin.organizer.scanDiaries();
            if (scanResult.success && scanResult.data) {
                this.availableYears = Object.keys(scanResult.data);
            }
        } catch (error) {
            console.error('扫描可用数据失败:', error);
        }
    }

    private async startProcessing() {
        const options: any = {};
        if (this.selectedYear) options.year = this.selectedYear;
        if (this.forceOverwrite) options.force = true;
        await this.plugin.processYearSummariesWithOptions(options);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class DiarySummariesPlugin extends Plugin {
	settings: DiaryOrganizerSettings;
	organizer: DiaryOrganizer;
	statusBarItem: any;

	async onload() {
		console.log('Loading Diary Summaries plugin');

		await this.loadSettings();

		// 初始化日记整理器
		this.organizer = new DiaryOrganizer(this.app, this.settings);

		// 添加设置页面
		this.addSettingTab(new DiaryOrganizerSettingTab(this.app, this));

		// 添加命令
		this.addCommands();

		// 添加状态栏
		this.addStatusBar();
	}

	onunload() {
		console.log('Unloading Diary Summaries plugin');
		if (this.statusBarItem) {
			this.statusBarItem.remove();
		}
	}

	async loadSettings() {
		const savedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
		
		// 解密API Key（如果已加密）
		if (this.settings.aiServices.openai.apiKey && APIKeyEncryption.isEncrypted(this.settings.aiServices.openai.apiKey)) {
			this.settings.aiServices.openai.apiKey = APIKeyEncryption.decryptAPIKey(this.settings.aiServices.openai.apiKey);
		}
		
		// 迁移旧版本设置到新的openaiConnections结构
		this.migrateToOpenAIConnections();
		
		// 解密OpenAI连接的API Keys
		if (this.settings.aiServices.openaiConnections) {
			this.settings.aiServices.openaiConnections.forEach((connection: OpenAIConnection) => {
				if (connection.apiKey && APIKeyEncryption.isEncrypted(connection.apiKey)) {
					connection.apiKey = APIKeyEncryption.decryptAPIKey(connection.apiKey);
				}
			});
		}
		
		// 确保新的设置属性存在
		if (!this.settings.summaryTypes.week) {
			this.settings.summaryTypes.week = DEFAULT_SETTINGS.summaryTypes.week;
		}
		if (!this.settings.summaryTypes.quarter) {
			this.settings.summaryTypes.quarter = DEFAULT_SETTINGS.summaryTypes.quarter;
		}
		if (!this.settings.summaryTypes.year) {
			this.settings.summaryTypes.year = DEFAULT_SETTINGS.summaryTypes.year;
		}

		// 确保每个汇总类型都有enabled属性
		if (this.settings.summaryTypes.week.enabled === undefined) {
			this.settings.summaryTypes.week.enabled = true;
		}
		if (this.settings.summaryTypes.month.enabled === undefined) {
			this.settings.summaryTypes.month.enabled = true;
		}
		if (this.settings.summaryTypes.quarter.enabled === undefined) {
			this.settings.summaryTypes.quarter.enabled = false;
		}
		if (this.settings.summaryTypes.year.enabled === undefined) {
			this.settings.summaryTypes.year.enabled = false;
		}
		
		// 确保每个汇总类型都有outputDir属性
		if (!this.settings.summaryTypes.week.outputDir) {
			this.settings.summaryTypes.week.outputDir = DEFAULT_SETTINGS.summaryTypes.week.outputDir;
		}
		if (!this.settings.summaryTypes.month.outputDir) {
			this.settings.summaryTypes.month.outputDir = DEFAULT_SETTINGS.summaryTypes.month.outputDir;
		}
		if (!this.settings.summaryTypes.quarter.outputDir) {
			this.settings.summaryTypes.quarter.outputDir = DEFAULT_SETTINGS.summaryTypes.quarter.outputDir;
		}
		if (!this.settings.summaryTypes.year.outputDir) {
			this.settings.summaryTypes.year.outputDir = DEFAULT_SETTINGS.summaryTypes.year.outputDir;
		}
	}

	private migrateToOpenAIConnections() {
		// 如果没有openaiConnections但有旧版本的openai配置，则迁移
		if (!this.settings.aiServices.openaiConnections || this.settings.aiServices.openaiConnections.length === 0) {
			if (this.settings.aiServices.openai.apiKey || this.settings.aiServices.openai.baseURL) {
				this.settings.aiServices.openaiConnections = [
					{
						id: 'migrated-openai',
						name: 'OpenAI (已迁移)',
						apiKey: this.settings.aiServices.openai.apiKey || '',
						baseURL: this.settings.aiServices.openai.baseURL || 'https://api.openai.com/v1',
						models: [this.settings.aiServices.openai.model || 'gpt-4'],
						isDefault: true
					}
				];
			} else {
				// 如果完全没有配置，使用默认值
				this.settings.aiServices.openaiConnections = DEFAULT_SETTINGS.aiServices.openaiConnections;
			}
		}
	}

	async saveSettings() {
		// 创建设置副本以避免修改原始设置
		const settingsToSave = JSON.parse(JSON.stringify(this.settings));
		
		// 加密旧版本API Key后再保存
		if (settingsToSave.aiServices.openai.apiKey && settingsToSave.aiServices.openai.apiKey.trim() !== '') {
			settingsToSave.aiServices.openai.apiKey = APIKeyEncryption.encryptAPIKey(settingsToSave.aiServices.openai.apiKey);
		}
		
		// 加密OpenAI连接的API Keys
		if (settingsToSave.aiServices.openaiConnections) {
			settingsToSave.aiServices.openaiConnections.forEach((connection: OpenAIConnection) => {
				if (connection.apiKey && connection.apiKey.trim() !== '') {
					connection.apiKey = APIKeyEncryption.encryptAPIKey(connection.apiKey);
				}
			});
		}
		
		await this.saveData(settingsToSave);
	}

	addStatusBar() {
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('📝 日记汇总');
	}

	addCommands() {
		// 处理周报汇总命令
		this.addCommand({
			id: 'process-week-summaries',
			name: '处理周报汇总（全部）',
			callback: async () => {
				await this.processWeekSummaries();
			}
		});

		// 处理周报汇总命令（带选择）
		this.addCommand({
			id: 'process-week-summaries-with-selection',
			name: '处理周报汇总（选择年/月/周）',
			callback: async () => {
				new WeekSelectionModal(this).open();
			}
		});

		// 处理月度汇总命令（带选择）
		this.addCommand({
			id: 'process-month-summaries-with-selection',
			name: '处理月度汇总（选择年份月份）',
			callback: async () => {
				new YearMonthSelectionModal(this).open();
			}
		});

		// 处理月度汇总命令（全部）
		this.addCommand({
			id: 'process-month-summaries',
			name: '处理月度汇总（全部）',
			callback: async () => {
				await this.processMonthSummaries();
			}
		});

		// 处理季度汇总命令（全部）
		this.addCommand({
			id: 'process-quarter-summaries',
			name: '处理季度汇总（全部）',
			callback: async () => {
				await this.processQuarterSummaries();
			}
		});

		// 处理季度汇总命令（带选择）
		this.addCommand({
			id: 'process-quarter-summaries-with-selection',
			name: '处理季度汇总（选择年份季度）',
			callback: async () => {
				new YearQuarterSelectionModal(this).open();
			}
		});

		// 处理年度汇总命令（全部）
		this.addCommand({
			id: 'process-year-summaries',
			name: '处理年度汇总（全部）',
			callback: async () => {
				await this.processYearSummaries();
			}
		});

		// 处理年度汇总命令（带选择）
		this.addCommand({
			id: 'process-year-summaries-with-selection',
			name: '处理年度汇总（选择年份）',
			callback: async () => {
				new YearSelectionModal(this).open();
			}
		});

		// 处理所有汇总命令
		this.addCommand({
			id: 'process-all-summaries',
			name: '处理所有汇总',
			callback: async () => {
				await this.processAllSummaries();
			}
		});

		// 快捷：强制生成本周周报
		this.addCommand({
			id: 'force-generate-this-week-summary',
			name: '强制生成本周周报汇总',
			callback: async () => {
				const now = new Date();
				const options: any = {
					year: `${now.getFullYear()}`,
					month: this.getMonthLabel(now),
					week: this.getWeekKey(now),
					force: true,
				};
				await this.processWeekSummariesWithOptions(options);
			}
		});

		// 快捷：强制生成本月月度汇总
		this.addCommand({
			id: 'force-generate-this-month-summary',
			name: '强制生成本月月度汇总',
			callback: async () => {
				const now = new Date();
				const options: any = {
					year: `${now.getFullYear()}`,
					month: this.getMonthLabel(now),
					force: true,
				};
				await this.processMonthSummariesWithOptions(options);
			}
		});

		// 快捷：强制生成本季度季度汇总
		this.addCommand({
			id: 'force-generate-this-quarter-summary',
			name: '强制生成本季度季度汇总',
			callback: async () => {
				const now = new Date();
				const options: any = {
					year: `${now.getFullYear()}`,
					quarter: this.getQuarter(now),
					force: true,
				};
				await this.processQuarterSummariesWithOptions(options);
			}
		});

		// 快捷：强制生成本年度年度汇总
		this.addCommand({
			id: 'force-generate-this-year-summary',
			name: '强制生成本年度年度汇总',
			callback: async () => {
				const now = new Date();
				const options: any = {
					year: `${now.getFullYear()}`,
					force: true,
				};
				await this.processYearSummariesWithOptions(options);
			}
		});
	}

	// 辅助：按扫描/处理逻辑一致的键格式
	private getWeekKey(date: Date): string {
		const startOfWeek = new Date(date);
		startOfWeek.setDate(date.getDate() - date.getDay());
		return `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;
	}

	private getMonthLabel(date: Date): string {
		const m = date.getMonth() + 1;
		return `${m.toString().padStart(2, '0')}月`;
	}

	private getQuarter(date: Date): string {
		const m = date.getMonth() + 1;
		return `${Math.floor((m - 1) / 3) + 1}`;
	}

	async processMonthSummariesWithOptions(options: any = {}) {
		try {
			// 显示开始通知
			const yearText = options.year ? ` ${options.year}年` : '';
			const monthText = options.month ? ` ${options.month}` : '';
			const forceText = options.force ? '（强制执行）' : '';
			const targetText = yearText + monthText || '全部';
			
			new Notice(`🔄 开始处理${targetText}月度汇总${forceText}...`);
			this.updateStatusBar('🔄 扫描日记中...');
			
			// 扫描日记
			const scanResult = await this.organizer.scanDiaries();
			if (!scanResult.success) {
				new Notice(`❌ 扫描失败: ${scanResult.error}`);
				this.updateStatusBar('❌ 扫描失败');
				return;
			}

			// 显示扫描结果
			const totalYears = Object.keys(scanResult.data || {}).length;
			new Notice(`📊 扫描完成，发现 ${totalYears} 年的日记`);
			this.updateStatusBar(`📊 发现 ${totalYears} 年日记`);

			// 处理月度汇总
			await this.organizer.processMonthSummaries({
				...options,
				onProgress: (message: string) => {
					new Notice(`🔄 ${message}`);
					this.updateStatusBar(`🔄 ${message}`);
				},
				onComplete: (summary: string) => {
					new Notice(`✅ ${targetText}月度汇总处理完成！`);
					this.updateStatusBar('✅ 汇总完成');
				}
			});
			
		} catch (error) {
			console.error('处理月度汇总时出错:', error);
			new Notice(`❌ 处理失败: ${error.message}`);
			this.updateStatusBar('❌ 处理失败');
		}
	}

	async processWeekSummariesWithOptions(options: any = {}) {
		try {
			const yearText = options.year ? ` ${options.year}年` : '';
			const monthText = options.month ? ` ${options.month}` : '';
			const weekText = options.week ? ` 第${options.week}周` : '';
			const forceText = options.force ? '（强制执行）' : '';
			const targetText = (yearText + monthText + weekText).trim() || '全部';

			new Notice(`🔄 开始处理${targetText}周报汇总${forceText}...`);
			this.updateStatusBar('🔄 扫描日记中...');

			const scanResult = await this.organizer.scanDiaries();
			if (!scanResult.success) {
				new Notice(`❌ 扫描失败: ${scanResult.error}`);
				this.updateStatusBar('❌ 扫描失败');
				return;
			}

			const totalYears = Object.keys(scanResult.data || {}).length;
			new Notice(`📊 扫描完成，发现 ${totalYears} 年的日记`);
			this.updateStatusBar(`📊 发现 ${totalYears} 年日记`);

			await this.organizer.processWeekSummaries({
				...options,
				onProgress: (message: string) => {
					new Notice(`🔄 ${message}`);
					this.updateStatusBar(`🔄 ${message}`);
				},
				onComplete: (summary: string) => {
					new Notice(`✅ ${targetText}周报汇总处理完成！`);
					this.updateStatusBar('✅ 汇总完成');
				}
			});
		} catch (error) {
			console.error('处理周报汇总时出错:', error);
			new Notice(`❌ 处理失败: ${error.message}`);
			this.updateStatusBar('❌ 处理失败');
		}
	}

	async processQuarterSummariesWithOptions(options: any = {}) {
		try {
			const yearText = options.year ? ` ${options.year}年` : '';
			const quarterText = options.quarter ? ` Q${options.quarter}` : '';
			const forceText = options.force ? '（强制执行）' : '';
			const targetText = yearText + quarterText || '全部';

			new Notice(`🔄 开始处理${targetText}季度汇总${forceText}...`);
			this.updateStatusBar('🔄 扫描日记中...');

			const scanResult = await this.organizer.scanDiaries();
			if (!scanResult.success) {
				new Notice(`❌ 扫描失败: ${scanResult.error}`);
				this.updateStatusBar('❌ 扫描失败');
				return;
			}

			const totalYears = Object.keys(scanResult.data || {}).length;
			new Notice(`📊 扫描完成，发现 ${totalYears} 年的日记`);
			this.updateStatusBar(`📊 发现 ${totalYears} 年日记`);

			await this.organizer.processQuarterSummaries({
				...options,
				onProgress: (message: string) => {
					new Notice(`🔄 ${message}`);
					this.updateStatusBar(`🔄 ${message}`);
				},
				onComplete: (summary: string) => {
					new Notice(`✅ ${targetText}季度汇总处理完成！`);
					this.updateStatusBar('✅ 汇总完成');
				}
			});
		} catch (error) {
			console.error('处理季度汇总时出错:', error);
			new Notice(`❌ 处理失败: ${error.message}`);
			this.updateStatusBar('❌ 处理失败');
		}
	}

	async processYearSummariesWithOptions(options: any = {}) {
		try {
			const yearText = options.year ? ` ${options.year}年` : '';
			const forceText = options.force ? '（强制执行）' : '';
			const targetText = yearText || '全部';

			new Notice(`🔄 开始处理${targetText}年度汇总${forceText}...`);
			this.updateStatusBar('🔄 扫描日记中...');

			const scanResult = await this.organizer.scanDiaries();
			if (!scanResult.success) {
				new Notice(`❌ 扫描失败: ${scanResult.error}`);
				this.updateStatusBar('❌ 扫描失败');
				return;
			}

			const totalYears = Object.keys(scanResult.data || {}).length;
			new Notice(`📊 扫描完成，发现 ${totalYears} 年的日记`);
			this.updateStatusBar(`📊 发现 ${totalYears} 年日记`);

			await this.organizer.processYearSummaries({
				...options,
				onProgress: (message: string) => {
					new Notice(`🔄 ${message}`);
					this.updateStatusBar(`🔄 ${message}`);
				},
				onComplete: (summary: string) => {
					new Notice(`✅ ${targetText}年度汇总处理完成！`);
					this.updateStatusBar('✅ 汇总完成');
				}
			});
		} catch (error) {
			console.error('处理年度汇总时出错:', error);
			new Notice(`❌ 处理失败: ${error.message}`);
			this.updateStatusBar('❌ 处理失败');
		}
	}
	async processWeekSummaries() {
		try {
			new Notice('🔄 开始处理周报汇总...');
			this.updateStatusBar('🔄 处理周报汇总中...');
			
			// 扫描日记
			const scanResult = await this.organizer.scanDiaries();
			if (!scanResult.success) {
				new Notice(`❌ 扫描失败: ${scanResult.error}`);
				this.updateStatusBar('❌ 扫描失败');
				return;
			}

			// 处理周报汇总
			await this.organizer.processWeekSummaries({
				onProgress: (message: string) => {
					new Notice(`🔄 ${message}`);
					this.updateStatusBar(`🔄 ${message}`);
				},
				onComplete: (summary: string) => {
					new Notice(`✅ 周报汇总处理完成！`);
					this.updateStatusBar('✅ 周报汇总完成');
				}
			});
			
		} catch (error) {
			console.error('处理周报汇总时出错:', error);
			new Notice(`❌ 处理失败: ${error.message}`);
			this.updateStatusBar('❌ 处理失败');
		}
	}

	async processMonthSummaries() {
		await this.processMonthSummariesWithOptions();
	}

	async processQuarterSummaries() {
		try {
			new Notice('🔄 开始处理季度汇总...');
			this.updateStatusBar('🔄 处理季度汇总中...');
			
			// 扫描日记
			const scanResult = await this.organizer.scanDiaries();
			if (!scanResult.success) {
				new Notice(`❌ 扫描失败: ${scanResult.error}`);
				this.updateStatusBar('❌ 扫描失败');
				return;
			}

			// 处理季度汇总
			await this.organizer.processQuarterSummaries({
				onProgress: (message: string) => {
					new Notice(`🔄 ${message}`);
					this.updateStatusBar(`🔄 ${message}`);
				},
				onComplete: (summary: string) => {
					new Notice(`✅ 季度汇总处理完成！`);
					this.updateStatusBar('✅ 季度汇总完成');
				}
			});
			
		} catch (error) {
			console.error('处理季度汇总时出错:', error);
			new Notice(`❌ 处理失败: ${error.message}`);
			this.updateStatusBar('❌ 处理失败');
		}
	}

	async processYearSummaries() {
		try {
			new Notice('🔄 开始处理年度汇总...');
			this.updateStatusBar('🔄 处理年度汇总中...');
			
			// 扫描日记
			const scanResult = await this.organizer.scanDiaries();
			if (!scanResult.success) {
				new Notice(`❌ 扫描失败: ${scanResult.error}`);
				this.updateStatusBar('❌ 扫描失败');
				return;
			}

			// 处理年度汇总
			await this.organizer.processYearSummaries({
				onProgress: (message: string) => {
					new Notice(`🔄 ${message}`);
					this.updateStatusBar(`🔄 ${message}`);
				},
				onComplete: (summary: string) => {
					new Notice(`✅ 年度汇总处理完成！`);
					this.updateStatusBar('✅ 年度汇总完成');
				}
			});
			
		} catch (error) {
			console.error('处理年度汇总时出错:', error);
			new Notice(`❌ 处理失败: ${error.message}`);
			this.updateStatusBar('❌ 处理失败');
		}
	}

	async processAllSummaries() {
		try {
			new Notice('🔄 开始处理所有汇总...');
			this.updateStatusBar('🔄 处理所有汇总中...');
			
			// 扫描日记
			const scanResult = await this.organizer.scanDiaries();
			if (!scanResult.success) {
				new Notice(`❌ 扫描失败: ${scanResult.error}`);
				this.updateStatusBar('❌ 扫描失败');
				return;
			}

			// 处理所有汇总
			await this.organizer.processAllSummaries({
				summaryType: 'all',
				onProgress: (message: string) => {
					new Notice(`🔄 ${message}`);
					this.updateStatusBar(`🔄 ${message}`);
				},
				onComplete: (summary: string) => {
					new Notice(`✅ 所有汇总处理完成！`);
					this.updateStatusBar('✅ 所有汇总完成');
				}
			});
			
		} catch (error) {
			console.error('处理所有汇总时出错:', error);
			new Notice(`❌ 处理失败: ${error.message}`);
			this.updateStatusBar('❌ 处理失败');
		}
	}

	private updateStatusBar(text: string) {
		if (this.statusBarItem) {
			this.statusBarItem.setText(text);
		}
	}
} 