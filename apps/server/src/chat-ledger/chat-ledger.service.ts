import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, EntrySource, ExpenseNature, MajorType, Prisma, UsageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiService } from '../common/openai.service';
import {
  computeMissingSlots,
  inferExpenseNature,
  heuristicExtractSlots,
  normalizeMajorType,
  normalizeReasonText,
  slotQuestion
} from '../common/utils';
import { ConfirmInputDto, PatchDraftDto } from './dto';
import { SlotValues } from '@money-app/shared';

@Injectable()
export class ChatLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService
  ) {}

  async transcribeVoice(audioBase64: string, noisy: boolean) {
    const buffer = Buffer.from(audioBase64, 'base64');
    const text = await this.openAiService.transcribeAudio(buffer, noisy);
    return {
      transcribedText: text
    };
  }

  async startConversation(userId: string) {
    const missingSlots = computeMissingSlots({});
    const status = ConversationStatus.COLLECTING;
    const lastQuestion = this.buildSlotQuestion(missingSlots[0], {});

    const draft = await this.prisma.conversationDraft.create({
      data: {
        userId,
        slotValues: {} as Prisma.InputJsonValue,
        missingSlots,
        status,
        lastQuestion,
        jsonContext: JSON.stringify({ start: true })
      }
    });

    return {
      draftId: draft.id,
      status: draft.status,
      missingSlots: draft.missingSlots,
      slotValues: draft.slotValues,
      assistantReply: draft.lastQuestion
    };
  }

  async handleTextMessage(userId: string, draftId: string | undefined, message: string) {
    if (!draftId) {
      return this.createOrUpdateDraft(userId, message);
    }
    const draft = await this.ensureDraft(userId, draftId);
    const slotValues = (draft.slotValues as SlotValues) || {};
    const currentMissingSlot = draft.missingSlots?.[0];
    const merged = await this.mergeSlotValues(message, slotValues, currentMissingSlot);
    this.protectReasonOnRemarkStep(merged, slotValues, currentMissingSlot);
    this.applySlotFallback(merged, currentMissingSlot, message);
    const missingSlots = computeMissingSlots(merged);

    const status = missingSlots.length === 0 ? ConversationStatus.CONFIRMING : ConversationStatus.COLLECTING;
    const lastQuestion = missingSlots.length === 0 ? this.buildSummaryQuestion(merged) : this.buildSlotQuestion(missingSlots[0], merged);

    const updated = await this.prisma.conversationDraft.update({
      where: { id: draftId },
      data: {
        slotValues: merged as Prisma.InputJsonValue,
        missingSlots,
        status,
        lastQuestion,
        jsonContext: JSON.stringify({ history: [draft.jsonContext, message] })
      }
    });

    return {
      draftId: updated.id,
      status: updated.status,
      missingSlots: updated.missingSlots,
      slotValues: updated.slotValues,
      assistantReply: updated.lastQuestion
    };
  }

  async patchDraft(userId: string, dto: PatchDraftDto) {
    const draft = await this.ensureDraft(userId, dto.draftId);
    const current = draft.slotValues as SlotValues;
    const next: SlotValues = {
      ...current,
      amount: dto.amount ?? current.amount,
      majorType: dto.majorType ?? current.majorType,
      platformTags: dto.platformTags ?? current.platformTags,
      usageType: dto.usageType ?? current.usageType,
      reason: dto.reason ?? current.reason,
      occurredAt: dto.occurredAt ?? current.occurredAt,
      needRemark: dto.needRemark ?? current.needRemark,
      remark: dto.remark ?? current.remark
    };

    const missingSlots = computeMissingSlots(next);
    const status = missingSlots.length === 0 ? ConversationStatus.CONFIRMING : ConversationStatus.COLLECTING;

    const updated = await this.prisma.conversationDraft.update({
      where: { id: draft.id },
      data: {
        slotValues: next as Prisma.InputJsonValue,
        missingSlots,
        status,
        lastQuestion: missingSlots.length === 0 ? this.buildSummaryQuestion(next) : this.buildSlotQuestion(missingSlots[0], next)
      }
    });

    return {
      draftId: updated.id,
      status: updated.status,
      missingSlots: updated.missingSlots,
      slotValues: updated.slotValues,
      assistantReply: updated.lastQuestion
    };
  }

  async confirm(userId: string, dto: ConfirmInputDto) {
    const draft = await this.ensureDraft(userId, dto.draftId);
    if (draft.status !== ConversationStatus.CONFIRMING) {
      throw new BadRequestException('Draft is not ready to confirm');
    }

    const slotValues = draft.slotValues as SlotValues;
    const missingSlots = computeMissingSlots(slotValues);
    if (missingSlots.length > 0) {
      throw new BadRequestException(`Still missing slots: ${missingSlots.join(', ')}`);
    }

    const created = await this.prisma.ledgerEntry.create({
      data: {
        userId,
        amount: slotValues.amount!,
        currency: 'CNY',
        majorType: slotValues.majorType as MajorType,
        expenseNature: this.resolveExpenseNature(slotValues),
        platformTags: slotValues.platformTags!,
        usageType: this.resolveUsageType(slotValues),
        reason: slotValues.reason!,
        note: slotValues.remark || null,
        occurredAt: new Date(slotValues.occurredAt!),
        source: dto.source as EntrySource,
        rawText: dto.rawText,
        conversationHistory: this.normalizeConversationHistory(dto.conversationHistory) as Prisma.InputJsonValue,
        status: 'CONFIRMED'
      }
    });

    await this.prisma.conversationDraft.update({
      where: { id: draft.id },
      data: {
        status: ConversationStatus.CONFIRMED,
        lastQuestion: '已确认入账。'
      }
    });

    return {
      entryId: created.id,
      status: 'CONFIRMED'
    };
  }

  private async createOrUpdateDraft(userId: string, message: string) {
    const initialSlots = await this.mergeSlotValues(message, {}, undefined);
    const missingSlots = computeMissingSlots(initialSlots);
    const status = missingSlots.length === 0 ? ConversationStatus.CONFIRMING : ConversationStatus.COLLECTING;
    const lastQuestion = missingSlots.length === 0 ? this.buildSummaryQuestion(initialSlots) : this.buildSlotQuestion(missingSlots[0], initialSlots);

    const draft = await this.prisma.conversationDraft.create({
      data: {
        userId,
        slotValues: initialSlots as Prisma.InputJsonValue,
        missingSlots,
        status,
        lastQuestion,
        jsonContext: JSON.stringify({ initialMessage: message })
      }
    });

    return {
      transcribedText: message,
      draftId: draft.id,
      status: draft.status,
      missingSlots: draft.missingSlots,
      slotValues: draft.slotValues,
      assistantReply: draft.lastQuestion
    };
  }

  private async mergeSlotValues(
    message: string,
    current: Partial<SlotValues>,
    currentMissingSlot?: string
  ): Promise<SlotValues> {
    const localExtract = heuristicExtractSlots(message);
    const llmExtract = await this.openAiService.extractSlots(message, current);

    const merged: SlotValues = {
      ...current,
      ...localExtract,
      ...(llmExtract as Partial<SlotValues> | null)
    };

    if (typeof merged.amount === 'string') {
      merged.amount = Number(merged.amount);
    }

    if (typeof merged.platformTags === 'string') {
      merged.platformTags = (merged.platformTags as unknown as string)
        .split(/[、,，\s]+/)
        .filter(Boolean);
    }
    const needRemarkValue = merged.needRemark as unknown;
    if (typeof needRemarkValue === 'string') {
      merged.needRemark = ['是', '需要', 'yes', 'y', 'true'].includes(needRemarkValue.toLowerCase());
    }
    if (merged.amount !== undefined && merged.reason) {
      const amountText = String(merged.amount);
      const reasonText = String(merged.reason).trim();
      if (reasonText === amountText || reasonText === `${amountText}元` || reasonText === `${amountText}块`) {
        merged.reason = current.reason;
      }
    }
    const normalizedReason = normalizeReasonText(String(merged.reason || ''));
    merged.reason = normalizedReason || current.reason;

    merged.majorType = normalizeMajorType({
      majorType: merged.majorType,
      reason: merged.reason,
      platformTags: merged.platformTags,
      rawText: message
    }) as SlotValues['majorType'];

    if (merged.usageType && !this.shouldAcceptUsageType(message, currentMissingSlot)) {
      merged.usageType = current.usageType;
    }

    return merged;
  }

  private applySlotFallback(merged: SlotValues, currentMissingSlot: string | undefined, message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;

    if (currentMissingSlot === 'remark' && !merged.remark) {
      merged.needRemark = true;
      merged.remark = trimmed;
      return;
    }

    if (currentMissingSlot === 'reason' && !merged.reason) {
      merged.reason = normalizeReasonText(trimmed) || merged.reason || '';
    }
  }

  private protectReasonOnRemarkStep(
    merged: SlotValues,
    current: Partial<SlotValues>,
    currentMissingSlot: string | undefined
  ) {
    // When asking for remark/needRemark, user input should not mutate the already confirmed reason/source.
    if ((currentMissingSlot === 'remark' || currentMissingSlot === 'needRemark') && current.reason) {
      merged.reason = current.reason;
    }
  }

  private buildSummaryQuestion(slotValues: SlotValues): string {
    const noteText = slotValues.needRemark ? slotValues.remark || '待补充' : '无';
    const majorTypeText =
      slotValues.majorType === 'fixed' ? '固定支出' : slotValues.majorType === 'extra' ? '额外支出' : '收入';
    const usageText =
      slotValues.usageType === 'family'
        ? '家庭'
        : slotValues.usageType === 'self'
          ? '老婆'
          : slotValues.usageType === 'child'
            ? '孩子'
            : slotValues.usageType === 'husband'
              ? '老公'
              : '其他';
    const reasonLabel = slotValues.majorType === 'income' ? '收入来源' : '用途';
    const timeText = this.formatDateTime(slotValues.occurredAt);
    if (slotValues.majorType === 'income') {
      return `请确认这笔账单：金额${slotValues.amount}元；分类${majorTypeText}；平台${slotValues.platformTags?.join('/')}；时间${timeText}；${reasonLabel}${slotValues.reason}；备注${noteText}。确认请回复“确认”。`;
    }
    return `请确认这笔账单：金额${slotValues.amount}元；分类${majorTypeText}；平台${slotValues.platformTags?.join('/')}；归属对象${usageText}；时间${timeText}；${reasonLabel}${slotValues.reason}；备注${noteText}。确认请回复“确认”。`;
  }

  private buildSlotQuestion(slot?: string, slotValues?: Partial<SlotValues>) {
    if (slot === 'reason' && slotValues?.majorType === 'income') {
      return '请补充这笔收入来源（老公/老婆/其他）。';
    }
    return slotQuestion((slot as Parameters<typeof slotQuestion>[0]) || 'amount');
  }

  private shouldAcceptUsageType(message: string, currentMissingSlot?: string) {
    if (currentMissingSlot === 'usageType') return true;
    return /(家庭|老婆|本人|孩子|老公|其他)/.test(message);
  }

  private resolveUsageType(slotValues: SlotValues): UsageType {
    if (slotValues.majorType !== 'income') {
      return (slotValues.usageType as UsageType) || 'other';
    }

    const source = String(slotValues.reason || '').trim();
    if (source === '老公') return 'husband';
    if (source === '老婆' || source === '本人') return 'self';
    return 'other';
  }

  private resolveExpenseNature(slotValues: SlotValues): ExpenseNature | null {
    const value = inferExpenseNature({
      majorType: slotValues.majorType,
      amount: slotValues.amount,
      reason: slotValues.reason,
      platformTags: slotValues.platformTags
    });
    return value ? (value as ExpenseNature) : null;
  }

  private formatDateTime(input?: string) {
    if (!input) return '未填写';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  private async ensureDraft(userId: string, draftId: string) {
    const draft = await this.prisma.conversationDraft.findUnique({ where: { id: draftId } });
    if (!draft || draft.userId !== userId) {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  private normalizeConversationHistory(input?: Array<{ role: 'user' | 'assistant'; text: string }>) {
    if (!input?.length) return null;
    const history = input
      .filter((item) => item && typeof item.text === 'string' && typeof item.role === 'string')
      .map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        text: item.text.trim()
      }))
      .filter((item) => item.text);

    return history.length ? history : null;
  }
}
