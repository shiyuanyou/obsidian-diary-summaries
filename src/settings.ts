import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import DiarySummariesPlugin from './main';
import { DiaryOrganizerSettings, OpenAIConnection } from './types';
import { OpenAIConnectionModal } from './components/OpenAIConnectionModal';
import { SystemPromptModal } from './components/SystemPromptModal';

export class DiaryOrganizerSettingTab extends PluginSettingTab {
	plugin: DiarySummariesPlugin;
	private openaiContainer: HTMLElement | null = null;

	constructor(app: App, plugin: DiarySummariesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: '日记汇总设置' });

		// OpenAI 设置
		this.addOpenAISettings(containerEl);

		// Ollama 设置
		this.addOllamaSettings(containerEl);

		// 汇总类型设置
		this.addSummaryTypeSettings(containerEl);

		// 日记配置设置
		this.addDiaryConfigSettings(containerEl);
	}

	addOpenAISettings(containerEl: HTMLElement) {
		// 创建OpenAI设置的专用容器
		this.openaiContainer = containerEl.createDiv({ cls: 'openai-settings-container' });
		
		const headerContainer = this.openaiContainer.createDiv({ cls: 'setting-item-heading' });
		headerContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
		
		headerContainer.createEl('h3', { text: 'OpenAI 连接管理' });
		
		// 添加新连接按钮
		const addButton = headerContainer.createEl('button', { 
			text: '+ 添加连接',
			cls: 'mod-cta'
		});
		addButton.style.cssText = 'padding: 4px 12px; font-size: 12px;';
		addButton.onclick = () => this.openConnectionModal(null);

		// 显示现有连接列表
		this.renderConnectionsList(this.openaiContainer);
	}

	private renderConnectionsList(containerEl: HTMLElement) {
		// 清除旧的连接列表
		const existingList = containerEl.querySelector('.openai-connections-list');
		if (existingList) {
			existingList.remove();
		}

		const connectionsContainer = containerEl.createDiv({ cls: 'openai-connections-list' });
		connectionsContainer.style.cssText = 'margin-bottom: 20px;';

		const connections = this.plugin.settings.aiServices.openaiConnections || [];

		if (connections.length === 0) {
			const emptyDiv = connectionsContainer.createDiv({ cls: 'setting-item-description' });
			emptyDiv.textContent = '暂无OpenAI连接，点击上方"+ 添加连接"按钮来添加第一个连接。';
			emptyDiv.style.cssText = 'text-align: center; padding: 20px; color: var(--text-muted);';
			return;
		}

		connections.forEach((connection, index) => {
			const connectionItem = connectionsContainer.createDiv({ cls: 'setting-item' });
			connectionItem.style.cssText = 'border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 12px; margin-bottom: 8px;';

			const connectionHeader = connectionItem.createDiv();
			connectionHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

			// 连接名称和状态
			const nameContainer = connectionHeader.createDiv();
			nameContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
			
			const nameEl = nameContainer.createEl('span', { 
				text: connection.name || '未命名连接',
				cls: 'setting-item-name'
			});
			nameEl.style.cssText = 'font-weight: 500;';

			if (connection.isDefault) {
				const defaultBadge = nameContainer.createEl('span', { 
					text: '默认',
					cls: 'mod-cta'
				});
				defaultBadge.style.cssText = 'font-size: 10px; padding: 2px 6px; border-radius: 4px;';
			}

			// 按钮组
			const buttonGroup = connectionHeader.createDiv();
			buttonGroup.style.cssText = 'display: flex; gap: 6px;';

			// 编辑按钮
			const editButton = buttonGroup.createEl('button', { 
				text: '编辑',
				cls: 'clickable-icon'
			});
			editButton.style.cssText = 'padding: 4px 8px; font-size: 12px;';
			editButton.onclick = () => this.openConnectionModal(connection);

			// 删除按钮
			const deleteButton = buttonGroup.createEl('button', { 
				text: '删除',
				cls: 'mod-warning'
			});
			deleteButton.style.cssText = 'padding: 4px 8px; font-size: 12px;';
			deleteButton.onclick = () => this.deleteConnection(connection.id);

			// 连接详情
			const detailsContainer = connectionItem.createDiv();
			detailsContainer.style.cssText = 'font-size: 12px; color: var(--text-muted);';

			const urlEl = detailsContainer.createDiv();
			urlEl.textContent = `URL: ${connection.baseURL}`;

			const modelsEl = detailsContainer.createDiv();
			const displayModels = connection.models.length > 3 
				? connection.models.slice(0, 3).join(', ') + '...'
				: connection.models.join(', ');
			modelsEl.textContent = `模型: ${displayModels}`;

			const keyStatus = detailsContainer.createDiv();
			keyStatus.textContent = `API Key: ${connection.apiKey ? '已配置' : '未配置'}`;
		});
	}

	private openConnectionModal(connection: OpenAIConnection | null) {
		const modal = new OpenAIConnectionModal(
			this.app,
			connection,
			(savedConnection) => {
				this.saveConnection(savedConnection);
			},
			connection ? () => this.deleteConnection(connection.id) : undefined
		);
		modal.open();
	}

	private async saveConnection(connection: OpenAIConnection) {
		const connections = this.plugin.settings.aiServices.openaiConnections || [];
		
		// 如果设置为默认连接，清除其他连接的默认状态
		if (connection.isDefault) {
			connections.forEach(conn => {
				if (conn.id !== connection.id) {
					conn.isDefault = false;
				}
			});
		}

		// 查找现有连接或添加新连接
		const existingIndex = connections.findIndex(conn => conn.id === connection.id);
		if (existingIndex >= 0) {
			connections[existingIndex] = connection;
		} else {
			connections.push(connection);
		}

    this.plugin.settings.aiServices.openaiConnections = connections;
    // 连接变化后，规范化四种汇总的服务选择，避免指向失效选项
    this.normalizeServiceSelections();
    await this.plugin.saveSettings();
		
		new Notice(`连接 "${connection.name}" 已保存`);
		if (this.openaiContainer) {
			this.renderConnectionsList(this.openaiContainer);
		}
		// 刷新整个设置页面以更新服务下拉框选项
		this.display();
	}

	private async deleteConnection(connectionId: string) {
		const connections = this.plugin.settings.aiServices.openaiConnections || [];
		const connectionToDelete = connections.find(conn => conn.id === connectionId);
		
		if (!connectionToDelete) {
			new Notice('连接不存在');
			return;
		}

		// 确认删除
		const shouldDelete = confirm(`确定要删除连接 "${connectionToDelete.name}" 吗？`);
		if (!shouldDelete) {
			return;
		}

		// 从列表中移除
		this.plugin.settings.aiServices.openaiConnections = connections.filter(
			conn => conn.id !== connectionId
		);

		// 如果删除的是默认连接，将第一个连接设为默认
		if (connectionToDelete.isDefault && this.plugin.settings.aiServices.openaiConnections.length > 0) {
			this.plugin.settings.aiServices.openaiConnections[0].isDefault = true;
		}

    // 连接删除后，规范化四种汇总的服务选择
    this.normalizeServiceSelections();
    await this.plugin.saveSettings();
		
		new Notice(`连接 "${connectionToDelete.name}" 已删除`);
		if (this.openaiContainer) {
			this.renderConnectionsList(this.openaiContainer);
		}
		// 刷新整个设置页面以更新服务下拉框选项
		this.display();
	}

	// 确保四种汇总类型的 service 值均指向当前可选项；若无效则回退到第一个可用选项
	private normalizeServiceSelections() {
		const options = this.getAvailableServiceOptions().map(opt => opt.value);
		const types: Array<'week' | 'month' | 'quarter' | 'year'> = ['week', 'month', 'quarter', 'year'];
		types.forEach(type => {
			const current = this.plugin.settings.summaryTypes[type].service;
			if (!options.includes(current) && options.length > 0) {
				this.plugin.settings.summaryTypes[type].service = options[0];
			}
		});
	}

	private getAvailableServiceOptions(): Array<{value: string, display: string}> {
		const options: Array<{value: string, display: string}> = [];
		
		// 添加OpenAI连接选项
		const openaiConnections = this.plugin.settings.aiServices.openaiConnections || [];
		openaiConnections.forEach(connection => {
			connection.models.forEach(model => {
				options.push({
					value: `${connection.name}:${model}`,
					display: `${connection.name}:${model}`
				});
			});
		});

		// 添加Ollama选项（向后兼容）
		if (this.plugin.settings.aiServices.ollama.model) {
			options.push({
				value: 'ollama',
				display: `Ollama:${this.plugin.settings.aiServices.ollama.model}`
			});
		}

		// 如果没有可用选项，添加默认选项
		if (options.length === 0) {
			options.push({
				value: 'OpenAI:gpt-4',
				display: 'OpenAI:gpt-4 (请先配置连接)'
			});
		}

		return options;
	}

	private createServiceDropdown(
		containerEl: HTMLElement, 
		name: string, 
		desc: string, 
		currentValue: string, 
		onChange: (value: string) => void
	) {
		const serviceOptions = this.getAvailableServiceOptions();
		
		return new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addDropdown(dropdown => {
				// 添加所有可用选项
				serviceOptions.forEach(option => {
					dropdown.addOption(option.value, option.display);
				});

				// 设置当前值，如果不存在则使用第一个选项
				const valueExists = serviceOptions.some(option => option.value === currentValue);
				const valueToSet = valueExists ? currentValue : serviceOptions[0]?.value || '';
				
				dropdown.setValue(valueToSet);
				// 如果当前存储值无效，立刻写回并保存，避免显示与实际使用不一致
				if (!valueExists && valueToSet) {
					// 立即持久化回设置（调用外部传入的 onChange）
					onChange(valueToSet);
				}
				dropdown.onChange(onChange);
			});
	}

	addOllamaSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'Ollama 设置' });

		new Setting(containerEl)
			.setName('Base URL')
			.setDesc('Ollama 服务的基础 URL')
			.addText(text => text
				.setPlaceholder('http://localhost:11434')
				.setValue(this.plugin.settings.aiServices.ollama.baseURL)
				.onChange(async (value) => {
					this.plugin.settings.aiServices.ollama.baseURL = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('模型')
			.setDesc('选择要使用的 Ollama 模型')
			.addText(text => text
				.setPlaceholder('llama2')
				.setValue(this.plugin.settings.aiServices.ollama.model)
				.onChange(async (value) => {
					this.plugin.settings.aiServices.ollama.model = value;
					await this.plugin.saveSettings();
				}));
	}

	addSummaryTypeSettings(containerEl: HTMLElement) {
		// 为每种汇总类型创建设置
		this.createSummaryTypeSection(containerEl, 'week', '周报汇总类型设置', {
			tokenLimits: [1000, 4000, 500],
			outputDirPlaceholder: 'diary_summaries/周报',
			outputDirDesc: '周报汇总文件的保存目录（常用路径：diary_summaries/周报、汇总/周报、周报汇总）'
		});

		this.createSummaryTypeSection(containerEl, 'month', '月报汇总类型设置', {
			tokenLimits: [1000, 8000, 500],
			outputDirPlaceholder: 'diary_summaries',
			outputDirDesc: '月报汇总文件的保存目录（常用路径：diary_summaries、汇总/月报、月报汇总）'
		});

		this.createSummaryTypeSection(containerEl, 'quarter', '季报汇总类型设置', {
			tokenLimits: [2000, 10000, 500],
			outputDirPlaceholder: 'diary_summaries/季报',
			outputDirDesc: '季报汇总文件的保存目录（常用路径：diary_summaries/季报、汇总/季报、季报汇总）'
		});

		this.createSummaryTypeSection(containerEl, 'year', '年报汇总类型设置', {
			tokenLimits: [3000, 12000, 500],
			outputDirPlaceholder: 'diary_summaries/年报',
			outputDirDesc: '年报汇总文件的保存目录（常用路径：diary_summaries/年报、汇总/年报、年报汇总）'
		});
	}

	private createSummaryTypeSection(
		containerEl: HTMLElement,
		type: 'week' | 'month' | 'quarter' | 'year',
		title: string,
		options: {
			tokenLimits: [number, number, number];
			outputDirPlaceholder: string;
			outputDirDesc: string;
		}
	) {
		const config = this.plugin.settings.summaryTypes[type];
		
		// 创建主容器
		const sectionContainer = containerEl.createDiv({ cls: 'summary-type-section' });
		
		// 创建标题容器（包含标题和开关）
		const headerContainer = sectionContainer.createDiv({ cls: 'summary-type-header' });
		headerContainer.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 8px 0;
			border-bottom: 1px solid var(--background-modifier-border);
			margin-bottom: 16px;
		`;

		// 标题
		const titleEl = headerContainer.createEl('h3', { text: title });
		titleEl.style.cssText = 'margin: 0;';

		// 开关容器
		const toggleContainer = headerContainer.createDiv();
		toggleContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';

		// 状态文本
		const statusText = toggleContainer.createSpan({ 
			text: config.enabled ? '已启用' : '已禁用' 
		});
		statusText.style.cssText = `
			font-size: 12px;
			color: ${config.enabled ? 'var(--text-accent)' : 'var(--text-muted)'};
		`;

		// 开关
		const toggle = toggleContainer.createEl('label');
		toggle.style.cssText = `
			position: relative;
			display: inline-block;
			width: 44px;
			height: 24px;
		`;

		const toggleInput = toggle.createEl('input', { type: 'checkbox' });
		toggleInput.checked = config.enabled;
		toggleInput.style.cssText = 'opacity: 0; width: 0; height: 0;';

		const slider = toggle.createEl('span');
		slider.style.cssText = `
			position: absolute;
			cursor: pointer;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: ${config.enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'};
			transition: 0.4s;
			border-radius: 24px;
		`;

		const sliderDot = slider.createEl('span');
		sliderDot.style.cssText = `
			position: absolute;
			content: "";
			height: 18px;
			width: 18px;
			left: ${config.enabled ? '23px' : '3px'};
			bottom: 3px;
			background-color: white;
			transition: 0.4s;
			border-radius: 50%;
		`;

		// 详细设置容器
		const detailsContainer = sectionContainer.createDiv({ cls: 'summary-type-details' });
		detailsContainer.style.cssText = `
			display: ${config.enabled ? 'block' : 'none'};
			padding-top: 8px;
		`;

		// 开关事件处理
		toggleInput.addEventListener('change', async () => {
			const isEnabled = toggleInput.checked;
			
			// 更新设置
			this.plugin.settings.summaryTypes[type].enabled = isEnabled;
			await this.plugin.saveSettings();

			// 更新UI
			statusText.textContent = isEnabled ? '已启用' : '已禁用';
			statusText.style.color = isEnabled ? 'var(--text-accent)' : 'var(--text-muted)';
			slider.style.backgroundColor = isEnabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)';
			sliderDot.style.left = isEnabled ? '23px' : '3px';
			detailsContainer.style.display = isEnabled ? 'block' : 'none';
		});

		// 添加详细设置
		this.addSummaryTypeDetails(detailsContainer, type, options);
	}

	private addSummaryTypeDetails(
		containerEl: HTMLElement,
		type: 'week' | 'month' | 'quarter' | 'year',
		options: {
			tokenLimits: [number, number, number];
			outputDirPlaceholder: string;
			outputDirDesc: string;
		}
	) {
		const config = this.plugin.settings.summaryTypes[type];
		const typeDisplayName = {
			week: '周报',
			month: '月报',
			quarter: '季报',
			year: '年报'
		}[type];

		// AI服务选择
		this.createServiceDropdown(
			containerEl,
			`${typeDisplayName}汇总服务`,
			`选择用于${typeDisplayName}汇总的AI服务和模型`,
			config.service,
			async (value) => {
				this.plugin.settings.summaryTypes[type].service = value;
				await this.plugin.saveSettings();
			}
		);

		// 最大Token数
		new Setting(containerEl)
			.setName('最大 Token 数')
			.setDesc(`${typeDisplayName}汇总的最大 Token 数`)
			.addSlider(slider => slider
				.setLimits(options.tokenLimits[0], options.tokenLimits[1], options.tokenLimits[2])
				.setValue(config.maxTokens)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.summaryTypes[type].maxTokens = value;
					await this.plugin.saveSettings();
				}));

		// 系统提示词
		new Setting(containerEl)
			.setName('系统提示词')
			.setDesc(`${typeDisplayName}汇总的系统提示词 - 点击编辑按钮可在弹窗中编辑`)
			.addButton(button => button
				.setButtonText('编辑')
				.setTooltip('编辑系统提示词')
				.onClick(() => {
					this.openSystemPromptModal(type, typeDisplayName);
				}));

		// 保存目录
		new Setting(containerEl)
			.setName('保存的目录')
			.setDesc(options.outputDirDesc)
			.addText(text => text
				.setPlaceholder(options.outputDirPlaceholder)
				.setValue(config.outputDir)
				.onChange(async (value) => {
					this.plugin.settings.summaryTypes[type].outputDir = value;
					await this.plugin.saveSettings();
				}));
	}

	addDiaryConfigSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: '日记读取配置' });

		new Setting(containerEl)
			.setName('日记根目录')
			.setDesc('日记文件的根目录路径')
			.addText(text => text
				.setPlaceholder('记录/日记')
				.setValue(this.plugin.settings.diaryConfig.diaryRoot)
				.onChange(async (value) => {
					this.plugin.settings.diaryConfig.diaryRoot = value;
					await this.plugin.saveSettings();
				}));
	}

	private openSystemPromptModal(type: 'week' | 'month' | 'quarter' | 'year', typeDisplayName: string) {
		const currentPrompt = this.plugin.settings.summaryTypes[type].systemPrompt;
		const defaultPrompt = this.getDefaultSystemPrompt(type);
		
		const modal = new SystemPromptModal(this.app, {
			title: `编辑${typeDisplayName}汇总系统提示词`,
			currentPrompt: currentPrompt,
			defaultPrompt: defaultPrompt,
			onSave: async (prompt: string) => {
				this.plugin.settings.summaryTypes[type].systemPrompt = prompt;
				await this.plugin.saveSettings();
			}
		});
		
		modal.open();
	}

	private getDefaultSystemPrompt(type: 'week' | 'month' | 'quarter' | 'year'): string {
		const defaultPrompts = {
			week: '你是一个专业的日记整理助手。请整理和分析用户提供的日记内容，生成周报汇总报告。请从以下几个方面进行总结：1. 本周主要成就和进展 2. 本周遇到的主要挑战 3. 本周的重要学习和成长 4. 本周的人际关系和社交 5. 本周的情绪和心态变化 6. 下周的计划和目标。请用中文回答，格式要清晰易读 7. 节选一些金句',
			month: '你是一个专业的日记整理助手。请整理和分析用户提供的日记内容，生成月度汇总报告。请从以下几个方面进行总结：1. 本月主要成就和进展 2. 本月遇到的主要挑战 3. 本月的重要学习和成长 4. 本月的人际关系和社交 5. 本月的情绪和心态变化 6. 下月的计划和目标。请用中文回答，格式要清晰易读 7. 节选一些金句',
			quarter: '你是一个专业的日记整理助手。请整理和分析用户提供的日记内容，生成季度汇总报告。请从以下几个方面进行总结：1. 本季度主要成就和进展 2. 本季度遇到的主要挑战 3. 本季度的重要学习和成长 4. 本季度的人际关系和社交 5. 本季度的情绪和心态变化 6. 下季度的计划和目标。请用中文回答，格式要清晰易读 7. 节选一些金句',
			year: '你是一个专业的日记整理助手。请整理和分析用户提供的日记内容，生成年度汇总报告。请从以下几个方面进行总结：1. 本年主要成就和进展 2. 本年遇到的主要挑战 3. 本年重要学习和成长 4. 本年的人际关系和社交 5. 本年的情绪和心态变化 6. 明年的计划和目标。请用中文回答，格式要清晰易读 7. 节选一些金句'
		};
		
		return defaultPrompts[type];
	}
} 