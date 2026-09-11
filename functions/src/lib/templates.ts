export function renderTemplate(template: string, placeholders: Record<string, string | number>): string {
  return Object.entries(placeholders).reduce(
    (text, [key, value]) => text.split(`[${key.toUpperCase()}]`).join(String(value)),
    template
  );
}

export function applyTestMode(
  subject: string,
  recipients: string[],
  testMode: boolean,
  testEmails: string[]
): { subject: string; recipients: string[] } {
  if (!testMode) {
    return { subject, recipients };
  }
  return {
    subject: `[TEST] ${subject}`,
    recipients: testEmails,
  };
}
