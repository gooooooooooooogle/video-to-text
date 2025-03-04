# video-to-text

一个基于Node.js的视频转文字应用，能够将视频文件中的语音内容转换为文本。本项目使用Vosk进行语音识别，支持中文识别。

## 功能特点

- 支持多种视频格式转换
- 使用Vosk进行高效的语音识别
- 支持中文语音识别
- 自动保存识别结果为文本文件
- 显示实时转换进度

## 系统要求

- Node.js 14.0.0 或更高版本
- FFmpeg（用于视频处理）
- 8GB 或更大的内存（用于处理大型视频文件）

## 安装步骤

1. 安装 FFmpeg
   - Windows: 
     1. 下载 FFmpeg: https://ffmpeg.org/download.html
     2. 将FFmpeg添加到系统环境变量
   - macOS:
     ```bash
     brew install ffmpeg
     ```
   - Linux:
     ```bash
     sudo apt-get update && sudo apt-get install ffmpeg
     ```

2. 克隆项目并安装依赖
   ```bash
   git clone [项目地址]
   cd video-to-text
   npm install
   ```

3. 下载Vosk模型
   1. 访问 https://alphacephei.com/vosk/models
   2. 下载中文模型 `vosk-model-small-cn-0.22`
   3. 解压下载的模型文件
   4. 在项目根目录创建 `model` 文件夹
   5. 将解压后的模型文件夹中的所有内容复制到 `model` 文件夹中
   
   模型文件夹结构应如下：
   ```
   model/
   ├── am/
   ├── conf/
   ├── graph/
   ├── ivector/
   ├── rescore/
   └── rnnlm/
   ```

## 使用方法

1. 基本使用
   ```bash
   npm start [视频文件路径]
   ```
   例如：
   ```bash
   npm start "C:\Videos\test.mp4"
   ```

2. 转换结果
   - 转换完成后，文本结果将保存在项目根目录的 `output.txt` 文件中
   - 转换过程中会显示实时进度
   - 程序会自动清理临时文件

## 注意事项

1. 视频质量
   - 建议使用音质清晰的视频
   - 背景噪音较大可能会影响识别效果

2. 文件大小
   - 建议单个视频文件不要超过2GB
   - 处理大文件时需要较长时间

3. 内存使用
   - 处理大型视频文件时可能需要较大内存
   - 如果出现内存不足，建议关闭其他占用内存的应用

## 常见问题

1. 找不到FFmpeg
   - 确保FFmpeg已正确安装并添加到系统环境变量
   - 重启终端或命令提示符

2. 模型无法加载
   - 检查模型文件夹结构是否正确
   - 确保模型文件完整解压

3. 转换速度慢
   - 检查系统资源占用情况
   - 考虑使用更小的视频文件

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
