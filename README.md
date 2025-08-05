# Diary Summaries - Obsidian插件

AI驱动的日记汇总插件，支持使用OpenAI和Ollama生成周、月、季度和年度汇总。

## 功能特点

- 🤖 支持OpenAI和Ollama AI服务
- 📅 自动扫描日记文件结构
- 📊 生成月度汇总报告
- ⚙️ 可配置的AI设置
- 🎯 支持强制覆盖和选择性处理

## 安装要求

### 1. 安装Node.js

首先需要安装Node.js和npm：

**macOS (使用Homebrew):**
```bash
brew install node
```

**或者从官网下载:**
https://nodejs.org/

### 2. 安装依赖

在插件目录下运行：
```bash
cd .obsidian/plugins/diary-summaries
npm install
```

### 3. 构建插件

```bash
npm run build
```

## 配置

### 1. 启用插件

在Obsidian中：
1. 打开设置 → 社区插件
2. 关闭安全模式
3. 刷新插件列表
4. 搜索"Diary Summaries"并启用

### 2. 配置AI服务

#### OpenAI配置
1. 获取OpenAI API Key: https://platform.openai.com/api-keys
2. 在插件设置中填入API Key
3. 选择模型（推荐GPT-4）

#### Ollama配置
1. 安装Ollama: https://ollama.ai/
2. 下载模型: `ollama pull llama2`
3. 在插件设置中配置Ollama URL和模型

### 3. 配置日记路径

在插件设置中配置：
- **日记根目录**: 日记文件的根目录路径（如：`记录/日记`）
- **输出目录**: 汇总文件的输出目录（如：`diary_summaries`）

## 使用方法

### 命令面板

使用 `Ctrl+P` (Windows/Linux) 或 `Cmd+P` (macOS) 打开命令面板，然后：

1. **处理月度汇总**: 生成所有月份的汇总
2. **处理所有汇总**: 处理所有类型的汇总（目前仅月度）

### 日记文件结构

插件期望的日记目录结构：

```
记录/日记/
├── 2023年/
│   ├── 10月-W40周/
│   │   ├── 23-10-07周六.md
│   │   └── 23-10-08周日.md
│   └── 11月-W44周/
│       └── 23-11-01周三.md
├── 2024年/
│   └── ...
└── 2025年/
    └── ...
```

### 文件名格式

日记文件名应包含日期信息：
- 格式：`YY-MM-DD周X.md`
- 示例：`25-01-20周一.md`, `24-01-25周四.md`

## 输出示例

生成的月度汇总文件示例：

```markdown
# 2025年01月月度汇总

## 本月主要成就和进展
- 完成了项目A的开发
- 学习了新的技术栈
- 参加了行业会议

## 本月遇到的主要挑战
- 项目进度延期
- 技术难题解决

## 本月的重要学习和成长
- 掌握了React Hooks
- 提升了沟通能力

## 本月的人际关系和社交
- 与同事建立了良好的合作关系
- 参加了团队建设活动

## 本月的情绪和心态变化
- 整体保持积极心态
- 偶尔感到压力，但能及时调整

## 下月的计划和目标
- 继续推进项目B
- 学习新的技术
- 提升工作效率

## 金句摘录
- "成功不是偶然的，而是日积月累的结果"
- "每一次挑战都是成长的机会"
```

## 故障排除

### 常见问题

1. **插件无法加载**
   - 检查Node.js是否正确安装
   - 确认依赖是否正确安装
   - 查看控制台错误信息

2. **AI调用失败**
   - 检查API Key是否正确
   - 确认网络连接正常
   - 验证模型名称是否正确

3. **日记扫描失败**
   - 检查日记路径配置
   - 确认文件结构符合要求
   - 验证文件名格式

4. **汇总生成失败**
   - 检查AI服务配置
   - 确认日记内容不为空
   - 验证输出目录权限

### 调试模式

在Obsidian开发者工具中查看控制台输出：
1. 打开开发者工具 (Ctrl+Shift+I)
2. 查看Console标签页
3. 查看错误信息和调试输出

## 开发

### 开发环境设置

```bash
# 克隆项目
git clone <repository-url>
cd diary-summaries

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

### 项目结构

```
diary-summaries/
├── src/
│   ├── main.ts              # 主插件入口
│   ├── settings.ts          # 设置页面
│   ├── types.ts             # 类型定义
│   └── core/
│       ├── organizer.ts     # 核心整理逻辑
│       ├── ai-client.ts     # AI调用
│       └── scanner.ts       # 日记扫描
├── manifest.json            # 插件清单
├── package.json             # 项目配置
└── README.md               # 说明文档
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 更新日志

### v1.0.0
- 初始版本
- 支持OpenAI和Ollama
- 月度汇总功能
- 基础设置页面 