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

  // Categorize items into three buckets
  const mediaItems = items.filter(i => isMedia(i));
  const blogItems = items.filter(i => isBlog(i));
  const manualItems = items.filter(i => isManualOrEvent(i));

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

  // Logo URL (hosted on GitHub raw)
  const logoUrl = config.logoUrl || 'https://raw.githubusercontent.com/LeoDPraetorian/praetorian-coverage-digest/main/scripts/coverage-digest/assets/logo-white.png';

  // Replace summary stats (replaceAll to handle multiple occurrences)
  template = template.replaceAll('{{DATE}}', dateStr);
  template = template.replaceAll('{{TOTAL_ITEMS}}', String(items.length));
  template = template.replaceAll('{{MEDIA_COUNT}}', String(mediaItems.length));
  template = template.replaceAll('{{TOOLS_MENTIONED}}', String(allTools.length));
  template = template.replaceAll('{{BLOG_COUNT}}', String(blogItems.length));
  template = template.replaceAll('{{ACTION_COUNT}}', String(items.length));
  template = template.replaceAll('{{SOURCE_COUNT}}', String(config.rssFeeds.length + config.googleAlertsFeeds.length));
  template = template.replaceAll('{{LOGO_URL}}', logoUrl);

  // Generate smart action items
  const actionItems = generateActionItems(mediaItems, blogItems, manualItems, allTools);
  template = template.replaceAll('{{ACTION_ITEMS}}', actionItems);

  // Render sections
  if (items.length === 0) {
    template = removeSection(template, 'IF_MEDIA');
    template = removeSection(template, 'IF_BLOG');
    template = removeSection(template, 'IF_MANUAL');
    template = removeSection(template, 'IF_ACTION_NEEDED');
    template = renderSection(template, 'IF_EMPTY', '');
  } else {
    template = removeSection(template, 'IF_EMPTY');

    // External Media Coverage
    if (mediaItems.length > 0) {
      const renderedMedia = mediaItems.map(item => renderItem(itemTemplate, item)).join('');
      template = renderSection(template, 'IF_MEDIA', '');
      template = template.replaceAll('{{MEDIA_ITEMS}}', renderedMedia);
    } else {
      template = removeSection(template, 'IF_MEDIA');
    }

    // Blog & Publications
    if (blogItems.length > 0) {
      const renderedBlog = blogItems.map(item => renderItem(itemTemplate, item)).join('');
      template = renderSection(template, 'IF_BLOG', '');
      template = template.replaceAll('{{BLOG_ITEMS}}', renderedBlog);
    } else {
      template = removeSection(template, 'IF_BLOG');
    }

    // Events & Submissions
    if (manualItems.length > 0) {
      const renderedManual = manualItems.map(item => renderItem(itemTemplate, item)).join('');
      template = renderSection(template, 'IF_MANUAL', '');
      template = template.replaceAll('{{MANUAL_ITEMS}}', renderedManual);
    } else {
      template = removeSection(template, 'IF_MANUAL');
    }

    // Action needed banner
    template = renderSection(template, 'IF_ACTION_NEEDED', '');
  }

  return template;
}

/**
 * Generate smart, contextual action items based on coverage types.
 * Returns rendered HTML for the action items list.
 */
function generateActionItems(mediaItems, blogItems, manualItems, allTools) {
  const actions = [];
  const toolStr = allTools.slice(0, 3).join(', ');

  // Priority 1: Media coverage actions (highest value - third party validation)
  if (mediaItems.length > 0) {
    const topMedia = mediaItems[0]; // Most recent
    actions.push({
      priority: 'high',
      emoji: '1',
      text: `Post ${escapeHtml(topMedia.source)} coverage of <strong>${escapeHtml((topMedia.toolsMentioned || [])[0] || 'Praetorian')}</strong> to LinkedIn company page — third-party validation drives 3x more engagement than self-promotion`,
    });
    actions.push({
      priority: 'high',
      emoji: '2',
      text: `Send pre-written reshare template to <strong>#amplification-crew</strong> — employee reshares are the highest-ROI amplification action (10-15 key voices)`,
    });
  }

  // Priority 2: Blog post actions
  if (blogItems.length > 0) {
    const topBlog = blogItems[0];
    const blogTool = (topBlog.toolsMentioned || [])[0] || '';
    actions.push({
      priority: 'medium',
      emoji: String(actions.length + 1),
      text: `Promote <strong>${escapeHtml(topBlog.title)}</strong> with 3 key takeaways on LinkedIn — ${blogTool ? `position ${escapeHtml(blogTool)} as the go-to solution in this space` : 'drive organic traffic to the blog'}`,
    });
  }

  // Priority 3: Sales enablement (when tools are mentioned)
  if (allTools.length > 0) {
    actions.push({
      priority: 'medium',
      emoji: String(actions.length + 1),
      text: `Brief sales team: <strong>${escapeHtml(toolStr)}</strong> ${mediaItems.length > 0 ? 'featured in ' + mediaItems.length + ' publications' : 'covered this week'} — add links to prospect outreach for social proof`,
    });
  }

  // Priority 4: Website update (batched)
  actions.push({
    priority: 'normal',
    emoji: String(actions.length + 1),
    text: `Update <strong>praetorian.com/news</strong> "In the News" page with this week's coverage — keeps SEO fresh and gives prospects confidence`,
  });

  // Cap at 5 items
  return actions.slice(0, 5).map(action => {
    const color = action.priority === 'high' ? '#E63948' : action.priority === 'medium' ? '#11C3DB' : '#A0A4A8';
    return `<tr>
      <td style="padding:6px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:top;padding-right:12px;">
            <div style="width:24px;height:24px;border-radius:50%;background-color:${color};text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#FFFFFF;">${action.emoji}</div>
          </td>
          <td style="vertical-align:top;">
            <div style="font-size:13px;color:#A0A4A8;line-height:1.5;">${action.text}</div>
          </td>
        </tr></table>
      </td>
    </tr>`;
  }).join('\n');
}

/**
 * Check if an item is external media coverage.
 */
function isMedia(item) {
  const source = (item.source || '').toLowerCase();
  const type = (item.sourceType || '').toLowerCase();
  if (type === 'rss' || type === 'media') {
    return !source.includes('praetorian blog') && !source.includes('praetorian.com/blog');
  }
  return false;
}

/**
 * Check if an item is a blog/self-published piece.
 */
function isBlog(item) {
  const source = (item.source || '').toLowerCase();
  const type = (item.sourceType || '').toLowerCase();
  if (type === 'blog') return true;
  if (source.includes('praetorian blog') || source.includes('praetorian.com/blog')) return true;
  return false;
}

/**
 * Check if an item is an event, podcast, or manual submission.
 */
function isManualOrEvent(item) {
  const type = (item.sourceType || '').toLowerCase();
  return type === 'manual' || type === 'event' || type === 'podcast';
}

/**
 * Render a single item using the item template.
 */
function renderItem(template, item) {
  let html = template;

  const itemDate = new Date(item.date);
  const now = new Date();
  const daysAgo = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));

  // Show relative time for recent items, absolute date for older
  let dateStr;
  if (daysAgo === 0) {
    dateStr = 'Today';
  } else if (daysAgo === 1) {
    dateStr = 'Yesterday';
  } else if (daysAgo <= 7) {
    dateStr = `${daysAgo} days ago`;
  } else {
    dateStr = itemDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  html = html.replaceAll('{{ITEM_TITLE}}', escapeHtml(item.title));
  html = html.replaceAll('{{ITEM_URL}}', item.url || '#');
  html = html.replaceAll('{{ITEM_SOURCE}}', escapeHtml(item.source));
  html = html.replaceAll('{{ITEM_DATE}}', dateStr);

  // Tools mentioned
  if (item.toolsMentioned && item.toolsMentioned.length > 0) {
    html = renderSection(html, 'IF_TOOLS', '');
    html = html.replaceAll('{{ITEM_TOOLS}}', item.toolsMentioned.join(', '));
  } else {
    html = removeSection(html, 'IF_TOOLS');
  }

  // Excerpt
  if (item.excerpt) {
    html = renderSection(html, 'IF_EXCERPT', '');
    html = html.replaceAll('{{ITEM_EXCERPT}}', escapeHtml(item.excerpt));
  } else {
    html = removeSection(html, 'IF_EXCERPT');
  }

  return html;
}

/**
 * Keep a conditional section (remove only the markers).
 */
function renderSection(html, sectionName, _placeholder) {
  html = html.replaceAll(`{{#${sectionName}}}`, '');
  html = html.replaceAll(`{{/${sectionName}}}`, '');
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
