import { ConversationStatus } from '@prisma/client';
import { ChatLedgerService } from '../src/chat-ledger/chat-ledger.service';

describe('ChatLedgerService', () => {
  const draftFindUnique = jest.fn();
  const draftUpdate = jest.fn();
  const entryCreate = jest.fn();
  const entryFindMany = jest.fn();

  const prisma = {
    conversationDraft: {
      findUnique: draftFindUnique,
      update: draftUpdate
    },
    ledgerEntry: {
      create: entryCreate,
      findMany: entryFindMany
    }
  } as any;

  const openAiService = {
    extractSlots: jest.fn(),
    transcribeAudio: jest.fn(),
    generateLedgerChatReply: jest.fn()
  } as any;

  const service = new ChatLedgerService(prisma, openAiService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should normalize majorType to extra for takeout-like text', async () => {
    draftFindUnique.mockResolvedValue({
      id: 'd1',
      userId: 'u1',
      status: ConversationStatus.COLLECTING,
      missingSlots: ['reason'],
      slotValues: {
        amount: 28,
        majorType: 'fixed',
        platformTags: ['饿了么'],
        usageType: 'self',
        occurredAt: new Date().toISOString(),
        needRemark: false
      },
      jsonContext: '{}'
    });
    openAiService.extractSlots.mockResolvedValue(null);
    draftUpdate.mockResolvedValue({
      id: 'd1',
      status: ConversationStatus.COLLECTING,
      missingSlots: ['reason'],
      slotValues: {}
    });

    await service.handleTextMessage('u1', 'd1', '饿了么外卖午饭');

    expect(draftUpdate).toHaveBeenCalled();
    const payload = draftUpdate.mock.calls[0][0].data.slotValues;
    expect(payload.majorType).toBe('extra');
  });

  it('should persist expenseNature when confirming entry', async () => {
    const occurredAt = new Date().toISOString();
    draftFindUnique.mockResolvedValue({
      id: 'd2',
      userId: 'u1',
      status: ConversationStatus.CONFIRMING,
      missingSlots: [],
      slotValues: {
        amount: 680,
        majorType: 'extra',
        platformTags: ['现金'],
        usageType: 'child',
        reason: '亲子乐园',
        occurredAt,
        needRemark: false,
        remark: ''
      },
      jsonContext: '{}'
    });
    entryCreate.mockResolvedValue({ id: 'entry-1' });
    draftUpdate.mockResolvedValue({});

    await service.confirm('u1', {
      draftId: 'd2',
      rawText: '亲子乐园 680',
      source: 'text'
    });

    expect(entryCreate).toHaveBeenCalled();
    const data = entryCreate.mock.calls[0][0].data;
    expect(data.expenseNature).toBe('one_off');
  });

  it('should route no-draft message to analysis chat mode', async () => {
    entryFindMany.mockResolvedValue([
      {
        amount: 300,
        majorType: 'income',
        platformTags: ['微信'],
        usageType: 'self',
        reason: '工资',
        note: null,
        occurredAt: new Date('2026-03-01T08:00:00.000Z')
      }
    ]);
    openAiService.generateLedgerChatReply.mockResolvedValue('这个月收入占比更高。');

    const res = await service.handleTextMessage('u1', undefined, '本月收入支出如何？');

    expect(openAiService.generateLedgerChatReply).toHaveBeenCalled();
    expect(res.draftId).toBe('');
    expect(res.assistantReply).toContain('收入占比');
  });
});
