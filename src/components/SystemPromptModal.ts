import { Modal, App, Setting, Notice } from 'obsidian';

interface SystemPromptModalOptions {
	title: string;
	currentPrompt: string;
	defaultPrompt: string;
	onSave: (prompt: string) => Promise<void>;
}

export class SystemPromptModal extends Modal {
	private options: SystemPromptModalOptions;
	private currentPrompt: string;
	private textAreaEl: HTMLTextAreaElement;

	constructor(app: App, options: SystemPromptModalOptions) {
		super(app);
		this.options = options;
		this.currentPrompt = options.currentPrompt;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// 设置Modal样式
		this.modalEl.style.width = '80%';
		this.modalEl.style.maxWidth = '800px';
		this.modalEl.style.height = '80%';
		this.modalEl.style.maxHeight = '600px';

		// 标题
		contentEl.createEl('h2', { text: this.options.title });

		// 提示信息
		const descEl = contentEl.createEl('p', { 
			text: '请编辑系统提示词。系统提示词用于指导AI如何生成汇总内容。' 
		});
		descEl.style.color = 'var(--text-muted)';
		descEl.style.marginBottom = '16px';

		// 文本编辑区域
		const textAreaContainer = contentEl.createEl('div');
		textAreaContainer.style.cssText = `
			margin-bottom: 20px;
			height: 300px;
		`;

		this.textAreaEl = textAreaContainer.createEl('textarea', {
			text: this.currentPrompt
		});
		this.textAreaEl.style.cssText = `
			width: 100%;
			height: 100%;
			padding: 12px;
			border: 1px solid var(--background-modifier-border);
			border-radius: 6px;
			background: var(--background-primary);
			color: var(--text-normal);
			font-family: var(--font-text);
			font-size: 14px;
			line-height: 1.5;
			resize: none;
			outline: none;
		`;

		// 聚焦并选中所有文本
		this.textAreaEl.focus();
		this.textAreaEl.select();

		// 按钮区域
		const buttonContainer = contentEl.createEl('div');
		buttonContainer.style.cssText = `
			display: flex;
			justify-content: space-between;
			gap: 12px;
			margin-top: 20px;
		`;

		// 恢复默认按钮
		const restoreButton = buttonContainer.createEl('button', {
			text: '恢复默认'
		});
		restoreButton.style.cssText = `
			padding: 8px 16px;
			border: 1px solid var(--interactive-accent);
			background: transparent;
			color: var(--interactive-accent);
			border-radius: 6px;
			cursor: pointer;
			font-size: 14px;
		`;
		restoreButton.addEventListener('click', () => this.restoreDefault());

		// 右侧按钮组
		const rightButtonGroup = buttonContainer.createEl('div');
		rightButtonGroup.style.cssText = `
			display: flex;
			gap: 12px;
		`;

		// 取消按钮
		const cancelButton = rightButtonGroup.createEl('button', {
			text: '取消'
		});
		cancelButton.style.cssText = `
			padding: 8px 16px;
			border: 1px solid var(--background-modifier-border);
			background: var(--background-primary);
			color: var(--text-normal);
			border-radius: 6px;
			cursor: pointer;
			font-size: 14px;
		`;
		cancelButton.addEventListener('click', () => this.close());

		// 保存按钮
		const saveButton = rightButtonGroup.createEl('button', {
			text: '保存'
		});
		saveButton.style.cssText = `
			padding: 8px 16px;
			border: none;
			background: var(--interactive-accent);
			color: var(--text-on-accent);
			border-radius: 6px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 500;
		`;
		saveButton.addEventListener('click', () => this.save());

		// 添加键盘快捷键
		this.scope.register(['Mod'], 'Enter', () => {
			this.save();
		});

		this.scope.register([], 'Escape', () => {
			this.close();
		});
	}

	private restoreDefault() {
		this.textAreaEl.value = this.options.defaultPrompt;
		this.textAreaEl.focus();
		new Notice('已恢复默认系统提示词');
	}

	private async save() {
		const newPrompt = this.textAreaEl.value.trim();
		
		if (!newPrompt) {
			new Notice('❌ 系统提示词不能为空');
			return;
		}

		try {
			await this.options.onSave(newPrompt);
			new Notice('✅ 系统提示词已保存');
			this.close();
		} catch (error) {
			console.error('保存系统提示词失败:', error);
			new Notice('❌ 保存失败，请重试');
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}