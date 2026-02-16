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

  // Generate LinkedIn drafts
  const linkedInDrafts = generateLinkedInDrafts(items);
  template = template.replaceAll('{{LINKEDIN_DRAFTS}}', linkedInDrafts);

  // Render sections
  if (items.length === 0) {
    template = removeSection(template, 'IF_MEDIA');
    template = removeSection(template, 'IF_BLOG');
    template = removeSection(template, 'IF_MANUAL');
    template = removeSection(template, 'IF_ACTION_NEEDED');
    template = removeSection(template, 'IF_LINKEDIN');
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

    // LinkedIn drafts section
    if (items.length > 0) {
      template = renderSection(template, 'IF_LINKEDIN', '');
    } else {
      template = removeSection(template, 'IF_LINKEDIN');
    }
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
 * Generate ready-to-post LinkedIn drafts for each coverage item.
 * Returns rendered HTML with copy-paste-ready posts.
 */
function generateLinkedInDrafts(items) {
  if (items.length === 0) return '';

  return items.map((item, idx) => {
    const tool = (item.toolsMentioned || [])[0] || '';
    const hashtags = buildHashtags(item);
    let draft = '';

    if (isBlog(item)) {
      draft = generateBlogLinkedInDraft(item, tool);
    } else if (isMedia(item)) {
      draft = generateMediaLinkedInDraft(item, tool);
    } else {
      draft = generateEventLinkedInDraft(item, tool);
    }

    draft += `\n\n${hashtags}`;

    const typeLabel = isBlog(item) ? 'BLOG' : isMedia(item) ? 'MEDIA' : 'EVENT';
    const typeColor = isBlog(item) ? '#D4AF37' : isMedia(item) ? '#E63948' : '#11C3DB';

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="background-color:#1F252A;border-radius:8px;border-left:4px solid ${typeColor};padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display:inline-block;font-size:10px;font-weight:700;color:${typeColor};text-transform:uppercase;letter-spacing:1.5px;background-color:rgba(0,0,0,0.3);padding:3px 8px;border-radius:3px;">${typeLabel} POST ${idx + 1}</span>
                <div style="font-size:12px;color:#535B61;margin-top:6px;margin-bottom:12px;">${escapeHtml(item.title)}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#0D0D0D;border-radius:6px;padding:16px;">
                <div style="font-size:13px;color:#FFFFFF;line-height:1.6;white-space:pre-wrap;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(draft)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-top:10px;">
                <a href="${item.url || '#'}" style="display:inline-block;font-size:11px;color:#11C3DB;text-decoration:none;">Open article &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }).join('\n');
}

/**
 * Generate LinkedIn draft for media coverage (third-party validation).
 */
function generateMediaLinkedInDraft(item, tool) {
  const source = item.source || 'a leading publication';
  const toolPhrase = tool ? `our open-source tool ${tool}` : 'Praetorian';

  if (item.excerpt) {
    return `Proud to see ${toolPhrase} featured in ${source}!\n\n${item.excerpt}\n\nThis is what happens when you build security tools that solve real problems — the community takes notice.\n\nCheck it out: ${item.url || ''}`;
  }

  return `Proud to see ${toolPhrase} featured in ${source}!\n\nAt Praetorian, we build open-source security tools that help defenders stay ahead. Great to see the community recognizing this work.\n\nRead more: ${item.url || ''}`;
}

/**
 * Generate LinkedIn draft for blog/self-published content.
 */
function generateBlogLinkedInDraft(item, tool) {
  const toolPhrase = tool ? ` for ${tool}` : '';

  if (item.excerpt) {
    return `New from the Praetorian team${toolPhrase}:\n\n${item.excerpt}\n\nWe're sharing this openly because offensive security knowledge shouldn't be gatekept. Whether you're red team, blue team, or somewhere in between — this is for you.\n\nRead the full post: ${item.url || ''}`;
  }

  return `New from the Praetorian team${toolPhrase}: ${item.title}\n\nWe believe the best security research should be open and accessible. Dive in and let us know what you think.\n\nRead more: ${item.url || ''}`;
}

/**
 * Generate LinkedIn draft for events/conferences.
 */
function generateEventLinkedInDraft(item, tool) {
  const toolPhrase = tool ? ` featuring ${tool}` : '';

  return `${item.title}${toolPhrase}\n\n${item.excerpt || 'Join us for an exciting session on offensive security and threat exposure management.'}\n\nIf you're attending, come say hello — we love connecting with the security community.\n\nDetails: ${item.url || ''}`;
}

/**
 * Build relevant hashtags for a LinkedIn post.
 */
function buildHashtags(item) {
  const tags = ['#cybersecurity', '#infosec'];

  const tools = item.toolsMentioned || [];
  for (const tool of tools.slice(0, 2)) {
    const tag = '#' + tool.replace(/\s+/g, '').toLowerCase();
    if (!tags.includes(tag)) tags.push(tag);
  }

  if (isBlog(item)) {
    tags.push('#opensourcesecurity');
  } else if (isMedia(item)) {
    tags.push('#securitynews');
  }

  tags.push('#praetorian');

  return tags.slice(0, 6).join(' ');
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
