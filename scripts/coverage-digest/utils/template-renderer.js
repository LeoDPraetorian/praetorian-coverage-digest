import { readFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../config.js';

/**
 * Render the digest email HTML from template + items.
 */
export async function renderDigest(items) {
  const templatePath = join(config.paths.templates, 'email-template.html');
  const itemTemplatePath = join(config.paths.templates, 'email-item-template.html');

  let template = await readFile(templatePath, 'utf-8');
  const itemTemplate = await readFile(itemTemplatePath, 'utf-8');

  // Categorize items
  const mediaItems = items.filter(i => i.sourceType === 'rss' || i.sourceType === 'media');
  const manualItems = items.filter(i => i.sourceType === 'manual' || i.sourceType === 'event' || i.sourceType === 'podcast');

  // Collect all unique tools mentioned
  const allTools = [...new Set(items.flatMap(i => i.toolsMentioned || []))];

  // Format date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Replace summary stats
  template = template.replace('{{DATE}}', dateStr);
  template = template.replace('{{TOTAL_ITEMS}}', String(items.length));
  template = template.replace('{{MEDIA_COUNT}}', String(mediaItems.length));
  template = template.replace('{{TOOLS_MENTIONED}}', String(allTools.length));
  template = template.replace('{{SOURCE_COUNT}}', String(config.rssFeeds.length + config.googleAlertsFeeds.length));
  template = template.replace('{{REPLY_TO}}', config.email.replyTo);

  // Render sections
  if (items.length === 0) {
    template = removeSection(template, 'IF_MEDIA');
    template = removeSection(template, 'IF_RSS');
    template = removeSection(template, 'IF_MANUAL');
    template = removeSection(template, 'IF_ACTION_NEEDED');
    template = renderSection(template, 'IF_EMPTY', '');
  } else {
    template = removeSection(template, 'IF_EMPTY');

    // Media / RSS items (combine into one section for now)
    if (mediaItems.length > 0) {
      const renderedMedia = mediaItems.map(item => renderItem(itemTemplate, item)).join('');
      template = renderSection(template, 'IF_MEDIA', '');
      template = template.replace('{{MEDIA_ITEMS}}', renderedMedia);
      // Hide duplicate RSS section if all items are in media
      template = removeSection(template, 'IF_RSS');
    } else {
      template = removeSection(template, 'IF_MEDIA');
      template = removeSection(template, 'IF_RSS');
    }

    // Manual submissions
    if (manualItems.length > 0) {
      const renderedManual = manualItems.map(item => renderItem(itemTemplate, item)).join('');
      template = renderSection(template, 'IF_MANUAL', '');
      template = template.replace('{{MANUAL_ITEMS}}', renderedManual);
    } else {
      template = removeSection(template, 'IF_MANUAL');
    }

    // Action needed
    const actionCount = items.length;
    template = renderSection(template, 'IF_ACTION_NEEDED', '');
    template = template.replace('{{ACTION_COUNT}}', String(actionCount));
  }

  return template;
}

/**
 * Render a single item using the item template.
 */
function renderItem(template, item) {
  let html = template;

  const itemDate = new Date(item.date);
  const dateStr = itemDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  html = html.replace('{{ITEM_TITLE}}', escapeHtml(item.title));
  html = html.replace('{{ITEM_URL}}', item.url || '#');
  html = html.replace('{{ITEM_SOURCE}}', escapeHtml(item.source));
  html = html.replace('{{ITEM_DATE}}', dateStr);

  // Tools mentioned
  if (item.toolsMentioned && item.toolsMentioned.length > 0) {
    html = renderSection(html, 'IF_TOOLS', '');
    html = html.replace('{{ITEM_TOOLS}}', item.toolsMentioned.join(', '));
  } else {
    html = removeSection(html, 'IF_TOOLS');
  }

  // Excerpt
  if (item.excerpt) {
    html = renderSection(html, 'IF_EXCERPT', '');
    html = html.replace('{{ITEM_EXCERPT}}', escapeHtml(item.excerpt));
  } else {
    html = removeSection(html, 'IF_EXCERPT');
  }

  return html;
}

/**
 * Keep a conditional section (remove only the markers).
 */
function renderSection(html, sectionName, _placeholder) {
  html = html.replace(`{{#${sectionName}}}`, '');
  html = html.replace(`{{/${sectionName}}}`, '');
  return html;
}

/**
 * Remove a conditional section entirely (markers + content between them).
 */
function removeSection(html, sectionName) {
  const regex = new RegExp(`{{#${sectionName}}}[\\s\\S]*?{{/${sectionName}}}`, 'g');
  return html.replace(regex, '');
}

/**
 * Basic HTML escaping.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
