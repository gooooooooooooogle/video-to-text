const ffmpeg = require('fluent-ffmpeg');
const vosk = require('vosk');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// 设置Vosk模型路径
const MODEL_PATH = path.join(__dirname, 'model');

// 初始化Vosk
vosk.setLogLevel(-1); // 禁用日志
if (!fs.existsSync(MODEL_PATH)) {
    console.error('请下载Vosk模型并放置在model目录下');
    console.error('可以从 https://alphacephei.com/vosk/models 下载中文模型');
    process.exit(1);
}
const model = new vosk.Model(MODEL_PATH);

async function videoToText(videoPath) {
    try {
        const startTime = Date.now();
        console.log('开始处理视频转文字任务...');

        // 步骤1：将视频转换为音频
        console.log('\n[步骤1/3] 正在将视频转换为音频...');
        const audioStartTime = Date.now();
        const audioPath = path.join(__dirname, 'temp.wav');
        await convertVideoToAudio(videoPath, audioPath);
        const audioEndTime = Date.now();
        console.log(`✓ 视频转换音频完成 (耗时: ${((audioEndTime - audioStartTime) / 1000).toFixed(2)}秒)`);

        // 步骤2：将音频转换为文字
        console.log('\n[步骤2/3] 正在将音频转换为文字...');
        const textStartTime = Date.now();
        const text = await convertAudioToText(audioPath);
        const textEndTime = Date.now();
        console.log(`✓ 音频转换文字完成 (耗时: ${((textEndTime - textStartTime) / 1000).toFixed(2)}秒)`);

        // 步骤3：保存文字到文件
        console.log('\n[步骤3/3] 正在保存转换结果...');
        const saveStartTime = Date.now();
        const outputPath = path.join(__dirname, 'output.txt');
        const textWithoutSpaces = text.replace(/\s+/g, '');
        await fs.writeFile(outputPath, textWithoutSpaces, 'utf8');
        const saveEndTime = Date.now();
        console.log(`✓ 文字已保存到: ${outputPath} (耗时: ${((saveEndTime - saveStartTime) / 1000).toFixed(2)}秒)`);

        // 清理临时文件
        await fs.remove(audioPath);
        const endTime = Date.now();
        console.log(`\n✨ 所有任务处理完成！总耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);

    } catch (error) {
        console.error('处理过程中出错:', error);
    }
}

function convertVideoToAudio(videoPath, audioPath) {
    return new Promise((resolve, reject) => {
        let duration = 0;
        let progress = 0;

        ffmpeg(videoPath)
            .toFormat('wav')
            .audioChannels(1)
            .audioFrequency(16000)  // 使用推荐的采样率
            .audioBitrate('128k')   // 使用更高的比特率以提高质量
            .on('start', () => {
                process.stdout.write('正在转换: 0%');
            })
            .on('progress', (info) => {
                if (duration === 0) duration = info.duration;
                progress = Math.round((info.timemark.split(':').reduce((acc, time) => (60 * acc) + +time, 0) / duration) * 100);
                process.stdout.write(`\r正在转换: ${progress}%`);
            })
            .on('error', (err) => reject(err))
            .on('end', () => {
                process.stdout.write('\r正在转换: 100%\n');
                resolve();
            })
            .save(audioPath);
    });
}

async function convertAudioToText(audioPath) {
    console.log('正在初始化语音识别模型...');
    const BUFFER_SIZE = 32768;  // 32KB的缓冲区大小
    const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB的数据块大小

    console.log('正在加载音频文件...');
    const audioStat = await fs.stat(audioPath);
    const totalSize = audioStat.size;
    console.log(`音频文件大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    // 计算数据块
    const chunks = [];
    for (let i = 0; i < totalSize; i += CHUNK_SIZE) {
        chunks.push({
            start: i,
            end: Math.min(i + CHUNK_SIZE, totalSize)
        });
    }

    // 创建进度显示
    let processedChunks = 0;
    const totalChunks = chunks.length;
    const updateProgress = () => {
        const progress = Math.round((processedChunks / totalChunks) * 100);
        const progressBar = '='.repeat(Math.floor(progress / 2)) + ' '.repeat(50 - Math.floor(progress / 2));
        process.stdout.write(`\r处理进度: ${progress}% [${progressBar}]`);
    };

    // 初始化进度条
    process.stdout.write('\n[音频识别进度]\n');
    process.stdout.write('0% [' + ' '.repeat(50) + '] 100%\n');
    updateProgress();

    // 初始化识别器
    const rec = new vosk.Recognizer({ model: model, sampleRate: 16000 });
    const results = [];

    // 处理每个数据块
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
            const fileHandle = await fs.promises.open(audioPath, 'r');
            const buffer = Buffer.alloc(BUFFER_SIZE);
            let position = chunk.start;

            while (position < chunk.end) {
                const readSize = Math.min(BUFFER_SIZE, chunk.end - position);
                const { bytesRead } = await fileHandle.read(buffer, 0, readSize, position);
                if (bytesRead === 0) break;

                const isEndOfSegment = rec.acceptWaveform(buffer.slice(0, bytesRead));
                if (isEndOfSegment) {
                    const segmentResult = rec.result();
                    if (segmentResult.text) {
                        results.push(segmentResult.text);
                        // 实时打印识别出的文本
                        process.stdout.write('\n识别文本: ' + segmentResult.text);
                    }
                }
                position += bytesRead;
            }

            await fileHandle.close();
            processedChunks++;
            updateProgress();

        } catch (error) {
            console.error(`处理数据块 ${i} 时发生错误:`, error);
            results.push(''); // 处理失败时使用空字符串
            processedChunks++;
            updateProgress();
        }
    }

    // 获取最后的识别结果
    const finalResult = rec.finalResult();
    if (finalResult.text) {
        results.push(finalResult.text);
    }

    // 释放识别器资源
    rec.free();

    process.stdout.write('\n\n✓ 音频识别完成！\n');
    console.log(`总共处理了 ${chunks.length} 个数据块`);

    // 合并所有结果
    return results.join(' ').trim();
}

// 使用示例
if (!module.parent) {
    const videoPath = process.argv[2] || 'C:\\Users\\Administrator\\Desktop\\test.mp4';
    videoToText(videoPath);
}
module.exports = {
    videoToText
};