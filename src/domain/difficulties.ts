import { Brain, Eye, Globe2, Languages } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DifficultyKey } from './types';

export interface DifficultyOption {
  key: DifficultyKey;
  label: string;
  description: string;
  recommended?: boolean;
  icon: LucideIcon;
}

export const DIFFICULTY_ORDER = ['classic', 'vision', 'language', 'full'] as const satisfies readonly DifficultyKey[];

export const DIFFICULTY_OPTIONS_BY_KEY = {
  classic: {
    key: 'classic',
    label: '经典综合',
    description: 'Transformer、ResNet、GAN、BERT 等高知名度论文',
    recommended: true,
    icon: Brain,
  },
  vision: {
    key: 'vision',
    label: '视觉方向',
    description: '检测、分割、生成、三维视觉、多模态视觉论文',
    icon: Eye,
  },
  language: {
    key: 'language',
    label: '语言模型',
    description: 'NLP、LLM、RAG、Agent 和对齐相关论文',
    icon: Languages,
  },
  full: {
    key: 'full',
    label: '完整题库',
    description: '所有已启用论文都会进入候选池',
    icon: Globe2,
  },
} as const satisfies Record<DifficultyKey, DifficultyOption>;

export const DIFFICULTIES: readonly DifficultyOption[] = DIFFICULTY_ORDER.map(
  (key) => DIFFICULTY_OPTIONS_BY_KEY[key]
);
