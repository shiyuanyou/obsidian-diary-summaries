import { App, TFolder, AbstractInputSuggest } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<string> {
  private app: App;
  private inputEl: HTMLInputElement;
  private folders: string[] = [];

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.app = app;
    this.inputEl = inputEl;
    this.folders = this.getAllFolderPaths();
  }

  getSuggestions(query: string): string[] {
    const normalizedQuery = (query || '').toLowerCase();
    if (!normalizedQuery) return this.folders.slice(0, 50);
    return this.folders
      .filter((p) => p.toLowerCase().includes(normalizedQuery))
      .slice(0, 50);
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.createEl('div', { text: value });
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    // 触发输入事件，便于绑定的 onChange 回调生效
    this.inputEl.dispatchEvent(new Event('input'));
    this.close();
  }

  private getAllFolderPaths(): string[] {
    const root = this.app.vault.getRoot();
    const result: string[] = [];

    const walk = (folder: TFolder) => {
      // 跳过根目录空路径
      if (folder.path) {
        result.push(folder.path);
      }
      folder.children.forEach((child) => {
        if (child instanceof TFolder) {
          walk(child);
        }
      });
    };

    walk(root);
    // 将顶层也包含（有些用户喜欢直接选择根目录，如 "记录/日记" 已在结果中）
    return result.sort((a, b) => a.localeCompare(b));
  }
}


