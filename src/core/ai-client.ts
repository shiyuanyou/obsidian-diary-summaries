import { DiaryOrganizerSettings, AIResponse, OpenAIConnection } from '../types';

interface ServiceConfig {
	type: 'openai' | 'ollama';
	connection?: OpenAIConnection;
	model?: string;
}

export class AIClient {
	private settings: DiaryOrganizerSettings;

	constructor(settings: DiaryOrganizerSettings) {
		this.settings = settings;
	}

	private parseServiceString(serviceString: string): ServiceConfig {
		// 如果包含冒号，说明是新格式："连接名称:模型ID"
		if (serviceString.includes(':')) {
			const [connectionName, modelId] = serviceString.split(':');
			const connection = this.settings.aiServices.openaiConnections?.find(
				conn => conn.name === connectionName
			);
			
			if (connection) {
				return {
					type: 'openai',
					connection: connection,
					model: modelId
				};
			} else {
				// 回退：使用默认连接 + 其第一个模型，避免因为连接被重命名/删除导致配置不可用
				const fallback = this.settings.aiServices.openaiConnections?.find(c => c.isDefault) 
					|| this.settings.aiServices.openaiConnections?.[0];
				if (fallback) {
					return {
						type: 'openai',
						connection: fallback,
						model: fallback.models[0] || this.settings.aiServices.openai.model
					};
				}
				throw new Error(`找不到连接: ${connectionName}`);
			}
		}
		
		// 向后兼容旧格式
		if (serviceString === 'openai') {
			// 使用默认OpenAI连接
			const defaultConnection = this.settings.aiServices.openaiConnections?.find(
				conn => conn.isDefault
			) || this.settings.aiServices.openaiConnections?.[0];
			
			if (defaultConnection) {
				return {
					type: 'openai',
					connection: defaultConnection,
					// 始终使用连接列表中当前的第一个模型，避免继续使用旧模型
					model: defaultConnection.models[0] || this.settings.aiServices.openai.model
				};
			} else {
				// 使用旧版本设置
				return {
					type: 'openai',
					model: this.settings.aiServices.openai.model
				};
			}
		} else if (serviceString === 'ollama') {
			return {
				type: 'ollama',
				model: this.settings.aiServices.ollama.model
			};
		} else {
			throw new Error(`不支持的服务格式: ${serviceString}`);
		}
	}

	async generateWeekSummary(diaryContent: string): Promise<string> {
		const config = this.settings.summaryTypes.week;
		const systemPrompt = config.systemPrompt;
		const userContent = `请分析以下日记内容并生成周报汇总：\n\n${diaryContent}`;

		try {
			const serviceConfig = this.parseServiceString(config.service);
			
			if (serviceConfig.type === 'openai') {
				return await this.callOpenAI(
					userContent, 
					systemPrompt, 
					config.maxTokens, 
					serviceConfig.connection,
					serviceConfig.model
				);
			} else if (serviceConfig.type === 'ollama') {
				return await this.callOllama(userContent, systemPrompt, config.maxTokens);
			} else {
				throw new Error(`不支持的AI服务: ${serviceConfig.type}`);
			}
		} catch (error) {
			console.error('AI调用失败:', error);
			throw new Error(`AI调用失败: ${error.message}`);
		}
	}

	async generateMonthSummary(diaryContent: string): Promise<string> {
		const config = this.settings.summaryTypes.month;
		const systemPrompt = config.systemPrompt;
		const userContent = `请分析以下日记内容并生成月度汇总：\n\n${diaryContent}`;

		try {
			const serviceConfig = this.parseServiceString(config.service);
			
			if (serviceConfig.type === 'openai') {
				return await this.callOpenAI(
					userContent, 
					systemPrompt, 
					config.maxTokens, 
					serviceConfig.connection,
					serviceConfig.model
				);
			} else if (serviceConfig.type === 'ollama') {
				return await this.callOllama(userContent, systemPrompt, config.maxTokens);
			} else {
				throw new Error(`不支持的AI服务: ${serviceConfig.type}`);
			}
		} catch (error) {
			console.error('AI调用失败:', error);
			throw new Error(`AI调用失败: ${error.message}`);
		}
	}

	async generateQuarterSummary(diaryContent: string): Promise<string> {
		const config = this.settings.summaryTypes.quarter;
		const systemPrompt = config.systemPrompt;
		const userContent = `请分析以下日记内容并生成季度汇总：\n\n${diaryContent}`;

		try {
			const serviceConfig = this.parseServiceString(config.service);
			
			if (serviceConfig.type === 'openai') {
				return await this.callOpenAI(
					userContent, 
					systemPrompt, 
					config.maxTokens, 
					serviceConfig.connection,
					serviceConfig.model
				);
			} else if (serviceConfig.type === 'ollama') {
				return await this.callOllama(userContent, systemPrompt, config.maxTokens);
			} else {
				throw new Error(`不支持的AI服务: ${serviceConfig.type}`);
			}
		} catch (error) {
			console.error('AI调用失败:', error);
			throw new Error(`AI调用失败: ${error.message}`);
		}
	}

	async generateYearSummary(diaryContent: string): Promise<string> {
		const config = this.settings.summaryTypes.year;
		const systemPrompt = config.systemPrompt;
		const userContent = `请分析以下日记内容并生成年度汇总：\n\n${diaryContent}`;

		try {
			const serviceConfig = this.parseServiceString(config.service);
			
			if (serviceConfig.type === 'openai') {
				return await this.callOpenAI(
					userContent, 
					systemPrompt, 
					config.maxTokens, 
					serviceConfig.connection,
					serviceConfig.model
				);
			} else if (serviceConfig.type === 'ollama') {
				return await this.callOllama(userContent, systemPrompt, config.maxTokens);
			} else {
				throw new Error(`不支持的AI服务: ${serviceConfig.type}`);
			}
		} catch (error) {
			console.error('AI调用失败:', error);
			throw new Error(`AI调用失败: ${error.message}`);
		}
	}

	private async callOpenAI(
		userContent: string, 
		systemPrompt: string, 
		maxTokens: number,
		connection?: OpenAIConnection,
		model?: string
	): Promise<string> {
		// 使用新连接配置，如果没有则回退到旧配置
		let apiConfig;
		if (connection) {
			apiConfig = {
				apiKey: connection.apiKey,
				baseURL: connection.baseURL,
				model: model || connection.models[0]
			};
		} else {
			// 向后兼容：使用旧版本配置
			apiConfig = this.settings.aiServices.openai;
		}
		
		if (!apiConfig.apiKey) {
			throw new Error('OpenAI API Key 未配置');
		}

		try {
			// 检查是否是通义千问API
			const isQwen = apiConfig.baseURL && apiConfig.baseURL.includes('dashscope');
			
			if (isQwen) {
				// 使用通义千问API格式
				return await this.callQwenAPI(userContent, systemPrompt, maxTokens, apiConfig);
			} else {
				// 使用标准OpenAI API格式
				return await this.callStandardOpenAI(userContent, systemPrompt, maxTokens, apiConfig);
			}
		} catch (error) {
			console.error('OpenAI API调用失败:', error);
			throw new Error(`OpenAI API调用失败: ${error.message}`);
		}
	}

	private async callQwenAPI(
		userContent: string,
		systemPrompt: string,
		maxTokens: number,
		config: any
	): Promise<string> {
		const response = await fetch(`${config.baseURL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${config.apiKey}`,
			},
			body: JSON.stringify({
				model: config.model,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userContent }
				],
				max_tokens: maxTokens,
				temperature: 0.7,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`通义千问API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data = await response.json();
		const content = data.choices[0]?.message?.content;
		
		if (!content) {
			throw new Error('通义千问响应为空');
		}

		return content;
	}

	private async callStandardOpenAI(
		userContent: string,
		systemPrompt: string,
		maxTokens: number,
		config: any
	): Promise<string> {
		// 使用动态导入，避免在构建时包含openai包
		const { Configuration, OpenAIApi } = await import('openai');
		
		const configuration = new Configuration({
			apiKey: config.apiKey,
			basePath: config.baseURL,
		});
		
		const openai = new OpenAIApi(configuration);

		const response = await openai.createChatCompletion({
			model: config.model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userContent }
			],
			max_tokens: maxTokens,
			temperature: 0.7,
		});

		const content = response.data.choices[0]?.message?.content;
		if (!content) {
			throw new Error('AI响应为空');
		}

		return content;
	}

	private async callOllama(
		userContent: string, 
		systemPrompt: string, 
		maxTokens: number
	): Promise<string> {
		const ollamaConfig = this.settings.aiServices.ollama;

		try {
			const response = await fetch(`${ollamaConfig.baseURL}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: ollamaConfig.model,
					prompt: `${systemPrompt}\n\n${userContent}`,
					stream: false,
					options: {
						num_predict: maxTokens,
						temperature: 0.7,
					},
				}),
			});

			if (!response.ok) {
				throw new Error(`Ollama API请求失败: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			const content = data.response;
			
			if (!content) {
				throw new Error('Ollama响应为空');
			}

			return content;
		} catch (error) {
			console.error('Ollama API调用失败:', error);
			throw new Error(`Ollama API调用失败: ${error.message}`);
		}
	}
} 