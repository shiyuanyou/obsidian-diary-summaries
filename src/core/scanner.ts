import { App, TFile, TFolder } from 'obsidian';
import { DiaryData, DiaryEntry } from '../types';

export class DiaryScanner {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	async scanDiaries(diaryRoot: string): Promise<DiaryData> {
		const data: DiaryData = {};

		try {
			// 获取日记根目录
			const rootFolder = this.app.vault.getAbstractFileByPath(diaryRoot);
			if (!rootFolder || !(rootFolder instanceof TFolder)) {
				throw new Error(`日记根目录不存在: ${diaryRoot}`);
			}

			// 扫描年份目录
			for (const yearFolder of rootFolder.children) {
				if (!(yearFolder instanceof TFolder)) {
					continue;
				}

				const yearMatch = yearFolder.name.match(/(\d{4})年/);
				if (!yearMatch) {
					continue;
				}

				const year = yearMatch[1];
				data[year] = {
					months: {}
				};

				// 扫描周目录
				await this.scanYearFolder(yearFolder, data[year]);
			}

			console.log(`扫描完成，发现 ${Object.keys(data).length} 年的日记`);
			return data;
		} catch (error) {
			console.error('扫描日记失败:', error);
			throw error;
		}
	}

	private async scanYearFolder(yearFolder: TFolder, yearData: { months: { [key: string]: DiaryEntry[] } }): Promise<void> {
		for (const weekFolder of yearFolder.children) {
			if (!(weekFolder instanceof TFolder)) {
				continue;
			}

			// 扫描周目录中的日记文件
			await this.scanWeekFolder(weekFolder, yearData);
		}
	}

	private async scanWeekFolder(weekFolder: TFolder, yearData: { months: { [key: string]: DiaryEntry[] } }): Promise<void> {
		for (const file of weekFolder.children) {
			if (!(file instanceof TFile) || !file.name.endsWith('.md')) {
				continue;
			}

			try {
				const diaryEntry = await this.parseDiaryFile(file);
				if (diaryEntry) {
					const month = diaryEntry.month;
					if (!yearData.months[month]) {
						yearData.months[month] = [];
					}
					yearData.months[month].push(diaryEntry);
				}
			} catch (error) {
				console.error(`解析日记文件失败 ${file.path}:`, error);
			}
		}
	}

	private async parseDiaryFile(file: TFile): Promise<DiaryEntry | null> {
		try {
			// 从文件名解析日期
			const date = this.extractDateFromFilename(file.name);
			if (!date) {
				return null;
			}

			// 读取文件内容
			const content = await this.app.vault.read(file);
			if (!content.trim()) {
				return null;
			}

			// 获取月份
			const month = this.getMonthFromDate(date);

			return {
				file: file.path,
				date: date,
				content: content.trim(),
				month: month
			};
		} catch (error) {
			console.error(`解析日记文件失败 ${file.path}:`, error);
			return null;
		}
	}

	private extractDateFromFilename(filename: string): Date | null {
		// 匹配格式如: 25-01-20周一.md, 24-01-25周四.md
		const match = filename.match(/(\d{2})-(\d{2})-(\d{2})/);
		if (!match) {
			return null;
		}

		const [, yearStr, monthStr, dayStr] = match;
		const year = parseInt(`20${yearStr}`);
		const month = parseInt(monthStr);
		const day = parseInt(dayStr);

		try {
			return new Date(year, month - 1, day);
		} catch (error) {
			console.error(`日期解析失败: ${filename}`, error);
			return null;
		}
	}

	private getMonthFromDate(date: Date): string {
		const month = date.getMonth() + 1;
		return `${month.toString().padStart(2, '0')}月`;
	}
} 