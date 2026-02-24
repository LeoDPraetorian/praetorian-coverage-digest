import { readFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../config.js';

/**
 * Render the interactive marketing dashboard HTML.
 * Unlike the email, this is a full web page with CSS/JS interactivity.
 */
export async function renderDashboard(items) {
  const templatePath = join(config.paths.templates, 'dashboard-template.html');
  let template = await readFile(templatePath, 'utf-8');

  const mediaItems = items.filter(i => isMedia(i));
  const blogItems = items.filter(i => isBlog(i));
  const allTools = [...new Set(items.flatMap(i => i.toolsMentioned || []))];

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Quarterly data (fetches from praetorian.com)
  const q = await calculateQuarterlyProgress(items);

  // Build tool coverage data: count mentions per tool
  const toolCounts = {};
  for (const item of items) {
    for (const t of item.toolsMentioned || []) {
      toolCounts[t] = (toolCounts[t] || 0) + 1;
    }
  }
  // Also count blog post tool mentions by title keywords
  for (const post of q.blogPosts) {
    for (const tool of config.tools) {
      if (post.title.toLowerCase().includes(tool.toLowerCase())) {
        toolCounts[tool] = (toolCounts[tool] || 0) + 1;
      }
    }
  }
  const toolData = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Generate LinkedIn drafts data for copy buttons
  const linkedInData = items.map(item => {
    const tool = (item.toolsMentioned || [])[0] || '';
    let draft = '';
    if (isBlog(item)) draft = generateBlogLinkedInDraft(item, tool);
    else if (isMedia(item)) draft = generateMediaLinkedInDraft(item, tool);
    else draft = generateEventLinkedInDraft(item, tool);
    draft += '\n\n' + buildHashtags(item);
    const typeLabel = isBlog(item) ? 'Blog' : isMedia(item) ? 'Media' : 'Event';
    return { title: item.title, type: typeLabel, draft, url: item.url };
  });

  // Action items
  const actionData = [];
  const toolStr = allTools.slice(0, 3).join(', ');
  if (mediaItems.length > 0) {
    actionData.push({ priority: 'high', text: `Post ${mediaItems[0].source} coverage to LinkedIn company page` });
    actionData.push({ priority: 'high', text: `Send reshare template to #amplification-crew (10-15 key voices)` });
  }
  if (blogItems.length > 0) {
    actionData.push({ priority: 'medium', text: `Promote "${blogItems[0].title}" with 3 key takeaways on LinkedIn` });
  }
  if (allTools.length > 0) {
    actionData.push({ priority: 'medium', text: `Brief sales team: ${toolStr} featured in publications` });
  }
  actionData.push({ priority: 'normal', text: `Update praetorian.com/news "In the News" page` });

  // Inject data as JSON into template
  template = template.replaceAll('{{DATE}}', dateStr);
  template = template.replaceAll('{{Q_LABEL}}', q.label);
  template = template.replaceAll('{{BLOG_COUNT}}', String(q.blogCount));
  template = template.replaceAll('{{BLOG_GOAL}}', String(q.blogGoal));
  template = template.replaceAll('{{BLOG_PCT}}', String(q.blogPct));
  template = template.replaceAll('{{MEDIA_COUNT}}', String(q.mediaCount));
  template = template.replaceAll('{{MEDIA_GOAL}}', String(q.mediaGoal));
  template = template.replaceAll('{{MEDIA_PCT}}', String(q.mediaPct));
  template = template.replaceAll('{{TOOLS_COUNT}}', String(allTools.length));
  template = template.replaceAll('{{TOTAL_ITEMS}}', String(items.length));
  template = template.replaceAll('\'{{BLOG_POSTS_JSON}}\'', JSON.stringify(q.blogPosts));
  template = template.replaceAll('\'{{MEDIA_POSTS_JSON}}\'', JSON.stringify(q.mediaPosts));
  template = template.replaceAll('\'{{TOOL_DATA_JSON}}\'', JSON.stringify(toolData));
  template = template.replaceAll('\'{{LINKEDIN_DATA_JSON}}\'', JSON.stringify(linkedInData));
  template = template.replaceAll('\'{{ACTION_DATA_JSON}}\'', JSON.stringify(actionData));

  return template;
}

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

  // Dashboard URL (for the CTA button in the email)
  const dashboardUrl = process.env.DASHBOARD_URL || 'https://praetorian-inc.github.io/people-operations/';
  template = template.replaceAll('{{DASHBOARD_URL}}', dashboardUrl);

  // Quarterly progress tracker (fetches blog count from praetorian.com)
  const quarterlyData = await calculateQuarterlyProgress(items);
  template = template.replaceAll('{{Q_LABEL}}', quarterlyData.label);
  template = template.replaceAll('{{BLOG_PROGRESS}}', String(quarterlyData.blogCount));
  template = template.replaceAll('{{BLOG_GOAL}}', String(quarterlyData.blogGoal));
  template = template.replaceAll('{{BLOG_PCT}}', String(quarterlyData.blogPct));
  template = template.replaceAll('{{MEDIA_PROGRESS}}', String(quarterlyData.mediaCount));
  template = template.replaceAll('{{MEDIA_GOAL}}', String(quarterlyData.mediaGoal));
  template = template.replaceAll('{{MEDIA_PCT}}', String(quarterlyData.mediaPct));

  // Show quarterly section if we have data
  if (quarterlyData.blogCount > 0 || quarterlyData.mediaCount > 0) {
    template = renderSection(template, 'IF_QUARTERLY', '');
  } else {
    template = removeSection(template, 'IF_QUARTERLY');
  }

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
 * Returns rendered HTML with copy-paste-ready posts optimized for
 * LinkedIn's algorithm: strong hook, value in middle, CTA at end.
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

    const typeLabel = isBlog(item) ? '📝 BLOG' : isMedia(item) ? '📰 MEDIA' : '🎤 EVENT';
    const typeColor = isBlog(item) ? '#D4AF37' : isMedia(item) ? '#E63948' : '#11C3DB';
    const typeEmoji = isBlog(item) ? '💡' : isMedia(item) ? '🔒' : '🎯';

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="background-color:#1F252A;border-radius:10px;border-left:4px solid ${typeColor};padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display:inline-block;font-size:10px;font-weight:700;color:${typeColor};text-transform:uppercase;letter-spacing:1.5px;background-color:rgba(0,0,0,0.3);padding:4px 10px;border-radius:4px;">${typeEmoji} ${typeLabel} POST ${idx + 1}</span>
                <div style="font-size:12px;color:#6B7280;margin-top:8px;margin-bottom:14px;font-style:italic;">${escapeHtml(item.title)}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#0D0D0D;border-radius:8px;padding:20px;border:1px solid #2A2F35;">
                <div style="font-size:13px;color:#E5E7EB;line-height:1.7;white-space:pre-wrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(draft)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="padding-right:16px;">
                    <a href="${item.url || '#'}" style="display:inline-block;font-size:11px;font-weight:600;color:#11C3DB;text-decoration:none;padding:6px 12px;border:1px solid #11C3DB;border-radius:4px;">Open article &rarr;</a>
                  </td>
                  <td>
                    <span style="font-size:10px;color:#535B61;">Ready to copy &amp; paste to LinkedIn</span>
                  </td>
                </tr></table>
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
 * Leads with publication credibility, uses social proof language,
 * and ends with an engagement-driving question.
 */
function generateMediaLinkedInDraft(item, tool) {
  const source = item.source || 'a leading cybersecurity publication';
  const toolName = tool || 'Praetorian';
  const url = item.url || '';

  if (tool && item.excerpt) {
    return `🔒 When ${source} covers your open-source tool, you know you're onto something.

${toolName} — ${item.excerpt}

The best security tools should be accessible to everyone defending networks. That's why we build in the open.

Full article: ${url}

What open-source security tools are in your daily rotation? 👇`;
  }

  if (tool) {
    return `🔒 ${source} just featured ${toolName}, and the industry is taking notice.

Building offensive security tools in the open isn't just a philosophy — it's how we make the entire ecosystem stronger.

→ 100% open-source
→ Built by practitioners, for practitioners
→ Solving real problems that defenders face daily

Full article: ${url}

What security challenges are you tackling right now? 👇`;
  }

  return `⚡ Praetorian was just recognized by ${source}.

When leading publications take notice, it validates what we've been building — security tools and research that push the industry forward.

We believe offensive security knowledge should be open and accessible. That's the mission.

Read the full feature: ${url}

What security trends are you watching most closely? 👇`;
}

/**
 * Generate LinkedIn draft for blog/self-published content.
 * Leads with the problem being solved, teases key insights,
 * and positions Praetorian as thought leaders.
 */
function generateBlogLinkedInDraft(item, tool) {
  const url = item.url || '';

  if (tool && item.excerpt) {
    return `💡 Most security teams are still doing this the hard way.

We just published a deep dive on ${tool}: ${item.excerpt}

Here's what we cover:
→ The problem most teams overlook
→ A practical approach that actually scales
→ Real-world results from offensive engagements

Offensive security knowledge shouldn't be gatekept. Red team, blue team, purple team — this one's for you.

Full post: ${url}

What's your biggest security testing challenge right now? 🔥`;
  }

  if (item.excerpt) {
    return `🚀 New research just dropped from the Praetorian team.

${item.excerpt}

We're sharing this openly because the cybersecurity community gets stronger when knowledge flows freely.

Whether you're breaking in or defending — there's something here for you.

Read the full post: ${url}

Tag someone who needs to see this 👇`;
  }

  return `💡 New from the Praetorian blog: ${item.title}

We spend our days breaking into the most hardened environments in the world. Now we're sharing what we've learned.

This isn't theory — it's battle-tested offensive security research from practitioners in the trenches.

Read it here: ${url}

What topics should we cover next? Drop your ideas below 👇`;
}

/**
 * Generate LinkedIn draft for events/conferences.
 * Creates FOMO, highlights key takeaways, and drives community engagement.
 */
function generateEventLinkedInDraft(item, tool) {
  const url = item.url || '';
  const toolMention = tool ? ` on ${tool}` : '';
  const isPast = item.date && new Date(item.date) < new Date();

  if (isPast) {
    return `🎯 If you missed this, here's what you need to know.

${item.title}${toolMention} — the conversations were incredible.

${item.excerpt || 'Key takeaway: The offensive security landscape is evolving faster than most organizations can keep up. The teams that invest in continuous security testing are the ones staying ahead.'}

The energy in the cybersecurity community right now is unmatched. Grateful to be part of it.

${url ? `Recap & resources: ${url}` : ''}

Were you there? What was your biggest takeaway? 👇`;
  }

  return `🎯 Mark your calendars — this is one you don't want to miss.

${item.title}${toolMention}

${item.excerpt || 'We\'re diving deep into offensive security, threat exposure management, and what the next generation of security testing looks like.'}

The best conversations in cybersecurity happen when practitioners get in the same room.

${url ? `Details & registration: ${url}` : ''}

Who else is going? Drop a 🔥 below if you'll be there!`;
}

/**
 * Build relevant hashtags for a LinkedIn post.
 * Strategy: core security tags + tool-specific + engagement + brand.
 * Targets 6-8 hashtags for optimal LinkedIn reach.
 */
function buildHashtags(item) {
  const tags = ['#cybersecurity', '#offensivesecurity', '#infosec'];

  // Tool-specific tags
  const tools = item.toolsMentioned || [];
  for (const tool of tools.slice(0, 2)) {
    const tag = '#' + tool.replace(/\s+/g, '').toLowerCase();
    if (!tags.includes(tag)) tags.push(tag);
  }

  // Content-type engagement tags
  if (isBlog(item)) {
    tags.push('#securityresearch');
    tags.push('#opensource');
  } else if (isMedia(item)) {
    tags.push('#securitytools');
    tags.push('#opensource');
  } else {
    tags.push('#securitycommunity');
  }

  // Community + engagement tags
  tags.push('#redteam');
  tags.push('#pentesting');

  // Brand tag always last
  tags.push('#praetorian');

  // Deduplicate and cap at 8
  const uniqueTags = [...new Set(tags)];
  return uniqueTags.slice(0, 8).join(' ');
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

  // Determine accent color based on item type
  let accentColor;
  if (isMedia(item)) {
    accentColor = '#E63948'; // red for external media
  } else if (isBlog(item)) {
    accentColor = '#11C3DB'; // cyan for blog/publications
  } else {
    accentColor = '#D4AF37'; // gold for events/manual
  }

  html = html.replaceAll('{{ITEM_TITLE}}', escapeHtml(item.title));
  html = html.replaceAll('{{ITEM_URL}}', item.url || '#');
  html = html.replaceAll('{{ITEM_SOURCE}}', escapeHtml(item.source));
  html = html.replaceAll('{{ITEM_DATE}}', dateStr);
  html = html.replaceAll('{{ITEM_ACCENT_COLOR}}', accentColor);

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
 * Calculate quarterly progress for blog posts and tier-1 media pickups.
 * Blog posts are fetched from praetorian.com/blog RSS feed (source of truth).
 * Media items come from the coverage tracker.
 * Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
 *
 * Returns counts AND the full list of blog/media items for the dashboard.
 */
async function calculateQuarterlyProgress(items) {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const qStart = new Date(year, (quarter - 1) * 3, 1);
  const label = `Q${quarter} ${year}`;

  // Goals
  const blogGoal = 16;
  const mediaGoal = 5;

  // Blog posts: fetch details from praetorian.com blog RSS feeds
  const blogPosts = [];
  try {
    const feedUrls = [
      'https://www.praetorian.com/blog/feed/',
      'https://www.praetorian.com/blog/feed/?paged=2',
    ];
    for (const feedUrl of feedUrls) {
      const res = await fetch(feedUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const xml = await res.text();
      // Extract individual <item> blocks
      const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      for (const block of itemBlocks) {
        const content = block[1];
        const title = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';
        const link = content.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
        const creator = content.match(/<dc:creator>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/dc:creator>/)?.[1] || '';
        const date = new Date(pubDate);
        if (date >= qStart && date <= now) {
          blogPosts.push({ title, url: link, date: date.toISOString(), author: creator });
        }
      }
    }
    // Sort newest first
    blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log(`  Blog posts from praetorian.com in ${label}: ${blogPosts.length}`);
  } catch (err) {
    console.warn(`  Warning: Could not fetch blog RSS: ${err.message}`);
    // Fallback: use blog items from coverage tracker
    for (const item of items) {
      if (isBlog(item) && new Date(item.date) >= qStart) {
        blogPosts.push({ title: item.title, url: item.url, date: item.date, author: '' });
      }
    }
  }

  // Media items: from coverage tracker (external media pickups)
  const mediaPosts = [];
  for (const item of items) {
    if (isMedia(item) && new Date(item.date) >= qStart) {
      mediaPosts.push({
        title: item.title,
        url: item.url,
        date: item.date,
        source: item.source,
        tools: item.toolsMentioned || [],
      });
    }
  }

  return {
    label,
    blogCount: blogPosts.length,
    blogGoal,
    blogPct: Math.min(100, Math.round((blogPosts.length / blogGoal) * 100)),
    mediaCount: mediaPosts.length,
    mediaGoal,
    mediaPct: Math.min(100, Math.round((mediaPosts.length / mediaGoal) * 100)),
    blogPosts,
    mediaPosts,
  };
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
