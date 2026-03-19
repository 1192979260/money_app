import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client?: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: this.configService.get<string>('OPENAI_BASE_URL') || undefined
      });
    }
  }

  async transcribeAudio(audio: Buffer, noisy = false): Promise<string> {
    const provider = this.configService.get<string>('STT_PROVIDER', 'faster_whisper');

    if (provider === 'faster_whisper') {
      try {
        return await this.transcribeByFasterWhisper(audio, noisy);
      } catch (error) {
        this.logger.warn(`faster-whisper failed, fallback to OpenAI if available: ${String(error)}`);
      }
    }

    if (!this.client) {
      return '语音转写服务未配置，请先配置 faster-whisper 或 OPENAI_API_KEY';
    }

    const model = noisy
      ? this.configService.get<string>('OPENAI_STT_MODEL_HIGH_NOISE', 'gpt-4o-transcribe')
      : this.configService.get<string>('OPENAI_STT_MODEL', 'gpt-4o-mini-transcribe');

    const file = await OpenAI.toFile(audio, 'voice.webm');
    const result = await this.client.audio.transcriptions.create({
      file,
      model
    });

    return result.text;
  }

  async extractSlots(conversation: string, currentSlots: Record<string, unknown>) {
    if (!this.client) {
      return null;
    }

    const model = this.configService.get<string>('OPENAI_CHAT_MODEL', 'gpt-5.4-mini');
    const prompt = `你是记账信息抽取器。\n用户消息: ${conversation}\n当前槽位: ${JSON.stringify(currentSlots)}\n返回 JSON, 字段: amount(number), majorType(fixed|extra|income), platformTags(string[]), usageType(family|self|child|husband|other), reason(string), occurredAt(ISO), needRemark(boolean), remark(string). 未识别可省略。`;

    const response = await this.client.responses.create({
      model,
      input: prompt,
      text: { format: { type: 'json_object' } }
    });

    const text = response.output_text || '{}';
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Failed to parse slots: ${String(error)}`);
      return null;
    }
  }

  async generateAdvice(inputSnapshot: string, periodLabel: string): Promise<string> {
    if (!this.client) {
      return '未配置 OpenAI，暂无法生成消费建议。';
    }
    const model = this.configService.get<string>('OPENAI_ADVICE_MODEL', 'gpt-5.4');
    const response = await this.client.responses.create({
      model,
      input: `请基于以下${periodLabel}账单数据给出理性、可执行的消费建议，包含3条优化建议和1条风险提醒：\n${inputSnapshot}`
    });
    return response.output_text || '暂无建议';
  }

  private async transcribeByFasterWhisper(audio: Buffer, noisy: boolean): Promise<string> {
    const tempDir = await mkdtemp(join(tmpdir(), 'money-app-stt-'));
    const audioPath = join(tempDir, 'voice-input.webm');
    await writeFile(audioPath, audio);

    const pythonBin = this.configService.get<string>('FASTER_WHISPER_PYTHON_BIN', 'python3');
    const scriptPath = this.configService.get<string>(
      'FASTER_WHISPER_SCRIPT_PATH',
      join(process.cwd(), 'scripts', 'faster_whisper_transcribe.py')
    );
    const model = noisy
      ? this.configService.get<string>('FASTER_WHISPER_MODEL_HIGH_NOISE', 'small')
      : this.configService.get<string>('FASTER_WHISPER_MODEL', 'base');

    const language = this.configService.get<string>('FASTER_WHISPER_LANGUAGE', 'zh');
    const device = this.configService.get<string>('FASTER_WHISPER_DEVICE', 'cpu');
    const computeType = this.configService.get<string>('FASTER_WHISPER_COMPUTE_TYPE', 'int8');

    try {
      const { stdout, stderr } = await execFileAsync(
        pythonBin,
        [
          scriptPath,
          '--audio-path',
          audioPath,
          '--model',
          model,
          '--language',
          language,
          '--device',
          device,
          '--compute-type',
          computeType
        ],
        { timeout: 120000, maxBuffer: 8 * 1024 * 1024 }
      );

      if (stderr?.trim()) {
        this.logger.log(`faster-whisper stderr: ${stderr.trim()}`);
      }

      const raw = stdout.trim();
      if (!raw) {
        throw new Error('empty transcription result');
      }

      try {
        const parsed = JSON.parse(raw) as { text?: string };
        return (parsed.text || '').trim();
      } catch (_error) {
        return raw;
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
