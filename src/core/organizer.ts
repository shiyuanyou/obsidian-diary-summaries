import { App, TFile, Notice } from 'obsidian';
import { DiaryOrganizerSettings, DiaryData, DiaryEntry, ScanResult, ProcessOptions } from '../types';
import { AIClient } from './ai-client';
import { DiaryScanner } from './scanner';

export class DiaryOrganizer {
	private app: App;
	private settings: DiaryOrganizerSettings;
	private aiClient: AIClient;
	private scanner: DiaryScanner;

	constructor(app: App, settings: DiaryOrganizerSettings) {
		this.app = app;
		this.settings = settings;
		this.aiClient = new AIClient(settings);
		this.scanner = new DiaryScanner(app);
	}

	async scanDiaries(): Promise<ScanResult> {
		try {
			const diaryRoot = this.settings.diaryConfig.diaryRoot;
			const data = await this.scanner.scanDiaries(diaryRoot);
			return {
				success: true,
				data: data
			};
		} catch (error) {
			console.error('扫描日记失败:', error);
			return {
				success: false,
				error: error.message
			};
		}
	}

	async processWeekSummaries(options: ProcessOptions = {}): Promise<void> {
		try {
			// 检查周报汇总是否开启
			if (!this.settings.summaryTypes.week.enabled) {
				const message = '周报汇总已禁用，跳过处理';
				options.onProgress?.(message);
				options.onComplete?.(message);
				return;
			}

			// 扫描日记
			const scanResult = await this.scanDiaries();
			if (!scanResult.success || !scanResult.data) {
				throw new Error(scanResult.error || '扫描失败');
			}

			const data = scanResult.data;
			const outputDir = this.settings.summaryTypes.week.outputDir;

			// 确保输出目录存在
			await this.ensureOutputDirectory(outputDir);

			let processedCount = 0;
			let totalCount = 0;

			// 计算总数量
			for (const [year, yearData] of Object.entries(data)) {
				if (options.year && year !== options.year) {
					continue;
				}
				for (const [month, diaries] of Object.entries(yearData.months)) {
					if (options.month && month !== options.month) {
						continue;
					}
					if (diaries.length > 0) {
						totalCount++;
					}
				}
			}

			// 处理每个年份的周报汇总
			for (const [year, yearData] of Object.entries(data)) {
				if (options.year && year !== options.year) {
					continue;
				}

				for (const [month, diaries] of Object.entries(yearData.months)) {
					if (options.month && month !== options.month) {
						continue;
					}

					if (diaries.length === 0) {
						continue;
					}

					// 按周分组日记
					const weeklyGroups = this.groupDiariesByWeek(diaries);
					
					for (const [weekKey, weekDiaries] of Object.entries(weeklyGroups)) {
						// 检查是否已存在汇总文件
						const summaryPath = `${outputDir}/${year}年/${month}_W${weekKey}_汇总.md`;
						const existingFile = this.app.vault.getAbstractFileByPath(summaryPath);
						
						if (existingFile && !options.force) {
							const message = `跳过 ${year}年${month}第${weekKey}周 汇总，文件已存在`;
							console.log(message);
							options.onProgress?.(message);
							processedCount++;
							continue;
						}

						// 如果强制执行且文件存在，先删除旧文件
						if (existingFile && options.force) {
							try {
								await this.app.vault.delete(existingFile);
								console.log(`已删除旧文件: ${summaryPath}`);
							} catch (error) {
								console.error(`删除旧文件失败: ${summaryPath}`, error);
							}
						}

						// 显示进度
						const progressMessage = `处理 ${year}年${month}第${weekKey}周 汇总 (${processedCount + 1}/${totalCount})`;
						options.onProgress?.(progressMessage);

						// 生成周报汇总
						await this.generateWeekSummary(year, month, weekKey, weekDiaries, outputDir);
						processedCount++;

						// 显示完成进度
						const completeMessage = `✅ ${year}年${month}第${weekKey}周 汇总完成 (${processedCount}/${totalCount})`;
						options.onProgress?.(completeMessage);
					}
				}
			}

			// 完成回调
			const summary = `成功处理 ${processedCount} 个周报汇总`;
			options.onComplete?.(summary);

		} catch (error) {
			console.error('处理周报汇总失败:', error);
			throw error;
		}
	}

	async processMonthSummaries(options: ProcessOptions = {}): Promise<void> {
		try {
			// 检查月报汇总是否开启
			if (!this.settings.summaryTypes.month.enabled) {
				const message = '月报汇总已禁用，跳过处理';
				options.onProgress?.(message);
				options.onComplete?.(message);
				return;
			}

			// 扫描日记
			const scanResult = await this.scanDiaries();
			if (!scanResult.success || !scanResult.data) {
				throw new Error(scanResult.error || '扫描失败');
			}

			const data = scanResult.data;
			const outputDir = this.settings.summaryTypes.month.outputDir;

			// 确保输出目录存在
			await this.ensureOutputDirectory(outputDir);

			let processedCount = 0;
			let totalCount = 0;

			// 计算总数量
			for (const [year, yearData] of Object.entries(data)) {
				if (options.year && year !== options.year) {
					continue;
				}
				for (const [month, diaries] of Object.entries(yearData.months)) {
					if (options.month && month !== options.month) {
						continue;
					}
					if (diaries.length > 0) {
						totalCount++;
					}
				}
			}

			// 处理每个年份的月度汇总
			for (const [year, yearData] of Object.entries(data)) {
				if (options.year && year !== options.year) {
					continue;
				}

				for (const [month, diaries] of Object.entries(yearData.months)) {
					if (options.month && month !== options.month) {
						continue;
					}

					if (diaries.length === 0) {
						continue;
					}

					// 检查是否已存在汇总文件
					const summaryPath = `${outputDir}/${year}年/${month}_汇总.md`;
					const existingFile = this.app.vault.getAbstractFileByPath(summaryPath);
					
					if (existingFile && !options.force) {
						const message = `跳过 ${year}年${month} 汇总，文件已存在`;
						console.log(message);
						options.onProgress?.(message);
						processedCount++;
						continue;
					}

					// 如果强制执行且文件存在，先删除旧文件
					if (existingFile && options.force) {
						try {
							await this.app.vault.delete(existingFile);
							console.log(`已删除旧文件: ${summaryPath}`);
						} catch (error) {
							console.error(`删除旧文件失败: ${summaryPath}`, error);
						}
					}

					// 显示进度
					const progressMessage = `处理 ${year}年${month} 汇总 (${processedCount + 1}/${totalCount})`;
					options.onProgress?.(progressMessage);

					// 生成月度汇总
					await this.generateMonthSummary(year, month, diaries, outputDir);
					processedCount++;

					// 显示完成进度
					const completeMessage = `✅ ${year}年${month} 汇总完成 (${processedCount}/${totalCount})`;
					options.onProgress?.(completeMessage);
				}
			}

			// 完成回调
			const summary = `成功处理 ${processedCount} 个月度汇总`;
			options.onComplete?.(summary);

		} catch (error) {
			console.error('处理月度汇总失败:', error);
			throw error;
		}
	}

	async processQuarterSummaries(options: ProcessOptions = {}): Promise<void> {
		try {
			// 检查季报汇总是否开启
			if (!this.settings.summaryTypes.quarter.enabled) {
				const message = '季报汇总已禁用，跳过处理';
				options.onProgress?.(message);
				options.onComplete?.(message);
				return;
			}

			// 扫描日记
			const scanResult = await this.scanDiaries();
			if (!scanResult.success || !scanResult.data) {
				throw new Error(scanResult.error || '扫描失败');
			}

			const data = scanResult.data;
			const outputDir = this.settings.summaryTypes.quarter.outputDir;

			// 确保输出目录存在
			await this.ensureOutputDirectory(outputDir);

			let processedCount = 0;
			let totalCount = 0;

			// 计算总数量
			for (const [year, yearData] of Object.entries(data)) {
				if (options.year && year !== options.year) {
					continue;
				}
				// 每个年份有4个季度
				totalCount += 4;
			}

			// 处理每个年份的季度汇总
			for (const [year, yearData] of Object.entries(data)) {
				if (options.year && year !== options.year) {
					continue;
				}

				// 按季度分组日记
				const quarterlyGroups = this.groupDiariesByQuarter(yearData.months);
				
				for (const [quarter, quarterDiaries] of Object.entries(quarterlyGroups)) {
					if (options.quarter && quarter !== options.quarter) {
						continue;
					}

					if (quarterDiaries.length === 0) {
						continue;
					}

					// 检查是否已存在汇总文件
					const summaryPath = `${outputDir}/${year}年/Q${quarter}_汇总.md`;
					const existingFile = this.app.vault.getAbstractFileByPath(summaryPath);
					
					if (existingFile && !options.force) {
						const message = `跳过 ${year}年Q${quarter} 汇总，文件已存在`;
						console.log(message);
						options.onProgress?.(message);
						processedCount++;
						continue;
					}

					// 如果强制执行且文件存在，先删除旧文件
					if (existingFile && options.force) {
						try {
							await this.app.vault.delete(existingFile);
							console.log(`已删除旧文件: ${summaryPath}`);
						} catch (error) {
							console.error(`删除旧文件失败: ${summaryPath}`, error);
						}
					}

					// 显示进度
					const progressMessage = `处理 ${year}年Q${quarter} 汇总 (${processedCount + 1}/${totalCount})`;
					options.onProgress?.(progressMessage);

					// 生成季度汇总
					await this.generateQuarterSummary(year, quarter, quarterDiaries, outputDir);
					processedCount++;

					// 显示完成进度
					const completeMessage = `✅ ${year}年Q${quarter} 汇总完成 (${processedCount}/${totalCount})`;
					options.onProgress?.(completeMessage);
				}
			}

			// 完成回调
			const summary = `成功处理 ${processedCount} 个季度汇总`;
			options.onComplete?.(summary);

		} catch (error) {
			console.error('处理季度汇总失败:', error);
			throw error;
		}
	}

	async processYearSummaries(options: ProcessOptions = {}): Promise<void> {
		try {
			// 检查年报汇总是否开启
			if (!this.settings.summaryTypes.year.enabled) {
				const message = '年报汇总已禁用，跳过处理';
				options.onProgress?.(message);
				options.onComplete?.(message);
				return;
			}

			// 扫描日记
			const scanResult = await this.scanDiaries();
			if (!scanResult.success || !scanResult.data) {
				throw new Error(scanResult.error || '扫描失败');
			}

			const data = scanResult.data;
			const outputDir = this.settings.summaryTypes.year.outputDir;

			// 确保输出目录存在
			await this.ensureOutputDirectory(outputDir);

			let processedCount = 0;
			let totalCount = Object.keys(data).length;

			// 处理每个年份的年度汇总
			for (const [year, yearData] of Object.entries(data)) {
				if (options.year && year !== options.year) {
					continue;
				}

				// 收集该年份的所有日记
				const allYearDiaries: DiaryEntry[] = [];
				for (const [month, diaries] of Object.entries(yearData.months)) {
					allYearDiaries.push(...diaries);
				}

				if (allYearDiaries.length === 0) {
					continue;
				}

				// 检查是否已存在汇总文件
				const summaryPath = `${outputDir}/${year}年/${year}年_汇总.md`;
				const existingFile = this.app.vault.getAbstractFileByPath(summaryPath);
				
				if (existingFile && !options.force) {
					const message = `跳过 ${year}年 汇总，文件已存在`;
					console.log(message);
					options.onProgress?.(message);
					processedCount++;
					continue;
				}

				// 如果强制执行且文件存在，先删除旧文件
				if (existingFile && options.force) {
					try {
						await this.app.vault.delete(existingFile);
						console.log(`已删除旧文件: ${summaryPath}`);
					} catch (error) {
						console.error(`删除旧文件失败: ${summaryPath}`, error);
					}
				}

				// 显示进度
				const progressMessage = `处理 ${year}年 汇总 (${processedCount + 1}/${totalCount})`;
				options.onProgress?.(progressMessage);

				// 生成年度汇总
				await this.generateYearSummary(year, allYearDiaries, outputDir);
				processedCount++;

				// 显示完成进度
				const completeMessage = `✅ ${year}年 汇总完成 (${processedCount}/${totalCount})`;
				options.onProgress?.(completeMessage);
			}

			// 完成回调
			const summary = `成功处理 ${processedCount} 个年度汇总`;
			options.onComplete?.(summary);

		} catch (error) {
			console.error('处理年度汇总失败:', error);
			throw error;
		}
	}

	async processAllSummaries(options: ProcessOptions = {}): Promise<void> {
		// 根据summaryType参数决定处理哪种类型的汇总
		const summaryType = options.summaryType || 'month';
		
		switch (summaryType) {
			case 'week':
				await this.processWeekSummaries(options);
				break;
			case 'month':
				await this.processMonthSummaries(options);
				break;
			case 'quarter':
				await this.processQuarterSummaries(options);
				break;
			case 'year':
				await this.processYearSummaries(options);
				break;
			case 'all':
				// 处理所有类型的汇总
				await this.processWeekSummaries(options);
				await this.processMonthSummaries(options);
				await this.processQuarterSummaries(options);
				await this.processYearSummaries(options);
				break;
			default:
				throw new Error(`不支持的汇总类型: ${summaryType}`);
		}
	}

	private async generateMonthSummary(
		year: string, 
		month: string, 
		diaries: DiaryEntry[], 
		outputDir: string
	): Promise<void> {
		try {
			// 准备日记内容
			const diaryContents = diaries
				.sort((a, b) => a.date.getTime() - b.date.getTime())
				.map(diary => `## ${diary.date.toLocaleDateString()}\n\n${diary.content}`)
				.join('\n\n');

			// 调用AI生成汇总
			const summary = await this.aiClient.generateMonthSummary(diaryContents);

			// 创建汇总文件
			const summaryContent = `# ${year}年${month}月度汇总\n\n${summary}`;
			const summaryPath = `${outputDir}/${year}年/${month}_汇总.md`;

			// 确保年份目录存在
			await this.ensureOutputDirectory(`${outputDir}/${year}年`);

			// 写入文件
			await this.app.vault.create(summaryPath, summaryContent);

			console.log(`已生成 ${year}年${month} 月度汇总`);
		} catch (error) {
			console.error(`生成 ${year}年${month} 月度汇总失败:`, error);
			throw error;
		}
	}

	private async generateWeekSummary(
		year: string,
		month: string,
		weekKey: string,
		weekDiaries: DiaryEntry[],
		outputDir: string
	): Promise<void> {
		try {
			// 准备日记内容
			const diaryContents = weekDiaries
				.sort((a, b) => a.date.getTime() - b.date.getTime())
				.map(diary => `## ${diary.date.toLocaleDateString()}\n\n${diary.content}`)
				.join('\n\n');

			// 调用AI生成周报汇总
			const summary = await this.aiClient.generateWeekSummary(diaryContents);

			// 创建汇总文件
			const summaryContent = `# ${year}年${month}第${weekKey}周周报\n\n${summary}`;
			const summaryPath = `${outputDir}/${year}年/${month}_W${weekKey}_汇总.md`;

			// 确保年份目录存在
			await this.ensureOutputDirectory(`${outputDir}/${year}年`);

			// 写入文件
			await this.app.vault.create(summaryPath, summaryContent);

			console.log(`已生成 ${year}年${month}第${weekKey}周周报`);
		} catch (error) {
			console.error(`生成 ${year}年${month}第${weekKey}周周报失败:`, error);
			throw error;
		}
	}

	private async generateQuarterSummary(
		year: string,
		quarter: string,
		quarterDiaries: DiaryEntry[],
		outputDir: string
	): Promise<void> {
		try {
			// 准备日记内容
			const diaryContents = quarterDiaries
				.sort((a, b) => a.date.getTime() - b.date.getTime())
				.map(diary => `## ${diary.date.toLocaleDateString()}\n\n${diary.content}`)
				.join('\n\n');

			// 调用AI生成季度汇总
			const summary = await this.aiClient.generateQuarterSummary(diaryContents);

			// 创建汇总文件
			const summaryContent = `# ${year}年Q${quarter}季度汇总\n\n${summary}`;
			const summaryPath = `${outputDir}/${year}年/Q${quarter}_汇总.md`;

			// 确保年份目录存在
			await this.ensureOutputDirectory(`${outputDir}/${year}年`);

			// 写入文件
			await this.app.vault.create(summaryPath, summaryContent);

			console.log(`已生成 ${year}年Q${quarter}季度汇总`);
		} catch (error) {
			console.error(`生成 ${year}年Q${quarter}季度汇总失败:`, error);
			throw error;
		}
	}

	private async generateYearSummary(
		year: string,
		allYearDiaries: DiaryEntry[],
		outputDir: string
	): Promise<void> {
		try {
			// 准备日记内容
			const diaryContents = allYearDiaries
				.sort((a, b) => a.date.getTime() - b.date.getTime())
				.map(diary => `## ${diary.date.toLocaleDateString()}\n\n${diary.content}`)
				.join('\n\n');

			// 调用AI生成年度汇总
			const summary = await this.aiClient.generateYearSummary(diaryContents);

			// 创建汇总文件
			const summaryContent = `# ${year}年年度汇总\n\n${summary}`;
			const summaryPath = `${outputDir}/${year}年/${year}年_汇总.md`;

			// 确保年份目录存在
			await this.ensureOutputDirectory(`${outputDir}/${year}年`);

			// 写入文件
			await this.app.vault.create(summaryPath, summaryContent);

			console.log(`已生成 ${year}年年度汇总`);
		} catch (error) {
			console.error(`生成 ${year}年年度汇总失败:`, error);
			throw error;
		}
	}

	private async ensureOutputDirectory(path: string): Promise<void> {
		try {
			const folder = this.app.vault.getAbstractFileByPath(path);
			if (!folder) {
				await this.app.vault.createFolder(path);
			}
		} catch (error) {
			console.error(`创建目录失败 ${path}:`, error);
		}
	}

	private groupDiariesByWeek(diaries: DiaryEntry[]): { [key: string]: DiaryEntry[] } {
		const weeklyGroups: { [key: string]: DiaryEntry[] } = {};
		diaries.forEach(diary => {
			const weekKey = this.getWeekKey(diary.date);
			if (!weeklyGroups[weekKey]) {
				weeklyGroups[weekKey] = [];
			}
			weeklyGroups[weekKey].push(diary);
		});
		return weeklyGroups;
	}

	private groupDiariesByQuarter(months: { [key: string]: DiaryEntry[] }): { [key: string]: DiaryEntry[] } {
		const quarterlyGroups: { [key: string]: DiaryEntry[] } = {};
		for (const [month, diaries] of Object.entries(months)) {
			const quarterKey = this.getQuarterKey(month);
			if (!quarterlyGroups[quarterKey]) {
				quarterlyGroups[quarterKey] = [];
			}
			quarterlyGroups[quarterKey].push(...diaries);
		}
		return quarterlyGroups;
	}

	private getWeekKey(date: Date): string {
		const startOfWeek = new Date(date);
		startOfWeek.setDate(date.getDate() - date.getDay()); // 本周一
		return `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;
	}

	private getQuarterKey(month: string): string {
		const monthNum = parseInt(month, 10);
		if (monthNum >= 1 && monthNum <= 3) return '1';
		if (monthNum >= 4 && monthNum <= 6) return '2';
		if (monthNum >= 7 && monthNum <= 9) return '3';
		return '4';
	}
} 