import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

/**
 * Lightweight markdown renderer for AI responses. Covers the subset Gemini is
 * instructed to produce: headings, bold/italic, inline code, fenced code blocks
 * (with copy button), bullet/numbered lists, blockquotes, and links.
 */

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link';
  content: string;
  url?: string;
}

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Order matters: code first so its content is never re-parsed.
  const pattern = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]\n]+\]\([^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('`')) {
      tokens.push({ type: 'code', content: raw.slice(1, -1) });
    } else if (raw.startsWith('**') || raw.startsWith('__')) {
      tokens.push({ type: 'bold', content: raw.slice(2, -2) });
    } else if (raw.startsWith('[')) {
      const linkMatch = raw.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push({ type: 'link', content: linkMatch[1], url: linkMatch[2] });
      } else {
        tokens.push({ type: 'text', content: raw });
      }
    } else {
      tokens.push({ type: 'italic', content: raw.slice(1, -1) });
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return tokens;
}

function InlineText({ text, baseStyle }: { text: string; baseStyle: any }) {
  const tokens = useMemo(() => parseInline(text), [text]);
  return (
    <Text style={baseStyle}>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'bold':
            return <Text key={i} style={styles.bold}>{token.content}</Text>;
          case 'italic':
            return <Text key={i} style={styles.italic}>{token.content}</Text>;
          case 'code':
            return <Text key={i} style={styles.inlineCode}>{token.content}</Text>;
          case 'link':
            return (
              <Text
                key={i}
                style={styles.link}
                onPress={() => token.url && Linking.openURL(token.url).catch(() => {})}
              >
                {token.content}
              </Text>
            );
          default:
            return <Text key={i}>{token.content}</Text>;
        }
      })}
    </Text>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{language || 'code'}</Text>
        <TouchableOpacity onPress={handleCopy} style={styles.codeCopyButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name={copied ? 'check' : 'copy'} size={13} color={copied ? '#34d399' : '#a1a1aa'} />
          <Text style={[styles.codeCopyText, copied && { color: '#34d399' }]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText}>{code}</Text>
      </ScrollView>
    </View>
  );
}

interface Block {
  type: 'paragraph' | 'heading' | 'bullet' | 'ordered' | 'code' | 'quote' | 'divider';
  content: string;
  level?: number;
  language?: string;
  ordinal?: string;
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let codeBuffer: string[] | null = null;
  let codeLanguage = '';
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraphBuffer.join('\n') });
      paragraphBuffer = [];
    }
  };

  for (const line of lines) {
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      if (codeBuffer === null) {
        flushParagraph();
        codeBuffer = [];
        codeLanguage = fence[1] || '';
      } else {
        blocks.push({ type: 'code', content: codeBuffer.join('\n'), language: codeLanguage });
        codeBuffer = null;
      }
      continue;
    }
    if (codeBuffer !== null) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === '') {
      flushParagraph();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'divider', content: '' });
      continue;
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', content: heading[2], level: heading[1].length });
      continue;
    }
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      blocks.push({ type: 'bullet', content: bullet[1] });
      continue;
    }
    const ordered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      blocks.push({ type: 'ordered', content: ordered[2], ordinal: ordered[1] });
      continue;
    }
    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push({ type: 'quote', content: quote[1] });
      continue;
    }
    paragraphBuffer.push(trimmed);
  }

  if (codeBuffer !== null) {
    // Unterminated fence (mid-stream) — render what we have.
    blocks.push({ type: 'code', content: codeBuffer.join('\n'), language: codeLanguage });
  }
  flushParagraph();
  return blocks;
}

export function BotMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <View>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const headingStyle =
              block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;
            return <InlineText key={i} text={block.content} baseStyle={[styles.paragraph, headingStyle]} />;
          }
          case 'code':
            return <CodeBlock key={i} code={block.content} language={block.language} />;
          case 'bullet':
            return (
              <View key={i} style={styles.listRow}>
                <Text style={styles.listMarker}>{'•'}</Text>
                <View style={styles.listContent}>
                  <InlineText text={block.content} baseStyle={styles.paragraph} />
                </View>
              </View>
            );
          case 'ordered':
            return (
              <View key={i} style={styles.listRow}>
                <Text style={styles.listMarker}>{block.ordinal}.</Text>
                <View style={styles.listContent}>
                  <InlineText text={block.content} baseStyle={styles.paragraph} />
                </View>
              </View>
            );
          case 'quote':
            return (
              <View key={i} style={styles.quote}>
                <InlineText text={block.content} baseStyle={[styles.paragraph, styles.quoteText]} />
              </View>
            );
          case 'divider':
            return <View key={i} style={styles.divider} />;
          default:
            return <InlineText key={i} text={block.content} baseStyle={[styles.paragraph, i > 0 && styles.blockSpacing]} />;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 15,
    lineHeight: 23,
    color: '#e4e4e7',
  },
  blockSpacing: { marginTop: 8 },
  bold: { fontWeight: '800', color: '#fafafa' },
  italic: { fontStyle: 'italic' },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#93c5fd',
    backgroundColor: 'rgba(147, 197, 253, 0.1)',
  },
  link: { color: '#60a5fa', textDecorationLine: 'underline' },
  h1: { fontSize: 20, fontWeight: '900', color: '#fafafa', marginTop: 10, marginBottom: 2 },
  h2: { fontSize: 18, fontWeight: '800', color: '#fafafa', marginTop: 8, marginBottom: 2 },
  h3: { fontSize: 16, fontWeight: '800', color: '#fafafa', marginTop: 6, marginBottom: 1 },
  listRow: { flexDirection: 'row', marginTop: 4, paddingRight: 4 },
  listMarker: {
    width: 20,
    fontSize: 15,
    lineHeight: 23,
    color: '#818cf8',
    fontWeight: '800',
    textAlign: 'center',
  },
  listContent: { flex: 1 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: '#4f46e5',
    paddingLeft: 10,
    marginVertical: 6,
  },
  quoteText: { color: '#a1a1aa', fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: '#3f3f46', marginVertical: 10 },
  codeBlock: {
    backgroundColor: '#0d0d10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginVertical: 8,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c22',
    backgroundColor: '#131317',
  },
  codeLanguage: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#71717a',
  },
  codeCopyButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  codeCopyText: { fontSize: 11, fontWeight: '700', color: '#a1a1aa' },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12.5,
    lineHeight: 19,
    color: '#d4d4d8',
    padding: 12,
  },
});
