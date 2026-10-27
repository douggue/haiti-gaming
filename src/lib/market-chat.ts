/**
 * Market chat: phone numbers, emails and links are hidden so buyer and seller can't
 * arrange to pay each other directly (the agent stays in the middle).
 */
const HIDDEN = "•••";

// 7+ digits, possibly split by spaces, dots, dashes or brackets (e.g. +509 3712-3456, 3 7 1 2 3 4 5 6)
const PHONE = /\+?\d(?:[\s.\-()]{0,3}\d){6,}/g;
const EMAIL = /[A-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[A-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\])\s*[A-Z]{2,}/gi;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me|telegram\.me|chat\.whatsapp\.com|bit\.ly|m\.me)\/?\S*/gi;
const APPS = /\b(?:whats\s*app|watsap|wasap|telegram|signal)\b[\s:]*\+?[\d\s.\-]{5,}/gi;

export function redactContacts(text: string): { body: string; hidden: boolean } {
  let body = text.replace(LINK, HIDDEN).replace(EMAIL, HIDDEN).replace(APPS, HIDDEN).replace(PHONE, HIDDEN);
  body = body.replace(/(?:•••\s*){2,}/g, `${HIDDEN} `).trim();
  return { body, hidden: body !== text.trim() };
}
