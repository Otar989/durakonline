import { NextRequest, NextResponse } from 'next/server';

const pages: Record<string,string> = {
  rules: `# Правила\n\nКраткая версия правил. Полная версия доступна в приложении.`,
  terms: `# Пользовательское соглашение\n\nПлейсхолдер текста соглашения.`,
  policy: `# Политика конфиденциальности\n\nПлейсхолдер политики.`,
};

export function GET(req: NextRequest){
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || 'rules';
  const md = pages[id] || pages.rules;
  return NextResponse.json({ id, md });
}
