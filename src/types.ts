// OpenAI连接配置接口
export interface OpenAIConnection {
	id: string;
	name: string;
	apiKey: string;
	baseURL: string;
	models: string[];
	isDefault?: boolean;
}

// 插件设置接口
export interface DiaryOrganizerSettings {
	aiServices: {
		openaiConnections: OpenAIConnection[];
		// 保留原有单个openai配置以兼容旧版本
		openai: {
			apiKey: string;
			baseURL?: string;
			model: string;
		};
		ollama: {
			baseURL: string;
			model: string;
		};
	};
	summaryTypes: {
		week: {
			enabled: boolean;
			service: string; // 格式："连接名称:模型ID" 或 "openai" | "ollama" (向后兼容)
			maxTokens: number;
			systemPrompt: string;
			outputDir: string;
		};
		month: {
			enabled: boolean;
			service: string; // 格式："连接名称:模型ID" 或 "openai" | "ollama" (向后兼容)
			maxTokens: number;
			systemPrompt: string;
			outputDir: string;
		};
		quarter: {
			enabled: boolean;
			service: string; // 格式："连接名称:模型ID" 或 "openai" | "ollama" (向后兼容)
			maxTokens: number;
			systemPrompt: string;
			outputDir: string;
		};
		year: {
			enabled: boolean;
			service: string; // 格式："连接名称:模型ID" 或 "openai" | "ollama" (向后兼容)
			maxTokens: number;
			systemPrompt: string;
			outputDir: string;
		};
	};
	diaryConfig: {
		diaryRoot: string;
		outputDir: string;
	};
}

// 默认设置
export const DEFAULT_SETTINGS: DiaryOrganizerSettings = {
	aiServices: {
		openaiConnections: [
			{
				id: 'default-openai',
				name: 'OpenAI',
				apiKey: '',
				baseURL: 'https://api.openai.com/v1',
				models: ['gpt-4', 'gpt-3.5-turbo'],
				isDefault: true
			}
		],
		openai: {
			apiKey: '',
			baseURL: 'https://api.openai.com/v1',
			model: 'gpt-4',
		},
		ollama: {
			baseURL: 'http://localhost:11434',
			model: 'llama2',
		},
	},
	summaryTypes: {
		week: {
			enabled: true,
			service: 'OpenAI:gpt-4', // 默认使用OpenAI连接的gpt-4模型
			maxTokens: 2000,
			systemPrompt: '你是一个专业的日记整理助手。请整理和分析用户提供的日记内容，生成周报汇总报告。请从以下几个方面进行总结：1. 本周主要成就和进展 2. 本周遇到的主要挑战 3. 本周的重要学习和成长 4. 本周的人际关系和社交 5. 本周的情绪和心态变化 6. 下周的计划和目标。请用中文回答，格式要清晰易读 7. 节选一些金句',
			outputDir: 'diary_summaries/周报',
		},
		month: {
			enabled: true,
			service: 'OpenAI:gpt-4', // 默认使用OpenAI连接的gpt-4模型
			maxTokens: 4000,
			systemPrompt: '你是一个专业的日记整理助手。请整理和分析用户提供的日记内容，生成月度汇总报告。请从以下几个方面进行总结：1. 本月主要成就和进展 2. 本月遇到的主要挑战 3. 本月的重要学习和成长 4. 本月的人际关系和社交 5. 本月的情绪和心态变化 6. 下月的计划和目标。请用中文回答，格式要清晰易读 7. 节选一些金句',
			outputDir: 'diary_summaries',
		},
		quarter: {
			enabled: false, // 默认关闭季报
			service: 'OpenAI:gpt-4', // 默认使用OpenAI连接的gpt-4模型
			maxTokens: 6000,
			systemPrompt: '你是一个专业的日记整理助手。请整理和分析用户提供的日记内容，生成季度汇总报告。请从以下几个方面进行总结：1. 本季度主要成就和进展 2. 本季度遇到的主要挑战 3. 本季度的重要学习和成长 4. 本季度的人际关系和社交 5. 本季度的情绪和心态变化 6. 下季度的计划和目标。请用中文回答，格式要清晰易读 7. 节选一些金句',
			outputDir: 'diary_summaries/季报',
		},
		year: {
			enabled: false, // 默认关闭年报
			service: 'OpenAI:gpt-4', // 默认使用OpenAI连接的gpt-4模型
			maxTokens: 8000,
			systemPrompt: '你是一个专业的日记整理助手。请整理和分析用户提供的日记内容，生成年度汇总报告。请从以下几个方面进行总结：1. 本年主要成就和进展 2. 本年遇到的主要挑战 3. 本年重要学习和成长 4. 本年的人际关系和社交 5. 本年的情绪和心态变化 6. 明年的计划和目标。请用中文回答，格式要清晰易读 7. 节选一些金句',
			outputDir: 'diary_summaries/年报',
		},
	},
	diaryConfig: {
		diaryRoot: '记录/日记',
		outputDir: 'diary_summaries',
	},
};

// 日记数据接口
export interface DiaryData {
	[year: string]: {
		months: {
			[month: string]: DiaryEntry[];
		};
	};
}

// 日记条目接口
export interface DiaryEntry {
	file: string;
	date: Date;
	content: string;
	month: string;
}

// AI服务配置接口
export interface OpenAIConfig {
	apiKey: string;
	baseURL?: string;
	model: string;
	maxTokens: number;
}

export interface OllamaConfig {
	baseURL: string;
	model: string;
	maxTokens: number;
}

// 处理选项接口
export interface ProcessOptions {
	year?: string;
	month?: string;
	week?: string;
	quarter?: string;
	force?: boolean;
	summaryType?: 'week' | 'month' | 'quarter' | 'year' | 'all';
	onProgress?: (message: string) => void;
	onComplete?: (summary: string) => void;
}

// AI响应接口
export interface AIResponse {
	content: string;
	error?: string;
}

// 扫描结果接口
export interface ScanResult {
	success: boolean;
	data?: DiaryData;
	error?: string;
} 