import { App, Modal, Setting, Notice, requestUrl } from 'obsidian';
import { OpenAIConnection } from '../types';

export class OpenAIConnectionModal extends Modal {
	connection: OpenAIConnection;
	onSave: (connection: OpenAIConnection) => void;
	onDelete?: () => void;
	isEditing: boolean;
	private modelsContainer: HTMLElement;

	constructor(
		app: App, 
		connection: OpenAIConnection | null, 
		onSave: (connection: OpenAIConnection) => void,
		onDelete?: () => void
	) {
		super(app);
		this.onSave = onSave;
		this.onDelete = onDelete;
		this.isEditing = connection !== null;
		
		// 如果是编辑模式，使用传入的连接；否则创建新连接
		this.connection = connection || {
			id: this.generateId(),
			name: '',
			apiKey: '',
			baseURL: 'https://api.openai.com/v1',
			models: ['gpt-4', 'gpt-3.5-turbo'],
			isDefault: false
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { 
			text: this.isEditing ? '编辑OpenAI连接' : '添加OpenAI连接' 
		});

		// 连接名称
		new Setting(contentEl)
			.setName('连接名称')
			.setDesc('为此连接设置一个易识别的名称')
			.addText(text => text
				.setPlaceholder('例如：OpenAI、通义千问、DeepSeek等')
				.setValue(this.connection.name)
				.onChange((value) => {
					this.connection.name = value;
				}));

		// API Key
		let isPasswordVisible = false;
		const apiKeySetting = new Setting(contentEl)
			.setName('API Key')
			.setDesc('输入API密钥')
			.addText(text => {
				text.setPlaceholder('sk-...')
					.setValue(this.connection.apiKey)
					.onChange((value) => {
						this.connection.apiKey = value;
					});
				text.inputEl.type = 'password';
				return text;
			})
			.addButton(button => {
				button.setButtonText('👁️')
					.setTooltip('显示/隐藏API Key')
					.onClick(() => {
						isPasswordVisible = !isPasswordVisible;
						const textInput = apiKeySetting.controlEl.querySelector('input[type="password"], input[type="text"]') as HTMLInputElement;
						if (textInput) {
							textInput.type = isPasswordVisible ? 'text' : 'password';
							button.setButtonText(isPasswordVisible ? '🙈' : '👁️');
						}
					});
			});

		// Base URL
		new Setting(contentEl)
			.setName('Base URL')
			.setDesc('API的基础URL')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1')
				.setValue(this.connection.baseURL)
				.onChange((value) => {
					this.connection.baseURL = value;
				}));

		// 模型列表
		this.createModelsListSection(contentEl);

		// 设为默认连接
		new Setting(contentEl)
			.setName('设为默认连接')
			.setDesc('将此连接设为默认的OpenAI连接')
			.addToggle(toggle => toggle
				.setValue(this.connection.isDefault || false)
				.onChange((value) => {
					this.connection.isDefault = value;
				}));

		// 测试连接按钮
		new Setting(contentEl)
			.setName('测试连接')
			.setDesc('测试API连接是否正常')
			.addButton(button => button
				.setButtonText('测试连接')
				.setCta()
				.onClick(() => this.testConnection()));

		// 底部按钮
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		buttonContainer.style.cssText = 'display: flex; justify-content: space-between; margin-top: 20px;';

		// 删除按钮（仅编辑模式显示）
		if (this.isEditing && this.onDelete) {
			const deleteButton = buttonContainer.createEl('button', { 
				text: '删除', 
				cls: 'mod-warning' 
			});
			deleteButton.onclick = () => {
				if (this.onDelete) {
					this.onDelete();
					this.close();
				}
			};
		}

		// 右侧按钮组
		const rightButtons = buttonContainer.createDiv();
		rightButtons.style.cssText = 'display: flex; gap: 10px;';

		const cancelButton = rightButtons.createEl('button', { text: '取消' });
		cancelButton.onclick = () => this.close();

		const saveButton = rightButtons.createEl('button', { 
			text: '保存', 
			cls: 'mod-cta' 
		});
		saveButton.onclick = () => this.save();
	}

	private generateId(): string {
		return 'openai-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
	}

	private async testConnection() {
		if (!this.connection.apiKey.trim()) {
			new Notice('请先输入API Key');
			return;
		}

		if (!this.connection.baseURL.trim()) {
			new Notice('请先输入Base URL');
			return;
		}

		const notice = new Notice('正在测试连接...', 0);

		try {
			// 构建测试请求
			const url = this.connection.baseURL.endsWith('/') 
				? this.connection.baseURL + 'models'
				: this.connection.baseURL + '/models';

			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.connection.apiKey}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.status === 200) {
				notice.hide();
				new Notice('✅ 连接测试成功！');
				
				// 如果成功，尝试获取可用模型列表
				if (response.json && response.json.data) {
					const availableModels = response.json.data.map((model: any) => model.id);
					if (availableModels.length > 0) {
						// 询问用户是否要更新模型列表
						const shouldUpdate = confirm(
							`检测到 ${availableModels.length} 个可用模型，是否要更新模型列表？`
						);
						if (shouldUpdate) {
							this.connection.models = availableModels;
							this.renderModelsList();
							new Notice('模型列表已更新');
						}
					}
				}
			} else {
				throw new Error(`HTTP ${response.status}: ${response.status}`);
			}
		} catch (error) {
			notice.hide();
			console.error('API测试失败:', error);
			new Notice(`❌ 连接测试失败: ${error.message}`);
		}
	}

	private save() {
		// 验证必填字段
		if (!this.connection.name.trim()) {
			new Notice('请输入连接名称');
			return;
		}

		if (!this.connection.apiKey.trim()) {
			new Notice('请输入API Key');
			return;
		}

		if (!this.connection.baseURL.trim()) {
			new Notice('请输入Base URL');
			return;
		}

		if (this.connection.models.length === 0) {
			new Notice('请至少添加一个模型');
			return;
		}

		this.onSave(this.connection);
		this.close();
	}

	private createModelsListSection(containerEl: HTMLElement) {
		// 模型列表标题
		const modelsSection = containerEl.createDiv({ cls: 'setting-item' });
		modelsSection.style.cssText = 'border-bottom: none; padding-bottom: 0;';
		
		const modelsHeader = modelsSection.createDiv({ cls: 'setting-item-info' });
		modelsHeader.createDiv({ cls: 'setting-item-name' }).textContent = '模型 ID';
		modelsHeader.createDiv({ cls: 'setting-item-description' }).textContent = '支持的模型列表';

		// 模型列表容器
		this.modelsContainer = containerEl.createDiv({ cls: 'models-container' });
		this.modelsContainer.style.cssText = `
			border: 1px solid var(--background-modifier-border);
			border-radius: 6px;
			padding: 8px;
			margin-bottom: 16px;
			min-height: 120px;
			max-height: 200px;
			overflow-y: auto;
		`;

		this.renderModelsList();

		// 添加模型输入框
		const addModelContainer = containerEl.createDiv({ cls: 'setting-item' });
		addModelContainer.style.cssText = 'border-bottom: none; padding: 8px 0;';
		
		const addModelSetting = new Setting(addModelContainer)
			.setName('添加一个模型 ID')
			.addText(text => {
				text.setPlaceholder('例如: gpt-4, qwen-plus 等')
					.onChange((value) => {
						// 实时更新
					});
				
				// 回车添加模型
				text.inputEl.addEventListener('keypress', (e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						const modelName = text.getValue().trim();
						if (modelName && !this.connection.models.includes(modelName)) {
							this.connection.models.push(modelName);
							this.renderModelsList();
							text.setValue('');
						} else if (this.connection.models.includes(modelName)) {
							new Notice('模型已存在');
						}
					}
				});
				
				return text;
			})
			.addButton(button => {
				button.setButtonText('+')
					.setTooltip('添加模型')
					.onClick(() => {
						const textInput = addModelSetting.controlEl.querySelector('input') as HTMLInputElement;
						const modelName = textInput?.value.trim();
						if (modelName && !this.connection.models.includes(modelName)) {
							this.connection.models.push(modelName);
							this.renderModelsList();
							textInput.value = '';
						} else if (this.connection.models.includes(modelName)) {
							new Notice('模型已存在');
						} else {
							new Notice('请输入模型名称');
						}
					});
			});
	}

	private renderModelsList() {
		if (!this.modelsContainer) return;

		this.modelsContainer.empty();

		if (this.connection.models.length === 0) {
			const emptyDiv = this.modelsContainer.createDiv();
			emptyDiv.textContent = '暂无模型，请添加至少一个模型';
			emptyDiv.style.cssText = 'color: var(--text-muted); text-align: center; padding: 20px; font-style: italic;';
			return;
		}

		this.connection.models.forEach((model, index) => {
			const modelItem = this.modelsContainer.createDiv({ cls: 'model-item' });
			modelItem.style.cssText = `
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 6px 8px;
				margin-bottom: 4px;
				background: var(--background-secondary);
				border-radius: 4px;
				border: 1px solid var(--background-modifier-border);
			`;

			const modelText = modelItem.createSpan({ text: model });
			modelText.style.cssText = 'flex: 1; font-family: var(--font-monospace); font-size: 13px;';

			const removeButton = modelItem.createEl('button', { text: '−' });
			removeButton.style.cssText = `
				background: var(--interactive-accent);
				color: white;
				border: none;
				border-radius: 3px;
				width: 20px;
				height: 20px;
				font-size: 16px;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				line-height: 1;
			`;
			removeButton.setAttribute('title', '删除模型');
			removeButton.onclick = () => {
				this.connection.models.splice(index, 1);
				this.renderModelsList();
			};
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}