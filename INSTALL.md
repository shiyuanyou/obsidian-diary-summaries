# 安装指南

## 快速安装步骤

### 1. 安装Node.js
```bash
# 使用Homebrew安装
brew install node

# 或者从官网下载
# https://nodejs.org/
```

### 2. 验证安装
```bash
node --version
npm --version
```

### 3. 安装依赖
```bash
cd .obsidian/plugins/diary-summaries
npm install
```

### 4. 构建插件
```bash
npm run build
```

### 5. 在Obsidian中启用
1. 打开Obsidian
2. 设置 → 社区插件
3. 关闭安全模式
4. 刷新插件列表
5. 搜索"Diary Summaries"并启用

## 故障排除

### 如果遇到TypeScript错误
我们已经配置了跳过类型检查，直接运行：
```bash
npm run build
```

### 如果遇到依赖安装问题
```bash
# 清除缓存
npm cache clean --force

# 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 如果插件无法加载
1. 检查main.js文件是否存在
2. 查看Obsidian开发者工具的控制台错误
3. 确认插件已启用

## 测试插件

1. 配置AI服务（OpenAI或Ollama）
2. 设置日记路径：`记录/日记`
3. 使用 `Cmd+P` 打开命令面板
4. 搜索"处理月度汇总"并运行

## 支持

如果遇到问题，请检查：
- Node.js版本 >= 14
- npm版本 >= 6
- Obsidian版本 >= 0.15.0 